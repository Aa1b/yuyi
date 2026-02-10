/**
 * 图片处理工具
 * 提供图片压缩、格式转换、缩略图生成等功能
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * 压缩图片
 * @param {string} inputPath 输入文件路径
 * @param {string} outputPath 输出文件路径
 * @param {object} options 选项
 * @returns {Promise<object>} 处理结果
 */
async function compressImage(inputPath, outputPath, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = null,
    quality = 85,
    format = 'auto', // auto, jpeg, png, webp
  } = options;

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // 确定输出格式
    let outputFormat = format;
    if (format === 'auto') {
      outputFormat = metadata.format === 'png' ? 'png' : 'jpeg';
    }

    // 计算目标尺寸
    let targetWidth = metadata.width;
    let targetHeight = metadata.height;

    if (maxWidth && metadata.width > maxWidth) {
      const ratio = maxWidth / metadata.width;
      targetWidth = maxWidth;
      targetHeight = Math.round(metadata.height * ratio);
    }

    if (maxHeight && targetHeight > maxHeight) {
      const ratio = maxHeight / targetHeight;
      targetWidth = Math.round(targetWidth * ratio);
      targetHeight = maxHeight;
    }

    // 处理图片
    let pipeline = image.resize(targetWidth, targetHeight, {
      withoutEnlargement: true,
      fit: 'inside',
    });

    // 根据格式设置选项
    if (outputFormat === 'jpeg') {
      pipeline = pipeline.jpeg({ quality });
    } else if (outputFormat === 'png') {
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
    } else if (outputFormat === 'webp') {
      pipeline = pipeline.webp({ quality });
    }

    await pipeline.toFile(outputPath);

    // 获取文件大小
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;

    return {
      success: true,
      originalSize,
      compressedSize,
      compressionRatio: ((originalSize - compressedSize) / originalSize * 100).toFixed(2),
      width: targetWidth,
      height: targetHeight,
      format: outputFormat,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 生成缩略图
 * @param {string} inputPath 输入文件路径
 * @param {string} outputPath 输出文件路径
 * @param {object} options 选项
 * @returns {Promise<object>} 处理结果
 */
async function generateThumbnail(inputPath, outputPath, options = {}) {
  const {
    width = 300,
    height = 300,
    quality = 80,
    fit = 'cover', // cover, contain, fill
    position = 'center',
  } = options;

  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit,
        position,
      })
      .jpeg({ quality })
      .png({ quality })
      .webp({ quality })
      .toFile(outputPath);

    const thumbnailSize = fs.statSync(outputPath).size;

    return {
      success: true,
      size: thumbnailSize,
      width,
      height,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 获取图片信息
 * @param {string} imagePath 图片路径
 * @returns {Promise<object>} 图片信息
 */
async function getImageInfo(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = fs.statSync(imagePath);

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: stats.size,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels,
    };
  } catch (error) {
    throw new Error(`获取图片信息失败: ${error.message}`);
  }
}

module.exports = {
  compressImage,
  generateThumbnail,
  getImageInfo,
};
