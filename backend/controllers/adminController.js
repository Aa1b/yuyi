const pool = require('../config/database');
const cache = require('../utils/cache');

const invalidate = () => cache.invalidateLifeMetaCaches();

/**
 * 分类列表（管理端，含禁用）
 */
exports.listCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, sort_order AS sortOrder, is_enabled AS isEnabled,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM life_categories
       ORDER BY sort_order ASC, id ASC`
    );
    res.json({ code: 200, message: '获取成功', data: rows });
  } catch (e) {
    next(e);
  }
};

/**
 * 新增分类
 */
exports.createCategory = async (req, res, next) => {
  try {
    const name = req.body.name != null ? String(req.body.name).trim() : '';
    const sortOrder = req.body.sortOrder != null ? parseInt(req.body.sortOrder, 10) : 0;
    const isEnabled = req.body.isEnabled === false || req.body.isEnabled === 0 ? 0 : 1;
    if (!name) {
      return res.status(400).json({ code: 400, message: '分类名称不能为空' });
    }
    await pool.execute(
      'INSERT INTO life_categories (name, sort_order, is_enabled) VALUES (?, ?, ?)',
      [name, Number.isNaN(sortOrder) ? 0 : sortOrder, isEnabled]
    );
    invalidate();
    res.status(201).json({ code: 200, message: '创建成功', data: null });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ code: 400, message: '分类名称已存在' });
    }
    next(e);
  }
};

/**
 * 更新分类（可重命名；重命名时同步 life_records.category 字符串）
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ code: 400, message: '无效的分类ID' });

    const [existing] = await pool.execute('SELECT name FROM life_categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }
    const oldName = existing[0].name;

    const patch = {};
    if (req.body.name !== undefined) patch.name = String(req.body.name).trim();
    if (req.body.sortOrder !== undefined) patch.sortOrder = parseInt(req.body.sortOrder, 10);
    if (req.body.isEnabled !== undefined) patch.isEnabled = req.body.isEnabled === false || req.body.isEnabled === 0 ? 0 : 1;

    if (patch.name !== undefined && !patch.name) {
      return res.status(400).json({ code: 400, message: '分类名称不能为空' });
    }

    const newName = patch.name !== undefined ? patch.name : oldName;

    if (patch.name !== undefined && newName !== oldName) {
      await pool.execute('UPDATE life_records SET category = ? WHERE category = ? AND status = 1', [newName, oldName]);
    }

    const fields = [];
    const vals = [];
    if (patch.name !== undefined) {
      fields.push('name = ?');
      vals.push(newName);
    }
    if (patch.sortOrder !== undefined && !Number.isNaN(patch.sortOrder)) {
      fields.push('sort_order = ?');
      vals.push(patch.sortOrder);
    }
    if (patch.isEnabled !== undefined) {
      fields.push('is_enabled = ?');
      vals.push(patch.isEnabled);
    }
    if (fields.length === 0) {
      return res.json({ code: 200, message: '无变更', data: null });
    }
    vals.push(id);
    await pool.execute(`UPDATE life_categories SET ${fields.join(', ')} WHERE id = ?`, vals);
    invalidate();
    res.json({ code: 200, message: '更新成功', data: null });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ code: 400, message: '分类名称已存在' });
    }
    next(e);
  }
};

/**
 * 删除分类（有记录引用时禁止）
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ code: 400, message: '无效的分类ID' });

    const [rows] = await pool.execute('SELECT name FROM life_categories WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }
    const name = rows[0].name;

    const [cnt] = await pool.execute(
      'SELECT COUNT(*) AS c FROM life_records WHERE status = 1 AND category = ?',
      [name]
    );
    if (cnt[0].c > 0) {
      return res.status(400).json({
        code: 400,
        message: `该分类已被 ${cnt[0].c} 条记录使用，无法删除`,
      });
    }

    await pool.execute('DELETE FROM life_categories WHERE id = ?', [id]);
    invalidate();
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (e) {
    next(e);
  }
};

/**
 * 标签列表（管理端）
 */
exports.listTags = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, count, sort_order AS sortOrder, is_enabled AS isEnabled,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM life_tags
       ORDER BY sort_order ASC, id ASC`
    );
    res.json({ code: 200, message: '获取成功', data: rows });
  } catch (e) {
    next(e);
  }
};

exports.createTag = async (req, res, next) => {
  try {
    const name = req.body.name != null ? String(req.body.name).trim() : '';
    const sortOrder = req.body.sortOrder != null ? parseInt(req.body.sortOrder, 10) : 0;
    const isEnabled = req.body.isEnabled === false || req.body.isEnabled === 0 ? 0 : 1;
    if (!name) {
      return res.status(400).json({ code: 400, message: '标签名称不能为空' });
    }
    await pool.execute(
      'INSERT INTO life_tags (name, count, sort_order, is_enabled) VALUES (?, 0, ?, ?)',
      [name, Number.isNaN(sortOrder) ? 0 : sortOrder, isEnabled]
    );
    invalidate();
    res.status(201).json({ code: 200, message: '创建成功', data: null });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ code: 400, message: '标签名称已存在' });
    }
    next(e);
  }
};

exports.updateTag = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ code: 400, message: '无效的标签ID' });

    const [existing] = await pool.execute('SELECT id FROM life_tags WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '标签不存在' });
    }

    const patch = {};
    if (req.body.name !== undefined) patch.name = String(req.body.name).trim();
    if (req.body.sortOrder !== undefined) patch.sortOrder = parseInt(req.body.sortOrder, 10);
    if (req.body.isEnabled !== undefined) patch.isEnabled = req.body.isEnabled === false || req.body.isEnabled === 0 ? 0 : 1;

    if (patch.name !== undefined && !patch.name) {
      return res.status(400).json({ code: 400, message: '标签名称不能为空' });
    }

    const fields = [];
    const vals = [];
    if (patch.name !== undefined) {
      fields.push('name = ?');
      vals.push(patch.name);
    }
    if (patch.sortOrder !== undefined && !Number.isNaN(patch.sortOrder)) {
      fields.push('sort_order = ?');
      vals.push(patch.sortOrder);
    }
    if (patch.isEnabled !== undefined) {
      fields.push('is_enabled = ?');
      vals.push(patch.isEnabled);
    }
    if (fields.length === 0) {
      return res.json({ code: 200, message: '无变更', data: null });
    }
    vals.push(id);
    await pool.execute(`UPDATE life_tags SET ${fields.join(', ')} WHERE id = ?`, vals);
    invalidate();
    res.json({ code: 200, message: '更新成功', data: null });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ code: 400, message: '标签名称已存在' });
    }
    next(e);
  }
};

exports.deleteTag = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ code: 400, message: '无效的标签ID' });

    const [cnt] = await pool.execute(
      'SELECT COUNT(*) AS c FROM life_record_tags WHERE tag_id = ?',
      [id]
    );
    if (cnt[0].c > 0) {
      return res.status(400).json({
        code: 400,
        message: `该标签已被 ${cnt[0].c} 条记录引用，无法删除`,
      });
    }

    const [r] = await pool.execute('DELETE FROM life_tags WHERE id = ?', [id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '标签不存在' });
    }
    invalidate();
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (e) {
    next(e);
  }
};

/**
 * 用户列表（分页 + 关键词搜昵称）
 */
exports.listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const keyword = req.query.keyword != null ? String(req.query.keyword).trim() : '';
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (nickname LIKE ? OR email LIKE ? OR CAST(id AS CHAR) LIKE ?)';
      const p = `%${keyword}%`;
      params.push(p, p, p);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users WHERE ${where}`,
      params
    );
    const total = countRows[0].total;

    const [list] = await pool.execute(
      `SELECT id, nickname, avatar, email, phone, is_admin AS isAdmin,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM users WHERE ${where}
       ORDER BY id DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: { list, total, page, pageSize },
    });
  } catch (e) {
    next(e);
  }
};

/**
 * 设置/取消管理员（不能操作自己；至少保留一名管理员）
 */
exports.updateUserAdmin = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const operatorId = req.user.id;
    if (!targetId) {
      return res.status(400).json({ code: 400, message: '无效的用户ID' });
    }
    if (targetId === operatorId) {
      return res.status(400).json({ code: 400, message: '不能修改自己的管理员状态' });
    }

    const wantAdmin = !(req.body.isAdmin === false || req.body.isAdmin === 0);

    const [users] = await pool.execute('SELECT id, is_admin FROM users WHERE id = ?', [targetId]);
    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    if (!wantAdmin && users[0].is_admin) {
      const [admins] = await pool.execute(
        'SELECT COUNT(*) AS c FROM users WHERE is_admin = 1'
      );
      if (admins[0].c <= 1) {
        return res.status(400).json({ code: 400, message: '至少需要保留一名管理员' });
      }
    }

    await pool.execute('UPDATE users SET is_admin = ? WHERE id = ?', [wantAdmin ? 1 : 0, targetId]);
    res.json({ code: 200, message: '更新成功', data: null });
  } catch (e) {
    next(e);
  }
};
