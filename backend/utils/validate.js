/**
 * 后端输入校验（长度与格式）
 * 用于生活记录、评论、个人资料等接口
 */

const LIMIT = {
  recordTitle: 100,
  recordContent: 2000,
  recordCategory: 50,
  recordLocation: 20,
  recordTag: 20,
  commentContent: 100,
  profileNickname: 50,
  profileAvatar: 500,
  profileIntroduction: 200,
  profileAddress: 255,
};

function length(str, max) {
  if (str == null) return 0;
  return String(str).trim().length;
}

/**
 * 创建生活记录校验
 */
function validateRecordCreate(body) {
  const { title, content, category, location, tags } = body || {};
  if (title != null && String(title).trim() !== '') {
    const t = String(title).trim();
    if (t.length > LIMIT.recordTitle) {
      return { code: 400, message: `标题不能超过${LIMIT.recordTitle}字`, field: 'title' };
    }
  }
  if (content != null && String(content).trim() !== '') {
    const c = String(content).trim();
    if (c.length > LIMIT.recordContent) {
      return { code: 400, message: `内容不能超过${LIMIT.recordContent}字`, field: 'content' };
    }
  }
  if (category != null && String(category).trim() !== '') {
    const cat = String(category).trim();
    if (cat.length > LIMIT.recordCategory) {
      return { code: 400, message: `分类不能超过${LIMIT.recordCategory}字`, field: 'category' };
    }
  }
  if (location != null && String(location).trim() !== '') {
    const loc = String(location).trim();
    if (loc.length > LIMIT.recordLocation) {
      return { code: 400, message: `位置不能超过${LIMIT.recordLocation}字`, field: 'location' };
    }
  }
  if (tags && Array.isArray(tags)) {
    for (let i = 0; i < tags.length; i++) {
      const tag = String(tags[i]).trim();
      if (tag.length > LIMIT.recordTag) {
        return { code: 400, message: `单个标签不能超过${LIMIT.recordTag}字`, field: 'tags' };
      }
    }
  }
  return null;
}

/**
 * 更新生活记录校验（仅校验传入的字段）
 */
function validateRecordUpdate(body) {
  const { content, category, location, tags } = body || {};
  if (content !== undefined) {
    const c = String(content).trim();
    if (c.length > LIMIT.recordContent) {
      return { code: 400, message: `内容不能超过${LIMIT.recordContent}字`, field: 'content' };
    }
  }
  if (category !== undefined && category != null && String(category).trim() !== '') {
    const cat = String(category).trim();
    if (cat.length > LIMIT.recordCategory) {
      return { code: 400, message: `分类不能超过${LIMIT.recordCategory}字`, field: 'category' };
    }
  }
  if (location !== undefined && location != null && String(location).trim() !== '') {
    const loc = String(location).trim();
    if (loc.length > LIMIT.recordLocation) {
      return { code: 400, message: `位置不能超过${LIMIT.recordLocation}字`, field: 'location' };
    }
  }
  if (tags !== undefined && Array.isArray(tags)) {
    for (let i = 0; i < tags.length; i++) {
      const tag = String(tags[i]).trim();
      if (tag.length > LIMIT.recordTag) {
        return { code: 400, message: `单个标签不能超过${LIMIT.recordTag}字`, field: 'tags' };
      }
    }
  }
  return null;
}

/**
 * 评论内容校验
 */
function validateComment(body) {
  const { content } = body || {};
  if (content == null || String(content).trim() === '') {
    return { code: 400, message: '评论内容不能为空', field: 'content' };
  }
  const c = String(content).trim();
  if (c.length > LIMIT.commentContent) {
    return { code: 400, message: `评论不能超过${LIMIT.commentContent}字`, field: 'content' };
  }
  return null;
}

/**
 * 个人资料更新校验
 */
function validateProfile(body) {
  const { nickname, avatar, gender, birth, address, introduction } = body || {};
  if (nickname !== undefined) {
    const n = String(nickname).trim();
    if (n.length > LIMIT.profileNickname) {
      return { code: 400, message: `昵称不能超过${LIMIT.profileNickname}字`, field: 'nickname' };
    }
  }
  if (avatar !== undefined && avatar != null && String(avatar).length > LIMIT.profileAvatar) {
    return { code: 400, message: '头像地址过长', field: 'avatar' };
  }
  if (gender !== undefined && ![0, 1, 2].includes(Number(gender))) {
    return { code: 400, message: '性别参数无效', field: 'gender' };
  }
  if (birth !== undefined && birth != null && String(birth).trim() !== '') {
    const b = String(birth).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) {
      return { code: 400, message: '生日格式无效，应为YYYY-MM-DD', field: 'birth' };
    }
  }
  if (address !== undefined && address != null) {
    const raw = Array.isArray(address) ? JSON.stringify(address) : String(address);
    if (raw.length > LIMIT.profileAddress) {
      return { code: 400, message: '地址内容过长', field: 'address' };
    }
  }
  if (introduction !== undefined && introduction != null) {
    const intro = String(introduction).trim();
    if (intro.length > LIMIT.profileIntroduction) {
      return { code: 400, message: `个人简介不能超过${LIMIT.profileIntroduction}字`, field: 'introduction' };
    }
  }
  return null;
}

module.exports = {
  LIMIT,
  validateRecordCreate,
  validateRecordUpdate,
  validateComment,
  validateProfile,
};
