import {createBattle} from './engine.mjs';
export default {async fetch(request,env){
 const u=new URL(request.url);
 if(u.pathname==='/health')return Response.json({ok:true,game:'Blast Tanks',protocol:1},{headers:{'Access-Control-Allow-Origin':'*'}});
 if(u.pathname!=='/room')return new Response('Blast Tanks server • /health', {status:200});
 if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
 let code=u.searchParams.get('code');const create=!code;
 if(create){const bytes=crypto.getRandomValues(new Uint8Array(6));code=Array.from(bytes,n=>String.fromCharCode(65+n%26)).join('')}
 if(!/^[A-Z]{6}$/.test(code))return new Response('Invalid room code',{status:400});
 const target=new URL(request.url);target.searchParams.set('code',code);if(create)target.searchParams.set('create','1');else target.searchParams.delete('create');
 return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(target,request));
}};
export class BattleRoom {
 constructor(ctx,env){this.clients=new Map();this.host=null;this.battle=null;this.timer=null;this.seq=0;this.code='';this.created=Date.now();}
 async fetch(request){
  const u=new URL(request.url);this.code=u.searchParams.get('code');
  if(!this.clients.size&&u.searchParams.get('create')!=='1')return new Response('Room not found. Ask the host to create another.',{status:404});
  if(this.clients.size>=4)return new Response('Room full',{status:409});
  if(this.battle?.snapshot().state==='play')return new Response('Battle already started. Join after the round.',{status:409});
  const pair=new WebSocketPair(),client=pair[0],ws=pair[1];ws.accept();
  const id=[0,1,2,3].find(n=>![...this.clients.values()].some(p=>p.id===n));
  this.clients.set(ws,{id,input:{x:0,y:0,fire:false},at:Date.now(),window:Date.now(),count:0});if(this.host===null)this.host=id;
  ws.addEventListener('message',e=>this.message(ws,e.data));ws.addEventListener('close',()=>this.drop(ws));ws.addEventListener('error',()=>this.drop(ws));
  this.send(ws,{type:'welcome',id,code:this.code});this.lobby();
  return new Response(null,{status:101,webSocket:client});
 }
 send(ws,m){try{ws.send(JSON.stringify(m))}catch(_){this.drop(ws)}}
 broadcast(m){for(const ws of this.clients.keys())this.send(ws,m)}
 lobby(){this.broadcast({type:'lobby',code:this.code,host:this.host,players:[...this.clients.values()].map(p=>p.id)})}
 message(ws,raw){
  const p=this.clients.get(ws);if(!p)return;
  if(typeof raw!=='string'||raw.length>512){ws.close(1009,'Message too large');this.drop(ws);return}
  const now=Date.now();if(now-p.window>1000){p.window=now;p.count=0}if(++p.count>80){ws.close(1008,'Too many messages');this.drop(ws);return}
  let m;try{m=JSON.parse(raw)}catch(_){return}
  if(m?.type==='input'){if(![-1,0,1].includes(m.x)||![-1,0,1].includes(m.y)||typeof m.fire!=='boolean')return;p.input={x:m.x,y:m.y,fire:m.fire};p.at=now;return}
  if(m?.type==='start'){
   if(p.id!==this.host){this.send(ws,{type:'error',message:'Only the host can start a battle.'});return}
   if(this.battle?.snapshot().state==='play')return;
   if(this.clients.size<2){this.send(ws,{type:'error',message:'Two human players are needed. Share the room code with a friend.'});return}
   const map=Number.isInteger(m.map)&&m.map>=0&&m.map<4?m.map:0,level=Number.isInteger(m.difficulty)&&m.difficulty>=0&&m.difficulty<3?m.difficulty:1;
   for(const c of this.clients.values()){c.input={x:0,y:0,fire:false};c.at=now}
   this.battle=createBattle(map,level,[...this.clients.values()].map(c=>c.id));this.seq=0;this.snapshot();this.timer=setInterval(()=>this.tick(),30);
  }
 }
 tick(){if(!this.battle)return;const now=Date.now();for(const c of this.clients.values())this.battle.input(c.id,now-c.at<500?c.input:{x:0,y:0,fire:false});const before=this.battle.snapshot();const shots=before.shells.length,explosions=before.blasts.length;this.battle.step(.03);const after=this.battle.snapshot();this.shots=(this.shots||false)||after.shells.length>shots;this.explosions=(this.explosions||false)||after.blasts.length>explosions;if(++this.seq%2===0||after.state==='end')this.snapshot();if(after.state==='end'){clearInterval(this.timer);this.timer=null;this.lobby()}}
 snapshot(){this.broadcast({type:'state',...this.battle.snapshot(),seq:this.seq,shots:!!this.shots,explosions:!!this.explosions});this.shots=this.explosions=false}
 drop(ws){const p=this.clients.get(ws);if(!p)return;this.clients.delete(ws);this.battle?.drop(p.id);if(this.host===p.id)this.host=this.clients.values().next().value?.id??null;if(!this.clients.size){if(this.timer)clearInterval(this.timer);this.timer=null;this.battle=null}else this.lobby()}
}
