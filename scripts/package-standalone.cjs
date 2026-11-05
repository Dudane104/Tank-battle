// Reproducible offline distribution. Compact mode resamples artwork only in the exported file.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

async function compactSprite(bytes) {
  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const sprite = await loadImage(bytes);
  // Keep twice the resolution of the largest in-game sprite cache.
  const scale = Math.min(1, 192 / Math.max(sprite.width, sprite.height));
  const canvas = createCanvas(Math.round(sprite.width * scale), Math.round(sprite.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  assert.ok(pixels.some((channel, i) => i % 4 === 3 && channel > 0), 'Empty compact sprite');
  return canvas.toBuffer('image/png');
}

async function main() {
  const args = process.argv.slice(2);
  const compact = args[0] === '--compact';
  if (compact) args.shift();
  const root = path.resolve(__dirname, '..');
  const version = require('../package.json').version;
  const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const manifest = source.match(/const ASSET_FILES=\{([^}]+)\}/);
  assert.ok(manifest, 'Missing asset manifest');
  const entries = [...manifest[1].matchAll(/'assets\/([a-z_]+\.png)'/g)];
  assert.equal(entries.length, 6, 'Expected six original artwork files');

  let html = source;
  const replacements = [];
  for (const [literal, name] of entries) {
    const bytes = fs.readFileSync(path.join(root, 'assets', name));
    assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Invalid PNG');
    const embedded = compact ? await compactSprite(bytes) : bytes;
    const uri = "'data:image/png;base64," + embedded.toString('base64') + "'";
    html = html.replace(literal, uri);
    replacements.push({ literal, uri });
  }
  let restored = html;
  for (const { literal, uri } of replacements) restored = restored.replace(uri, literal);
  assert.equal(restored, source, 'Packaging must not change game code');

  const filename = 'BLAST_TANKS_V' + version.replaceAll('.', '_') + '.html';
  const output = path.resolve(args[0] || path.join(root, 'dist', filename));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html);
  console.log('PASS standalone: six PNGs embedded; game code unchanged; ' + fs.statSync(output).size + ' bytes; ' + output);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
