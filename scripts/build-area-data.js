/**
 * 从 modood/Administrative-divisions-of-China dist/pc-code.json 生成 utils/areaData.js
 * 优先读取本目录下 pc-code.json（可事先下载），避免每次联网。
 * 运行: node scripts/build-area-data.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const localJson = path.join(__dirname, 'pc-code.json');
const outPath = path.join(__dirname, '..', 'utils', 'areaData.js');
const url =
  'https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/master/dist/pc-code.json';

function norm6(c) {
  const s = String(c);
  if (s.length === 2) return s + '0000';
  if (s.length === 4) return s + '00';
  return s;
}

function buildFromPc(pc) {
  const provinces = {};
  const cities = {};
  for (const p of pc) {
    const pk = norm6(p.code);
    provinces[pk] = p.name;
    for (const ch of p.children) {
      const ck = norm6(ch.code);
      cities[ck] = ch.name;
    }
  }
  return { provinces, cities };
}

function writeFile({ provinces, cities }) {
  const head =
    '/** 省/地级市数据（由 scripts/build-area-data.js 从 modood/Administrative-divisions-of-China 生成；更新请运行: node scripts/build-area-data.js） */\n';
  const body = `export const areaList = ${JSON.stringify({ provinces, cities }, null, 2)};\n`;
  fs.writeFileSync(outPath, head + body, 'utf8');
  console.log('Written', outPath);
  console.log('provinces', Object.keys(provinces).length, 'cities', Object.keys(cities).length);
}

if (fs.existsSync(localJson)) {
  const pc = JSON.parse(fs.readFileSync(localJson, 'utf8'));
  writeFile(buildFromPc(pc));
} else {
  https
    .get(url, (r) => {
      let d = '';
      r.on('data', (c) => {
        d += c;
      });
      r.on('end', () => {
        const pc = JSON.parse(d);
        writeFile(buildFromPc(pc));
      });
    })
    .on('error', (e) => {
      console.error(e);
      process.exit(1);
    });
}
