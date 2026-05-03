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

/** 列表/详情里展示用的默认头像（本地包内路径） */
export const DEFAULT_AVATAR_URL = '/static/chat/avatar.png';

/**
 * @param {string} url 后端或数据库中的地址（可能为 http、相对路径、历史 IP）
 * @returns {string}
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return url || '';

  let u = url.trim();
  if (!u) return '';

  // 协议相对 URL（//example.com/...）
  if (/^\/\//.test(u)) u = 'https:' + u;

  // 微信头像：thirdwx 与 wx 指向同一资源，统一为 wx（与后端 normalizeWechatAvatarUrl 一致）
  u = u.replace(/^https?:\/\/thirdwx\.qlogo\.cn/i, 'https://wx.qlogo.cn');

  // 微信/腾讯图床：真机对 HTTP 外链常失败，统一升级为 HTTPS
  if (/^http:\/\//i.test(u) && /(qlogo\.cn|qpic\.cn)/i.test(u)) {
    u = 'https://' + u.slice(7);
  }

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

/**
 * 头像展示用：解析为可加载 URL，空或无效时使用本地默认图（避免 t-avatar 白块）
 * @param {string|null|undefined} url
 * @returns {string}
 */
export function resolveAvatarDisplayUrl(url) {
  const raw = url != null && url !== '' ? String(url).trim() : '';
  if (!raw) return DEFAULT_AVATAR_URL;
  const out = resolveMediaUrl(raw);
  return out && String(out).trim() ? out : DEFAULT_AVATAR_URL;
}

export default resolveMediaUrl;
