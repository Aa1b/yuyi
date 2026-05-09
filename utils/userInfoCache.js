import { resolveAvatarDisplayUrl } from './resolveMediaUrl';

/** 写入本地 user_info，并带与展示一致的 image（无头像时为默认图路径） */
export function saveUserInfoToCache(user) {
  if (!user) return;
  wx.setStorageSync('user_info', {
    ...user,
    image: resolveAvatarDisplayUrl(user.avatar),
  });
}
