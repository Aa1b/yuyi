const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', '_ppt_extract', 'ppt', 'slides');
for (let i = 1; i <= 17; i++) {
  const f = path.join(dir, `slide${i}.xml`);
  if (!fs.existsSync(f)) continue;
  const xml = fs.readFileSync(f, 'utf8');
  const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
  console.log(`--- slide ${i} ---`);
  console.log(texts.filter(Boolean).join(' | '));
}
