/**
 * 生活记录 privacy 与产品文案
 *
 * 规则（与 backend lifeController 一致，枚举值不变）：
 * - public：所有人可见，会进入首页「最新/最热/同城」等仅展示公开内容的列表
 * - private：仅作者本人可见
 * - friends：互相关注的用户可见（user_follows 中同时存在「我看 TA」「TA 看我」两条关注）
 */

export const LIFE_RECORD_PRIVACY_OPTIONS = [
  { label: '公开', value: 'public', icon: 'globe' },
  { label: '好友可见', value: 'friends', icon: 'user' },
  { label: '私密', value: 'private', icon: 'lock-on' },
];

/** 设置页、ActionSheet 等无 icon 场景 */
export const DEFAULT_PRIVACY_OPTIONS = LIFE_RECORD_PRIVACY_OPTIONS.map(({ label, value }) => ({
  label,
  value,
}));

export function getLifePrivacyLabel(value) {
  const hit = LIFE_RECORD_PRIVACY_OPTIONS.find((o) => o.value === value);
  return hit ? hit.label : '未知';
}

/** 发布/编辑页下方说明（精简） */
export const LIFE_RECORD_PRIVACY_HINT =
  '「好友可见」= 你与对方互相关注后可查看（站内「关注」关系）。此类记录不会进入首页「最新/最热/同城」的公开推荐。';
