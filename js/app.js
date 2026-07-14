

function scrollToActiveMinigame(stageId){
 requestAnimationFrame(()=>{
  requestAnimationFrame(()=>{
   const stage=$('#'+stageId);
   if(stage){
    stage.scrollIntoView({behavior:'smooth',block:'center'});
    stage.classList.add('stage-focus');
    setTimeout(()=>stage.classList.remove('stage-focus'),900)
   }
  })
 })
}
function scrollToArcadeTop(){
 requestAnimationFrame(()=>{
  $('#view-minigames .arcade-grid')?.scrollIntoView({behavior:'smooth',block:'start'})
 })
}

/* Embedded v0.6 minigames — independent from minigames.js loading */
(function(){

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
 const coins=Math.max(1,Math.floor((2+quality*10)*coinRewardMultiplier()));
 return{xp,points,gems,coins}
}
function finishMini(id,title,displayScore,normalized,rawScore){
 startMiniCooldown(id);
 state.eventStats.minigames++;
 state.minigameRecords[id]=Math.max(state.minigameRecords[id]||0,rawScore);
 const rewards=miniRewards(normalized,rawScore);
 state.points+=rewards.points;
 state.gems+=rewards.gems;
 state.coins+=rewards.coins;
 addXp(rewards.xp);
 grantPetXp(8+normalized*28);
 const grade=miniGrade(normalized);
 $('#miniGrade').textContent=grade;$('#miniGrade').className='mini-grade grade-'+grade.toLowerCase();
 $('#miniResultTitle').textContent=title;$('#miniResultScore').textContent=displayScore;
 $('#miniResultRewards').innerHTML=`<span>⭐ +${fmt(rewards.xp)} EXP</span><span>⚡ +${fmt(rewards.points)} punktów</span><span>💎 +${fmt(rewards.gems)}</span><span>🟡 +${fmt(rewards.coins)} Noob Coinów</span>`;
 $('#miniResultOverlay').classList.add('show');
 submitMinigameScore(id,rawScore);
 render();loadMinigameLeaderboards()
}

/* AIM LAB */
let aimTargetTimeout=null;
let aimMoveFrame=null;
function moveAim(){
 if(!aimRunning)return;
 const field=$('#aimField'),target=$('#aimTarget');if(!field||!target)return;
 clearTimeout(aimTargetTimeout);cancelAnimationFrame(aimMoveFrame);
 const rect=field.getBoundingClientRect(),fake=Math.random()<.20,moving=Math.random()<.38;
 target.dataset.fake=fake?'1':'0';target.dataset.moving=moving?'1':'0';
 target.classList.toggle('fake',fake);target.classList.toggle('moving',moving);
 target.innerHTML=fake?'<span>NOOB</span><small>?</small>':'<span>NOOB</span>';
 const size=Math.max(40,68-aimHits*.28),maxX=Math.max(1,rect.width-size-10),maxY=Math.max(1,rect.height-size-10);
 let x=Math.random()*maxX,y=Math.random()*maxY;target.style.width=size+'px';target.style.height=size+'px';target.style.left=x+'px';target.style.top=y+'px';
 if(moving){
  const speed=40+Math.min(55,aimHits*1.1),angle=Math.random()*Math.PI*2;let vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed,last=performance.now();
  const animate=now=>{if(!aimRunning||target.dataset.moving!=='1')return;const dt=Math.min(.03,(now-last)/1000);last=now;x+=vx*dt;y+=vy*dt;
   if(x<=0||x>=maxX){vx*=-1;x=Math.max(0,Math.min(maxX,x))}if(y<=0||y>=maxY){vy*=-1;y=Math.max(0,Math.min(maxY,y))}
   target.style.left=x+'px';target.style.top=y+'px';aimMoveFrame=requestAnimationFrame(animate)};
  aimMoveFrame=requestAnimationFrame(animate)
 }
 const lifetime=1150;
 aimTargetTimeout=setTimeout(()=>{if(!aimRunning)return;cancelAnimationFrame(aimMoveFrame);if(!fake){aimMisses++;aimCombo=0;updateAimHud();sfx('bad')}moveAim()},lifetime)
}
function updateAimHud(){
 const acc=aimHits+aimMisses?aimHits/(aimHits+aimMisses)*100:100;
 $('#aimScore').textContent=aimScore;$('#aimCombo').textContent=aimCombo;$('#aimAccuracy').textContent=acc.toFixed(1)+'%'
}
function startAimGame(){
 if(!prepareMinigame('aim','aimStage'))return;scrollToActiveMinigame('aimStage');
 aimRunning=true;aimScore=0;aimHits=0;aimMisses=0;aimCombo=0;aimTimer=20;updateAimHud();moveAim();
 let last=performance.now();clearInterval(aimLoop);
 aimLoop=setInterval(()=>{const now=performance.now();aimTimer-=Math.min(.2,(now-last)/1000);last=now;$('#aimTime').textContent=Math.max(0,aimTimer).toFixed(1);if(aimTimer<=0)stopAimGame(true)},100)
}
function stopAimGame(reward=true){
 if(!aimRunning)return;aimRunning=false;clearInterval(aimLoop);clearTimeout(aimTargetTimeout);cancelAnimationFrame(aimMoveFrame);$('#aimStage').classList.remove('running');
 if(!reward)return hideGames();
 const accuracy=aimHits+aimMisses?aimHits/(aimHits+aimMisses):0;
 const comboFactor=Math.min(1,aimCombo/25);
 const normalized=Math.min(1,accuracy*.72+comboFactor*.28);
 const raw=Math.round(accuracy*10000);
 state.aimBest=Math.max(state.aimBest,raw);
 finishMini('aim','Noob Aim Lab',`${(accuracy*100).toFixed(1)}% accuracy`,normalized,raw)
}
if($('#aimTarget'))$('#aimTarget').onclick=e=>{
 e.stopPropagation();if(!aimRunning)return;
 const fake=e.currentTarget.dataset.fake==='1';
 if(fake){
  aimMisses++;
  aimCombo=0;
  aimScore=Math.max(0,aimScore-12);
  sfx('bad')
 }else{
  aimHits++;
  aimCombo++;
  aimScore+=10+Math.min(40,aimCombo*2);
  sfx('click')
 }
 updateAimHud();
 moveAim()
};
if($('#aimField'))$('#aimField').onclick=e=>{if(!aimRunning||e.target===$('#aimTarget'))return;aimMisses++;aimCombo=0;updateAimHud();sfx('bad')};

/* NOOB RIDER */
function startParkour(){
 if(!prepareMinigame('parkour','parkourStage'))return;scrollToActiveMinigame('parkourStage');
 const c=$('#parkourCanvas'),ctx=c.getContext('2d');
 parkourData={ctx,p:{x:110,y:245,w:62,h:52,vy:0},obs:[],pickups:[],score:0,bonus:0,speed:5,last:performance.now(),spawn:0};
 parkourRunning=true;parkourLoop()
}
function parkourJump(){if(parkourRunning&&parkourData&&parkourData.p.y>=238)parkourData.p.vy=-13.5}
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


if(!window.__parkourSpaceBound){window.__parkourSpaceBound=true;document.addEventListener('keydown',event=>{
 if(event.code==='Space'&&parkourRunning){
  event.preventDefault();
  if(!event.repeat)parkourJump()
 }
},{capture:true});}

/* REFLEX */
const reflexKeys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
const reflexIcons={ArrowUp:'⬆️',ArrowDown:'⬇️',ArrowLeft:'⬅️',ArrowRight:'➡️'};
function nextReflex(){
 if(!reflexRunning||!reflexData)return;
 reflexData.key=rand(reflexKeys);
 reflexData.accepted=false;
 // Wolniejszy i stabilniejszy timing.
 const windowMs=Math.max(820,1650-reflexData.score*1.7);
 reflexData.deadline=performance.now()+windowMs;
 const keyEl=$('#reflexKey');
 if(keyEl){
  keyEl.textContent=reflexIcons[reflexData.key];
  keyEl.classList.remove('pop');
  void keyEl.offsetWidth;
  keyEl.classList.add('pop')
 }
}
function startReflex(){
 if(!prepareMinigame('reflex','reflexStage'))return;scrollToActiveMinigame('reflexStage');
 reflexRunning=true;reflexData={score:0,combo:0,misses:0,time:20,key:null,deadline:0,last:performance.now()};nextReflex();
 clearInterval(reflexTimer);reflexTimer=setInterval(()=>{
  if(!reflexRunning)return;
  const now=performance.now(),dt=(now-reflexData.last)/1000;reflexData.last=now;reflexData.time-=dt;
  if(now>reflexData.deadline&&!reflexData.accepted){
   reflexData.accepted=true;
   reflexData.misses++;
   reflexData.combo=0;
   sfx('bad');
   nextReflex()
  }
  $('#reflexScore').textContent=reflexData.score;$('#reflexCombo').textContent=reflexData.combo;$('#reflexTime').textContent=Math.max(0,reflexData.time).toFixed(1);
  if(reflexData.time<=0)stopReflex(true)
 },50)
}
function reflexInput(code){
 if(!reflexRunning||!reflexData)return false;
 if(!reflexKeys.includes(code))return false;
 if(reflexData.accepted)return true;

 reflexData.accepted=true;
 if(code===reflexData.key){
  const reaction=Math.max(0,reflexData.deadline-performance.now());
  reflexData.combo++;
  reflexData.score+=10+Math.floor(reaction/120)+Math.min(15,reflexData.combo);
  sfx('click')
 }else{
  reflexData.misses++;
  reflexData.combo=0;
  sfx('bad')
 }
 nextReflex();
 return true
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
 if(!prepareMinigame('dodge','dodgeStage'))return;scrollToActiveMinigame('dodgeStage');
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
if($('#miniResultClose'))if($('#miniResultClose'))$('#miniResultClose').onclick=()=>{$('#miniResultOverlay')?.classList.remove('show');hideGames();scrollToArcadeTop()};
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







Object.assign(window,{
 startAimGame,stopAimGame,
 startParkour,stopParkour,parkourJump,
 startReflex,stopReflex,
 startDodge,stopDodge,
 renderMiniCooldowns,
 loadMinigameLeaderboards,
 stopAllMinigames,hideGames
});
window.__MINIGAMES_V06_READY__=true;
})();


function showView(id){
 const anyMiniRunning =
  (typeof aimRunning!=='undefined'&&aimRunning) ||
  (typeof parkourRunning!=='undefined'&&parkourRunning) ||
  (typeof reflexRunning!=='undefined'&&reflexRunning) ||
  (typeof dodgeRunning!=='undefined'&&dodgeRunning);

 if(id!=='minigames'&&anyMiniRunning){
  try{stopAllMinigames(false);hideGames()}catch(error){console.error(error)}
 }

 if(!featureUnlocked(id)){
  toast(lockedFeatureMessage(id));
  renderFeatureLocks();
  return
 }

 $$('.view').forEach(view=>view.classList.toggle('active',view.id==='view-'+id));
 $$('.nav-btn').forEach(button=>button.classList.toggle('active',button.dataset.view===id));
 scrollTo({top:0,behavior:'smooth'});
 render()
}

function bindClick(selector,handler){
 const element=$(selector);
 if(element)element.onclick=handler
}
function bindInput(selector,handler){
 const element=$(selector);
 if(element)element.oninput=handler
}

$$('.nav-btn').forEach(button=>{
 button.onclick=()=>showView(button.dataset.view)
});


/* Explicit v0.6 minigame button bindings */
bindClick('#playAim',()=>window.startAimGame?.());
bindClick('#playParkour',()=>window.startParkour?.());
bindClick('#playReflex',()=>window.startReflex?.());
bindClick('#playDodge',()=>window.startDodge?.());
bindClick('#refreshMiniBoards',()=>window.loadMinigameLeaderboards?.());
bindClick('#stopAim',()=>window.stopAimGame?.(false));
bindClick('#stopParkourBtn',()=>window.stopParkour?.(false));
bindClick('#stopReflexBtn',()=>window.stopReflex?.(false));
bindClick('#stopDodgeBtn',()=>window.stopDodge?.(false));

/* Główna gra */
bindClick('#clicker',doClick);
bindClick('#quickClick',()=>quickBuy('click'));
bindClick('#quickAuto',()=>quickBuy('auto'));
bindClick('#rebirthBtn',rebirth);
bindClick('#dailyBtn',claimDaily);
bindClick('#challengeBossBtn',spawnWorldBoss);
bindClick('#bossResultClose',()=>$('#bossResultOverlay')?.classList.remove('show'));

/* Pety i skiny */
bindClick('#openCrate',openCrate);
bindClick('#crateClose',()=>{
 $('#crateOverlay')?.classList.remove('show');
 const egg=$('#petEgg'),glow=$('#eggGlow');
 if(egg){egg.className='pet-egg';egg.innerHTML='<span>?</span>'}
 glow?.classList.remove('show')
});
bindClick('#openGoldCrate',openGoldCase);
bindClick('#goldClose',()=>{
 const close=$('#goldClose');
 if(close?.dataset.skin)state.activeSkin=close.dataset.skin;
 $('#goldCrateOverlay')?.classList.remove('show');
 render()
});

/* Kasyno v0.6 */
bindClick('#unlockCasino',unlockCasino);
bindClick('#spinSlots',spinSlots);
bindClick('#spinFortune',spinFortune);
bindClick('#claimCasinoSupply',claimCasinoSupply);
bindClick('#confirmExchange',confirmExchange);

$$('[data-roulette]').forEach(button=>{
 button.onclick=()=>playRoulette(button.dataset.roulette)
});
$$('[data-higher]').forEach(button=>{
 button.onclick=()=>playHigherLower(button.dataset.higher==='true')
});
$$('[data-bet]').forEach(button=>{
 button.onclick=()=>{
  casinoBet=Number(button.dataset.bet);
  $$('[data-bet]').forEach(x=>x.classList.toggle('active',x===button));
  renderCasino()
 }
});
$$('[data-casino-tab]').forEach(button=>{
 button.onclick=()=>{
  $$('[data-casino-tab]').forEach(x=>x.classList.toggle('active',x===button));
  $$('.casino-panel').forEach(panel=>panel.classList.toggle('active',panel.id==='casino-'+button.dataset.casinoTab));
  renderCasino()
 }
});
$$('[data-exchange]').forEach(button=>{
 button.onclick=()=>{
  exchangeCurrency=button.dataset.exchange;
  $$('[data-exchange]').forEach(x=>x.classList.toggle('active',x===button));
  updateExchangePreview()
 }
});



const exchangeInput=$('#exchangeAmountInput');
if(exchangeInput){
 exchangeInput.addEventListener('input',updateExchangePreview);
 exchangeInput.addEventListener('change',updateExchangePreview)
}
bindClick('#exchangeMax',setExchangeMaximum);
$$('[data-exchange-percent]').forEach(button=>{
 button.onclick=()=>setExchangePercent(Number(button.dataset.exchangePercent))
});

/* Feedback i diagnostyka */
bindClick('#clearDiagnostics',clearDiagnostics);
bindClick('#sendFeedback',sendFeedback);
bindClick('#refreshFeedback',loadFeedback);
bindInput('#feedbackText',event=>{
 const counter=$('#feedbackCount');
 if(counter)counter.textContent=event.target.value.length
});
if($('#feedbackName')){
 $('#feedbackName').value=state.playerName||$('#playerName')?.value||'Gracz'
}

/* Dźwięk */
bindClick('#soundBtn',()=>{state.sound=!state.sound;render()});
bindClick('#musicBtn',()=>setMusic(!state.music));

/* Rankingi główne */
$$('[data-board]').forEach(button=>{
 button.onclick=()=>{
  boardMode=button.dataset.board;
  $$('[data-board]').forEach(x=>x.classList.toggle('active',x===button));
  loadBoard()
 }
});

/* Klawiatura */
function isTypingElement(element){
 return !!element&&(
  ['INPUT','TEXTAREA','SELECT'].includes(element.tagName) ||
  element.isContentEditable ||
  element.closest?.('[contenteditable="true"]')
 )
}
document.addEventListener('keydown',event=>{
 if(isTypingElement(document.activeElement))return;

 const anyMiniRunning =
  (typeof aimRunning!=='undefined'&&aimRunning) ||
  (typeof parkourRunning!=='undefined'&&parkourRunning) ||
  (typeof reflexRunning!=='undefined'&&reflexRunning) ||
  (typeof dodgeRunning!=='undefined'&&dodgeRunning);

 if(event.code==='Escape'&&anyMiniRunning){
  event.preventDefault();
  stopAllMinigames(false);
  hideGames();
  return
 }

 if(event.code==='Space'&&typeof parkourRunning!=='undefined'&&parkourRunning){
  event.preventDefault();
  if(!event.repeat)parkourJump();
  return
 }

 if((event.code==='Space'||event.code==='Enter')&&!event.repeat&&$('#view-game')?.classList.contains('active')){
  event.preventDefault();
  doClick()
 }
});

/* Timery gry */
setInterval(()=>{
 state.playSeconds++;
 state.lastSeen=Date.now();

 if(state.auto>0){
  state.points+=pps();
  addXp(Math.max(1,Math.floor(state.auto/3)))
 }

 if(state.playSeconds%10===0)render();
 else{
  renderHud();
  save()
 }
},1000);

setInterval(()=>{try{tickEvent()}catch(error){console.error('Event:',error)}},1000);
setInterval(()=>{try{loadBoard()}catch(error){console.error('Ranking:',error)}},30000);

/* Start */
try{applyOfflineEarnings()}catch(error){console.error('Offline:',error)}
if(state.music)try{setMusic(true)}catch(error){console.error(error)}

try{render()}catch(error){
 console.error('Pierwszy render:',error);
 saveDiagnostic?.('Startup render',error.message,error.stack||'')
}
try{loadBoard()}catch(error){console.error(error)}
try{loadFeedback()}catch(error){console.error(error)}
try{tickEvent()}catch(error){console.error(error)}

if(typeof worldProgressWasReset!=='undefined'&&worldProgressWasReset){
 setTimeout(()=>toast('🌍 Postęp światów został zresetowany. Reszta zapisu została zachowana.'),700)
}

/* Profil i admin */
try{bindProfileSettings()}catch(error){console.error('Profil bindings:',error)}
try{bindAdminPanel()}catch(error){console.error('Admin bindings:',error)}
try{renderProfileSettings()}catch(error){console.error('Profil render:',error)}
try{refreshAdminSession()}catch(error){console.error('Admin session:',error)}

profileAutoTimer=setInterval(()=>{
 try{automaticLeaderboardSave()}catch(error){console.error(error)}
},45000);

document.addEventListener('visibilitychange',()=>{
 if(document.hidden){
  try{automaticLeaderboardSave()}catch(error){console.error(error)}
 }
});

/* Minigry i kasyno */
if(typeof startAimGame!=='function'){
 console.error('Minigames module did not load: js/minigames.js');
 saveDiagnostic?.('Minigry','Nie załadowano js/minigames.js','Sprawdź, czy plik istnieje w repozytorium.');
}

if(typeof loadMinigameLeaderboards==='function'){try{loadMinigameLeaderboards()}catch(error){console.error('Minigame boards:',error)}}
if(typeof renderMiniCooldowns==='function'){try{renderMiniCooldowns()}catch(error){console.error('Cooldowns:',error)}}
try{renderCasino()}catch(error){console.error('Casino:',error)}

if(!window.__v06UiTimer){
 window.__v06UiTimer=setInterval(()=>{
  try{renderCasino()}catch(error){console.error('Casino render:',error)}
  if(typeof renderMiniCooldowns==='function'){try{renderMiniCooldowns()}catch(error){console.error('Minigame cooldowns:',error)}}
 },1000)
}
