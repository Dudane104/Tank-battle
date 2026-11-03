const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements={},context=new Proxy({},{get:()=>()=>{}});
const element=()=>({dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},getContext:()=>context});
class Image{constructor(){this.dataset={}}}
let code=fs.readFileSync(process.argv[2]||'index.html','utf8').split('<script>')[1].split('</script>')[0];
code=code.replace('})();','globalThis.game={start,shoot,update,detonate,center,get:()=>({tanks,grid,shells,blasts,pickups})};})();');
const env={HTMLImageElement:Image,Image,document:{getElementById:id=>elements[id]??=element(),createElement:element,querySelectorAll:()=>[],addEventListener(){}},addEventListener(){},requestAnimationFrame(){},devicePixelRatio:1,innerWidth:844,innerHeight:390,performance:{now:()=>0},Math};
vm.runInNewContext(code,env);const g=env.game;
function setup(){g.start();const s=g.get();for(let y=1;y<14;y++)for(let x=1;x<27;x++)s.grid[y][x]=0;s.tanks.forEach((t,i)=>{Object.assign(t,g.center(i?20+i:6,i?11:6));t.inv=0;t.armor=0;t.range=5});return s;}
function tick(seconds){for(let n=0;n<seconds*60;n++)g.update(1/60);}
let count=0;function test(name,fn){fn();count++;console.log('PASS',name);}
for(const [name,dx,dy]of [['right',1,0],['left',-1,0],['down',0,1],['up',0,-1]])test(`point-blank ${name} wall blocks blast and protects tank behind`,()=>{const s=setup(),me=s.tanks[0],target=s.tanks[1];s.grid[6+dy][6+dx]=2;Object.assign(target,g.center(6+dx*2,6+dy*2));me.a=Math.atan2(dy,dx);g.shoot(me);tick(.8);assert.equal(target.hp,4,'rock must protect target');assert.equal(s.blasts.length,1);assert.ok(s.blasts[0].cells.every(([x,y])=>s.grid[y][x]!==2),'blast must not originate inside rock');});
test('off-centre barrel clipping cannot bypass wall',()=>{const s=setup(),me=s.tanks[0],target=s.tanks[1];s.grid[6][7]=2;Object.assign(target,g.center(8,6));me.x+=6;me.a=0;g.shoot(me);tick(.8);assert.equal(target.hp,4);assert.ok(s.blasts[0].cells.every(([x,y])=>s.grid[y][x]!==2));});
test('solid-cell detonation cannot originate a blast',()=>{const s=setup();s.grid[6][7]=2;g.detonate({...g.center(7,6),vx:0,vy:0,range:5});assert.equal(s.blasts.length,0);});
test('long update shell stops at first wall',()=>{const s=setup(),me=s.tanks[0],target=s.tanks[1];s.grid[6][9]=2;Object.assign(target,g.center(11,6));me.a=0;g.shoot(me);g.update(.6);assert.equal(s.shells.length,1);assert.ok(s.shells[0].x<g.center(9,6).x-20);tick(.8);assert.equal(target.hp,4);});
test('long update detects a tank crossed by a shell',()=>{const s=setup(),me=s.tanks[0],target=s.tanks[1];Object.assign(target,g.center(9,6));me.a=0;g.shoot(me);g.update(.6);assert.ok(s.shells[0].fuse!==undefined);tick(.8);assert.equal(target.hp,3);});
test('crate survives warning fuse and breaks on detonation',()=>{const s=setup(),me=s.tanks[0];s.grid[6][7]=1;me.a=0;g.shoot(me);tick(.2);assert.equal(s.grid[6][7],1);assert.ok(s.shells[0].fuse>0);tick(.6);assert.equal(s.grid[6][7],0);});
test('muzzle contact arms on the next simulation tick, preserving fuse timing',()=>{const s=setup(),me=s.tanks[0];s.grid[6][7]=1;me.a=0;g.shoot(me);assert.equal(s.shells[0].fuse,undefined);g.update(1/60);assert.equal(s.shells[0].fuse,.7);assert.equal(s.grid[6][7],1);});
test('impact warning retains shell heading',()=>{const s=setup(),me=s.tanks[0];s.grid[7][6]=1;me.a=Math.PI/2;g.shoot(me);tick(.2);assert.equal(s.shells[0].a,Math.PI/2);});
test('restart discards armed fuses',()=>{const s=setup();s.grid[6][7]=1;s.tanks[0].a=0;g.shoot(s.tanks[0]);tick(.2);g.start();tick(1);assert.equal(g.get().shells.length,0);assert.equal(g.get().blasts.length,0);assert.ok(g.get().tanks.every(t=>t.alive&&t.hp===4));});
console.log(`${count} projectile regression checks passed`);
