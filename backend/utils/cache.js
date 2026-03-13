/**
 * 简单的内存缓存工具
 * 用于缓存频繁查询的数据，减少数据库压力
 */

class Cache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 默认5分钟
  }

  /**
   * 设置缓存
   * @param {string} key 缓存键
   * @param {any} value 缓存值
   * @param {number} ttl 过期时间（毫秒），默认5分钟
   */
  set(key, value, ttl = this.defaultTTL) {
    const expireAt = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expireAt,
    });
  }

  /**
   * 获取缓存
   * @param {string} key 缓存键
   * @returns {any|null} 缓存值，不存在或已过期返回null
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 检查缓存是否存在且未过期
   * @param {string} key 缓存键
   * @returns {boolean}
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清理过期缓存
   */
  cleanExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireAt) {
        this.cache.delete(key);
      }
    }
  }
}

// 创建单例
const cache = new Cache();

// 定期清理过期缓存（每10分钟）
setInterval(() => {
  cache.cleanExpired();
}, 10 * 60 * 1000);

module.exports = cache;
