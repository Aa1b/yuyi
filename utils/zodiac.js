import { formatBirthDate } from '~/utils/time';

/**
 * 根据生日（YYYY-MM-DD 或接口 ISO）推算西方星座名；仅用日期数字，避免时区偏移。
 */
export function getWesternZodiacFromBirth(birth) {
  const ymd = formatBirthDate(birth);
  if (!ymd || ymd.length < 10) return '';
  const month = parseInt(ymd.slice(5, 7), 10);
  const day = parseInt(ymd.slice(8, 10), 10);
  if (!month || !day) return '';
  const md = month * 100 + day;

  if (md >= 120 && md <= 218) return '水瓶座';
  if (md >= 219 && md <= 320) return '双鱼座';
  if (md >= 321 && md <= 419) return '白羊座';
  if (md >= 420 && md <= 520) return '金牛座';
  if (md >= 521 && md <= 621) return '双子座';
  if (md >= 622 && md <= 722) return '巨蟹座';
  if (md >= 723 && md <= 822) return '狮子座';
  if (md >= 823 && md <= 922) return '处女座';
  if (md >= 923 && md <= 1023) return '天秤座';
  if (md >= 1024 && md <= 1122) return '天蝎座';
  if (md >= 1123 && md <= 1221) return '射手座';
  return '摩羯座'; // 12/22–1/19
}
