/**
 * 存储服务
 * 统一管理文件存储逻辑，支持本地存储和未来扩展云存储
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config();

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';
    this.storagePath = process.env.STORAGE_PATH || './uploads';
    this.baseUrl = process.env.STORAGE_BASE_URL || 'http://localhost:3000';
    
    // 确保存储目录存在
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * 生成文件路径（按年月分目录）
   * @param {string} filename 文件名
   * @param {string} type 文件类型：images 或 videos
   * @returns {object} 文件路径信息
   */
  generateFilePath(filename, type = 'images') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const dir = path.join(this.storagePath, type, String(year), month);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    return {
      dir,
      filename,
      fullPath: path.join(dir, filename),
      relativePath: path.join(type, String(year), month, filename).replace(/\\/g, '/'),
    };
  }

  /**
   * 生成缩略图路径
   * @param {string} filename 原文件名
   * @param {string} type 文件类型
   * @returns {object} 缩略图路径信息
   */
  generateThumbnailPath(filename, type = 'images') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const thumbnailDir = type === 'images' 
      ? path.join(this.storagePath, type, String(year), month, 'thumbnails')
      : path.join(this.storagePath, type, String(year), month, 'thumbnails');
    
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
    
    const thumbnailFilename = filename.replace(/\.[^.]+$/, '_thumb.jpg');
    
    return {
      dir: thumbnailDir,
      filename: thumbnailFilename,
      fullPath: path.join(thumbnailDir, thumbnailFilename),
      relativePath: path.join(type, String(year), month, 'thumbnails', thumbnailFilename).replace(/\\/g, '/'),
    };
  }

  /**
   * 获取文件URL
   * @param {string} filePath 文件路径（相对路径或绝对路径）
   * @returns {string} 文件访问URL
   */
  getFileUrl(filePath) {
    // 如果是绝对路径，转换为相对路径
    if (path.isAbsolute(filePath)) {
      const relativePath = path.relative(this.storagePath, filePath).replace(/\\/g, '/');
      return `${this.baseUrl}/uploads/${relativePath}`;
    }
    
    // 如果已经是相对路径
    const cleanPath = filePath.replace(/^\/+/, '').replace(/\\/g, '/');
    return `${this.baseUrl}/uploads/${cleanPath}`;
  }

  /**
   * 保存文件
   * @param {string} sourcePath 源文件路径
   * @param {string} targetPath 目标文件路径
   * @returns {Promise<string>} 保存的文件路径
   */
  async saveFile(sourcePath, targetPath) {
    // 确保目标目录存在
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 复制文件
    await fs.promises.copyFile(sourcePath, targetPath);
    return targetPath;
  }

  /**
   * 移动文件
   * @param {string} sourcePath 源文件路径
   * @param {string} targetPath 目标文件路径
   * @returns {Promise<string>} 移动后的文件路径
   */
  async moveFile(sourcePath, targetPath) {
    // 确保目标目录存在
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 移动文件
    await fs.promises.rename(sourcePath, targetPath);
    return targetPath;
  }

  /**
   * 删除文件
   * @param {string} filePath 文件路径
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除文件失败:', error);
      return false;
    }
  }

  /**
   * 检查文件是否存在
   * @param {string} filePath 文件路径
   * @returns {boolean} 文件是否存在
   */
  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * 获取文件信息
   * @param {string} filePath 文件路径
   * @returns {Promise<object>} 文件信息
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      throw new Error(`获取文件信息失败: ${error.message}`);
    }
  }

  /**
   * 从URL解析文件路径
   * @param {string} url 文件URL
   * @returns {string} 本地文件路径
   */
  parseUrlToPath(url) {
    // 移除baseUrl和/uploads前缀
    let relativePath = url.replace(this.baseUrl, '').replace('/uploads/', '');
    
    // 转换为绝对路径
    return path.join(this.storagePath, relativePath);
  }
}

module.exports = new StorageService();
