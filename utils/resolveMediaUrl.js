/**
 * 将后端返回的图片/视频地址转为小程序可用的 HTTPS 完整 URL（真机禁止 HTTP 外链）
 * 配置见 config.js：baseUrl（API）、publicBaseUrl（静态资源根域名，不含 /api）
 */
import config from '~/config';

function getPublicBase() {
  const explicit = (config.publicBaseUrl || '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;
  return (config.baseUrl || '').replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

/**
 * @param {string} url 后端或数据库中的地址（可能为 http、相对路径、历史 IP）
 * @returns {string}
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return url || '';

  const u = url.trim();
  const publicBase = getPublicBase();
  if (!publicBase) {
    return /^https?:\/\//i.test(u) ? u : u;
  }

  // 历史：旧服务器 IP + 端口上的文件，统一映射到当前 HTTPS 站点
  const legacyPrefixes = [
    'http://149.104.29.197:5678',
    'http://149.104.29.197:3000',
    'https://149.104.29.197:5678',
    'https://149.104.29.197:3000',
  ];
  for (const prefix of legacyPrefixes) {
    if (u.startsWith(prefix)) {
      const path = u.slice(prefix.length);
      return publicBase + (path.startsWith('/') ? path : '/' + path);
    }
  }

  // 与当前站点同域名的 http 一律升级为 https（避免真机 wx-image 报错）
  if (/^http:\/\//i.test(u)) {
    try {
      const cur = new URL(u);
      const pub = new URL(
        publicBase.startsWith('http://') || publicBase.startsWith('https://')
          ? publicBase
          : `https://${publicBase}`
      );
      if (cur.hostname === pub.hostname) {
        cur.protocol = 'https:';
        return cur.href;
      }
    } catch (e) {
      /* ignore */
    }
    return u;
  }

  if (/^https:\/\//i.test(u)) {
    return u;
  }

  // 相对路径：补全为 publicBase
  return publicBase + (u.startsWith('/') ? u : '/' + u);
}

export default resolveMediaUrl;
