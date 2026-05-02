import { areaList } from './areaData.js';

export function getAreaOptions(data, filter) {
  const res = Object.keys(data).map((key) => ({ value: key, label: data[key] }));
  return typeof filter === 'function' ? res.filter(filter) : res;
}

/** 与个人信息编辑「地址」一致：按省码筛市列表 */
export function getCitiesOfProvince(provinceValue) {
  return getAreaOptions(
    areaList.cities,
    (city) => `${city.value}`.slice(0, 2) === `${provinceValue}`.slice(0, 2),
  );
}

export function createInitialProvinceCityState() {
  const provinces = getAreaOptions(areaList.provinces);
  const firstPv = provinces[0] && provinces[0].value;
  const cities = firstPv ? getCitiesOfProvince(firstPv) : [];
  return { provinces, cities };
}

export function formatProvinceCityLine(valueArr) {
  if (!valueArr || valueArr.length < 2) return '';
  const [pk, ck] = valueArr;
  const pName = areaList.provinces[pk] ?? areaList.provinces[String(pk)] ?? '';
  const cName = areaList.cities[ck] ?? areaList.cities[String(ck)] ?? '';
  return [pName, cName].filter(Boolean).join(' ');
}
