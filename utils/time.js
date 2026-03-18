function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDate(input) {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const str = String(input);
  // 兼容 "2026-03-14 13:51:34" 之类格式
  const d = new Date(str.replace(/-/g, '/'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * 按需求显示日期：
 * - 今天：显示 HH:mm
 * - 昨天：显示 "昨天"
 * - 前天：显示 "两天前"
 * - 大前天：显示 "三天前"
 * - 其它：显示 YYYY-MM-DD
 */
export function formatRelativeDayOrTime(input) {
  const d = toDate(input);
  if (!d) return '';
  const now = new Date();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays <= 0) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (diffDays === 1) return '昨天';
  if (diffDays === 2) return '两天前';
  if (diffDays === 3) return '三天前';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

