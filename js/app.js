function ensureAchievementStats(){
 state.achievementStats={arcadePlayed:0,casinoPlayed:0,casinoWins:0,maxCasinoChips:0,chipsToGems:0,chipsToCoins:0,portals:0,hospitals:0,aimTrueStreak:0,aimBestTrueStreak:0,reflexPerfectRun:false,dodgeNoLifeLost:false,...(state.achievementStats||{})}
}
ensureAchievementStats();



function scrollToActiveMinigame(stageId){
 requestAnimationFrame(()=>{
  requestAnimationFrame(()=>{
   const stage=$('#'+stageId);
   if(stage){
    stage.scrollIntoView({behavior:'smooth',block:'center'});
    stage.classList.add('stage-focus');
    setTimeout(()=>{stage.focus({preventScroll:true});stage.classList.remove('stage-focus')},450)
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
let aimScore=0,aimHits=0,aimMisses=0,aimCombo=0,aimTimer=0,aimStartedAt=0,parkourData=null,reflexData=null,dodgeData=null;
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
  if(label)label.textContent=left>0?`Cooldown: ${Math.ceil(left/1000)} s`:'Gotowa';
  if(button)button.disabled=left>0
 })
}
setInterval(renderMiniCooldowns,200);
setInterval(()=>{
 const box=$('#arcadeCycleStatus');if(!box)return;
 ensureArcadeCycle();
 const marks=id=>state.arcadeCycle[id]?'☑':'☐';
 const left=Math.max(0,(state.arcadeBuffUntil||0)-Date.now());
 box.textContent=left>0?`Aktywny buff x1.15 • ${Math.ceil(left/60000)} min`:`Aim ${marks('aim')} • Rider ${marks('parkour')} • Reflex ${marks('reflex')} • Dodge ${marks('dodge')}`
},500);

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

function ensureArcadeCycle(){
 state.arcadeCycle={aim:false,parkour:false,reflex:false,dodge:false,...(state.arcadeCycle||{})};
 state.arcadeBuffUntil=Math.max(0,Number(state.arcadeBuffUntil)||0)
}
ensureArcadeCycle();

function arcadeBuffActive(){
 return Date.now()<(state.arcadeBuffUntil||0)
}
function arcadeRewardMultiplier(){
 return arcadeBuffActive()?1.15:1
}
function registerArcadeCompletion(game){
 ensureArcadeCycle();
 state.arcadeCycle[game]=true;
 const completed=['aim','parkour','reflex','dodge'].every(id=>state.arcadeCycle[id]);
 if(completed){
  state.arcadeBuffUntil=Date.now()+3*60*60*1000;
  state.arcadeCycle={aim:false,parkour:false,reflex:false,dodge:false};
  toast('🏆 Arcade Mastery: x1.15 nagród przez 3 godziny!');
  confetti();
  sfx('good')
 }
 save()
}

function miniGrade(normalized){
 if(normalized>=.97)return'SSS';
 if(normalized>=.91)return'SS';
 if(normalized>=.83)return'S';
 if(normalized>=.72)return'A';
 if(normalized>=.58)return'B';
 if(normalized>=.42)return'C';
 return'D'
}

const MINI_ACTIVITY_RULES={
 aim:{
  minSeconds:5,
  validate:a=>(a.actions||0)>=4
 },
 parkour:{
  minSeconds:6,
  validate:a=>(a.score||0)>=100
 },
 reflex:{
  minSeconds:7,
  validate:a=>(a.actions||0)>=3
 },
 dodge:{
  minSeconds:7,
  validate:a=>(a.score||0)>=8
 }
};

function validateMiniActivity(id,activity={}){
 const rule=MINI_ACTIVITY_RULES[id];
 if(!rule)return{valid:true};

 const seconds=Math.max(0,Number(activity.seconds)||0);
 if(seconds<rule.minSeconds){
  return{
   valid:false,
   reason:`Zagraj co najmniej ${rule.minSeconds} sekund.`
  }
 }

 if(!rule.validate(activity)){
  const messages={
   aim:'Traf lub spróbuj trafić co najmniej 4 cele.',
   parkour:'Przejedź co najmniej 100 metrów.',
   reflex:'Zareaguj na co najmniej 3 nuty.',
   dodge:'Przetrwaj trochę dłużej i zdobądź minimum 8 punktów.'
  };
  return{valid:false,reason:messages[id]||'Wykonaj więcej akcji w minigrze.'}
 }

 return{valid:true}
}

function showMiniNoReward(id,title,displayScore,reason){
 const grade=$('#miniGrade');
 if(grade){
  grade.textContent='—';
  grade.className='mini-grade grade-d'
 }
 const titleBox=$('#miniResultTitle');
 const scoreBox=$('#miniResultScore');
 const rewardsBox=$('#miniResultRewards');

 if(titleBox)titleBox.textContent=title;
 if(scoreBox)scoreBox.textContent=displayScore;
 if(rewardsBox){
  rewardsBox.innerHTML=
   `<span>🚫 Brak nagrody</span>`+
   `<span>${safeText(reason||'Zagraj aktywnie, zanim zakończysz grę.')}</span>`
 }

 const overlay=$('#miniResultOverlay');
 if(overlay){
  overlay.classList.remove('hidden');
  overlay.classList.add('show');
  overlay.scrollIntoView({behavior:'smooth',block:'center'})
 }

 // No cooldown, completion, leaderboard score or arcade-cycle credit.
 save()
}

function miniRewards(id,normalized,rawScore,grade){
 const quality=Math.max(.06,Math.min(1.2,normalized));
 const gradeMult={D:.60,C:.80,B:1,A:1.18,S:1.38,SS:1.58,SSS:1.82}[grade]||1;
 const globalMult=arcadeRewardMultiplier();
 const baseBuff=1.35;
 const parkourTimeValue=id==='parkour'
  ?1.35+Math.min(1.65,riderDistance/18000)
  :1;

 /*
  Rider is endless and requires substantially more time.
  Its currency scaling grows with actual distance.
 */
 const riderDistance=Math.max(0,Number(rawScore)||0);

 /*
  Noob Parkour jest najdłuższą minigrą, więc nagroda rośnie mocno
  dopiero wraz z realnym dystansem. Krótkie przejazdy nadal nie są
  przesadnie opłacalne.
 */
 const riderCurrencyScale=id==='parkour'
  ?1+
   Math.min(2.2,riderDistance/3500)+
   Math.min(4.5,Math.max(0,riderDistance-8000)/5000)+
   Math.min(5.0,Math.max(0,riderDistance-20000)/9000)
  :1;

 const riderProgressScale=id==='parkour'
  ?1+
   Math.min(1.5,riderDistance/7000)+
   Math.min(2.2,Math.max(0,riderDistance-12000)/11000)
  :1;

 const xp=Math.floor(
  (35+quality*115)*
  expMultiplier()*
  gradeMult*
  globalMult*
  baseBuff*
  riderProgressScale*
  parkourTimeValue
 );
 const points=Math.floor(
  (150+quality*900)*
  Math.max(1,state.level*.35)*
  totalMultiplier()**.22*
  gradeMult*
  globalMult*
  baseBuff*
  riderProgressScale*
  parkourTimeValue
 );
 const gems=Math.max(1,Math.floor(
  (1+quality*8*gemRewardMultiplier())*
  gradeMult*
  globalMult*
  baseBuff*
  riderCurrencyScale*
  parkourTimeValue
 ));
 const coins=Math.max(1,Math.floor(
  (2+quality*10)*
  coinRewardMultiplier()*
  gradeMult*
  globalMult*
  baseBuff*
  riderCurrencyScale*
  parkourTimeValue
 ));

 return{
  xp,points,gems,coins,gradeMult,globalMult,riderCurrencyScale
 }
}
const miniGradeRank={D:1,C:2,B:3,A:4,S:5,SS:6,SSS:7};
function saveBestMinigameGrade(game,grade){state.minigameBestGrades={aim:'-',parkour:'-',reflex:'-',dodge:'-',...(state.minigameBestGrades||{})};const old=state.minigameBestGrades[game]||'-';if((miniGradeRank[grade]||0)>(miniGradeRank[old]||0))state.minigameBestGrades[game]=grade}
function finishMini(id,title,displayScore,normalized,rawScore,activity={}){
 const activityResult=validateMiniActivity(id,activity);
 if(!activityResult.valid){
  showMiniNoReward(id,title,displayScore,activityResult.reason);
  return false
 }

 startMiniCooldown(id);
 state.eventStats.minigames++;ensureAchievementStats();state.achievementStats.arcadePlayed++;
 state.minigameRecords[id]=Math.max(state.minigameRecords[id]||0,rawScore);
 const grade=miniGrade(normalized);const rewards=miniRewards(id,normalized,rawScore,grade);
 addPoints(rewards.points);
 state.gems+=rewards.gems;
 state.coins+=rewards.coins;
 addXp(rewards.xp);
 grantPetXp(8+normalized*28);
 $('#miniGrade').textContent=grade;$('#miniGrade').className='mini-grade grade-'+grade.toLowerCase();
 $('#miniResultTitle').textContent=title;$('#miniResultScore').textContent=displayScore;
 $('#miniResultRewards').innerHTML=`<span>⭐ +${fmt(rewards.xp)} EXP</span><span>⚡ +${fmt(rewards.points)} punktów</span><span>💎 +${fmt(rewards.gems)}</span><span>🟡 +${fmt(rewards.coins)} Noob Coinów</span><span>🏅 Ocena ${grade}: x${rewards.gradeMult.toFixed(2)}</span>${rewards.riderCurrencyScale>1?`<span>🏁 Bonus długiego przejazdu: x${rewards.riderCurrencyScale.toFixed(2)} walut</span>`:''}${rewards.globalMult>1?'<span>🏆 Arcade buff x1.15</span>':''}`;
 const resultOverlay=$('#miniResultOverlay');if(resultOverlay){resultOverlay.classList.remove('hidden');resultOverlay.classList.add('show');resultOverlay.scrollIntoView({behavior:'smooth',block:'center'})}
 saveBestMinigameGrade(id,grade);registerArcadeCompletion(id);submitMinigameScore(id,rawScore);
 render();loadMinigameLeaderboards();return true
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
 target.innerHTML=fake?'<span class="aim-empty"></span>':'<span>NOOB</span>';
 const size=Math.max(40,68-aimHits*.28),maxX=Math.max(1,rect.width-size-10),maxY=Math.max(1,rect.height-size-10);
 let x=Math.random()*maxX,y=Math.random()*maxY;target.style.width=size+'px';target.style.height=size+'px';target.style.left=x+'px';target.style.top=y+'px';
 if(moving){
  const speed=40+Math.min(55,aimHits*1.1),angle=Math.random()*Math.PI*2;let vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed,last=performance.now();
  const animate=now=>{if(!aimRunning||target.dataset.moving!=='1')return;const dt=Math.min(.03,(now-last)/1000);last=now;x+=vx*dt;y+=vy*dt;
   if(x<=0||x>=maxX){vx*=-1;x=Math.max(0,Math.min(maxX,x))}if(y<=0||y>=maxY){vy*=-1;y=Math.max(0,Math.min(maxY,y))}
   target.style.left=x+'px';target.style.top=y+'px';aimMoveFrame=requestAnimationFrame(animate)};
  aimMoveFrame=requestAnimationFrame(animate)
 }
 const lifetime=fake?760:1150;
 aimTargetTimeout=setTimeout(()=>{if(!aimRunning)return;cancelAnimationFrame(aimMoveFrame);if(!fake){aimMisses++;aimCombo=0;ensureAchievementStats();state.achievementStats.aimTrueStreak=0;updateAimHud();sfx('bad')}moveAim()},lifetime)
}
function updateAimHud(){
 const acc=aimHits+aimMisses?aimHits/(aimHits+aimMisses)*100:100;
 $('#aimScore').textContent=aimScore;$('#aimCombo').textContent=aimCombo;$('#aimAccuracy').textContent=acc.toFixed(1)+'%'
}
function startAimGame(){
 if(!prepareMinigame('aim','aimStage'))return;scrollToActiveMinigame('aimStage');
 aimRunning=true;aimScore=0;aimHits=0;aimMisses=0;aimCombo=0;aimTimer=20;aimStartedAt=performance.now();updateAimHud();moveAim();
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
 finishMini(
  'aim',
  'Noob Aim Lab',
  `${(accuracy*100).toFixed(1)}% accuracy`,
  normalized,
  raw,
  {
   seconds:(performance.now()-aimStartedAt)/1000,
   actions:aimHits+aimMisses,
   score:aimScore
  }
 )
}
if($('#aimTarget'))$('#aimTarget').onclick=e=>{
 e.stopPropagation();if(!aimRunning)return;
 const fake=e.currentTarget.dataset.fake==='1';
 if(fake){
  aimMisses++;
  aimCombo=0;
  ensureAchievementStats();state.achievementStats.aimTrueStreak=0;
  aimScore=Math.max(0,aimScore-12);
  sfx('bad')
 }else{
  aimHits++;
  aimCombo++;
  ensureAchievementStats();state.achievementStats.aimTrueStreak++;state.achievementStats.aimBestTrueStreak=Math.max(state.achievementStats.aimBestTrueStreak,state.achievementStats.aimTrueStreak);
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
 parkourData={ctx,p:{x:110,y:245,w:62,h:52,vy:0},obs:[],pickups:[],score:0,bonus:0,speed:5,last:performance.now(),spawn:0,lives:3,nextPortal:10000,reversed:false,flipped:false,invuln:0,portal:null,startedAt:performance.now()};
 parkourRunning=true;parkourLoop()
}
function parkourJump(){if(parkourRunning&&parkourData&&parkourData.p.y>=238)parkourData.p.vy=-13.5}
function parkourLoop(){
 if(!parkourRunning)return;
 const d=parkourData,c=$('#parkourCanvas'),x=d.ctx,now=performance.now(),dt=Math.min(2,(now-d.last)/16.67);d.last=now;
 d.score+=d.speed*.10*dt;
 d.speed=Math.min(18,5+d.score/1350);
 d.invuln=Math.max(0,d.invuln-dt);
 if(d.score+d.bonus>=d.nextPortal&&!d.portal){
  d.nextPortal+=10000;
  d.portal={x:d.reversed?-70:c.width+70,y:238,w:96,h:140,effect:rand(['reverse','flip','boost'])}
 }
 d.spawn-=dt;
 if(d.spawn<=0){
  const type=rand(['💩','📦','🧱','🌵']);
  d.obs.push({x:d.reversed?-60:c.width+30,y:255,w:42,h:46,type});
  if(Math.random()<.35)d.pickups.push({x:d.reversed?-70:c.width+100,y:180-Math.random()*80,r:20,type:'star'});
 if(Math.random()<.035&&d.lives<3){
  d.pickups.push({
   x:d.reversed?-65:c.width+50,
   y:230,
   r:24,
   type:'hospital',
   healing:true
  })
 }
  d.spawn=Math.max(38,78-d.score/18)+Math.random()*26
 }
 d.p.vy+=.78*dt;d.p.y+=d.p.vy*dt;if(d.p.y>245){d.p.y=245;d.p.vy=0}
 const direction=d.reversed?1:-1;
 d.obs.forEach(o=>o.x+=d.speed*dt*direction);
 d.pickups.forEach(o=>o.x+=d.speed*dt*direction);if(d.portal)d.portal.x+=d.speed*dt*direction;
 d.obs=d.obs.filter(o=>o.x>-100&&o.x<c.width+100);d.pickups=d.pickups.filter(o=>o.x>-100&&o.x<c.width+100);
 const p=d.p;
 p.x=Math.max(12,Math.min(c.width-p.w-12,p.x));
 const playerHitbox={
  x:p.x+10,
  y:p.y+8,
  w:p.w-20,
  h:p.h-10
 };
 const healingObstacle=null;
 const hit=d.obs.some(o=>{
  if(o.healing)return false;
  const obstacleHitbox={x:o.x+7,y:o.y+8,w:Math.max(12,o.w-14),h:Math.max(14,o.h-10)};
  return playerHitbox.x<obstacleHitbox.x+obstacleHitbox.w&&
   playerHitbox.x+playerHitbox.w>obstacleHitbox.x&&
   playerHitbox.y<obstacleHitbox.y+obstacleHitbox.h&&
   playerHitbox.y+playerHitbox.h>obstacleHitbox.y
 });
 d.pickups=d.pickups.filter(o=>{const got=p.x<o.x+o.r&&p.x+p.w>o.x-o.r&&p.y<o.y+o.r&&p.y+p.h>o.y-o.r;if(got){
  if(o.type==='hospital'){
   d.lives=Math.min(3,d.lives+1);
   d.invuln=Math.max(d.invuln,70);
   ensureAchievementStats();
   state.achievementStats.hospitals++;
   sfx('good');
   toast('🏥 +1 życie')
  }else{
   d.bonus+=12;
   sfx('good')
  }
 }return!got});
 x.clearRect(0,0,c.width,c.height);
 const g=x.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#30145d');g.addColorStop(1,'#ff73c4');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
 x.fillStyle='#4a194f';x.fillRect(0,300,c.width,30);
 x.font='36px Arial';x.fillText('🛒',p.x,p.y+38);x.font='26px Arial';x.fillText('😎',p.x+15,p.y+12);
 d.obs.forEach(o=>{
  x.save();
  x.font='38px Arial';
  x.fillText(o.type,o.x,o.y+40);
  x.restore()
 });
 d.pickups.forEach(o=>{
  x.save();x.shadowBlur=18;x.shadowColor=o.type==='hospital'?'#4dffad':'#ffd34e';
  x.font=o.type==='hospital'?'38px Arial':'30px Arial';
  x.fillText(o.type==='hospital'?'🏥':'⭐',o.x-15,o.y+12);x.restore()
 });
 if(d.portal){
  x.save();
  x.shadowBlur=28;x.shadowColor='#b25cff';
  x.strokeStyle='#c975ff';x.lineWidth=10;
  x.beginPath();x.ellipse(d.portal.x,d.portal.y,42,68,0,0,Math.PI*2);x.stroke();
  x.font='26px Arial';x.fillText('🌀',d.portal.x-15,d.portal.y+8);
  x.restore()
 }
 $('#parkourScore').textContent=Math.floor(d.score+d.bonus);$('#parkourSpeed').textContent=(d.speed/5).toFixed(1);if($('#parkourLives'))$('#parkourLives').textContent='❤️'.repeat(d.lives)+'🖤'.repeat(3-d.lives);
 
 if(d.portal){
  const crossing=d.reversed?d.portal.x>=p.x:d.portal.x<=p.x+p.w;
  if(crossing){
   const effect=d.portal.effect;
   d.obs=d.obs.filter(o=>Math.abs(o.x-p.x)>260);
   d.pickups=d.pickups.filter(o=>Math.abs(o.x-p.x)>190);
   d.speed=Math.max(5,d.speed*.78);
   if(effect==='reverse'){
    d.reversed=!d.reversed;

    /*
     Gdy przeszkody jadą z lewej do prawej, gracz stoi po prawej.
     Gdy jadą z prawej do lewej, gracz stoi po lewej.
    */
    d.p.x=d.reversed
     ?Math.max(24,c.width-d.p.w-110)
     :110;

    d.obs=[];
    d.pickups=[];
    d.spawn=8;
    d.invuln=Math.max(d.invuln,40);
    toast('🌀 Portal: zmiana kierunku!')
   }
   if(effect==='flip'){d.flipped=!d.flipped;toast('🙃 Portal: świat do góry nogami!')}
   if(effect==='boost'){d.speed=Math.min(20,d.speed+3);toast('⚡ Portal: turbo!')}
   const canvas=$('#parkourCanvas');if(canvas)canvas.classList.toggle('parkour-flipped',d.flipped);
   d.portal=null;d.invuln=110;ensureAchievementStats();state.achievementStats.portals++;sfx('good')
  }else if(d.portal.x<-120||d.portal.x>c.width+120){d.portal=null}
 }
else if(hit&&d.invuln<=0){
  d.lives--;d.invuln=70;sfx('bad');
  d.obs=d.obs.filter(o=>!(playerHitbox.x<o.x+o.w&&playerHitbox.x+playerHitbox.w>o.x));
  if($('#parkourLives'))$('#parkourLives').classList.add('life-hit');setTimeout(()=>$('#parkourLives')?.classList.remove('life-hit'),350);
  if(d.lives<=0){stopParkour(true);return}
 }
 parkourFrame=requestAnimationFrame(parkourLoop)
}
function stopParkour(reward=true){
 if(!parkourRunning)return;parkourRunning=false;cancelAnimationFrame(parkourFrame);$('#parkourStage').classList.remove('running');
 if(!reward){parkourData=null;return hideGames()}
 const score=Math.floor((parkourData?.score||0)+(parkourData?.bonus||0));
 const lives=Math.max(0,parkourData?.lives||0);
 const activity={
  seconds:(performance.now()-(parkourData?.startedAt||performance.now()))/1000,
  score
 };
 parkourData=null;
 state.parkourBest=Math.max(state.parkourBest,score);
 finishMini('parkour','Noob Rider',score+' m',Math.min(1,(score/24000)*.82+(lives/3)*.18),score,activity)
}
$('#parkourCanvas')?.addEventListener('pointerdown',e=>{e.preventDefault();parkourJump()});


if(!window.__parkourSpaceBound){window.__parkourSpaceBound=true;document.addEventListener('keydown',event=>{
 if(event.code==='Space'&&parkourRunning){
  event.preventDefault();
  if(!event.repeat)parkourJump()
 }
},{capture:true});}

/* REFLEX — Guitar Hero */
const reflexKeys=['ArrowLeft','ArrowDown','ArrowUp','ArrowRight'];
const reflexIcons={ArrowUp:'⬆️',ArrowDown:'⬇️',ArrowLeft:'⬅️',ArrowRight:'➡️'};
let reflexNotes=[],reflexSpawnTimer=null,reflexAnimation=null;
const reflexInputLock=new Map();

function spawnReflexNote(){
 if(!reflexRunning||!reflexData)return;
 const key=rand(reflexKeys);
 const bomb=Math.random()<.13;
 const lane=$(`.reflex-lane[data-lane="${key}"]`);
 if(!lane)return;
 const note=document.createElement('div');
 note.className='reflex-note '+(bomb?'bomb':'normal');
 note.dataset.key=key;
 note.dataset.bomb=bomb?'1':'0';
 note.innerHTML=bomb?'💣':reflexIcons[key];
 lane.appendChild(note);
 const duration=Math.max(1100,2200-reflexData.score*1.4);
 const obj={el:note,key,bomb,start:performance.now(),duration,hit:false};
 reflexNotes.push(obj);
 setTimeout(spawnReflexNote,Math.max(380,800-reflexData.score*.5))
}
function updateReflexNotes(now){
 if(!reflexRunning)return;
 $$('.reflex-lane').forEach(lane=>{
  lane.classList.remove('reflex-zone-ready','reflex-zone-perfect')
 });
 reflexNotes.forEach(note=>{
  const progress=(now-note.start)/note.duration;
  note.progress=progress;
  note.el.style.transform=`translateY(${Math.min(1.08,progress)*290}px)`;
  const distance=getReflexLineDistance(note);
  const lane=note.el.closest('.reflex-lane');
  if(lane&&distance<=48){
   lane.classList.add('reflex-zone-ready');
   if(distance<=8)lane.classList.add('reflex-zone-perfect')
  }
  if(progress>1.08&&!note.hit){
   note.hit=true;
   if(!note.bomb){reflexData.misses++;reflexData.combo=0;reflexData.score=Math.max(0,reflexData.score-8);showReflexFeedback('-8 MISS','miss');sfx('bad')}
   note.el.remove()
  }
 });
 reflexNotes=reflexNotes.filter(note=>!note.hit);
 reflexAnimation=requestAnimationFrame(updateReflexNotes)
}
function startReflex(){
 if(!prepareMinigame('reflex','reflexStage'))return;scrollToActiveMinigame('reflexStage');setTimeout(()=>scrollToActiveMinigame('reflexStage'),180);
 reflexRunning=true;
 reflexData={score:0,combo:0,misses:0,bombs:0,hits:0,time:25,last:performance.now(),startedAt:performance.now(),perfectRun:true};
 reflexNotes=[];reflexInputLock.clear();$$('.reflex-note').forEach(x=>x.remove());
 spawnReflexNote();
 reflexAnimation=requestAnimationFrame(updateReflexNotes);
 clearInterval(reflexTimer);
 reflexTimer=setInterval(()=>{
  if(!reflexRunning)return;
  const now=performance.now(),dt=(now-reflexData.last)/1000;
  reflexData.last=now;reflexData.time-=dt;
  $('#reflexScore').textContent=reflexData.score;
  $('#reflexCombo').textContent=reflexData.combo;
  $('#reflexTime').textContent=Math.max(0,reflexData.time).toFixed(1);
  if(reflexData.time<=0)stopReflex(true)
 },50)
}

function showReflexFeedback(text,type){
 const highway=$('#reflexHighway');
 if(!highway)return;
 let feedback=$('#reflexFeedback');
 if(!feedback){
  feedback=document.createElement('div');
  feedback.id='reflexFeedback';
  feedback.className='reflex-feedback';
  highway.appendChild(feedback)
 }
 feedback.textContent=text;
 feedback.className='reflex-feedback '+type;
 feedback.classList.remove('show');
 void feedback.offsetWidth;
 feedback.classList.add('show')
}
function getReflexLineDistance(note){
 if(!note?.el?.isConnected)return Infinity;
 const line=document.querySelector('#reflexHighway .reflex-hit-line');
 if(!line)return Infinity;
 const noteRect=note.el.getBoundingClientRect();
 const lineRect=line.getBoundingClientRect();
 return Math.abs((noteRect.top+noteRect.height/2)-(lineRect.top+lineRect.height/2))
}

function reflexTimingGrade(distance){
 if(distance<=8)return{name:'PERFECT',score:42,time:.60,type:'perfect'};
 if(distance<=18)return{name:'GREAT',score:31,time:.30,type:'great'};
 if(distance<=30)return{name:'GOOD',score:21,time:.12,type:'good'};
 if(distance<=48)return{name:'OK',score:12,time:0,type:'ok'};
 return null
}

function reflexInput(code){
 if(!reflexRunning||!reflexData||!reflexKeys.includes(code))return false;

 const now=performance.now();
 const previous=reflexInputLock.get(code)||0;
 if(now-previous<115)return true;
 reflexInputLock.set(code,now);
 const candidates=reflexNotes
  .filter(note=>note.key===code&&!note.hit)
  .map(note=>({note,distance:getReflexLineDistance(note)}))
  .filter(item=>Number.isFinite(item.distance))
  .sort((a,b)=>a.distance-b.distance);

 const candidate=candidates.find(item=>item.distance<=48);
 if(!candidate){
  showReflexFeedback('POCZEKAJ NA LINIĘ','early');
  return true
 }

 const note=candidate.note;
 const timing=reflexTimingGrade(candidate.distance);
 if(!timing)return true;

 note.hit=true;
 const hitLane=note.el.closest('.reflex-lane');
 if(hitLane){
  hitLane.classList.add('reflex-zone-hit');
  setTimeout(()=>hitLane.classList.remove('reflex-zone-hit'),140)
 }
 note.el.remove();

 if(note.bomb){
  reflexData.score=Math.max(0,reflexData.score-35);
  reflexData.combo=0;
  reflexData.bombs++;
  reflexData.perfectRun=false;
  reflexData.time=Math.max(0,reflexData.time-1.25);
  showReflexFeedback('BOOM! -1.25s','bomb');
  sfx('bad');
  return true
 }

 reflexData.hits=(reflexData.hits||0)+1;
 reflexData.combo++;
 reflexData.score+=Math.round(timing.score*(1+Math.min(.75,reflexData.combo*.018)));

 let gainedTime=timing.time;
 if(reflexData.combo%8===0)gainedTime+=.45;
 if(reflexData.combo%20===0)gainedTime+=1;
 if(reflexData.combo%40===0)gainedTime+=1.75;
 reflexData.time=Math.min(45,reflexData.time+gainedTime);

 showReflexFeedback(timing.name+(gainedTime>0?` +${gainedTime.toFixed(2)}s`:''),timing.type);
 sfx(timing.name==='PERFECT'?'good':'click');
 return true
}
function stopReflex(reward=true){
 if(!reflexRunning)return;
 reflexRunning=false;clearInterval(reflexTimer);cancelAnimationFrame(reflexAnimation);
 reflexNotes.forEach(note=>note.el.remove());reflexNotes=[];
 $('#reflexStage').classList.remove('running');
 if(!reward){reflexData=null;return hideGames()}
 const score=reflexData.score;
 const activity={
  seconds:(performance.now()-(reflexData.startedAt||performance.now()))/1000,
  actions:(reflexData.hits||0)+reflexData.misses+reflexData.bombs,
  score
 };
 ensureAchievementStats();if(reflexData.perfectRun&&reflexData.misses===0&&reflexData.bombs===0)state.achievementStats.reflexPerfectRun=true;
 const total=Math.max(1,score/20+reflexData.misses+reflexData.bombs);
 const accuracy=Math.max(0,1-(reflexData.misses+reflexData.bombs)/total);
 const normalized=Math.min(1,accuracy*.62+Math.min(1,score/800)*.38);
 reflexData=null;
 state.reflexBest=Math.max(state.reflexBest,score);
 finishMini('reflex','Noob Reflex',score+' pkt',normalized,score,activity)
}

/* DODGE */
function startDodge(){
 if(!prepareMinigame('dodge','dodgeStage'))return;scrollToActiveMinigame('dodgeStage');
 const c=$('#dodgeCanvas'),ctx=c.getContext('2d');
 dodgeData={ctx,p:{x:c.width/2,y:350,w:52,h:52,v:0},items:[],score:0,lives:3,time:32,last:performance.now(),spawn:0,left:false,right:false,slow:0,shield:0,reverse:0,pickups:0,startedAt:performance.now()};
 dodgeRunning=true;dodgeLoop()
}
function dodgeLoop(){
 if(!dodgeRunning)return;
 const d=dodgeData,c=$('#dodgeCanvas'),x=d.ctx,now=performance.now(),dt=Math.min(2,(now-d.last)/16.67);d.last=now;
 d.time-=dt/60;d.score+=.11*dt;d.spawn-=dt;
 if(d.spawn<=0){
  const roll=Math.random();
  let type='bad',emoji=rand(['💀','🍌','🧻','🧠','🥔']);
  if(roll<.08){type='heart';emoji='❤️'}
  else if(roll<.15){type='shield';emoji='🛡️'}
  else if(roll<.22){type='slow';emoji='⏳'}
  else if(roll<.28){type='reverse';emoji='🔄'}
  else if(roll<.38){type='gold';emoji='⭐'}
  const difficulty=1+Math.min(1.8,d.score/180);
  d.items.push({x:30+Math.random()*(c.width-60),y:-30,vy:(3.1+Math.random()*2.4)*difficulty,type,emoji});
  d.spawn=Math.max(7,26-d.score/13)
 }
 d.slow=Math.max(0,d.slow-dt);d.shield=Math.max(0,d.shield-dt);d.reverse=Math.max(0,d.reverse-dt);
 const moveSpeed=8*(d.slow>0?.62:1);
 const left=d.reverse>0?d.right:d.left,right=d.reverse>0?d.left:d.right;
 if(left)d.p.x-=moveSpeed*dt;if(right)d.p.x+=moveSpeed*dt;d.p.x=Math.max(0,Math.min(c.width-d.p.w,d.p.x));
 const fallSpeedMultiplier=d.slow>0?.55:1;d.items.forEach(o=>o.y+=o.vy*dt*fallSpeedMultiplier);
 d.items=d.items.filter(o=>{const hit=d.p.x<o.x+32&&d.p.x+d.p.w>o.x&&d.p.y<o.y+32&&d.p.y+d.p.h>o.y;if(hit){
  if(o.type==='gold'){d.score+=28;d.pickups++;sfx('good')}
  else if(o.type==='heart'){d.lives=Math.min(3,d.lives+1);d.pickups++;sfx('good')}
  else if(o.type==='shield'){d.shield=150;d.pickups++;sfx('good')}
  else if(o.type==='slow'){d.slow=180;d.pickups++;sfx('good');toast('⏳ Spowolnienie obiektów')}
  else if(o.type==='reverse'){d.reverse=180;sfx('bad')}
  else if(d.shield>0){d.shield=0;sfx('click')}
  else{d.lives--;sfx('bad')}
  return false
 }return o.y<c.height+50});
 x.clearRect(0,0,c.width,c.height);const g=x.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#0c173c');g.addColorStop(1,'#62175d');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
 x.font='44px Arial';x.fillText('🛡️',d.p.x,d.p.y+42);d.items.forEach(o=>{
  const positive=['gold','heart','shield','slow'].includes(o.type);
  x.save();
  x.shadowBlur=positive?18:10;
  x.shadowColor=positive?'#4dffad':'#ff315f';
  x.font='34px Arial';
  x.fillText(o.emoji,o.x,o.y);
  x.restore()
 });
 $('#dodgeScore').textContent=Math.floor(d.score);
 $('#dodgeLives').textContent='❤️'.repeat(d.lives)+'🖤'.repeat(3-d.lives);
 $('#dodgeTime').textContent=Math.max(0,d.time).toFixed(1);
 if($('#dodgeEffects')){
  const effects=[];
  if(d.shield>0)effects.push('🛡️ Tarcza');
  if(d.slow>0)effects.push('⏳ Slow');
  if(d.reverse>0)effects.push('🔄 Odwrócenie');
  $('#dodgeEffects').textContent=effects.join(' • ')||'Brak efektów'
 }
 if(d.lives<=0||d.time<=0){stopDodge(true);return}
 dodgeFrame=requestAnimationFrame(dodgeLoop)
}
function stopDodge(reward=true){
 if(!dodgeRunning)return;dodgeRunning=false;cancelAnimationFrame(dodgeFrame);$('#dodgeStage').classList.remove('running');
 if(!reward){dodgeData=null;return hideGames()}
 const score=Math.floor(dodgeData.score),lives=dodgeData.lives,pickups=dodgeData.pickups||0;
 const activity={
  seconds:(performance.now()-(dodgeData.startedAt||performance.now()))/1000,
  score,
  actions:pickups
 };ensureAchievementStats();if(lives===3)state.achievementStats.dodgeNoLifeLost=true;const normalized=Math.min(1,(score/340)*.70+(lives/3)*.20+Math.min(1,pickups/8)*.10);dodgeData=null;
 state.dodgeBest=Math.max(state.dodgeBest,score);finishMini('dodge','Brainrot Dodge',score+' pkt',normalized,score,activity)
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
 const box=$('#minigameLeaderboards');
 if(!box)return;

 const names={
  aim:'🎯 Aim Accuracy',
  parkour:'🛒 Noob Rider',
  reflex:'⚡ Reflex',
  dodge:'🧠 Dodge'
 };

 const cosmeticByPlayer=new Map();

 if(db){
  for(const game of Object.keys(names)){
   const {data,error}=await db
    .from('minigame_scores')
    .select('player_id,player_name,score')
    .eq('game',game)
    .order('score',{ascending:false})
    .limit(3);

   if(!error)minigameBoards[game]=data||[]
  }

  const playerIds=[...new Set(
   Object.values(minigameBoards)
    .flat()
    .map(row=>row.player_id)
    .filter(Boolean)
  )];

  if(playerIds.length){
   const {data:profiles,error:profilesError}=await db
    .from('players')
    .select('player_id,save_data')
    .in('player_id',playerIds);

   if(!profilesError){
    (profiles||[]).forEach(row=>{
     let save={};
     try{
      save=typeof row.save_data==='string'
       ?JSON.parse(row.save_data||'{}')
       :(row.save_data||{})
     }catch{}

     cosmeticByPlayer.set(row.player_id,{
      frame:save.profileFrame||'default',
      background:save.profileBackground||'default'
     })
    })
   }
  }
 }

 box.innerHTML=Object.entries(names).map(([game,name])=>{
  const rows=(minigameBoards[game]||[]).map((row,index)=>{
   const cosmetic=cosmeticByPlayer.get(row.player_id)||{
    frame:'default',
    background:'default'
   };
   const value=game==='aim'
    ?(row.score/100).toFixed(1)+'%'
    :fmt(row.score);

   return `<div class="mini-profile-row"
    data-frame="${safeText(cosmetic.frame)}"
    data-background="${safeText(cosmetic.background)}">
    <b>${index+1}.</b>
    <span>${safeText(row.player_name)}</span>
    <strong>${value}</strong>
   </div>`
  }).join('')||'<p class="muted">Brak wyników</p>';

  const ownRecord=game==='aim'
   ?((state.minigameRecords.aim||0)/100).toFixed(1)+'%'
   :fmt(state.minigameRecords[game]||0);

  return `<div class="mini-board">
   <h3>${name}</h3>
   ${rows}
   <small>Twój rekord: ${ownRecord}</small>
  </div>`
 }).join('');

 requestAnimationFrame(()=>{
  if(typeof refreshVisibleTextures==='function')refreshVisibleTextures()
 })
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


function safeAction(name,callback){
 return (...args)=>{
  try{
   if(typeof callback!=='function'){
    console.warn(`Brak funkcji akcji: ${name}`);
    if(typeof saveDiagnostic==='function')saveDiagnostic('Missing action',name,'');
    return
   }
   return callback(...args)
  }catch(error){
   console.error(`Akcja ${name}:`,error);
   if(typeof saveDiagnostic==='function')saveDiagnostic('Action error',`${name}: ${error.message}`,error.stack||'');
   if(typeof toast==='function')toast('Ta akcja chwilowo nie działa')
  }
 }
}

function bindClick(selector,handler){
 const element=$(selector);
 if(!element)return;
 element.onclick=safeAction(selector,handler)
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
bindClick('#stopAim',()=>window.stopAimGame?.(true));
bindClick('#stopParkourBtn',()=>window.stopParkour?.(true));
bindClick('#stopReflexBtn',()=>window.stopReflex?.(true));
bindClick('#stopDodgeBtn',()=>window.stopDodge?.(true));


bindClick('#bossDamageUpgradeBtn',()=>buyBossDamageUpgrade());
bindClick('#bossBlockerUpgradeBtn',()=>buyBossBlockerUpgrade());

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
bindClick('#openGoldCrate',()=>window.openGoldCase?.());
bindClick('#goldClose',()=>{
 const close=$('#goldClose');
 if(close?.dataset.skin)state.activeSkin=close.dataset.skin;
 $('#goldCrateOverlay')?.classList.remove('show');
 render()
});
bindClick('#goldDismiss',()=>{
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
  setCasinoBet(Number(button.dataset.bet));
  renderCasino()
 }
});

const casinoBetInput=$('#casinoBetInput');
if(casinoBetInput){
 casinoBetInput.addEventListener('input',()=>{
  if(casinoBetInput.value==='')return;
  setCasinoBet(casinoBetInput.value,{syncInput:false})
 });
 casinoBetInput.addEventListener('change',()=>{
  setCasinoBet(casinoBetInput.value)
 })
}

bindClick('#casinoBetMax',()=>{
 setCasinoBet(Math.min(casinoMaxBet(),state.casinoChips));
 renderCasino()
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
  addPoints(pps());
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

document.addEventListener('click',event=>{
 const button=event.target.closest('[data-skin-filter]');
 if(!button)return;
 state.skinFilter=button.dataset.skinFilter;
 renderSkins();
 save()
});

document.addEventListener('click',event=>{
 const category=event.target.closest('[data-achievement-category]');
 if(category){state.achievementCategory=category.dataset.achievementCategory;renderAchievements();save()}
});
document.addEventListener('input',event=>{
 if(event.target.id==='achievementSearch'){state.achievementSearch=event.target.value;renderAchievements()}
});
document.addEventListener('change',event=>{
 if(event.target.id==='achievementSort'){state.achievementSort=event.target.value;renderAchievements();save()}
});



function showCollectionTab(tab){
 state.collectionTab=tab||'pets';
 document.querySelectorAll('[data-collection-tab]').forEach(b=>b.classList.toggle('active',b.dataset.collectionTab===state.collectionTab));
 document.querySelectorAll('[data-collection-panel]').forEach(p=>p.classList.toggle('active',p.dataset.collectionPanel===state.collectionTab));
 const renderers={pets:renderPets,skins:renderSkins,worlds:renderWorlds,awards:renderAchievements};
 try{renderers[state.collectionTab]?.()}catch(error){console.error('Collection tab:',error)}
 save()
}
document.addEventListener('click',event=>{
 const tab=event.target.closest('[data-collection-tab]');
 if(tab)showCollectionTab(tab.dataset.collectionTab)
});

document.addEventListener('click',event=>{
 const clicker=event.target.closest('#clicker,.click-button,.main-click-button');
 if(!clicker)return;
 if(event.__skinTextShown)return;event.__skinTextShown=true;

 const approxValue=typeof clickPower==='function'?clickPower():1;
 const critical=clicker.classList.contains('critical-hit');
 if(canShowClickEffect())showSkinClickValue(approxValue,event.clientX,event.clientY,critical)
});

setInterval(()=>{if(typeof refreshComboDisplay==='function')refreshComboDisplay()},250);

document.addEventListener('click',event=>{
 const clicker=event.target.closest('#clicker,.click-button,.main-click-button');
 if(!clicker||event.__comboRegistered)return;
 event.__comboRegistered=true;
 registerManualCombo()
},{capture:true});

setInterval(()=>{if(typeof decayComboIfNeeded==='function')decayComboIfNeeded()},150);

bindClick('#bossResultClose',()=>closeBossResult());
bindClick('#bossResultContinue',()=>closeBossResult());
document.addEventListener('click',event=>{
 if(event.target?.id==='bossResult')closeBossResult()
});

window.addEventListener('beforeunload',()=>{
 if(typeof flushManualClickBatch==='function')flushManualClickBatch()
});

document.addEventListener('click',event=>{
 const frame=event.target.closest('[data-profile-frame]');
 if(frame)window.equipProfileFrame?.(frame.dataset.profileFrame);

 const background=event.target.closest('[data-profile-background]');
 if(background)window.equipProfileBackground?.(background.dataset.profileBackground)
});

bindClick('#saveProfileStyle',()=>window.saveProfileStyleNow?.());


/* 0.6c — blokada zaznaczania i przeciągania podczas gry */
(function setupGameNoSelect(){
 const editableSelector=[
  'input',
  'textarea',
  'select',
  'option',
  '[contenteditable="true"]'
 ].join(',');

 function isEditable(target){
  if(!(target instanceof Element))return false;

  return !!target.closest([
   'input',
   'textarea',
   'select',
   'option',
   '[contenteditable="true"]',
   '#view-feedback',
   '#view-admin',
   '.feedback-panel',
   '.feedback-list',
   '.feedback-card',
   '.diagnostics-panel',
   '.diagnostics-list',
   '.error-log',
   '.admin-panel',
   '.admin-card',
   '.admin-log',
   '.admin-table',
   'pre',
   'code',
   '.log-entry'
  ].join(','))
 }

 document.addEventListener('selectstart',event=>{
  if(isEditable(event.target))return;
  event.preventDefault()
 },true);

 document.addEventListener('dragstart',event=>{
  if(isEditable(event.target))return;
  event.preventDefault()
 },true);

 document.addEventListener('mousedown',event=>{
  if(isEditable(event.target))return;
  if(event.detail>1)event.preventDefault()
 },true)
})();
