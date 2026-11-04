// Reproducible offline distribution; the six original PNGs remain unchanged.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),version=require('../package.json').version;
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const pattern=/const ASSET_FILES=\{([^}]+)\}/;
const match=source.match(pattern);assert.ok(match,'Missing asset manifest');
const files=[];
const manifest=match[1].replace(/'assets\/([a-z_]+\.png)'/g,(literal,name)=>{
 const bytes=fs.readFileSync(path.join(root,'assets',name));
 assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Invalid PNG');
 const uri='data:image/png;base64,'+bytes.toString('base64');
 files.push({literal,uri});return `'${uri}'`;
});
assert.equal(files.length,6,'Expected six original artwork files');
const html=source.replace(pattern,'const ASSET_FILES={'+manifest+'}');
let restored=html;for(const {literal,uri}of files)restored=restored.replace(`'${uri}'`,literal);
assert.equal(restored,source,'Packaging must not change game code');
const output=path.resolve(process.argv[2]||path.join(root,'dist',`BLAST_TANKS_V${version.replaceAll('.','_')}.html`));
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);
console.log(`PASS standalone: six original PNGs embedded; game code unchanged; ${fs.statSync(output).size} bytes; ${output}`);
