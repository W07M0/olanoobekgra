
const MINI_COOLDOWN=30000;
let activeMini=null,aimRunning=false,parkourRunning=false,reflexRunning=false,dodgeRunning=false;
let aimLoop=null,parkourFrame=null,dodgeFrame=null,reflexTimer=null;
let aimScore=0,aimHits=0,aimMisses=0,aimCombo=0,aimTimer=0,parkourData=null,reflexData=null,dodgeData=null;
let minigameBoards={aim:[],parkour:[],reflex:[],dodge:[]};

function miniReady(id){
 const left=Math.max(0,(state.minigameCooldowns[id]||0)-Date.now());
 if(left>0){toast(`Ta gra będzie gotowa za ${(left/1000).toFixed(1)} s`);return false}
 return true
}
function startMiniCooldown(id){
 state.minigameCooldowns[id]=Date.now()+MINI_COOLDOWN;
 save();renderMiniCooldowns()
}
function renderMiniCooldowns(){
 ['aim','parkour','reflex','dodge'].forEach(id=>{
  const left=Math.max(0,(state.minigameCooldowns[id]||0)-Date.now());
  const label=$('#cooldown-'+id),button=$(`[data-mini="${id}"]`);
  if(label)label.textContent=left>0?`Cooldown: ${(left/1000).toFixed(1)} s`:'Gotowa';
  if(button)button.disabled=left>0
 })
}
setInterval(renderMiniCooldowns,200);

function hideGames(){
 ['aimStage','parkourStage','reflexStage','dodgeStage'].forEach(id=>{$('#'+id)?.classList.add('hidden');$('#'+id)?.classList.remove('running')})
}
function stopAllMinigames(reward=false){
 if(aimRunning)stopAimGame(reward);
 if(parkourRunning)stopParkour(reward);
 if(reflexRunning)stopReflex(reward);
 if(dodgeRunning)stopDodge(reward)
}
function prepareMinigame(id,stage){
 if(!miniReady(id))return false;
 stopAllMinigames(false);hideGames();activeMini=id;
 const el=$('#'+stage);if(!el)return false;
 el.classList.remove('hidden');el.classList.add('running');
 return true
}
function miniGrade(normalized){
 if(normalized>=.92)return'S';
 if(normalized>=.78)return'A';
 if(normalized>=.62)return'B';
 if(normalized>=.42)return'C';
 return'D'
}
function miniRewards(normalized,rawScore){
 const quality=Math.max(.08,Math.min(1.15,normalized));
 const xp=Math.floor((35+quality*115)*expMultiplier());
 const points=Math.floor((150+quality*900)*Math.max(1,state.level*.35)*totalMultiplier()**.22);
 const gems=Math.max(1,Math.floor(1+quality*8*gemRewardMultiplier()));
 return{xp,points,gems}
}
function finishMini(id,title,displayScore,normalized,rawScore){
 startMiniCooldown(id);
 state.eventStats.minigames++;
 state.minigameRecords[id]=Math.max(state.minigameRecords[id]||0,rawScore);
 const rewards=miniRewards(normalized,rawScore);
 state.points+=rewards.points;state.gems+=rewards.gems;addXp(rewards.xp);grantPetXp(8+normalized*28);
 const grade=miniGrade(normalized);
 $('#miniGrade').textContent=grade;$('#miniGrade').className='mini-grade grade-'+grade.toLowerCase();
 $('#miniResultTitle').textContent=title;$('#miniResultScore').textContent=displayScore;
 $('#miniResultRewards').innerHTML=`<span>⭐ +${fmt(rewards.xp)} EXP</span><span>⚡ +${fmt(rewards.points)} punktów</span><span>💎 +${fmt(rewards.gems)}</span>`;
 $('#miniResultOverlay').classList.add('show');
 submitMinigameScore(id,rawScore);
 render();loadMinigameLeaderboards()
}

/* AIM LAB */
function moveAim(){
 if(!aimRunning)return;
 const f=$('#aimField'),t=$('#aimTarget'),rect=f.getBoundingClientRect();
 const fake=Math.random()<.18;
 t.textContent=fake?'FAKE':'NOOB';t.dataset.fake=fake?'1':'0';
 t.classList.toggle('fake',fake);
 const size=Math.max(34,68-aimHits*.45);
 t.style.width=size+'px';t.style.height=size+'px';
 t.style.left=Math.random()*Math.max(1,rect.width-size-8)+'px';
 t.style.top=Math.random()*Math.max(1,rect.height-size-8)+'px';
 t.style.setProperty('--tx',(Math.random()*60-30)+'px');
 t.style.setProperty('--ty',(Math.random()*45-22)+'px');
}
function updateAimHud(){
 const acc=aimHits+aimMisses?aimHits/(aimHits+aimMisses)*100:100;
 $('#aimScore').textContent=aimScore;$('#aimCombo').textContent=aimCombo;$('#aimAccuracy').textContent=acc.toFixed(1)+'%'
}
function startAimGame(){
 if(!prepareMinigame('aim','aimStage'))return;
 aimRunning=true;aimScore=0;aimHits=0;aimMisses=0;aimCombo=0;aimTimer=20;updateAimHud();moveAim();
 let last=performance.now();clearInterval(aimLoop);
 aimLoop=setInterval(()=>{const now=performance.now();aimTimer-=Math.min(.2,(now-last)/1000);last=now;$('#aimTime').textContent=Math.max(0,aimTimer).toFixed(1);if(aimTimer<=0)stopAimGame(true)},100)
}
function stopAimGame(reward=true){
 if(!aimRunning)return;aimRunning=false;clearInterval(aimLoop);$('#aimStage').classList.remove('running');
 if(!reward)return hideGames();
 const accuracy=aimHits+aimMisses?aimHits/(aimHits+aimMisses):0;
 const comboFactor=Math.min(1,aimCombo/25);
 const normalized=Math.min(1,accuracy*.78+comboFactor*.22);
 const raw=Math.round(accuracy*10000);
 state.aimBest=Math.max(state.aimBest,raw);
 finishMini('aim','Noob Aim Lab',`${(accuracy*100).toFixed(1)}% accuracy`,normalized,raw)
}
$('#aimTarget').onclick=e=>{
 e.stopPropagation();if(!aimRunning)return;
 const fake=e.currentTarget.dataset.fake==='1';
 if(fake){aimMisses++;aimCombo=0;sfx('bad')}else{aimHits++;aimCombo++;aimScore+=10+Math.min(40,aimCombo*2);sfx('click')}
 updateAimHud();moveAim()
};
$('#aimField').onclick=e=>{if(!aimRunning||e.target===$('#aimTarget'))return;aimMisses++;aimCombo=0;updateAimHud();sfx('bad')};

/* NOOB RIDER */
function startParkour(){
 if(!prepareMinigame('parkour','parkourStage'))return;
 const c=$('#parkourCanvas'),ctx=c.getContext('2d');
 parkourData={ctx,p:{x:110,y:245,w:62,h:52,vy:0},obs:[],pickups:[],score:0,bonus:0,speed:5,last:performance.now(),spawn:0};
 parkourRunning=true;parkourLoop()
}
function parkourJump(){if(parkourRunning&&parkourData&&parkourData.p.y>=244)parkourData.p.vy=-13.5}
function parkourLoop(){
 if(!parkourRunning)return;
 const d=parkourData,c=$('#parkourCanvas'),x=d.ctx,now=performance.now(),dt=Math.min(2,(now-d.last)/16.67);d.last=now;
 d.score+=d.speed*.09*dt;d.speed=5+Math.min(9,d.score/110);d.spawn-=dt;
 if(d.spawn<=0){
  const type=rand(['💩','📦','🧱','🌵']);
  d.obs.push({x:c.width+30,y:255,w:42,h:46,type});
  if(Math.random()<.35)d.pickups.push({x:c.width+100,y:180-Math.random()*80,r:20});
  d.spawn=Math.max(38,78-d.score/18)+Math.random()*26
 }
 d.p.vy+=.78*dt;d.p.y+=d.p.vy*dt;if(d.p.y>245){d.p.y=245;d.p.vy=0}
 d.obs.forEach(o=>o.x-=d.speed*dt);d.pickups.forEach(o=>o.x-=d.speed*dt);
 d.obs=d.obs.filter(o=>o.x>-80);d.pickups=d.pickups.filter(o=>o.x>-50);
 const p=d.p,hit=d.obs.some(o=>p.x<o.x+o.w&&p.x+p.w>o.x&&p.y<o.y+o.h&&p.y+p.h>o.y);
 d.pickups=d.pickups.filter(o=>{const got=p.x<o.x+o.r&&p.x+p.w>o.x-o.r&&p.y<o.y+o.r&&p.y+p.h>o.y-o.r;if(got){d.bonus+=12;sfx('good')}return!got});
 x.clearRect(0,0,c.width,c.height);
 const g=x.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#30145d');g.addColorStop(1,'#ff73c4');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
 x.fillStyle='#4a194f';x.fillRect(0,300,c.width,30);
 x.font='36px Arial';x.fillText('🛒',p.x,p.y+38);x.font='26px Arial';x.fillText('😎',p.x+15,p.y+12);
 d.obs.forEach(o=>{x.font='38px Arial';x.fillText(o.type,o.x,o.y+40)});
 d.pickups.forEach(o=>{x.font='30px Arial';x.fillText('⭐',o.x-15,o.y+12)});
 $('#parkourScore').textContent=Math.floor(d.score+d.bonus);$('#parkourSpeed').textContent=(d.speed/5).toFixed(1);
 if(hit){stopParkour(true);return}
 parkourFrame=requestAnimationFrame(parkourLoop)
}
function stopParkour(reward=true){
 if(!parkourRunning)return;parkourRunning=false;cancelAnimationFrame(parkourFrame);$('#parkourStage').classList.remove('running');
 if(!reward){parkourData=null;return hideGames()}
 const score=Math.floor((parkourData?.score||0)+(parkourData?.bonus||0));parkourData=null;
 state.parkourBest=Math.max(state.parkourBest,score);
 finishMini('parkour','Noob Rider',score+' m',Math.min(1,score/420),score)
}
$('#parkourCanvas')?.addEventListener('pointerdown',e=>{e.preventDefault();parkourJump()});

/* REFLEX */
const reflexKeys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
const reflexIcons={ArrowUp:'⬆️',ArrowDown:'⬇️',ArrowLeft:'⬅️',ArrowRight:'➡️'};
function nextReflex(){
 if(!reflexRunning)return;
 reflexData.key=rand(reflexKeys);reflexData.deadline=performance.now()+Math.max(380,1050-reflexData.score*9);
 $('#reflexKey').textContent=reflexIcons[reflexData.key];$('#reflexKey').classList.remove('pop');void $('#reflexKey').offsetWidth;$('#reflexKey').classList.add('pop')
}
function startReflex(){
 if(!prepareMinigame('reflex','reflexStage'))return;
 reflexRunning=true;reflexData={score:0,combo:0,misses:0,time:20,key:null,deadline:0,last:performance.now()};nextReflex();
 clearInterval(reflexTimer);reflexTimer=setInterval(()=>{
  if(!reflexRunning)return;
  const now=performance.now(),dt=(now-reflexData.last)/1000;reflexData.last=now;reflexData.time-=dt;
  if(now>reflexData.deadline){reflexData.misses++;reflexData.combo=0;sfx('bad');nextReflex()}
  $('#reflexScore').textContent=reflexData.score;$('#reflexCombo').textContent=reflexData.combo;$('#reflexTime').textContent=Math.max(0,reflexData.time).toFixed(1);
  if(reflexData.time<=0)stopReflex(true)
 },50)
}
function reflexInput(code){
 if(!reflexRunning||!reflexData)return false;
 if(!reflexKeys.includes(code))return false;
 if(code===reflexData.key){const reaction=Math.max(0,reflexData.deadline-performance.now());reflexData.combo++;reflexData.score+=10+Math.floor(reaction/70)+Math.min(20,reflexData.combo);sfx('click')}
 else{reflexData.misses++;reflexData.combo=0;sfx('bad')}
 nextReflex();return true
}
function stopReflex(reward=true){
 if(!reflexRunning)return;reflexRunning=false;clearInterval(reflexTimer);$('#reflexStage').classList.remove('running');
 if(!reward){reflexData=null;return hideGames()}
 const score=reflexData.score,attempts=score/10+reflexData.misses;
 const normalized=Math.min(1,score/650);reflexData=null;
 state.reflexBest=Math.max(state.reflexBest,score);finishMini('reflex','Noob Reflex',score+' pkt',normalized,score)
}

/* DODGE */
function startDodge(){
 if(!prepareMinigame('dodge','dodgeStage'))return;
 const c=$('#dodgeCanvas'),ctx=c.getContext('2d');
 dodgeData={ctx,p:{x:c.width/2,y:350,w:52,h:52,v:0},items:[],score:0,lives:3,time:25,last:performance.now(),spawn:0,left:false,right:false};
 dodgeRunning=true;dodgeLoop()
}
function dodgeLoop(){
 if(!dodgeRunning)return;
 const d=dodgeData,c=$('#dodgeCanvas'),x=d.ctx,now=performance.now(),dt=Math.min(2,(now-d.last)/16.67);d.last=now;
 d.time-=dt/60;d.score+=.11*dt;d.spawn-=dt;
 if(d.spawn<=0){d.items.push({x:30+Math.random()*(c.width-60),y:-30,vy:3.5+Math.random()*3,type:Math.random()<.16?'gold':'bad',emoji:Math.random()<.16?'⭐':rand(['💀','🍌','🧻','🧠','🥔'])});d.spawn=Math.max(10,28-d.score/20)}
 if(d.left)d.p.x-=8*dt;if(d.right)d.p.x+=8*dt;d.p.x=Math.max(0,Math.min(c.width-d.p.w,d.p.x));
 d.items.forEach(o=>o.y+=o.vy*dt);
 d.items=d.items.filter(o=>{const hit=d.p.x<o.x+32&&d.p.x+d.p.w>o.x&&d.p.y<o.y+32&&d.p.y+d.p.h>o.y;if(hit){if(o.type==='gold'){d.score+=25;sfx('good')}else{d.lives--;sfx('bad')}return false}return o.y<c.height+50});
 x.clearRect(0,0,c.width,c.height);const g=x.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#0c173c');g.addColorStop(1,'#62175d');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
 x.font='44px Arial';x.fillText('🛡️',d.p.x,d.p.y+42);d.items.forEach(o=>{x.font='34px Arial';x.fillText(o.emoji,o.x,o.y)});
 $('#dodgeScore').textContent=Math.floor(d.score);$('#dodgeLives').textContent=d.lives;$('#dodgeTime').textContent=Math.max(0,d.time).toFixed(1);
 if(d.lives<=0||d.time<=0){stopDodge(true);return}
 dodgeFrame=requestAnimationFrame(dodgeLoop)
}
function stopDodge(reward=true){
 if(!dodgeRunning)return;dodgeRunning=false;cancelAnimationFrame(dodgeFrame);$('#dodgeStage').classList.remove('running');
 if(!reward){dodgeData=null;return hideGames()}
 const score=Math.floor(dodgeData.score),normalized=Math.min(1,score/250);dodgeData=null;
 state.dodgeBest=Math.max(state.dodgeBest,score);finishMini('dodge','Brainrot Dodge',score+' pkt',normalized,score)
}
const dodgeKeys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
document.addEventListener('keydown',e=>{
 if(reflexInput(e.code)){e.preventDefault();return}
 if(dodgeRunning&&dodgeKeys[e.code]){dodgeData[dodgeKeys[e.code]]=true;e.preventDefault()}
});
document.addEventListener('keyup',e=>{if(dodgeRunning&&dodgeKeys[e.code])dodgeData[dodgeKeys[e.code]]=false});
$('#dodgeCanvas')?.addEventListener('pointerdown',e=>{if(!dodgeData)return;const r=e.currentTarget.getBoundingClientRect();dodgeData.left=e.clientX-r.left<r.width/2;dodgeData.right=!dodgeData.left});
$('#dodgeCanvas')?.addEventListener('pointerup',()=>{if(dodgeData){dodgeData.left=false;dodgeData.right=false}});

async function submitMinigameScore(game,score){
 if(!db||!state.playerName)return;
 const {error}=await db.rpc('submit_minigame_score',{p_player_id:playerId,p_player_name:state.playerName,p_game:game,p_score:Math.floor(score)});
 if(error)console.warn('Minigame ranking:',error.message)
}
async function loadMinigameLeaderboards(){
 const box=$('#minigameLeaderboards');if(!box)return;
 const names={aim:'🎯 Aim Accuracy',parkour:'🛒 Noob Rider',reflex:'⚡ Reflex',dodge:'🧠 Dodge'};
 if(db){
  for(const game of Object.keys(names)){
   const {data,error}=await db.from('minigame_scores').select('player_name,score').eq('game',game).order('score',{ascending:false}).limit(3);
   if(!error)minigameBoards[game]=data||[]
  }
 }
 box.innerHTML=Object.entries(names).map(([game,name])=>`<div class="mini-board"><h3>${name}</h3>${(minigameBoards[game]||[]).map((r,i)=>`<div><b>${i+1}.</b><span>${safeText(r.player_name)}</span><strong>${game==='aim'?(r.score/100).toFixed(1)+'%':fmt(r.score)}</strong></div>`).join('')||'<p class="muted">Brak wyników</p>'}<small>Twój rekord: ${game==='aim'?((state.minigameRecords.aim||0)/100).toFixed(1)+'%':fmt(state.minigameRecords[game]||0)}</small></div>`).join('')
}
if($('#miniResultClose'))$('#miniResultClose').onclick=()=>{$('#miniResultOverlay')?.classList.remove('show');hideGames()};
renderMiniCooldowns();


/* Explicit public API — avoids missing globals after cache/deployment issues. */
Object.assign(window,{
 renderMiniCooldowns,
 startAimGame,stopAimGame,
 startParkour,stopParkour,parkourJump,
 startReflex,stopReflex,
 startDodge,stopDodge,
 stopAllMinigames,hideGames,
 loadMinigameLeaderboards,
 submitMinigameScore
});
window.__ARCADE_V06_READY__=true;
