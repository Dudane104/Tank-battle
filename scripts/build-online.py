from pathlib import Path
s=Path('index.html').read_text()
core=s[s.index(' const cell='):s.index('function drawSprite')]
core=core.replace("if(net.active){onlineTick(dt);return}",'')
core=core[:core.index('function start()')]+"function start(){elapsed=0;buildMap();tanks=[[1,1],[26,1],[1,13],[26,13]].map((p,i)=>tank(i,...p));shells=[];blasts=[];pickups=[];particles=[];state='play'}\n"+core[core.index('function blocked'):]
core=core[:core.index('function playerDirection()')]+core[core.index('function update('):]
a=core.index("const me=tanks[0],direction=playerDirection()")
b=core.index('for(let i=shells.length-1;',a)
core=core[:a]+"const me=tanks[0];for(const t of tanks){t.cool=Math.max(0,t.cool-dt);t.inv=Math.max(0,t.inv-dt);if(humans.has(t.id)){const c=controls[t.id]||{};move(t,c.x||0,c.y||0,dt,true);if(c.fire)shoot(t)}else if(t.alive)ai(t,dt)}"+core[b:]
a=core.index('hud.textContent=');core=core[:a]+"if(alive.length<=1){roundEnd+=dt;if(roundEnd>1)state='end'}if(elapsed>=240)state='end';}\n"
core=core.replace("const player=tanks[0];", "const player=tanks.filter(t=>t.alive&&humans.has(t.id)).sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y))[0]||tanks[0];")
core=core.replace("danger?.owner===0", "humans.has(danger?.owner)").replace("enemy?.id===0", "humans.has(enemy?.id)").replace("enemy.id===0", "humans.has(enemy.id)")
prefix="""// Generated from index.html by scripts/build-online.py; do not edit independently.
export function createBattle(map=0,level=1,players=[0,1]){
const colors=['#ed5148','#4295ed','#57cc69','#f3cb45'];
const WORLD={w:1200,h:675},TILE=40,COLS=28,ROWS=15,OX=40,OY=37.5,dirs=[[1,0],[-1,0],[0,1],[0,-1]];
let state='play',grid=[],tanks=[],shells=[],blasts=[],pickups=[],particles=[],elapsed=0,roundEnd=0,terrainDirty=true,mapIndex=map,difficulty=level;
const humans=new Set(players),controls={},sound={play(){}},clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
"""
ending="""
start();for(const t of tanks)if(humans.has(t.id)){t.hp=t.maxHp=4;t.armor=1}
return {step(dt){update(Math.min(.033,dt))},input(id,c){if(humans.has(id))controls[id]=c},drop(id){humans.delete(id);delete controls[id]},snapshot(){return {state,grid,tanks:tanks.map(({threat,aimTarget,...t})=>t),shells,blasts,pickups,elapsed,mapIndex}},debug(){return {tanks,grid,shells,detonate,center}}};}
"""
Path('server/engine.mjs').write_text(prefix+core+ending)
