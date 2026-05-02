import { areaList } from '~/utils/areaData.js';

/**
 * 从资料里的 address（数组或 JSON 字符串）解析用于展示的省市文案（优先城市名）
 */
export function formatHomeRegionFromAddress(address) {
  if (address == null || address === '') return '';
  let arr = address;
  if (!Array.isArray(arr)) {
    try {
      const parsed = JSON.parse(String(address));
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      return '';
    }
  }
  if (!Array.isArray(arr) || arr.length < 2) return '';
  const provCode = arr[0];
  const cityCode = arr[1];
  const cityName = areaList.cities[cityCode];
  const provName = areaList.provinces[provCode];
  return cityName || provName || '';
}
