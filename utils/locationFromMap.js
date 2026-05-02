/**
 * 地图选点后的地址规范化，供发布/编辑保存到后端。
 * 同城列表按城市名做 LIKE 匹配，故优先用逆地理结果（含省市区），避免仅手写门牌导致无法匹配。
 */

const TENCENT_MAP_KEY = 'LITBZ-IDMWA-5D3KD-CURMW-MHJ4J-2SFMX';

/**
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string>} 成功时返回推荐地址或全地址，失败返回空串
 */
export function enrichAddressFromLocation(latitude, longitude) {
  return new Promise((resolve) => {
    wx.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      method: 'GET',
      data: {
        location: `${latitude},${longitude}`,
        key: TENCENT_MAP_KEY,
        get_poi: 1,
      },
      success(res) {
        if (res.data && res.data.status === 0) {
          const result = res.data.result;
          const line = result.formatted_addresses
            ? (result.formatted_addresses.recommend || result.address)
            : result.address;
          resolve((line && String(line).trim()) || '');
        } else {
          resolve('');
        }
      },
      fail() {
        resolve('');
      },
    });
  });
}

/**
 * 逆地理失败时，用选点结果拼一条可读地址（仍含微信返回的省市区路名等）
 * @param {{ address?: string, name?: string }} res
 * @param {string} enriched
 */
export function buildLocationLabel(res, enriched) {
  if (enriched) return enriched;
  const a = (res.address && String(res.address).trim()) || '';
  const n = (res.name && String(res.name).trim()) || '';
  if (a && n) return `${a} · ${n}`;
  return a || n;
}
