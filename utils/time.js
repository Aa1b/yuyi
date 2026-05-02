function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDate(input) {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  let str = String(input).trim();

  // 1) 先直接用原始字符串解析（兼容 ISO: 2026-03-14T13:51:34.000Z）
  let d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d;

  // 2) 去掉尾部 Z，并把 T 换成空格
  str = str.replace(/Z$/i, '').replace('T', ' ');
  d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d;

  // 3) 兼容用斜杠的老格式
  d = new Date(str.replace(/-/g, '/'));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 生日展示 / 日期选择器：统一为 YYYY-MM-DD（兼容接口返回的 ISO 字符串）
 */
export function formatBirthDate(input) {
  if (input == null || input === '') return '';
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    const y = input.getFullYear();
    const m = pad2(input.getMonth() + 1);
    const day = pad2(input.getDate());
    return `${y}-${m}-${day}`;
  }
  const s = String(input).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m) return m[1];
  const d = toDate(input);
  if (!d) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * 统一时间格式：YYYY-MM-DD HH:mm
 */
export function formatDateTime(input) {
  const d = toDate(input);
  if (!d) return '';
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const h = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  return `${y}-${m}-${day} ${h}:${min}`;
}

