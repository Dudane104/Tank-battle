const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||'index.html';
let source=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0];
source=source.replace('})();',`globalThis.test={start,update,move,shoot,detonate,render,route,clearShot,center,cell,canMove,drawSprite,tintedTank,resetInput,pauseGame,showMenu,ai,input,IMG,assetState,resize,get:()=>({state,tanks,grid,shells,blasts,pickups,elapsed,viewX,viewY,viewScale,sx,sy}),setDifficulty:n=>difficulty=n,setElapsed:n=>elapsed=n,setFire:v=>fireHeld=v};})();`);
const events={},elements={},grad={addColorStop(){}};
const context=new Proxy({createLinearGradient:()=>grad,createRadialGradient:()=>grad},{get:(t,k)=>t[k]??(()=>{})});
function element(){const classes=new Set();return {width:64,height:64,dataset:{},textContent:'',events:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){on?classes.add(x):classes.delete(x)}},addEventListener(n,f){this.events[n]=f},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0}),getContext:()=>context};}
class Image{constructor(){this.complete=true;this.naturalWidth=512;this.naturalHeight=475;this.dataset={};}}
let seed=42;const math=Object.create(Math);math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const sandbox={HTMLImageElement:Image,Image,document:{hidden:false,createElement:element,getElementById:id=>elements[id]??=element(),querySelectorAll:()=>[],addEventListener:(n,f)=>events[n]=f},devicePixelRatio:2,innerWidth:844,innerHeight:390,addEventListener:(n,f)=>events[n]=f,requestAnimationFrame(){},performance:{now:()=>0},Math:math,console};
vm.runInNewContext(source,sandbox);const t=sandbox.test;const test=(name,f)=>{f();console.log('PASS',name)};
function tick(seconds){for(let n=0;n<seconds*60;n++)t.update(1/60)}
function flood(grid,start,crates){const dist=new Map([[start.join(','),0]]),queue=[start];for(let i=0;i<queue.length;i++){const[x,y]=queue[i];for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=[nx,ny].join(',');if(grid[ny]?.[nx]===undefined||grid[ny][nx]===2||(!crates&&grid[ny][nx]===1)||dist.has(k))continue;dist.set(k,dist.get([x,y].join(','))+1);queue.push([nx,ny])}}return dist;}
test('arena has connected destructible routes, safe spawns, no open rush between opponents',()=>{t.start();const {grid}=t.get();const d=flood(grid,[1,1],true);for(const xy of [[26,1],[1,13],[26,13]])assert.ok(d.has(xy.join(',')));const clear=flood(grid,[1,1],false);for(const xy of [[26,1],[1,13],[26,13]])assert.ok(!clear.has(xy.join(',')));assert.ok(clear.size>=4);for(let y=0;y<15;y++)for(let x=0;x<28;x++)assert.equal(grid[y][x],grid[14-y][27-x]);console.log('  reachable spawn pocket:',clear.size,'cells; destructible route to lower spawn:',d.get('1,13'),'tiles')});
test('movement, wall collisions and diagonal speed',()=>{t.start();const me=t.get().tanks[0],x=me.x,y=me.y;for(let i=0;i<60;i++)t.move(me,-1,0,1/60);assert.ok(me.x>=x-6);me.x=x;me.y=y;t.move(me,1,1,1/60);assert.ok(Math.hypot(me.x-x,me.y-y)<=90/60+.001)});
test('five separated blast hits needed; invulnerability prevents multi-cell damage',()=>{t.start();const me=t.get().tanks[0];me.inv=0;for(let i=0;i<4;i++){t.detonate({x:me.x,y:me.y,vx:0,vy:0,range:1});assert.equal(me.alive,true);me.inv=0;}assert.equal(me.hp,1);t.detonate({x:me.x,y:me.y,vx:0,vy:0,range:1});assert.equal(me.alive,false);});
test('solid walls block blasts; first crate stops each arm',()=>{t.start();const {grid}=t.get();for(let y=1;y<14;y++)for(let x=1;x<27;x++)grid[y][x]=0;grid[5][7]=2;grid[5][3]=1;const p=t.center(5,5);t.detonate({...p,vx:0,vy:0,range:5});const cells=t.get().blasts.at(-1).cells;assert.ok(!cells.some(([x,y])=>x>=7&&y===5));assert.ok(cells.some(([x,y])=>x===3&&y===5));assert.ok(!cells.some(([x,y])=>x<3&&y===5));assert.equal(grid[5][3],0)});
test('projectile cooldown, warning fuse and hold fire',()=>{t.start();const {tanks,grid}=t.get();tanks.slice(1).forEach(o=>o.ai=999);const me=tanks[0];grid[1][2]=1;me.a=0;t.shoot(me);t.shoot(me);assert.equal(t.get().shells.length,1);tick(.2);assert.ok(t.get().shells[0].fuse>0);assert.equal(grid[1][2],1);tick(.8);assert.equal(grid[1][2],0);t.setFire(true);tick(1);assert.ok(t.get().shells.length||t.get().blasts.length);t.resetInput()});
test('routing returns valid step and firing checks occlusion',()=>{t.start();const {tanks,grid}=t.get();const step=t.route(tanks[0],tanks[1]);assert.ok(step);assert.notEqual(grid[step.y][step.x],2);const me=tanks[0],other={x:me.x+80,y:me.y};grid[1][2]=2;assert.equal(t.clearShot(me,other),false);grid[1][2]=0;grid[1][3]=0;assert.equal(t.clearShot(me,other),true)});
test('pause freezes simulation; resume/restart clears controls; game completes',()=>{t.start();t.input.right=true;t.pauseGame();const x=t.get().tanks[0].x;tick(2);assert.equal(t.get().tanks[0].x,x);assert.equal(t.input.right,false);t.pauseGame();assert.equal(t.get().state,'play');t.get().tanks.forEach((o,i)=>o.alive=i===0);tick(1.2);assert.equal(t.get().state,'end');t.start();assert.equal(t.get().tanks.filter(o=>o.alive).length,4);assert.equal(t.get().elapsed,0);t.showMenu();assert.equal(t.get().state,'menu')});
test('pointer release/cancellation stops fire',()=>{t.start();const fire=elements.fire;fire.events.pointerdown({preventDefault(){},pointerId:7});assert.ok(fire.classList.contains('held'));fire.events.pointercancel({pointerId:7});assert.ok(!fire.classList.contains('held'));events.blur();assert.equal(t.get().state,'pause');});
test('aspect ratio, arena containment and rendering at six screen sizes',()=>{for(const[w,h]of [[667,375],[844,390],[932,430],[1024,768],[1366,1024],[390,844]]){sandbox.innerWidth=w;sandbox.innerHeight=h;t.resize();const v=t.get();assert.equal(v.sx,v.sy);assert.ok(v.viewX>=0&&v.viewY>=0);assert.ok(v.viewX+1200*v.viewScale<=w+.01);assert.ok(v.viewY+675*v.viewScale<=h+.01);t.render();}});
test('cached canvas sprites and fallback paths',()=>{assert.equal(t.drawSprite(t.tintedTank(1),100,100,50,50),true);const expected=t.IMG.rock.src.replace('assets/','');t.IMG.rock.onerror();assert.equal(t.IMG.rock.src,expected)});
test('pickup is consumed by exactly one tank',()=>{t.start();const {tanks,pickups}=t.get();tanks[0].armor=0;tanks[1].armor=0;tanks[1].x=tanks[0].x;tanks[1].y=tanks[0].y;pickups.push({x:tanks[0].x,y:tanks[0].y,type:'armor',life:14});t.update(1/60);assert.equal(tanks[0].armor+tanks[1].armor,1)});
test('60 seconds of seeded AI simulation stays finite and opens cover',()=>{t.start();const before=t.get().grid.flat().filter(x=>x===1).length;tick(60);const {tanks,grid,state,elapsed}=t.get();assert.ok(tanks.every(o=>Number.isFinite(o.x)&&Number.isFinite(o.y)&&o.hp>=0));const after=grid.flat().filter(x=>x===1).length;assert.ok(after<before);console.log('  cover',before,'→',after,'alive',tanks.filter(x=>x.alive).length,'time',elapsed.toFixed(1),'state',state)});

function combatScenario(level) {
 t.setDifficulty(level);
 t.start();
 t.setElapsed(4);
 const { tanks, grid, shells }=t.get();
 for(let y=1;y<14;y++)for(let x=1;x<27;x++)grid[y][x]=0;
 const [player,cpu]=tanks;
 Object.assign(player,t.center(7,6));
 Object.assign(cpu,t.center(5,6),{ai:999,inv:0});
 for(const other of tanks.slice(2))other.alive=false;
 return {player,cpu,shells};
}

function firstResponse(level, dodge) {
 const {cpu,shells}=combatScenario(level);
 const {x,y}=cpu;
 if(dodge)shells.push({x:x-65,y,owner:0,a:0,vx:0,vy:0,fuse:.7,range:1});
 for(let frame=1;frame<=60;frame++){
  t.update(1/60);
  if(dodge?cpu.x!==x||cpu.y!==y:shells.some(shell=>shell.owner===cpu.id))return frame;
 }
 return Infinity;
}

function hitsToDefeat(level) {
 const {cpu}=combatScenario(level);
 let hits=0;
 while(cpu.alive&&hits<8){
  cpu.inv=0;
  t.detonate({x:cpu.x,y:cpu.y,range:1});
  hits++;
 }
 assert.equal(cpu.alive,false);
 return hits;
}

if(process.env.BALANCE){
 for(const level of [0,1,2]){
  console.log('CPU',level,'first shot/dodge frames/hits',firstResponse(level,false),firstResponse(level,true),hitsToDefeat(level));
  for(const runSeed of [11,23,37,51,71]){
   seed=runSeed;
   t.setDifficulty(level);
   t.start();
   let first=null;
   for(let frame=0;frame<180*60&&t.get().state==='play';frame++){
    const before=t.get().tanks.filter(o=>o.alive).length;
    t.update(1/60);
    if(first===null&&t.get().tanks.filter(o=>o.alive).length<before)first=t.get().elapsed;
   }
   console.log('BALANCE',level,runSeed,'first',first?.toFixed(1),'duration',t.get().elapsed.toFixed(1),'state',t.get().state);
  }
 }
}

test('Easy and Normal give players a visible reaction window while Hard reacts immediately',()=>{
 const aim=[0,1,2].map(level=>firstResponse(level,false));
 const dodge=[0,1,2].map(level=>firstResponse(level,true));
 for(const frames of [aim,dodge]){
  assert.equal(frames[2],1);
  assert.ok(frames[1]>=13&&frames[1]<=20,frames.join(','));
  assert.ok(frames[0]>=24&&frames[0]<=32,frames.join(','));
 }
});

test('A target that ducks behind cover resets Normal aim and fire still requires a clear line',()=>{
 const {player,cpu,shells}=combatScenario(1);
 tick(.15);
 assert.equal(shells.length,0);
 t.get().grid[6][6]=2;
 tick(.3);
 assert.equal(shells.length,0);
 t.get().grid[6][6]=0;
 tick(.15);
 assert.equal(shells.length,0);
 tick(.15);
 assert.equal(shells[0].owner,cpu.id);
 assert.ok(player.alive);
});

test('Normal and Easy CPU durability drops while Hard and player durability retain five hits',()=>{
 assert.deepEqual([0,1,2].map(hitsToDefeat),[3,4,5]);
 for(const level of [0,1,2]){
  t.setDifficulty(level);
  t.start();
  const [player]=t.get().tanks;
  assert.equal(player.hp,4);
  assert.equal(player.armor,1);
  assert.equal(player.speed,90);
  assert.equal(player.delay,.9);
 }
 t.setDifficulty(1);
});

test('Easy holds a close firing distance and gives a retreat window after its shot',()=>{
 const {player,cpu,shells}=combatScenario(0);
 cpu.ai=0;
 const start=cpu.x;
 tick(.3);
 assert.equal(cpu.x,start,'CPU should not rush into the player');
 tick(.25);
 assert.ok(shells.some(s=>s.owner===cpu.id),'CPU still returns fire');
 const position={x:cpu.x,y:cpu.y};
 t.input.down=true;
 tick(.5);
 t.resetInput();
 assert.equal(cpu.x,position.x);
 assert.equal(cpu.y,position.y);
 assert.ok(player.y>position.y+30,'Player can leave the firing lane during recovery');
 assert.equal(player.hp,4);
});

function counterattackScenario() {
 const {player,cpu,shells}=combatScenario(0);
 cpu.ai=0;
 // Wait for the opponent's shot, return fire, then retreat perpendicular to the blast.
 let lastCpuShot=null;
 let returnY=player.y;
 let phase='wait';
 let phaseUntil=0;
 const hp=cpu.hp;
 for(let frame=0;frame<1800&&t.get().state==='play';frame++){
  const now=t.get().elapsed;
  if(phase==='wait'){
   const shot=shells.find(s=>s.owner===cpu.id&&s!==lastCpuShot);
   if(shot){
    lastCpuShot=shot;
    player.a=Math.atan2(cpu.y-player.y,cpu.x-player.x);
    t.shoot(player);
    phase='retreat';phaseUntil=now+.6;
   }
  }
  t.input.down=phase==='retreat'&&now<phaseUntil;
  if(phase==='retreat'&&now>=phaseUntil){phase='return';phaseUntil=now+.55}
  t.input.up=phase==='return'&&now>phaseUntil&&player.y>returnY+2;
  if(phase==='return'&&now>phaseUntil&&player.y<=returnY+2)phase='wait';
  t.update(1/60);
 }
 t.resetInput();
 return {playerHP:player.hp,cpuHP:cpu.hp,hits:hp-cpu.hp,state:t.get().state,time:t.get().elapsed-4};
}
if(process.env.EASY_BENCH)console.log('COUNTERATTACK',JSON.stringify(counterattackScenario()));
test('Easy rewards a repeatable shoot-and-retreat counterattack with a win',()=>{
 const result=counterattackScenario();
 assert.equal(result.cpuHP,0);
 assert.equal(result.state,'end');
 assert.ok(result.playerHP>0);
 assert.ok(result.time<20);
 t.setDifficulty(1);
});
