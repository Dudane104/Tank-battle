// Native canvas visual check; deliberately not a browser/Safari test.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,Image}=require('@napi-rs/canvas');
class AssetImage extends Image{constructor(){super();this.dataset={}}set src(value){super.src=fs.readFileSync(value)}get src(){return super.src}}
const elements={},events={};function el(){return {classList:{add(){},remove(){},toggle(){}},addEventListener(){},dataset:{}}}
const canvas=createCanvas(844,390);canvas.addEventListener=()=>{};canvas.getBoundingClientRect=()=>({left:0,top:0});elements.game=canvas;
let source=fs.readFileSync('index.html','utf8').split('<script>')[1].split('</script>')[0];source=source.replace('})();','globalThis.visual={start,render,update,assetReady,get:()=>({tanks,grid,assetState})};})();');
const sandbox={HTMLImageElement:Image,Image:AssetImage,document:{createElement:()=>createCanvas(1,1),getElementById:id=>elements[id]??=el(),querySelectorAll:()=>[],addEventListener:(n,f)=>events[n]=f},devicePixelRatio:2,innerWidth:844,innerHeight:390,addEventListener:(n,f)=>events[n]=f,requestAnimationFrame(){},performance:{now:()=>1000},Math,console};
(async()=>{vm.runInNewContext(source,sandbox);const v=sandbox.visual;await v.assetReady;if(v.get().assetState.loaded!==6)throw Error('Missing images');v.start();fs.mkdirSync('artifacts',{recursive:true});for(const[w,h]of [[844,390],[667,375],[1024,768]]){sandbox.innerWidth=w;sandbox.innerHeight=h;events.resize();v.render();fs.writeFileSync(`artifacts/arena-${w}x${h}.png`,canvas.toBuffer('image/png'));}console.log('PASS native canvas: six real PNGs loaded and menu-free arena rendered at three sizes')})().catch(e=>{console.error(e);process.exit(1)});
