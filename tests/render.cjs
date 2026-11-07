// Native canvas visual check; deliberately not a browser/Safari test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image}=require('@napi-rs/canvas');
class AssetImage extends Image{constructor(){super();this.dataset={}}set src(value){super.src=value.startsWith('data:image/png;base64,')?Buffer.from(value.split(',')[1],'base64'):fs.readFileSync(value)}get src(){return super.src}}
const elements={},events={};function el(){return {classList:{add(){},remove(){},toggle(){}},addEventListener(){},dataset:{}}}
const canvas=createCanvas(844,390);canvas.addEventListener=()=>{};canvas.getBoundingClientRect=()=>({left:0,top:0});elements.game=canvas;
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const ids=new Set([...html.split('<script>')[0].matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
let source=html.split('<script>')[1].split('</script>')[0];source=source.replace('})();','globalThis.visual={start,shoot,render,update,assetReady,center,detonate,get:()=>({state,tanks,grid,shells,assetState})};})();');
let nextFrame;
const sandbox={HTMLImageElement:Image,Image:AssetImage,document:{createElement:()=>createCanvas(1,1),getElementById:id=>ids.has(id)?(elements[id]??=el()):null,querySelectorAll:()=>[],addEventListener:(n,f)=>events[n]=f},devicePixelRatio:2,innerWidth:844,innerHeight:390,addEventListener:(n,f)=>events[n]=f,requestAnimationFrame(fn){nextFrame=fn},performance:{now:()=>1000},Math,console};
(async()=>{vm.runInNewContext(source,sandbox);const v=sandbox.visual;await v.assetReady;if(v.get().assetState.loaded!==6)throw Error('Missing images');assert.equal(v.get().state,'menu');nextFrame(1000);elements.start.onclick();nextFrame(1016);assert.equal(v.get().state,'play');assert.equal(v.get().tanks.length,4);console.log('PASS menu frame, Deploy button, and first live frame');fs.mkdirSync('artifacts',{recursive:true});for(const[w,h]of [[844,390],[667,375],[1024,768]]){sandbox.innerWidth=w;sandbox.innerHeight=h;events.resize();v.render();fs.writeFileSync(`artifacts/arena-${w}x${h}.png`,canvas.toBuffer('image/png'));}v.start();v.get().tanks[0].a=-Math.PI/2;v.shoot(v.get().tanks[0]);v.update(1/60);if(v.get().shells[0].fuse!==.7)throw Error('Missing wall warning fuse');for(const[w,h]of [[844,390],[667,375],[1024,768]]){sandbox.innerWidth=w;sandbox.innerHeight=h;events.resize();v.render();fs.writeFileSync(`artifacts/impact-${w}x${h}.png`,canvas.toBuffer('image/png'));}v.start();Object.assign(v.get().tanks[0],v.center(10,5));
const warning={...v.center(12,5),owner:0,range:3,fuse:.35,a:0,vx:0,vy:0};
v.get().shells.push(warning);
for(const[w,h]of [[844,390],[667,375],[1024,768]]){
 sandbox.innerWidth=w;sandbox.innerHeight=h;events.resize();v.render();
 fs.writeFileSync(`artifacts/warning-${w}x${h}.png`,canvas.toBuffer('image/png'));
}
v.get().shells.length=0;v.detonate(warning);
for(const[w,h]of [[844,390],[667,375],[1024,768]]){
 sandbox.innerWidth=w;sandbox.innerHeight=h;events.resize();v.render();
 fs.writeFileSync(`artifacts/blast-${w}x${h}.png`,canvas.toBuffer('image/png'));
}
console.log('PASS native canvas: six real PNGs loaded; arena and armed wall impact rendered at three sizes')})().catch(e=>{console.error(e);process.exit(1)});


