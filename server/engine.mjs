// Generated from index.html by scripts/build-online.py; do not edit independently.
export function createBattle(map=0,level=1,players=[0,1]){
const colors=['#ed5148','#4295ed','#57cc69','#f3cb45'];
const WORLD={w:1200,h:675},TILE=40,COLS=28,ROWS=15,OX=40,OY=37.5,dirs=[[1,0],[-1,0],[0,1],[0,-1]];
let state='play',grid=[],tanks=[],shells=[],blasts=[],pickups=[],particles=[],elapsed=0,roundEnd=0,terrainDirty=true,mapIndex=map,difficulty=level;
const humans=new Set(players),controls={},sound={play(){}},clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const cell=(x,y)=>({x:Math.floor((x-OX)/TILE),y:Math.floor((y-OY)/TILE)}); const center=(x,y)=>({x:OX+x*TILE+TILE/2,y:OY+y*TILE+TILE/2}); const inGrid=(x,y)=>x>=0&&y>=0&&x<COLS&&y<ROWS;
function buildMap(){
 grid=Array.from({length:ROWS},(_,y)=>Array.from({length:COLS},(_,x)=>x===0||y===0||x===COLS-1||y===ROWS-1?2:0));
 // Three fortified columns and two halves; offset gateways break long firing lanes.
 for(let y=1;y<ROWS-1;y++)for(const x of [8,19])grid[y][x]=[3,4,10,11].includes(y)?1:2;
 for(let x=1;x<COLS-1;x++)grid[7][x]=[4,5,12,15,22,23].includes(x)?1:2;
 // Short baffles stop a straight rush along the edge and offer retreat cover.
 const walls=[[3,3],[4,3],[5,3],[6,5],[6,6],[11,2],[11,3],[14,4],[15,4],[16,4],[3,5]];
 for(const [x,y]of walls)for(const [xx,yy]of [[x,y],[COLS-1-x,y],[x,ROWS-1-y],[COLS-1-x,ROWS-1-y]])if(grid[yy][xx]===0)grid[yy][xx]=2;
 // Symmetric crates leave room to manoeuvre while protecting every approach.
 for(let y=1;y<=6;y++)for(let x=1;x<=13;x++)if((x*7+y*11)%8<2){for(const[xx,yy]of [[x,y],[COLS-1-x,y],[x,ROWS-1-y],[COLS-1-x,ROWS-1-y]])if(grid[yy][xx]===0)grid[yy][xx]=1}
 for(const [a,b]of [[1,1],[COLS-2,1],[1,ROWS-2],[COLS-2,ROWS-2]])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=a+dx,y=b+dy;if(x>0&&y>0&&x<COLS-1&&y<ROWS-1)grid[y][x]=0}
 if(mapIndex>0){
 grid=Array.from({length:ROWS},(_,y)=>Array.from({length:COLS},(_,x)=>x===0||y===0||x===COLS-1||y===ROWS-1?2:0));
 for(let y=2;y<ROWS-2;y++)for(let x=2;x<COLS-2;x++){
 if(mapIndex===1&&((x===9||x===18)&&![3,7,11].includes(y)||y===7&&![4,9,13,14,18,23].includes(x)))grid[y][x]=2;
 if(mapIndex===2&&x%3===0&&y%2===0)grid[y][x]=2;
 if(mapIndex===3&&((y===4||y===10)&&x%7<5||[6,21].includes(x)&&y>=5&&y<=9))grid[y][x]=2;
 if(!grid[y][x]&&(x*7+y*11)%5<2)grid[y][x]=1;
 }
 for(let y=1;y<=7;y++)for(let x=1;x<=13;x++){const v=grid[y][x];for(const [a,b]of [[x,y],[27-x,y],[x,14-y],[27-x,14-y]])grid[b][a]=v}
 for(const [x,y]of [[7,1],[20,1],[7,13],[20,13],[1,5],[1,9],[26,5],[26,9]])grid[y][x]=1;
 for(const [a,b]of [[1,1],[26,1],[1,13],[26,13]])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=a+dx,y=b+dy;if(x>0&&y>0&&x<27&&y<14)grid[y][x]=0}
 }
 terrainDirty=true;
}
const CPU_LEVELS = [
 { routeInterval: .65, aimDelay: .45, dodgeDelay: .42, hull: 3, armor: 0 },
 { routeInterval: .38, aimDelay: .25, dodgeDelay: .24, hull: 4, armor: 0 },
 { routeInterval: .22, aimDelay: 0, dodgeDelay: 0, hull: 4, armor: 1 },
];
function tank(i,cx,cy){
 const p=center(cx,cy);
 const cpu=i===0?null:CPU_LEVELS[difficulty];
 const hull=cpu?.hull??4;
 return {
  id:i,x:p.x,y:p.y,a:i%2?Math.PI:0,alive:true,inv:3,speed:90,range:1,
  delay:.9,cool:0,maxShells:1,armor:cpu?.armor??1,hits:0,hp:hull,maxHp:hull,
  ai:0,waypoint:null,dir:{x:0,y:0},threat:null,threatSince:0,aimTarget:null,aimSince:0,recoverUntil:0,
 };
}
function start(){elapsed=0;buildMap();tanks=[[1,1],[26,1],[1,13],[26,13]].map((p,i)=>tank(i,...p));shells=[];blasts=[];pickups=[];particles=[];state='play'}
function blocked(cx,cy){return !inGrid(cx,cy)||grid[cy][cx]>0} function canMove(t,x,y){const r=14;for(const dx of[-r,r])for(const dy of[-r,r]){const c=cell(x+dx,y+dy);if(blocked(c.x,c.y))return false}return true}
function move(t,dx,dy,dt,assist=false){dt=Math.min(dt,.033);if(!t.alive||(!dx&&!dy))return;const m=Math.hypot(dx,dy);dx/=m;dy/=m;t.a=Math.atan2(dy,dx);let nx=t.x+dx*t.speed*dt,ny=t.y+dy*t.speed*dt;
 if(assist&&dy===0&&!canMove(t,nx,t.y)){const y=OY+(Math.round((t.y-OY-TILE/2)/TILE)+.5)*TILE;if(Math.abs(y-t.y)<=10&&canMove(t,t.x,y)&&canMove(t,nx,y)){t.y=y;ny=y}}
 if(assist&&dx===0&&!canMove(t,t.x,ny)){const x=OX+(Math.round((t.x-OX-TILE/2)/TILE)+.5)*TILE;if(Math.abs(x-t.x)<=10&&canMove(t,x,t.y)&&canMove(t,x,ny)){t.x=x;nx=x}}
if(canMove(t,nx,t.y))t.x=nx;if(canMove(t,t.x,ny))t.y=ny}
// Sweep the muzzle and every flight segment so shells cannot begin in or cross cover.
function advanceShell(s,toX,toY){
 const fromX=s.x,fromY=s.y,steps=Math.max(1,Math.ceil(Math.hypot(toX-fromX,toY-fromY)/4));
 for(let n=1;n<=steps;n++){
  const x=fromX+(toX-fromX)*n/steps,y=fromY+(toY-fromY)*n/steps,c=cell(x,y);
  // Keep a stone impact on the last free point, never inside the blocking tile.
  if(!inGrid(c.x,c.y)||grid[c.y][c.x]===2)return true;
  s.x=x;s.y=y;
  if(grid[c.y][c.x]===1||tanks.some(t=>t.alive&&t.id!==s.owner&&Math.hypot(t.x-x,t.y-y)<18))return true;
 }
 return false;
}
function armShell(s){s.fuse=.7;s.vx=0;s.vy=0}
function shoot(t){
 if(state!=='play'||!t||!t.alive||t.cool>0)return;
 if(shells.filter(s=>s.owner===t.id).length>=t.maxShells)return;
 t.cool=t.delay;
 const s={x:t.x,y:t.y,a:t.a,vx:Math.cos(t.a)*360,vy:Math.sin(t.a)*360,owner:t.id,range:t.range,life:.9};
 if(advanceShell(s,t.x+Math.cos(t.a)*24,t.y+Math.sin(t.a)*24))s.pendingImpact=true;
 shells.push(s);sound.play('shot',t.id===0?1:.35);spark(s.x,s.y,'#ffe178',5);
}
function spark(x,y,color,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*100;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:.25+Math.random()*.35,color})}}
function pickup(cx,cy){if(Math.random()>.44)return;const p=center(cx,cy),types=['range','speed','rapid','armor','multi'];pickups.push({x:p.x,y:p.y,type:types[Math.floor(Math.random()*types.length)],life:14})}
// One footprint definition drives warnings and damage. Read the current cover each time.
function blastFootprint(shell){
 const origin=cell(shell.x,shell.y);
 if(!inGrid(origin.x,origin.y)||grid[origin.y][origin.x]===2)return [];
 const cells=[[origin.x,origin.y]];
 for(const [dx,dy] of dirs){
  for(let step=1;step<=shell.range;step++){
   const x=origin.x+dx*step,y=origin.y+dy*step;
   if(!inGrid(x,y)||grid[y][x]===2)break;
   cells.push([x,y]);
   if(grid[y][x]===1)break;
  }
 }
 return cells;
}
function detonate(s){
 const cells=blastFootprint(s);
 if(!cells.length)return;
 for(const [x,y] of cells){
  if(grid[y][x]===1){grid[y][x]=0;terrainDirty=true;pickup(x,y)}
 }
 blasts.push({cells,t:.45});sound.play('blast',.75);for(const[x,y]of cells){const p=center(x,y);spark(p.x,p.y,'#ff9a35',8);for(const t of tanks){if(!t.alive||t.inv>0)continue;if(Math.abs(t.x-p.x)<TILE*.44&&Math.abs(t.y-p.y)<TILE*.44){if(t.armor){t.armor=0;t.inv=1.1;sound.play('armour',t.id===0?1:.4)}else{t.hp--;t.hits=t.maxHp-t.hp;t.inv=1.1;spark(t.x,t.y,'#ffb14a',18);if(t.hp<=0){t.alive=false;t.deadAt=performance.now();spark(t.x,t.y,colors[t.id],28)}}}}}}
function route(from,to){
 const start=cell(from.x,from.y),goal=cell(to.x,to.y);if(!inGrid(start.x,start.y)||!inGrid(goal.x,goal.y))return null;
 const key=(x,y)=>y*COLS+x,dist=new Map([[key(start.x,start.y),0]]),prev=new Map(),open=[[start.x,start.y,0]];let found=false;
 while(open.length){open.sort((a,b)=>b[2]-a[2]);const [x,y,cost]=open.pop(),k=key(x,y);if(cost!==dist.get(k))continue;if(x===goal.x&&y===goal.y){found=true;break}for(const[dx,dy]of dirs){const nx=x+dx,ny=y+dy;if(!inGrid(nx,ny)||grid[ny][nx]===2)continue;const n=key(nx,ny),next=cost+(grid[ny][nx]===1?7:1);if(next<(dist.get(n)??Infinity)){dist.set(n,next);prev.set(n,k);open.push([nx,ny,next])}}}
 if(!found)return null;let k=key(goal.x,goal.y),first=k;while(prev.has(k)){first=k;k=prev.get(k);if(k===key(start.x,start.y))return {x:first%COLS,y:Math.floor(first/COLS)}}return null;
}
function clearShot(t,o){const dx=o.x-t.x,dy=o.y-t.y;if(Math.abs(dx)>10&&Math.abs(dy)>10)return false;if(Math.hypot(dx,dy)>300)return false;const steps=Math.ceil(Math.hypot(dx,dy)/8);for(let i=1;i<steps;i++){const c=cell(t.x+dx*i/steps,t.y+dy*i/steps);if(blocked(c.x,c.y))return false}return true}
function ai(t,dt){
 t.ai-=dt;if(elapsed<2)return;
 const level=CPU_LEVELS[difficulty];
 if(t.ai<=0){t.ai=level.routeInterval;let target=null,best=Infinity;for(const o of [...tanks.filter(o=>o.alive&&o.id!==t.id),...pickups]){const d=Math.hypot(o.x-t.x,o.y-t.y)*(o.type?.75:1);if(d<best){best=d;target=o}}
 if(target){const own=cell(t.x,t.y),mid=center(own.x,own.y);t.waypoint=Math.hypot(t.x-mid.x,t.y-mid.y)>3?own:route(t,target)}else t.waypoint=null;
 }
 // Easy opponents expose a short recovery window after firing at the player.
 if(difficulty===0&&elapsed<t.recoverUntil)return;
 const player=tanks.filter(t=>t.alive&&humans.has(t.id)).sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y))[0]||tanks[0];
 const standOff=difficulty===0&&player.alive&&clearShot(t,player)&&Math.hypot(t.x-player.x,t.y-player.y)<=120;
 // Step away from nearby shells and fresh explosions instead of charging through them.
 const danger=shells.find(s=>Math.hypot(s.x-t.x,s.y-t.y)<95)||blasts.find(b=>b.cells.some(([x,y])=>Math.hypot(center(x,y).x-t.x,center(x,y).y-t.y)<70));
 if(danger!==t.threat){
  t.threat=danger;
  t.threatSince=elapsed;
 }
 // Give the player an opening without changing CPU-versus-CPU hazard reactions.
 const dodgeDelay=humans.has(danger?.owner)?level.dodgeDelay:0;
 if(danger&&elapsed-t.threatSince>=dodgeDelay){const options=dirs.map(([dx,dy])=>({dx,dy,x:t.x+dx*20,y:t.y+dy*20})).filter(p=>canMove(t,p.x,p.y));if(options.length){options.sort((a,b)=>Math.hypot(b.x-(danger.x??t.x),b.y-(danger.y??t.y))-Math.hypot(a.x-(danger.x??t.x),a.y-(danger.y??t.y)));move(t,options[0].dx,options[0].dy,dt);t.ai=0;t.aimTarget=null;return}}
 if(t.waypoint){const p=center(t.waypoint.x,t.waypoint.y),dx=p.x-t.x,dy=p.y-t.y;if(Math.hypot(dx,dy)<2){t.x=p.x;t.y=p.y;t.ai=0;t.waypoint=null}else if(grid[t.waypoint.y][t.waypoint.x]===1){t.a=Math.atan2(dy,dx);if(Math.hypot(dx,dy)>TILE*2.6)move(t,dx,dy,dt);else shoot(t)}else if(!standOff)move(t,dx,dy,dt)}
 const enemy=tanks.find(o=>o.alive&&o.id!==t.id&&clearShot(t,o));
 if(enemy!==t.aimTarget){
  t.aimTarget=enemy;
  t.aimSince=elapsed;
 }
 const aimDelay=humans.has(enemy?.id)?level.aimDelay:0;
 if(enemy&&t.cool<=0&&elapsed-t.aimSince>=aimDelay){
  t.a=Math.atan2(enemy.y-t.y,enemy.x-t.x);
  shoot(t);
  if(difficulty===0&&humans.has(enemy.id)&&t.cool>0)t.recoverUntil=elapsed+.85;
 }
}
// Resolve the newest steering event before a gesture-triggered shot, even between frames.
function update(dt){if(state!=='play')return;elapsed+=dt;const me=tanks[0];for(const t of tanks){t.cool=Math.max(0,t.cool-dt);t.inv=Math.max(0,t.inv-dt);if(humans.has(t.id)){const c=controls[t.id]||{};move(t,c.x||0,c.y||0,dt,true);if(c.fire)shoot(t)}else if(t.alive)ai(t,dt)}for(let i=shells.length-1;i>=0;i--){const s=shells[i];if(s.fuse!==undefined){s.fuse-=dt;if(s.fuse<=0){detonate(s);shells.splice(i,1)}continue}if(s.pendingImpact){delete s.pendingImpact;armShell(s);continue}const travelTime=Math.min(dt,Math.max(0,s.life));s.life-=dt;if(advanceShell(s,s.x+s.vx*travelTime,s.y+s.vy*travelTime)||s.life<=0)armShell(s)}

for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.life-=dt;for(const t of tanks)if(t.alive&&Math.hypot(t.x-p.x,t.y-p.y)<24){if(p.type==='range')t.range=Math.min(5,t.range+1);if(p.type==='speed')t.speed=Math.min(138,t.speed+10);if(p.type==='rapid')t.delay=Math.max(.34,t.delay-.08);if(p.type==='armor')t.armor=1;if(p.type==='multi')t.maxShells=Math.min(3,t.maxShells+1);p.life=0;sound.play('pickup',t.id===0?1:.3);spark(p.x,p.y,'#fff',12);break}if(p.life<=0)pickups.splice(i,1)}for(let i=blasts.length-1;i>=0;i--){blasts[i].t-=dt;if(blasts[i].t<=0)blasts.splice(i,1)}for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94;if(p.t<=0)particles.splice(i,1)}const alive=tanks.filter(t=>t.alive);if(alive.length<=1){roundEnd+=dt;if(roundEnd>1)state='end'}if(elapsed>=240)state='end';}

start();for(const t of tanks)if(humans.has(t.id)){t.hp=t.maxHp=4;t.armor=1}
return {step(dt){update(Math.min(.033,dt))},input(id,c){if(humans.has(id))controls[id]=c},drop(id){humans.delete(id);delete controls[id]},snapshot(){return {state,grid,tanks:tanks.map(({threat,aimTarget,...t})=>t),shells,blasts,pickups,elapsed,mapIndex}},debug(){return {tanks,grid,shells,detonate,center}}};}
