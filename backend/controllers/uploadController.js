const path = require('path');
const fs = require('fs');
// sharp 可选：若服务器未安装 libvips 等依赖，应用仍可启动，图片上传将不压缩
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('sharp 未加载，图片压缩/缩略图将不可用:', e.message);
  sharp = null;
}
require('dotenv').config();

/**
 * 上传图片（带压缩和缩略图）
 */
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '没有上传文件',
      });
    }

    const originalPath = req.file.path;
    const filename = req.file.filename;
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    
    // 压缩后的图片路径
    const compressedPath = path.join(path.dirname(originalPath), `${nameWithoutExt}_compressed${ext}`);
    // 缩略图路径
    const thumbnailPath = path.join(path.dirname(originalPath), `${nameWithoutExt}_thumb${ext}`);

    try {
      if (!sharp) {
        const fileUrl = `/uploads/images/${filename}`;
        return res.json({
          code: 200,
          message: '上传成功（未压缩，服务器未启用 sharp）',
          data: { url: fileUrl, thumbnail: fileUrl, filename, size: req.file.size },
        });
      }
      // 压缩图片（最大宽度1920px，质量85%）
      await sharp(originalPath)
        .resize(1920, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .jpeg({ quality: 85 })
        .png({ quality: 85, compressionLevel: 9 })
        .webp({ quality: 85 })
        .toFile(compressedPath);

      // 生成缩略图（300x300）
      await sharp(originalPath)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .png({ quality: 80 })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);

      // 获取文件大小
      const originalSize = fs.statSync(originalPath).size;
      const compressedSize = fs.statSync(compressedPath).size;
      const thumbnailSize = fs.statSync(thumbnailPath).size;

      // 获取图片尺寸
      const metadata = await sharp(compressedPath).metadata();

      // 删除原图（如果压缩成功）
      if (compressedSize < originalSize) {
        fs.unlinkSync(originalPath);
      }

      // TODO: 实际项目中应该上传到云存储（微信云开发或OSS）
      // 这里返回本地路径（实际应该是云存储URL）
      const fileUrl = `/uploads/images/${path.basename(compressedPath)}`;
      const thumbnailUrl = `/uploads/images/${path.basename(thumbnailPath)}`;

      res.json({
        code: 200,
        message: '上传成功',
        data: {
          url: fileUrl,
          thumbnail: thumbnailUrl,
          filename: path.basename(compressedPath),
          size: compressedSize,
          originalSize,
          width: metadata.width,
          height: metadata.height,
        },
      });
    } catch (error) {
      console.error('图片处理失败:', error);
      // 如果处理失败，返回原图
      const fileUrl = `/uploads/images/${filename}`;
      res.json({
        code: 200,
        message: '上传成功（未压缩）',
        data: {
          url: fileUrl,
          thumbnail: fileUrl,
          filename,
          size: req.file.size,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 上传视频（带封面提取）
 */
exports.uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '没有上传文件',
      });
    }

    const videoPath = req.file.path;
    const filename = req.file.filename;
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    
    // 封面图路径
    const thumbnailDir = path.join(path.dirname(videoPath), 'thumbnails');
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
    const coverPath = path.join(thumbnailDir, `${nameWithoutExt}.jpg`);

    let duration = 0;
    let coverUrl = '';

    try {
      // 使用 ffmpeg 提取视频封面和时长
      const { execSync } = require('child_process');
      
      // 提取视频第一帧作为封面
      try {
        execSync(`ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${coverPath}"`, {
          stdio: 'ignore',
          timeout: 10000,
        });
        
        // 压缩封面图（若 sharp 可用）
        if (sharp) {
          await sharp(coverPath)
            .resize(800, 450, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toFile(coverPath);
        }
        coverUrl = `/uploads/videos/thumbnails/${path.basename(coverPath)}`;
      } catch (error) {
        console.warn('提取视频封面失败（可能需要安装ffmpeg）:', error.message);
        // 如果提取失败，使用默认封面
        coverUrl = `/uploads/videos/thumbnails/default.jpg`;
      }

      // 获取视频时长
      try {
        const durationOutput = execSync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
          { encoding: 'utf8', timeout: 5000 }
        );
        duration = Math.round(parseFloat(durationOutput.trim()));
      } catch (error) {
        console.warn('获取视频时长失败:', error.message);
        duration = 0;
      }
    } catch (error) {
      console.warn('视频处理失败（可能需要安装ffmpeg）:', error.message);
      // 如果处理失败，返回默认值
      coverUrl = `/uploads/videos/thumbnails/default.jpg`;
    }

    // TODO: 实际项目中应该上传到云存储（微信云开发或OSS）
    // 这里返回本地路径（实际应该是云存储URL）
    const fileUrl = `/uploads/videos/${filename}`;

    res.json({
      code: 200,
      message: '上传成功',
      data: {
        url: fileUrl,
        cover: coverUrl,
        duration,
        filename,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除文件
 */
exports.deleteFile = async (req, res, next) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        code: 400,
        message: '缺少文件URL',
      });
    }

    // TODO: 实际项目中应该从云存储删除
    // 这里删除本地文件
    try {
      const filePath = path.join(process.env.STORAGE_PATH || './uploads', url.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('删除文件失败:', error);
    }

    res.json({
      code: 200,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
