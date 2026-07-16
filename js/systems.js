function safeDomSelector(selector){
 if(typeof selector!=='string')return selector;
 return selector.replace(/^#{2,}/,'#')
}
const safe$=selector=>{
 try{return document.querySelector(safeDomSelector(selector))}
 catch(error){
  console.error('Nieprawidłowy selektor DOM:',selector,error);
  return null
 }
};

function setTextSafe(selector,value){
 const element=safe$(selector);
 if(element)element.textContent=value
}
function setDisabledSafe(selector,value){
 const element=safe$(selector);
 if(element)element.disabled=!!value
}
function setStyleSafe(selector,property,value){
 const element=safe$(selector);
 if(element)element.style[property]=value
}
function setCssPropertySafe(selector,property,value){
 const element=safe$(selector);
 if(element)element.style.setProperty(property,value)
}
function toggleClassSafe(selector,className,value){
 const element=safe$(selector);
 if(element)element.classList.toggle(className,!!value)
}



/* v0.6 stable runtime fallbacks */

if(typeof window.renderPets!=='function')window.renderPets=function(){};
if(typeof window.renderMiniStats!=='function')window.renderMiniStats=function(){};
if(typeof window.renderMiniCooldowns!=='function')window.renderMiniCooldowns=function(){};
if(typeof window.loadMinigameLeaderboards!=='function')window.loadMinigameLeaderboards=async function(){};


let bossTimer=null;
let boss=null;
let bossSpawnTimer=0;

function activeBossWorld(){
 if(!boss)return null;
 return worlds.find(world=>world.id===boss.worldId)||world()
}

function maybeSpawnBoss(){
 // Zachowane wyłącznie dla zgodności ze starszym kodem.
 // Boss może zostać uruchomiony tylko ręcznie przez spawnWorldBoss().
 return boss
}

function clearBoss(){
 boss=null;
 if(typeof clearBossBlockers==='function'){
  try{clearBossBlockers()}catch(error){console.warn('Clear boss blockers:',error)}
 }
}

const WORLD_BOSS_FIXED_HP=[50000,150000,450000,1400000,4200000,12000000,35000000,100000000,280000000,750000000,2000000000,5500000000,15000000000,40000000000,110000000000];
function calculatedWorldBossHp(w){
 const idx=Math.max(0,worldIndex(w.id));
 return WORLD_BOSS_FIXED_HP[idx]||WORLD_BOSS_FIXED_HP[WORLD_BOSS_FIXED_HP.length-1]
}
function calculatedEndgameBossHp(){
 const base=WORLD_BOSS_FIXED_HP[WORLD_BOSS_FIXED_HP.length-1];
 return Math.floor(base*(1+Math.min(3,state.rebirths*.04)))
}




const BOSS_REPEAT_COOLDOWN_MS=180000;
function effectiveBossCooldownMs(){
 return Math.max(60000,BOSS_REPEAT_COOLDOWN_MS-(state.bossCooldownLevel||0)*12000)
}
function bossRepeatRewardMultiplier(){
 return 1+(state.bossRepeatLootLevel||0)*.07
}
function bossRematchDamageMultiplier(worldId){
 return worldBossDefeated(worldId)?1+(state.bossRematchDamageLevel||0)*.10:1
}
function bossInstantResetChance(){
 return Math.min(.12,(state.bossInstantResetLevel||0)*.015)
}
function bossCooldownRemaining(worldId){
 state.bossCooldowns=state.bossCooldowns||{};
 return Math.max(0,Number(state.bossCooldowns[worldId]||0)-Date.now())
}
function setBossCooldown(worldId){
 state.bossCooldowns=state.bossCooldowns||{};
 state.bossCooldowns[worldId]=Date.now()+effectiveBossCooldownMs()
}
function bossKillCount(worldId){
 state.bossKillCounts=state.bossKillCounts||{};
 return Math.max(0,Number(state.bossKillCounts[worldId]||0))
}
function registerBossKill(worldId){
 state.bossKillCounts=state.bossKillCounts||{};
 state.bossKillCounts[worldId]=bossKillCount(worldId)+1
}
function formatBossCooldown(ms){
 const total=Math.max(0,Math.ceil(ms/1000));
 return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`
}
function unlockNextWorldAfterBoss(worldId){
 const idx=worldIndex(worldId);
 const next=worlds[idx+1];
 if(!next)return false;

 state.worldBossesDefeated=Array.isArray(state.worldBossesDefeated)?state.worldBossesDefeated:[];
 if(!state.worldBossesDefeated.includes(worldId))state.worldBossesDefeated.push(worldId);

 state.availableWorlds=Array.isArray(state.availableWorlds)?state.availableWorlds:['neon'];
 if(!state.availableWorlds.includes(next.id))state.availableWorlds.push(next.id);
 return true
}

function ensureWorldBossProgress(worldId){
 state.worldBossProgress=state.worldBossProgress||{};
 if(!(worldId in state.worldBossProgress))state.worldBossProgress[worldId]=0
}
function worldBossUnlockTarget(w){
 return Math.ceil(calculatedWorldBossHp(w)*.30)
}
function worldBossUnlockProgress(w){
 ensureWorldBossProgress(w.id);
 return Math.max(0,Number(state.worldBossProgress[w.id])||0)
}
function worldBossFightUnlocked(w){
 return worldBossUnlockProgress(w)>=worldBossUnlockTarget(w)
}
function refreshBossUnlockUi(){
 const button=safe$('#challengeBossBtn');
 const hint=safe$('#bossUnlockHint');
 if(!button&&!hint)return;

 const w=world();
 ensureWorldBossProgress(w.id);

 const firstDefeat=worldBossDefeated(w.id);
 const fightActive=!!(boss&&boss.active!==false);
 const current=worldBossUnlockProgress(w);
 const target=worldBossUnlockTarget(w);
 const ready=current>=target||firstDefeat;
 const cooldown=bossCooldownRemaining(w.id);
 const cooling=cooldown>0;

 if(button){
  const shouldShow=!fightActive&&ready;
  button.classList.toggle('hidden',!shouldShow);
  button.style.display=shouldShow?'block':'none';
  button.disabled=!shouldShow||cooling;
  button.textContent=fightActive?'⚔️ Walka trwa'
   :cooling?`⏱️ Boss odpoczywa ${formatBossCooldown(cooldown)}`
   :firstDefeat?'⚔️ Walcz ponownie'
   :'⚔️ Zmierz się z bossem'
 }

 if(hint){
  hint.classList.toggle('hidden',fightActive);
  hint.style.display=fightActive?'none':'block';
  hint.textContent=cooling?`Boss wróci za ${formatBossCooldown(cooldown)}`
   :ready?(firstDefeat?`🏆 Pokonano: ${bossKillCount(w.id)} razy`:'⚔️ Walka z bossem odblokowana')
   :`🔒 Odblokowanie bossa: ${fmt(Math.min(current,target))} / ${fmt(target)} ⭐`
 }
}


function isWorldBossDefeated(worldId){
 state.worldBossesDefeated=Array.isArray(state.worldBossesDefeated)?state.worldBossesDefeated:[];
 return state.worldBossesDefeated.includes(worldId)
}
function worldIndex(id){return worlds.findIndex(w=>w.id===id)}
function worldBossDefeated(id){return isWorldBossDefeated(id)}
function canUnlockWorld(w){
 if(!w.requiresBoss)return true;
 return isWorldBossDefeated(w.requiresBoss)||(state.availableWorlds||[]).includes(w.id)
}
function markWorldBossDefeated(worldId){
 state.worldBossesDefeated=Array.isArray(state.worldBossesDefeated)?state.worldBossesDefeated:[];
 if(!state.worldBossesDefeated.includes(worldId))state.worldBossesDefeated.push(worldId)
}
function currentWorldBossTemplate(){
 let w=world();
 return {
  name:w.bossName||'Boss Noob',
  emoji:w.bossEmoji||'👾',
  desc:`Strażnik świata: ${w.name}`,
  worldId:w.id,
  isWorldBoss:true
 }
}
function spawnWorldBoss(){
 if(boss)return toast('Walka z bossem już trwa');
 let w=world();
 ensureWorldBossProgress(w.id);
 const cooldown=bossCooldownRemaining(w.id);
 if(cooldown>0){
  refreshBossUnlockUi();
  return toast(`Boss odpoczywa jeszcze ${formatBossCooldown(cooldown)}`)
 }
 const currentProgress=worldBossUnlockProgress(w);
 const requiredProgress=worldBossUnlockTarget(w);
 if(!worldBossDefeated(w.id)&&currentProgress<requiredProgress){
  const current=worldBossUnlockProgress(w),target=worldBossUnlockTarget(w);
  return toast(`Najpierw zdobądź w tym świecie ${fmt(target-current)} punktów`)
 }
 
 let t=currentWorldBossTemplate();
 let maxHp=calculatedWorldBossHp(w);
 boss={...t,hp:maxHp,maxHp,time:Math.min(125,80+worldIndex(w)*4),rewardPoints:Math.floor(maxHp*.08),rewardGems:Math.max(2,Math.ceil((worldIndex(w.id)+1)/2)),rewardCoins:Math.max(1,Math.floor(worldIndex(w.id)/3)+1),blocked:false,blockersCleared:0};
 safe$('#bossPanel').classList.remove('hidden');renderBoss();scheduleBossBlocker(true);
 clearInterval(bossTimer);bossTimer=setInterval(()=>{
  if(!boss)return clearInterval(bossTimer);
  boss.time--;renderBoss();if(boss.time<=0)finishBoss(false)
 },1000)
}

let blockerTimeout=null;
function scheduleBossBlocker(first=false){
 clearTimeout(blockerTimeout);
 if(!boss)return;
 let delay=first?(5500+Math.random()*2500):(7500+Math.random()*4500);
 blockerTimeout=setTimeout(()=>{if(boss)spawnBossBlockers()},delay)
}
function spawnBossBlockers(){
 if(!boss||boss.blocked)return;
 boss.blocked=true;
 let idx=boss.isEndgame?worlds.length:worldIndex(boss.worldId);
 let count=boss.isEndgame?5:Math.min(5,2+Math.floor(idx/4));
 let layer=safe$('#bossBlockerLayer');layer.innerHTML='';layer.classList.remove('hidden');
 safe$('#bossPanel').classList.add('blocked');
 let msg=document.createElement('div');msg.className='boss-blocked-msg';msg.textContent=`Zniszcz ${count} blokad, żeby atakować!`;layer.append(msg);
 for(let i=0;i<count;i++){
  let b=document.createElement('button');b.className='boss-blocker';b.textContent='BREAK';
  b.dataset.hp=String(1+(idx>=8?1:0)+(boss.isEndgame?1:0));
  b.style.left=(8+Math.random()*78)+'%';b.style.top=(16+Math.random()*62)+'%';
  b.onclick=e=>{
   e.stopPropagation();
   let hp=Number(b.dataset.hp)-1;b.dataset.hp=String(hp);
   tone(740+Math.random()*180,.06,'square',.03);
   if(hp<=0)b.remove();else{b.textContent='HIT '+hp;b.style.transform='scale(.86)';setTimeout(()=>b.style.transform='',90)}
   if(!layer.querySelector('.boss-blocker'))clearBossBlockers()
  };
  layer.append(b)
 }
}
function clearBossBlockers(){
 if(!boss)return;
 boss.blocked=false;boss.blockersCleared=(boss.blockersCleared||0)+1;
 safe$('#bossBlockerLayer').classList.add('hidden');safe$('#bossBlockerLayer').innerHTML='';
 safe$('#bossPanel').classList.remove('blocked');toast('⚔️ Atak odblokowany!');scheduleBossBlocker()
}

function endgameBossReady(){
 return state.world==='dev' && Date.now()-(state.lastEndgameBossAt||0)>=180000
}
function spawnEndgameBoss(){
 if(boss||state.world!=='dev'||!endgameBossReady())return;
 const names=[
  {name:'Infinite Lag',emoji:'♾️',desc:'Skaluje się do twojej aktualnej potęgi.'},
  {name:'Corrupted Admin',emoji:'🛡️',desc:'Nie powinien istnieć w tej wersji gry.'},
  {name:'404 Titan',emoji:'💻',desc:'Błąd tak duży, że dostał własne HP.'},
  {name:'Golden Void',emoji:'👑',desc:'Łączy złoto, pustkę i ogromny lag.'}
 ];
 let t=rand(names),maxHp=calculatedEndgameBossHp();
 boss={...t,hp:maxHp,maxHp,time:85,isEndgame:true,worldId:'dev',rewardPoints:Math.floor(maxHp*2.7),rewardGems:Math.max(8,Math.floor(state.level/9)),rewardCoins:Math.max(4,Math.floor(state.rebirths/3)+2),blocked:false,blockersCleared:0};
 state.lastEndgameBossAt=Date.now();
 safe$('#bossPanel').classList.remove('hidden');renderBoss();scheduleBossBlocker(true);
 clearInterval(bossTimer);bossTimer=setInterval(()=>{
  if(!boss)return clearInterval(bossTimer);
  boss.time--;renderBoss();if(boss.time<=0)finishBoss(false)
 },1000)
}
function scheduleEndgameBossCheck(){
 if(state.world==='dev'){
  safe$('#endgameBossBanner').classList.remove('hidden');
  if(endgameBossReady()&&!boss)spawnEndgameBoss()
 }else safe$('#endgameBossBanner').classList.add('hidden')
}

function currentTitle(){return ''}

function spawnBoss(){spawnWorldBoss()}
function damageBoss(amount){
 if(!boss||boss.blocked)return;

 const raw=Math.max(1,Number(amount)||1);
 const upgraded=Math.max(
  1,
  raw
  *1.35
  *bossDamageUpgradeMultiplier()
  *(1+(state.worldExpBoost||0)*.05)
  *(1+(state.achievementBonuses?.bossDamage||0))*bossRematchDamageMultiplier(boss.worldId)
 );

 const capped=Math.min(upgraded,(boss?.maxHp||1)*.05);
 boss.hp=Math.max(0,(boss?.hp||0)-capped);

 renderBoss();
 if((boss?.hp||0)<=0)finishBoss(true)
}
function renderBoss(){
 if(!boss)return;
 {const el=safe$('#bossName');if(el)el.textContent=(boss?.emoji||'👹')+' '+(boss?.name||'Boss');safe$('#bossDesc').textContent=boss.desc;}
 {const el=safe$('#bossTime');if(el)el.textContent=boss.time;safe$('#bossHp').textContent=fmt((boss?.hp||0))+'/'+fmt((boss?.maxHp||1));}
 {const el=safe$('#bossReward');if(el)el.textContent=fmt(boss.rewardPoints)+' ⭐ + '+boss.rewardGems+' 💎 + '+(boss.rewardCoins||0)+' 🟡';}
 safe$('#bossHealthBar').style.width=((boss&&(boss?.maxHp||1)?(boss?.hp||0)/(boss?.maxHp||1):0)*100)+'%'
}

function closeBossResult(){
 const overlay=safe$('#bossResult');
 if(!overlay)return;
 overlay.classList.add('hidden');
 overlay.classList.remove('show')
}

function showBossResult({won,first,points=0,gems=0,coins=0,unlockedNext=false,cooldownMs=0}){
 const overlay=safe$('#bossResult');
 if(!overlay){
  toast(won
   ?`Boss pokonany! +${fmt(points)} ⭐ +${gems} 💎 +${coins} 🟡`
   :'Boss uciekł');
  return
 }

 const icon=safe$('#bossResultIcon');
 const title=safe$('#bossResultTitle');
 const desc=safe$('#bossResultDesc');
 const rewards=safe$('#bossResultRewards');

 if(icon)icon.textContent=won?'🏆':'💨';
 if(title)title.textContent=won
  ?first?'Pierwsze zwycięstwo!':'Boss pokonany ponownie!'
  :'Boss uciekł';

 if(desc){
  desc.textContent=won
   ?unlockedNext
    ?'Pokonano strażnika i odblokowano możliwość kupna kolejnego świata.'
    :`Boss wróci za ${formatBossCooldown(cooldownMs)}.`
   :`Spróbuj ponownie za ${formatBossCooldown(cooldownMs)}.`
 }

 if(rewards){
  rewards.innerHTML=won
   ?`<div><b>+${fmt(points)}</b><span>⭐ Punkty</span></div>
      <div><b>+${gems}</b><span>💎 Diamenty</span></div>
      <div><b>+${coins}</b><span>🟡 Noob Coiny</span></div>`
   :'<div class="boss-result-empty">Brak nagród za przegraną walkę.</div>'
 }

 overlay.classList.remove('hidden');
 overlay.classList.add('show');

 requestAnimationFrame(()=>{
  overlay.scrollIntoView({behavior:'smooth',block:'center'})
 })
}

function finishBoss(win){
 if(!boss)return;

 clearInterval(bossTimer);
 clearTimeout(blockerTimeout);

 const defeated={...boss};
 const w=worlds.find(item=>item.id===defeated.worldId)||world();
 const wasFirst=defeated.isWorldBoss&&!worldBossDefeated(w.id);

 const blockerLayer=safe$('#bossBlockerLayer');
 if(blockerLayer){
  blockerLayer.classList.add('hidden');
  blockerLayer.innerHTML=''
 }

 boss=null;

 const bossPanel=safe$('#bossPanel');
 if(bossPanel){
  bossPanel.classList.add('hidden');
  bossPanel.classList.remove('blocked')
 }

 let rewardPoints=0;
 let rewardGems=0;
 let rewardCoins=0;
 let unlockedNext=false;

 if(win){
  const lootMult=1+(state.permBossLoot||0)*.10;
  const repeatScale=wasFirst?1:.40*bossRepeatRewardMultiplier();

  rewardPoints=Math.max(1,Math.floor(defeated.rewardPoints*lootMult*repeatScale));
  rewardGems=Math.max(1,Math.floor(defeated.rewardGems*lootMult*gemRewardMultiplier()*(wasFirst?1:.75)));
  rewardCoins=Math.max(1,Math.floor((defeated.rewardCoins||0)*lootMult*coinRewardMultiplier()*(wasFirst?1:.75)));

  addPoints(rewardPoints);
  state.gems+=rewardGems;
  state.coins+=rewardCoins;
  state.bossWins=(state.bossWins||0)+1;
  registerBossKill(w.id);

  if(defeated.isWorldBoss&&wasFirst){
   markWorldBossDefeated(w.id);
   unlockedNext=unlockNextWorldAfterBoss(w.id)
  }

  ensureWorldBossProgress(w.id);
  state.worldBossProgress[w.id]=Math.max(
   state.worldBossProgress[w.id]||0,
   worldBossUnlockTarget(w)
  );

  setBossCooldown(w.id);
  if(!wasFirst&&Math.random()<bossInstantResetChance()){
   state.bossCooldowns[w.id]=0
  }

  grantPetXp(70+Math.max(0,worldIndex(w.id))*18);
  sfx('good');
  confetti()
 }else{
  setBossCooldown(w.id)
 }

 const cooldownMs=bossCooldownRemaining(w.id);

 save();
 renderWorlds();
 refreshBossUnlockUi();
 renderCollection();
 render();

 setTimeout(()=>{
  showBossResult({
   won:win,
   first:wasFirst,
   points:rewardPoints,
   gems:rewardGems,
   coins:rewardCoins,
   unlockedNext,
   cooldownMs
  })
 },0)
}
function showWorldTransition(w,newUnlock=false){
 {const el=safe$('#transitionEmoji');if(el)el.textContent=w.emoji;safe$('#transitionName').textContent=w.name;safe$('#transitionDesc').textContent=w.desc;}
 safe$('#worldTransition').classList.add('show');document.body.classList.add('world-switching');
 if(newUnlock)confetti();
 setTimeout(()=>{safe$('#worldTransition').classList.remove('show');document.body.classList.remove('world-switching')},1800)
}
function weatherSymbol(w){
 const map={neon:'✦',forest:'🍃',banana:'🍌',desert:'•',factory:'⚙️',ice:'❄️',ocean:'💧',volcano:'🔥',sky:'☁️',castle:'👑',galaxy:'✨',void:'●',rainbow:'🌈',goldrealm:'🪙',dev:'0'};
 return map[w.id]||w.rain||'✨'
}
function spawnWeather(){trimEffects();
 if(document.hidden)return;let host=safe$('#worldWeather'),w=world(),count=['legendary','mythic'].includes((skins.find(s=>s.id===state.activeSkin)||{}).rarity)?2:1;
 for(let i=0;i<count;i++){
  let p=document.createElement('span');p.className='weather-particle';p.textContent=weatherSymbol(w);
  p.style.left=Math.random()*100+'vw';p.style.fontSize=(12+Math.random()*18)+'px';
  p.style.setProperty('--weatherDur',(6+Math.random()*8)+'s');p.style.setProperty('--weatherX',(Math.random()*160-80)+'px');p.style.setProperty('--weatherRot',(Math.random()*720-360)+'deg');
  host.append(p);setTimeout(()=>p.remove(),14500)
 }
}
setInterval(()=>{if(safe$('#view-game').classList.contains('active'))spawnWeather()},1800);setInterval(scheduleEndgameBossCheck,15000);

function playWorldMusicNote(){
 if(!state.music)return;let w=world(),sets={
  neon:[220,277,330],forest:[196,247,294],banana:[262,330,392],desert:[165,220,247],factory:[110,220,440],ice:[440,554,659],ocean:[174,233,349],volcano:[98,147,196],sky:[523,659,784],castle:[196,294,392],galaxy:[220,330,495],void:[55,82,110],rainbow:[262,330,392,523],goldrealm:[330,440,660],dev:[110,220,880]
 };let arr=sets[w.id]||[220,277,330];tone(rand(arr),.24,w.id==='factory'||w.id==='dev'?'square':'triangle',.011)
}


function collectionProgressData(){
 const ownedPetTypes=new Set(
  (state.pets||[])
   .map(pet=>pet?.type)
   .filter(type=>pets.some(base=>base.id===type))
 );

 const ownedSkinIds=new Set(
  (state.ownedSkins||[])
   .filter(id=>skins.some(skin=>skin.id===id))
 );

 const unlockedWorldIds=new Set(
  (state.unlockedWorlds||[])
   .filter(id=>worlds.some(world=>world.id===id))
 );

 const claimedAchievementIds=new Set(
  (state.claimedAchievements||[])
   .filter(id=>achievements.some(achievement=>achievement.id===id))
 );

 const sections=[
  {key:'pets',owned:ownedPetTypes.size,total:pets.length},
  {key:'skins',owned:ownedSkinIds.size,total:skins.filter(skin=>skin.id!=='dev').length},
  {key:'worlds',owned:unlockedWorldIds.size,total:worlds.filter(world=>world.id!=='dev').length},
  {key:'awards',owned:claimedAchievementIds.size,total:achievements.length}
 ];

 const owned=sections.reduce((sum,section)=>sum+Math.min(section.owned,section.total),0);
 const total=sections.reduce((sum,section)=>sum+Math.max(0,section.total),0);
 const percent=total>0?Math.min(100,Math.round(owned/total*100)):0;

 return{owned,total,percent,sections}
}


function getCollectionTab(){
 return state.collectionTab||localStorage.getItem('noob_collection_tab')||'skins'
}
function setCollectionTab(tab){
 const allowed=['skins','pets','frames','backgrounds','achievements'];
 state.collectionTab=allowed.includes(tab)?tab:'skins';
 localStorage.setItem('noob_collection_tab',state.collectionTab);
 return state.collectionTab
}

function renderCollection(){syncClaimedAchievementRewards();
 const progress=collectionProgressData();
 const progressText=safe$('#collectionProgress');
 if(progressText)progressText.textContent=progress.percent+'%';

 const chip=progressText?.closest('.chip');
 if(chip){
  chip.title=`${progress.owned} / ${progress.total} elementów kolekcji`
 }

 const petCollection=safe$('#petCollectionGrid');
 if(petCollection&&typeof renderPetCollection==='function'){
  try{renderPetCollection()}catch(error){console.error('Pet collection:',error)}
 }

 const skinCollection=safe$('#skinCollectionGrid');
 if(skinCollection&&typeof renderSkinCollection==='function'){
  try{renderSkinCollection()}catch(error){console.error('Skin collection:',error)}
 }

 const tab=state.collectionTab||'pets';
 document.querySelectorAll('[data-collection-tab]').forEach(button=>{
  button.classList.toggle('active',button.dataset.collectionTab===tab)
 });
 document.querySelectorAll('[data-collection-panel]').forEach(panel=>{
  panel.classList.toggle('active',panel.dataset.collectionPanel===tab)
 })
}

function renderFeatureLocks(){
 $$('.nav-btn[data-view]').forEach(b=>{
  let id=b.dataset.view,locked=!featureUnlocked(id);
  b.classList.toggle('locked',locked);
  b.title=locked?lockedFeatureMessage(id):''
 });
}
function featureLockCard(id){
 let req=requiredLevelForFeature(id),pct=Math.min(100,state.level/req*100);
 return `<div class="feature-lock"><div>
  <div class="lock-icon">🔒</div>
  <h2>${lockedFeatureMessage(id)}</h2>
  <p class="muted">Aktualny poziom: ${state.level}/${req}</p>
  <div class="lock-progress"><i style="width:${pct}%"></i></div>
 </div></div>`
}
function applyFeatureViewLocks(){
 ['shop','pets','minigames','skins','casino','worlds','rebirth','awards'].forEach(id=>{
  let view=safe$('#view-'+id);if(!view)return;
  let existing=view.querySelector('.generated-feature-lock');
  if(!featureUnlocked(id)){
   if(!existing){
    let box=document.createElement('div');box.className='generated-feature-lock';box.innerHTML=featureLockCard(id);
    [...view.children].forEach(ch=>{if(ch!==box)ch.classList.add('feature-content-hidden')});
    view.prepend(box)
   }
   [...view.children].forEach(ch=>{if(!ch.classList.contains('generated-feature-lock'))ch.style.display='none'})
  }else{
   existing?.remove();
   [...view.children].forEach(ch=>ch.style.display='')
  }
 })
}


function renderHud(){
 refreshBossUnlockUi();try{
 const activeBoss=typeof boss!=='undefined'?boss:null;

 setTextSafe('#points',fmt(state.points));const playerTitle=safe$('#playerTitle');if(playerTitle)playerTitle.remove();
 if(safe$('#gems'))safe$('#gems').textContent=fmt(state.gems);
 if(safe$('#coins'))safe$('#coins').textContent=fmt(state.coins);
 $$('[data-bind="points"]').forEach(e=>e.textContent=fmt(state.points));
 $$('[data-bind="gems"]').forEach(e=>e.textContent=fmt(state.gems));$$('[data-bind="coins"]').forEach(e=>e.textContent=fmt(state.coins));
 setTextSafe('#perClick',fmt(clickValue()));setTextSafe('#pps',fmt(pps()));setTextSafe('#level',state.level);setTextSafe('#multiplier','x'+totalMultiplier().toFixed(2));
 {const el=safe$('#pps');if(el)el.textContent=fmt(pps());}
 {const el=safe$('#level');if(el)el.textContent=state.level;}
 {const el=safe$('#multiplier');if(el)el.textContent='x'+totalMultiplier().toFixed(2);}
 setStyleSafe('#xpBar','width',Math.min(100,state.xp/needXp()*100)+'%');setTextSafe('#expMult','x'+expMultiplier().toFixed(2));setTextSafe('#xpNeed',fmt(Math.max(0,needXp()-state.xp)));refreshComboDisplay();toggleClassSafe('#combo','hot',combo>=8);setCssPropertySafe('#aura','--combo',Math.min(100,combo/20*100)+'%');
 {const el=safe$('#expMult');if(el)el.textContent='x'+expMultiplier().toFixed(2);}
 {const el=safe$('#xpNeed');if(el)el.textContent=fmt(Math.max(0,needXp()-state.xp));}
 refreshComboDisplay();
 safe$('#combo').classList.toggle('hot',combo>=8);
 safe$('#aura').style.setProperty('--combo',Math.min(100,combo/20*100)+'%');
 setTextSafe('#quickClickCost','Koszt: '+fmt(state.clickCost));setTextSafe('#quickAutoCost','Koszt: '+fmt(state.autoCost));setDisabledSafe('#quickClick',state.points<state.clickCost);setDisabledSafe('#quickAuto',state.points<state.autoCost);
 {const el=safe$('#quickAutoCost');if(el)el.textContent='Koszt: '+fmt(state.autoCost);}
 safe$('#quickClick').disabled=state.points<state.clickCost;
 safe$('#quickAuto').disabled=state.points<state.autoCost;
 if(safe$('#playerTitle'))safe$('#playerTitle').remove();
 if(activeBoss)renderBoss();
}catch(error){console.error('renderHud:',error)}}
function trimEffects(){
 const limits=[['.float',8],['.skin-local-particle',30],['.weather-particle',20],['.world-particle',12],['.rain',55]];
 for(const [selector,max] of limits){
  const nodes=$$(selector);
  nodes.slice(0,Math.max(0,nodes.length-max)).forEach(n=>n.remove())
 }
}


function safeGameRender(name,callback){
 try{if(typeof callback==='function')callback()}
 catch(error){
  console.error(`Render ${name}:`,error);
  if(typeof saveDiagnostic==='function')saveDiagnostic('Render',`${name}: ${error.message}`,error.stack||'')
 }
}
function render(){ensureCosmeticUnlockAudit();syncClaimedAchievementRewards();
 if(typeof renderHud==='function'){try{renderHud()}catch(error){console.error('renderHud:',error)}}
 safe$('[data-bind="points"]')?.replaceChildren(document.createTextNode(fmt(state.points)));
 $$('[data-bind="gems"]').forEach(e=>e.textContent=fmt(state.gems));$$('[data-bind="coins"]').forEach(e=>e.textContent=fmt(state.coins));
 setTextSafe('#points',fmt(state.points));const playerTitle=safe$('#playerTitle');if(playerTitle)playerTitle.remove();
 if(safe$('#gems'))safe$('#gems').textContent=fmt(state.gems);if(safe$('#coins'))safe$('#coins').textContent=fmt(state.coins);
 setTextSafe('#perClick',fmt(clickValue()));setTextSafe('#pps',fmt(pps()));setTextSafe('#level',state.level);setTextSafe('#multiplier','x'+totalMultiplier().toFixed(2));
 setStyleSafe('#xpBar','width',Math.min(100,state.xp/needXp()*100)+'%');setTextSafe('#expMult','x'+expMultiplier().toFixed(2));setTextSafe('#xpNeed',fmt(Math.max(0,needXp()-state.xp)));refreshComboDisplay();toggleClassSafe('#combo','hot',combo>=8);setCssPropertySafe('#aura','--combo',Math.min(100,combo/20*100)+'%');
 setTextSafe('#quickClickCost','Koszt: '+fmt(state.clickCost));setTextSafe('#quickAutoCost','Koszt: '+fmt(state.autoCost));setDisabledSafe('#quickClick',state.points<state.clickCost);setDisabledSafe('#quickAuto',state.points<state.autoCost);
 setTextSafe('#rebirthGain',rebirthGain()+' 🟡');setDisabledSafe('#rebirthBtn',rebirthGain()<1);
 setTextSafe('#soundBtn',state.sound?'🔊':'🔇');setTextSafe('#musicBtn',state.music?'🎶':'🎵');
 document.body.dataset.world=state.world;
 let cw=world();document.documentElement.style.setProperty('--worldAccent',cw.accent||'#ff3e9d');
 setTextSafe('#worldEmoji',cw.emoji);setTextSafe('#worldName',cw.name);setTextSafe('#worldFlavor',cw.desc);
 if(typeof renderFeatureLocks==='function'){try{renderFeatureLocks()}catch(error){console.error('renderFeatureLocks:',error)}}applyFeatureViewLocks();if(typeof renderPatchNotes==='function'){try{renderPatchNotes()}catch(error){console.error('renderPatchNotes:',error)}}if(typeof renderCollection==='function'){try{renderCollection()}catch(error){console.error('renderCollection:',error)}}if(typeof renderDiagnostics==='function'){try{renderDiagnostics()}catch(error){console.error('renderDiagnostics:',error)}}if(typeof renderPets==='function'){try{renderPets()}catch(error){console.error('renderPets:',error)}}if(typeof renderShop==='function'){try{renderShop()}catch(error){console.error('renderShop:',error)}}if(typeof renderWorlds==='function'){try{renderWorlds()}catch(error){console.error('renderWorlds:',error)}}if(typeof renderSkins==='function'){try{renderSkins()}catch(error){console.error('renderSkins:',error)}}if(typeof renderCasino==='function'){try{renderCasino()}catch(error){console.error('renderCasino:',error)}}if(typeof renderMiniCooldowns==='function')if(typeof renderMiniCooldowns==='function'){try{renderMiniCooldowns()}catch(error){console.error('renderMiniCooldowns:',error)}}if(typeof renderMiniStats==='function'){try{renderMiniStats()}catch(error){console.error('renderMiniStats:',error)}}if(typeof renderAchievements==='function'){try{renderAchievements()}catch(error){console.error('renderAchievements:',error)}}safeGameRender('renderQuests',()=>typeof renderQuests==='function'&&renderQuests());renderStats();safeGameRender('renderSettingsStatistics',()=>typeof renderSettingsStatistics==='function'&&renderSettingsStatistics());safeGameRender('renderDaily',()=>typeof renderDaily==='function'&&renderDaily());safeGameRender('renderBoard',()=>typeof renderBoard==='function'&&renderBoard());applySkin();save()
 if(typeof refreshBossUnlockUi==='function')refreshBossUnlockUi();

 safeGameRender('renderCollection',()=>typeof renderCollection==='function'&&renderCollection());

 safeGameRender('renderProfileStyleSettings',()=>typeof renderProfileStyleSettings==='function'&&renderProfileStyleSettings());

 if(typeof applyTextureVariables==='function')applyTextureVariables();
 if(typeof refreshVisibleTextures==='function')refreshVisibleTextures();
}
function nextFeatureUnlock(){
 let entries=Object.entries(featureUnlocks).filter(([_,lvl])=>lvl>state.level).sort((a,b)=>a[1]-b[1]);
 return entries.length?`${entries[0][0]} — poziom ${entries[0][1]}`:'wszystko odblokowane'
}
function renderStats(){
 const box=safe$('#statsBox');
 if(!box)return
}

function upgradeCard(u){
 const lvl=u.get();
 const isMax=lvl>=u.max;
 const price=cost(u);
 const currency=currencyIcon(u.currency);
 const cardClass=u.permanent?'permanent-card':'temporary-card';

 return `<article class="card upgrade-card ${cardClass}">
  <div class="big">${u.icon}</div>
  <div class="upgrade-card-content">
   <h3>${u.name} <small>Lv.${lvl}/${u.max}</small></h3>
   <p class="muted">${u.desc}</p>
   <div class="price">
    ${isMax
      ?'<span class="upgrade-max">MAKSYMALNY POZIOM</span>'
      :`${fmt(price)} ${currency}`}
   </div>
  </div>
  <button class="buy-upgrade-btn"
   data-upgrade="${u.id}"
   ${isMax||state[u.currency]<price?'disabled':''}>
   ${isMax?'MAX':'Kup'}
  </button>
 </article>`
}

function bossUpgradeCards(){
 const damageLevel=state.bossDamageLevel||0;
 const blockerLevel=state.bossBlockerDelayLevel||0;
 const damageMax=damageLevel>=bossDamageUpgradeMax();
 const blockerMax=blockerLevel>=bossBlockerUpgradeMax();

 return `
  <article class="card upgrade-card temporary-card boss-upgrade-card">
   <div class="boss-upgrade-top">
    <div class="big boss-upgrade-icon">💥</div>
    <span class="upgrade-type-badge">BOSS</span>
   </div>
   <div class="upgrade-card-content">
    <h3>Siła przeciw bossom</h3>
    <p class="muted">+14% obrażeń zadawanych bossom za każdy poziom.</p>
    <div class="boss-level-row">
     <span>Poziom</span>
     <b>${damageLevel} / ${bossDamageUpgradeMax()}</b>
    </div>
    <div class="boss-upgrade-progress">
     <i style="width:${damageLevel/bossDamageUpgradeMax()*100}%"></i>
    </div>
    <div class="price">
     ${damageMax?'<span class="upgrade-max">MAKSYMALNY POZIOM</span>':`${fmt(bossDamageUpgradeCost())} ⭐`}
    </div>
   </div>
   <button class="buy-upgrade-btn boss-buy-btn" id="bossDamageUpgradeBtn"
    ${damageMax||state.points<bossDamageUpgradeCost()?'disabled':''}>
    ${damageMax?'MAX':'Kup ulepszenie'}
   </button>
  </article>

  <article class="card upgrade-card temporary-card boss-upgrade-card">
   <div class="boss-upgrade-top">
    <div class="big boss-upgrade-icon">⏳</div>
    <span class="upgrade-type-badge">BOSS</span>
   </div>
   <div class="upgrade-card-content">
    <h3>Opóźnienie blokad</h3>
    <p class="muted">Przeszkody bossa pojawiają się o 13% rzadziej za każdy poziom.</p>
    <div class="boss-level-row">
     <span>Poziom</span>
     <b>${blockerLevel} / ${bossBlockerUpgradeMax()}</b>
    </div>
    <div class="boss-upgrade-progress">
     <i style="width:${blockerLevel/bossBlockerUpgradeMax()*100}%"></i>
    </div>
    <div class="price">
     ${blockerMax?'<span class="upgrade-max">MAKSYMALNY POZIOM</span>':`${fmt(bossBlockerUpgradeCost())} ⭐`}
    </div>
   </div>
   <button class="buy-upgrade-btn boss-buy-btn" id="bossBlockerUpgradeBtn"
    ${blockerMax||state.points<bossBlockerUpgradeCost()?'disabled':''}>
    ${blockerMax?'MAX':'Kup ulepszenie'}
   </button>
  </article>`
}
function bindBossUpgradeButtons(){
 const damage=safe$('#bossDamageUpgradeBtn');
 const blocker=safe$('#bossBlockerUpgradeBtn');
 if(damage)damage.onclick=buyBossDamageUpgrade;
 if(blocker)blocker.onclick=buyBossBlockerUpgrade
}

function renderShop(){
 const temporaryGrid=safe$('#temporaryShopGrid');
 const gemGrid=safe$('#permanentGemShopGrid');
 const coinGrid=safe$('#permanentCoinShopGrid');
 if(!temporaryGrid||!gemGrid||!coinGrid)return;

 const temporary=upgrades.filter(u=>!u.permanent);
 const gemUpgrades=upgrades.filter(u=>u.permanent&&u.currency==='gems');
 const coinUpgrades=upgrades.filter(u=>u.permanent&&u.currency==='coins');

 temporaryGrid.innerHTML=temporary.map(upgradeCard).join('')+(typeof bossUpgradeCards==='function'?bossUpgradeCards():'');
 gemGrid.innerHTML=gemUpgrades.map(upgradeCard).join('');
 coinGrid.innerHTML=coinUpgrades.map(upgradeCard).join('');

 [temporaryGrid,gemGrid,coinGrid].forEach(grid=>grid.querySelectorAll('[data-upgrade]').forEach(button=>{
  button.onclick=()=>buyUpgrade(button.dataset.upgrade)
 }));
 if(typeof bindBossUpgradeButtons==='function')bindBossUpgradeButtons()
}
function buyUpgrade(id){if(!featureUnlocked('shop'))return toast(lockedFeatureMessage('shop'));let u=upgrades.find(x=>x.id===id);if(!u||u.get()>=u.max)return;let c=cost(u);if(state[u.currency]<c)return;state[u.currency]-=c;u.buy();sfx('buy');render()}

function renderPetInstance(instance){
 const base=getPetBase(instance),evo=PET_EVOLUTIONS[instance.evolution||0];
 const equipped=state.equipped.includes(instance.uid);
 const needed=instance.level>=50?1:petXpNeeded(instance.level);
 const pct=instance.level>=50?100:Math.min(100,(instance.xp||0)/needed*100);
 return`<div class="pet-instance ${equipped?'equipped':''}" style="--evo:${evo.color}">
  <div class="pet-instance-icon">${base.emoji}</div>
  <div class="pet-instance-main">
   <div class="pet-instance-title"><b>${petDisplayName(instance)}</b><span>Lv.${instance.level}</span></div>
   <div class="pet-instance-meta">${base.rarity.toUpperCase()} • ${evo.short} • x${petInstanceMultiplier(instance).toFixed(2)}</div>
   <div class="pet-xp"><i style="width:${pct}%"></i></div>
   <small>${instance.level>=50?'MAX LEVEL':`${Math.floor(instance.xp||0)}/${needed} EXP`}</small>
  </div>
  <div class="pet-instance-actions">
   <button class="small-btn" onclick="togglePetInstance('${instance.uid}')">${equipped?'Zdejmij':'Wyposaż'}</button>
   <button class="small-btn pet-delete" onclick="deletePetInstance('${instance.uid}')">Usuń</button>
  </div>
 </div>`
}

function ensurePetState(){
 state.pets=Array.isArray(state.pets)?state.pets:[];
 state.equipped=Array.isArray(state.equipped)?state.equipped:[];
 const valid=new Set(state.pets.map(p=>p?.uid||p?.instanceId||p?.id).filter(Boolean));
 state.equipped=[...new Set(state.equipped.filter(uid=>valid.has(uid)))].slice(0,3)
}
function renderPets(){syncClaimedAchievementRewards();
 try{
  sanitizeEquippedPets();
  const setText=(s,v)=>{const el=safe$(s);if(el)el.textContent=v};
  setText('#petDot',state.pets.length);
  setText('#equippedCount',state.equipped.length+'/'+maxPetSlots());
  setText('#petBonus','x'+petMultiplier().toFixed(2));
  setText('#petExpBonus','x'+petExpMultiplier().toFixed(2));

  const orbit=safe$('#petOrbit');
  if(orbit){
   const signature=state.equipped.join('|');
   if(orbit.dataset.signature!==signature){
    orbit.dataset.signature=signature;
    orbit.innerHTML=state.equipped.map((uid,index)=>{
     const instance=getPetInstance(uid),base=getPetBase(instance),evo=PET_EVOLUTIONS[instance?.evolution||0];
     return instance?`<span class="orbit-pet rarity-${base.rarity}" style="--orbit-index:${index};--orbit-count:${Math.max(1,state.equipped.length)};filter:drop-shadow(0 0 ${8+instance.evolution*5}px ${evo.color})">${base.emoji}</span>`:''
    }).join('')
   }
  }

  const container=safe$('#petGroups')||safe$('#petGrid')||safe$('#petsGrid');
  if(!container)return;

  const html=pets.map(base=>{
   const instances=state.pets.filter(p=>p.type===base.id).sort((a,b)=>b.evolution-a.evolution||b.level-a.level);
   if(!instances.length)return'';
   const fusion=[0,1,2].map(tier=>{
    const available=instances.filter(p=>p.evolution===tier&&!state.equipped.includes(p.uid)).length;
    const next=PET_EVOLUTIONS[tier+1];
    return`<button class="small-btn fusion-btn" onclick="fusePets('${base.id}',${tier})" ${available<3?'disabled':''}>Połącz 3× ${PET_EVOLUTIONS[tier].short} → ${next.short} <small>(${available}/3)</small></button>`
   }).join('');
   return`<div class="pet-group card rarity-${base.rarity}">
    <div class="pet-group-head"><div class="big">${base.emoji}</div><div><h3>${base.name}</h3><p class="muted">${base.rarity.toUpperCase()} • bazowo x${base.mult.toFixed(2)} • egzemplarze: ${instances.length}</p></div></div>
    <div class="pet-instance-list">${instances.map(renderPetInstance).join('')}</div>
    <div class="fusion-row">${fusion}</div>
   </div>`
  }).join('');

  container.innerHTML=html||'<div class="card pet-empty-state">🐾 Nie masz jeszcze petów. Otwórz jajko, aby zdobyć pierwszego.</div>'
 }catch(error){
  console.error('renderPets:',error);
  const container=safe$('#petGroups')||safe$('#petGrid')||safe$('#petsGrid');
  if(container)container.innerHTML='<div class="card pet-empty-state">Nie udało się wyświetlić petów. Sprawdź diagnostykę.</div>'
 }
}
function togglePetInstance(uid){
 const instance=getPetInstance(uid);if(!instance)return;
 if(state.equipped.includes(uid))state.equipped=state.equipped.filter(x=>x!==uid);
 else if(state.equipped.length<maxPetSlots())state.equipped.push(uid);
 else return toast('Brak wolnego slotu na peta');
 render()
}
function deletePetInstance(uid){
 const instance=getPetInstance(uid);if(!instance)return;
 const name=petDisplayName(instance);
 if(!confirm(`Na pewno usunąć peta „${name}” (Lv.${instance.level})? Tej operacji nie można cofnąć.`))return;
 state.equipped=state.equipped.filter(x=>x!==uid);
 state.pets=state.pets.filter(p=>p.uid!==uid);
 toast('Pet został usunięty');render()
}
function fusePets(type,tier){
 if(tier>=3)return;
 const candidates=state.pets.filter(p=>p.type===type&&p.evolution===tier&&!state.equipped.includes(p.uid))
  .sort((a,b)=>a.level-b.level||a.xp-b.xp).slice(0,3);
 if(candidates.length<3)return toast('Potrzebujesz 3 niewyposażonych petów tego samego poziomu ewolucji');
 const base=pets.find(p=>p.id===type),next=PET_EVOLUTIONS[tier+1];
 if(!confirm(`Połączyć 3 pety „${base.name}” w formę ${next.name}? Zużyte pety znikną.`))return;
 const ids=new Set(candidates.map(p=>p.uid));
 const newPet={
  uid:createPetUid(),type,evolution:tier+1,
  level:Math.max(...candidates.map(p=>p.level)),
  xp:Math.floor(candidates.reduce((s,p)=>s+(p.xp||0),0)/3)
 };
 state.pets=state.pets.filter(p=>!ids.has(p.uid));
 state.pets.push(newPet);
 confetti();sfx('good');toast(`Ewolucja udana: ${next.name}!`);render()
}
function weightedPet(){let petLuck=(state.luck||0)*.08+(state.petExpBonus||0)*.04+(state.achievementBonuses?.petLuck||0);let adjusted=pets.map((p,i)=>({...p,w:p.chance*Math.pow(1+petLuck,i/2)})),total=adjusted.reduce((a,p)=>a+p.w,0),r=Math.random()*total,sum=0;for(let p of adjusted){sum+=p.w;if(r<=sum)return p}return pets[0]}
function openCrate(){
 if(!featureUnlocked('pets'))return toast(lockedFeatureMessage('pets'));
 const eggCost=30;
 if(state.gems<eggCost)return toast(`Potrzebujesz ${eggCost} diamentów`);
 const base=weightedPet();
 const instance={uid:createPetUid(),type:base.id,level:1,xp:0,evolution:0};
 state.gems-=eggCost;state.eventStats.crates++;
 const overlay=safe$('#crateOverlay'),egg=safe$('#petEgg'),glow=safe$('#eggGlow');
 overlay.classList.add('show');safe$('#crateTitle').textContent='Jajko zaczyna się ruszać…';safe$('#petRevealIcon').textContent='❔';safe$('#petRevealRarity').textContent='';safe$('#crateResult').textContent='';safe$('#crateClose').classList.add('hidden');
 egg.className='pet-egg hatching';egg.innerHTML='<span>?</span>';glow.classList.remove('show');sfx('buy');
 setTimeout(()=>{egg.classList.add('cracking');safe$('#crateTitle').textContent='Coś jest w środku…';safe$('#petRevealIcon').textContent='✨';tone(180,.09,'square',.035);tone(240,.08,'square',.028,.1)},900);
 setTimeout(()=>{
  egg.classList.remove('hatching');egg.classList.add('opened');glow.classList.add('show');egg.innerHTML=`<span>${base.emoji}</span>`;state.pets.push(instance);
  {const el=safe$('#petRevealIcon');if(el)el.textContent=base.emoji;safe$('#crateTitle').textContent=base.name;safe$('#petRevealRarity').textContent=base.rarity.toUpperCase();safe$('#crateResult').innerHTML=`Mnożnik: <b>x${base.mult}</b><br>Nowy osobny egzemplarz`;}
  safe$('#crateClose').classList.remove('hidden');
  const rare=['legendary','mythic','secret'].includes(base.rarity);sfx(rare?'good':'buy');if(rare)confetti();render()
 },1900)
}

function renderWorldPath(){}

function migrateWorldAvailability(){
 state.availableWorlds=Array.isArray(state.availableWorlds)?state.availableWorlds:['neon'];
 state.unlockedWorlds=Array.isArray(state.unlockedWorlds)?state.unlockedWorlds:['neon'];
 state.worldBossesDefeated=Array.isArray(state.worldBossesDefeated)?state.worldBossesDefeated:[];

 worlds.forEach((w,idx)=>{
  if(idx===0)return;
  const prev=worlds[idx-1];
  if(isWorldBossDefeated(prev.id)&&!state.unlockedWorlds.includes(w.id)&&!state.availableWorlds.includes(w.id)){
   state.availableWorlds.push(w.id)
  }
 })
}

function renderWorlds(){migrateWorldAvailability();

 safe$('#worldGrid').innerHTML=worlds.map((w,i)=>{
  let unlocked=state.unlockedWorlds.includes(w.id),active=state.world===w.id;
  let cur=currencyIcon(w.currency),rebirthLocked=state.rebirths<w.rebirths,fundsLocked=state[w.currency]<w.cost,levelLocked=state.level<w.minLevel;
  let bossGate=!canUnlockWorld(w);
  let reqs=[];
  if(w.minLevel>1)reqs.push(`⭐ Poziom ${w.minLevel}`);
  if(w.rebirths>0)reqs.push(`♻️ ${w.rebirths} rebirth${w.rebirths===1?'':'ów'}`);
  if(w.requiresBoss)reqs.push(`⚔️ Boss: ${worlds.find(x=>x.id===w.requiresBoss)?.bossName||w.requiresBoss}`);
  let req=reqs.length?`<div class="world-requirement">${reqs.join(' • ')}</div>`:'';
  let bossDone=worldBossDefeated(w.id);
  ensureWorldBossProgress(w.id);
  let bossUnlockCurrent=worldBossUnlockProgress(w),bossUnlockTarget=worldBossUnlockTarget(w),bossUnlocked=bossUnlockCurrent>=bossUnlockTarget;
  let bossStatus=bossDone
   ?`<div class="world-boss-status done">✅ ${w.bossEmoji} ${w.bossName} • Pokonano ${bossKillCount(w.id)}×</div>`
   :`<div class="world-boss-unlock ${bossUnlocked?'ready':''}">
      <div><span>Odblokowanie walki</span><b>${fmt(Math.min(bossUnlockCurrent,bossUnlockTarget))} / ${fmt(bossUnlockTarget)} ⭐</b></div>
      <div class="world-boss-unlock-bar"><i style="width:${Math.min(100,bossUnlockCurrent/bossUnlockTarget*100)}%"></i></div>
      <small>${bossUnlocked?'⚔️ Walka odblokowana':'Zdobywaj punkty w tym świecie'}</small>
     </div>`;
  let label=active?'Aktywny':unlocked?'Wejdź':bossGate?'Pokonaj poprzedniego bossa':levelLocked?'Za niski poziom':rebirthLocked?'Za mało rebirthów':w.cost===0?'Odblokuj':`Odblokuj za ${fmt(w.cost)} ${cur}`;
  return`<div class="card world-card ${w.cls} ${(levelLocked||bossGate)&&!unlocked?'level-locked':''}">
   <div class="big">${w.emoji}</div><h3>${w.name}</h3>
   <p class="world-story">${w.desc}</p>
   <div class="world-bonuses"><span>⭐ x${w.mult}</span><span>💎 x${w.gemMult.toFixed(2)}</span><span>🟡 x${w.coinMult.toFixed(2)}</span><span>🐾 x${w.petMult.toFixed(2)}</span></div>
   ${bossStatus}${req}
   <button onclick="selectWorld('${w.id}')" ${!unlocked&&(bossGate||levelLocked||rebirthLocked||fundsLocked)?'disabled':''}>${label}</button>
  </div>`
 }).join('')
}
function selectWorld(id){
 const w=worlds.find(x=>x.id===id);
 if(!w)return;

 let newlyUnlocked=false;
 if(!state.unlockedWorlds.includes(id)){
  const idx=worldIndex(id);
  const previousBossOk=
   idx===0
   ||isWorldBossDefeated(worlds[idx-1].id)
   ||(state.availableWorlds||[]).includes(id);

  if(!previousBossOk)return toast('Najpierw pokonaj bossa poprzedniego świata');
  if(state.level<w.minLevel)return toast('Potrzebujesz poziomu '+w.minLevel);
  if(state.rebirths<w.rebirths)return toast('Potrzebujesz '+w.rebirths+' rebirthów');
  if(state[w.currency]<w.cost)return toast('Masz za mało '+currencyIcon(w.currency));

  state[w.currency]-=w.cost;
  state.unlockedWorlds.push(id);
  state.availableWorlds=(state.availableWorlds||[]).filter(worldId=>worldId!==id);
  newlyUnlocked=true;
  toast('Odblokowano '+w.name+'!')
 }

 state.world=id;
 ensureWorldBossProgress(id);
 showWorldTransition(w,newlyUnlocked);
 refreshBossUnlockUi();
 save();
 render()
}
function achievementRewardLabel(a){
 const currency=a.reward?.[0]==='gems'?'💎':a.reward?.[0]==='coins'?'🟡':'⭐';
 const base=a.reward?`${a.reward[1]} ${currency}`:'Brak waluty';
 return a.special?`${base} + ${a.special.name}`:base
}


function ensureCosmeticUnlockAudit(){
 state.cosmeticUnlockAudit={
  frames:["default", "arcade", "collector", "developer"],
  backgrounds:["default", "wealth", "casino", "reflex"],
  skins:["banana", "classic", "cyber", "dev", "glitch", "gold", "ice", "lava", "matrix", "rainbow", "toxic", "void"]
 }
}




function getAchievementSpecialReward(achievement){
 if(!achievement)return null;

 return achievement.special||
  achievement.specialReward||
  achievement.rewardSpecial||
  achievement.reward_item||
  achievement.unlock||
  (achievement.reward&&typeof achievement.reward==='object'
   ?achievement.reward:null)||
  (achievement.petReward
   ?{type:'pet',id:achievement.petReward}:null)||
  (achievement.frameReward
   ?{type:'frame',id:achievement.frameReward}:null)||
  (achievement.backgroundReward
   ?{type:'background',id:achievement.backgroundReward}:null)||
  (achievement.skinReward
   ?{type:'skin',id:achievement.skinReward}:null)
}

function ensureAchievementRewardCollections(){
 state.ownedProfileFrames=Array.isArray(state.ownedProfileFrames)
  ?state.ownedProfileFrames:['default'];
 state.ownedProfileBackgrounds=Array.isArray(state.ownedProfileBackgrounds)
  ?state.ownedProfileBackgrounds:['default'];
 state.ownedSkins=Array.isArray(state.ownedSkins)
  ?state.ownedSkins:['classic'];
 state.pets=Array.isArray(state.pets)?state.pets:[];
 state.discoveredPets=Array.isArray(state.discoveredPets)
  ?state.discoveredPets:[];
 state.petCollection=Array.isArray(state.petCollection)
  ?state.petCollection:[]
}

function addPetRewardToCollection(petId){
 if(!petId)return false;
 ensureAchievementRewardCollections();

 const alreadyOwned=state.pets.some(pet=>
  pet?.petId===petId||
  pet?.id===petId||
  pet?.type===petId
 );

 if(!alreadyOwned){
  state.pets.push({
   uid:crypto.randomUUID?.()||
    ('achievement_pet_'+Date.now()+'_'+Math.random().toString(36).slice(2)),
   petId,
   id:petId,
   level:1,
   exp:0,
   evolution:0,
   source:'achievement'
  })
 }

 if(!state.discoveredPets.includes(petId)){
  state.discoveredPets.push(petId)
 }
 if(!state.petCollection.includes(petId)){
  state.petCollection.push(petId)
 }

 return true
}

function grantAchievementRewardSafe(achievement){
 const reward=getAchievementSpecialReward(achievement);
 if(!reward)return false;

 ensureAchievementRewardCollections();

 const type=String(reward.type||reward.kind||'').toLowerCase();
 const id=
  reward.id||
  reward.petId||
  reward.skinId||
  reward.frameId||
  reward.backgroundId;

 if(type==='pet')return addPetRewardToCollection(id);

 if(type==='frame'){
  if(id&&!state.ownedProfileFrames.includes(id)){
   state.ownedProfileFrames.push(id)
  }
  return !!id
 }

 if(type==='background'||type==='profilebackground'){
  if(id&&!state.ownedProfileBackgrounds.includes(id)){
   state.ownedProfileBackgrounds.push(id)
  }
  return !!id
 }

 if(type==='skin'){
  if(id&&!state.ownedSkins.includes(id)){
   state.ownedSkins.push(id)
  }
  return !!id
 }

 if(type==='diamonds'||type==='gems'){
  const amount=Number(reward.amount??reward.value)||0;
  state.gems=(Number(state.gems)||0)+amount;
  return amount>0
 }

 if(type==='noobcoins'||type==='coins'){
  const amount=Number(reward.amount??reward.value)||0;
  state.coins=(Number(state.coins)||0)+amount;
  return amount>0
 }

 if(type==='multiplier'){
  state.achievementMultipliers=state.achievementMultipliers||{};
  if(id){
   state.achievementMultipliers[id]=Math.max(
    Number(state.achievementMultipliers[id])||1,
    Number(reward.value)||1
   )
  }
  return !!id
 }

 return false
}

function achievementIsClaimed(achievement){
 const id=achievement?.id;
 if(!id)return false;

 return [
  state.claimedAchievements,
  state.achievementsClaimed,
  state.unlockedAchievements,
  state.achievements
 ].some(collection=>
  Array.isArray(collection)&&collection.includes(id)
 )
}

function syncClaimedAchievementRewards(){
 if(typeof achievements==='undefined'||!Array.isArray(achievements))return;

 achievements.forEach(achievement=>{
  if(achievementIsClaimed(achievement)){
   grantAchievementRewardSafe(achievement)
  }
 })
}

function isSecretAchievement(achievement){
 return !!(
  achievement?.secret||
  achievement?.isSecret||
  achievement?.hidden||
  achievement?.visibility==='secret'
 )
}

function isAchievementUnlocked(achievement){
 if(!achievement)return false;
 if(achievementIsClaimed(achievement))return true;

 const id=achievement.id;
 return [
  state.unlockedAchievements,
  state.completedAchievements,
  state.achievementUnlocks
 ].some(collection=>
  Array.isArray(collection)&&collection.includes(id)
 )
}

function renderAchievements(){syncClaimedAchievementRewards();syncClaimedAchievementRewards();
 const grid=safe$('#achievementGrid');if(!grid)return;
 const category=state.achievementCategory||'all';
 const search=(state.achievementSearch||'').toLowerCase();
 const sort=state.achievementSort||'ready';

 let list=achievements.filter(a=>(!isSecretAchievement(a)||isAchievementUnlocked(a))&&(category==='all'||a.category===category)&&(!search||(a.name+' '+a.desc).toLowerCase().includes(search)));
 const info=a=>{
  const current=Math.max(0,Number(typeof a.progress==='function'?a.progress():(a.test()?1:0))||0);
  const target=Math.max(1,Number(a.target||1));
  return{current,target,pct:Math.min(100,current/target*100),done:a.test(),claimed:state.claimedAchievements.includes(a.id)}
 };
 list.sort((a,b)=>{
  const A=info(a),B=info(b);
  if(sort==='ready')return Number(B.done&&!B.claimed)-Number(A.done&&!A.claimed)||B.pct-A.pct;
  if(sort==='closest')return B.pct-A.pct;
  if(sort==='claimed')return Number(B.claimed)-Number(A.claimed);
  return Number(A.done)-Number(B.done)||B.pct-A.pct
 });

 grid.innerHTML=list.map(a=>{
  const x=info(a);
  return `<article class="achievement ${x.done?'done':''} ${x.claimed?'claimed':''}">
   <div class="achievement-main"><div class="badge">${a.icon}</div><div class="achievement-copy">
    <div class="achievement-category-label">${a.category}</div><h3>${a.name}</h3><p class="muted">${a.desc}</p>
    <div class="achievement-progress"><i style="width:${x.pct}%"></i></div>
    <div class="achievement-progress-label"><span>${fmt(Math.min(x.current,x.target))} / ${fmt(x.target)}</span><span>${achievementRewardLabel(a)}</span></div>
   </div></div>
   <button class="achievement-claim-btn ${x.done&&!x.claimed?'ready':''}" onclick="claimAchievement('${a.id}')" ${!x.done||x.claimed?'disabled':''}>${x.claimed?'✓ Odebrane':x.done?'Odbierz nagrodę':'Zablokowane'}</button>
  </article>`
 }).join('')||'<div class="card muted">Brak osiągnięć pasujących do filtra.</div>';

 $$('.achievement-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.achievementCategory===category));
 const searchBox=safe$('#achievementSearch');if(searchBox&&searchBox.value!==state.achievementSearch)searchBox.value=state.achievementSearch||'';
 const sortBox=safe$('#achievementSort');if(sortBox)sortBox.value=sort
}



function grantAchievementSpecial(a){if(grantAchievementRewardSafe(a))return;if(grantAchievementRewardSafe(a))return;
 if(!a.special)return;
 const s=a.special;
 if(s.type==='frame'){
  state.ownedProfileFrames=state.ownedProfileFrames||['default'];
  if(!state.ownedProfileFrames.includes(s.id))state.ownedProfileFrames.push(s.id);
  state.profileFrame=s.id
 }
 if(s.type==='background'){
  state.ownedProfileBackgrounds=state.ownedProfileBackgrounds||['default'];
  if(!state.ownedProfileBackgrounds.includes(s.id))state.ownedProfileBackgrounds.push(s.id);
  state.profileBackground=s.id
 }
 if(s.type==='bonus'){
  state.achievementBonuses=state.achievementBonuses||{};
  state.achievementBonuses[s.key]=Math.max(state.achievementBonuses[s.key]||0,s.value)
 }
 if(s.type==='pet'&&!state.specialPetClaimed){
  state.pets.push({uid:createPetUid(),type:'overlord',level:50,xp:0,evolution:3,special:true,mult:9.2,petLuck:.05});
  state.specialPetClaimed=true;
  state.achievementBonuses.petLuck=Math.max(state.achievementBonuses.petLuck||0,.05)
 }
}
function claimAchievement(id){let a=achievements.find(x=>x.id===id);if(!a||!a.test()||state.claimedAchievements.includes(id))return;if(a.reward)state[a.reward[0]]+=a.reward[1];grantAchievementSpecial(a);state.claimedAchievements.push(id);syncProfileStyleRewardsFromAchievements();renderProfileStyleSettings();renderLiveProfilePreview();sfx('good');render();save()}
function renderDaily(){let today=Math.floor(Date.now()/86400000),last=Math.floor(state.lastDaily/86400000),can=today>last,rewards=[1,2,3,5,7,10,20];safe$('#dailyGrid').innerHTML=rewards.map((r,i)=>`<div class="daily ${i===state.dailyStreak%7?'today':''}"><b>Dzień ${i+1}</b><div>💎 ${r}</div></div>`).join('');safe$('#dailyBtn').disabled=!can;safe$('#dailyBtn').textContent=can?'Odbierz nagrodę':'Wróć jutro'}
function claimDaily(){let today=Math.floor(Date.now()/86400000),last=Math.floor(state.lastDaily/86400000);if(today<=last)return;if(today-last>1)state.dailyStreak=0;let rewards=[1,2,3,5,7,10,20],r=rewards[state.dailyStreak%7];state.gems+=r;state.dailyStreak++;state.lastDaily=Date.now();confetti();sfx('good');toast('Dzienna nagroda: +'+r+' 💎');render()}


function spawnSkinParticles(intensity=1){
 trimEffects();
 const host=safe$('#skinParticles');
 if(!host)return;

 const skin=skins.find(s=>s.id===state.activeSkin)||skins[0];
 const rarityCount={common:1,rare:2,epic:3,legendary:4,mythic:6,secret:7};
 const count=Math.max(1,Math.floor((rarityCount[skin.rarity]||1)*Math.min(2,intensity)));

 for(let i=0;i<count;i++){
  const particle=document.createElement('span');
  particle.className='skin-local-particle';
  particle.textContent=rand(skin.particles||['✨']);

  const angle=Math.random()*Math.PI*2;
  const distance=50+Math.random()*85;
  particle.style.setProperty('--x',Math.cos(angle)*distance+'px');
  particle.style.setProperty('--y',Math.sin(angle)*distance+'px');
  particle.style.setProperty('--rot',(Math.random()*540-270)+'deg');
  particle.style.setProperty('--dur',(.65+Math.random()*.45)+'s');
  particle.style.color=skin.color||'#fff';
  particle.style.fontSize=(14+Math.random()*14)+'px';

  host.append(particle);
  setTimeout(()=>particle.remove(),1200)
 }

 if(skin.id==='gold'){
  for(let i=0;i<3;i++){
   setTimeout(()=>{
    const coin=document.createElement('span');
    coin.className='skin-local-particle';
    coin.textContent=rand(['🪙','💰','✨']);
    coin.style.setProperty('--x',(Math.random()*80-40)+'px');
    coin.style.setProperty('--y',(55+Math.random()*65)+'px');
    coin.style.setProperty('--rot',(Math.random()*500-250)+'deg');
    coin.style.setProperty('--dur','1.1s');
    host.append(coin);
    setTimeout(()=>coin.remove(),1300)
   },i*45)
  }
 }
}

function doClick(e){
let now=performance.now();combo=now-lastClick<470?Math.min(50,combo+1):1;lastClick=now;state.bestCombo=Math.max(state.bestCombo,combo);state.totalClicks++;
 let crit=Math.random()<Math.min(.32,.05+state.crit*.02),gain=clickValue()*(crit?5:1);queueManualClickReward(gain,typeof critical!=='undefined'?critical:false,typeof event!=='undefined'?event.clientX:null,typeof event!=='undefined'?event.clientY:null);if(boss)damageBoss(gain);grantPetXp(.08);addXp((1+Math.floor(combo/10))*(1+(state.comboExp||0)*Math.min(combo,25)*.006));
 if(Math.random()<Math.min(.08,.004+state.gemChance*.004)){state.gems++;toast('Znalazłeś diament! 💎')}
 let r=safe$('#clicker').getBoundingClientRect();floating(e?.clientX||r.left+r.width/2,e?.clientY||r.top+r.height/2,crit?'KRYTYK x5':undefined,crit);
 let b=safe$('#clicker');b.classList.remove('hit');void b.offsetWidth;b.classList.add('hit');if(crit)sfx('crit');else skinClickSound();spawnSkinParticles(crit?1.7:1);
 if(crit){safe$('#mainPanel').classList.add('shake');setTimeout(()=>safe$('#mainPanel').classList.remove('shake'),190);safe$('#message').textContent='💥 Krytyczny noob! +'+fmt(gain)}
 let rainAt=Math.max(5,8-(state.rainSpeed||0));if(combo>=rainAt&&combo%rainAt===0){let bonus=clickValue()*combo*(1+state.rain*.35);addPoints(bonus);noobRain();safe$('#message').textContent='🌧️ Deszcz noobków! +'+fmt(bonus)}
 if(typeof renderHud==='function'){try{renderHud()}catch(error){console.error('renderHud:',error)}}trimEffects()
}
function quickBuy(type){if(type==='click'&&state.points>=state.clickCost){state.points-=state.clickCost;state.perClick++;state.clickCost=Math.ceil(state.clickCost*1.72);sfx('buy')}if(type==='auto'&&state.points>=state.autoCost){state.points-=state.autoCost;state.auto++;state.autoCost=Math.ceil(state.autoCost*1.9);sfx('buy')}render()}
function rebirth(){
 if(!featureUnlocked('rebirth'))return toast(lockedFeatureMessage('rebirth'));
 const gain=rebirthGain();
 if(gain<1)return toast('Potrzebujesz co najmniej 250K punktów');
 if(!confirm('Zresetować punkty, poziom i podstawowe ulepszenia za '+gain+' Noob Coinów? Permanentne ulepszenia zostaną.'))return;

 state.coins+=gain;
 state.rebirths++;
 grantPetXp(100,true);
 Object.assign(state,{
  points:0,level:1,xp:0,
  perClick:1,auto:0,clickCost:20,autoCost:75,
  crit:0,rain:0,autoBoost:0,clickBurst:0,
  world:'neon'
 });

 confetti();sfx('good');
 toast('Rebirth wykonany! Permanentne ulepszenia zostały zachowane.');
 showView('game');render()
}

function startEvent(){
 let events=[
  {name:'⭐ Podwójne punkty',desc:'Wszystkie punkty x2!',mult:2,dur:30},
  {name:'🔥 Super Combo',desc:'Combo rośnie dwa razy szybciej.',mult:1.5,dur:25},
  {name:'👑 Golden Noob',desc:'Kliknięcia dają x5 punktów!',mult:5,dur:15},
  {name:'💎 Diamentowa gorączka',desc:'Większa szansa na diamenty.',mult:1.25,dur:25}
 ],ev=rand(events);currentEvent=ev;eventMultiplier=ev.mult;eventEnds=Date.now()+ev.dur*1000;state.eventStats.golden++;safe$('#eventTitle').textContent=ev.name;safe$('#eventDesc').textContent=ev.desc;toast(ev.name);confetti();render()
}
function tickEvent(){let left=Math.max(0,Math.ceil((eventEnds-Date.now())/1000));safe$('#eventTimer').textContent='00:'+String(left).padStart(2,'0');if(left<=0){if(currentEvent){currentEvent=null;eventMultiplier=1;safe$('#eventTitle').textContent='✨ Następny event';safe$('#eventDesc').textContent='Losowy bonus pojawi się za chwilę.';eventEnds=Date.now()+45000;render()}else startEvent()}}


function renderMiniStats(){
 const setText=(selector,value)=>{
  const el=safe$(selector);
  if(el)el.textContent=value
 };

 const records=state.minigameRecords||{};
 setText('#aimBest',((Number(records.aim)||0)/100).toFixed(1)+'%');
 setText('#parkourBest',fmt(Number(records.parkour)||0)+' m');
 setText('#reflexBest',fmt(Number(records.reflex)||0));
 setText('#dodgeBest',fmt(Number(records.dodge)||0));const grades=state.minigameBestGrades||{};setText('#aimBestGrade',grades.aim||'-');setText('#parkourBestGrade',grades.parkour||'-');setText('#reflexBestGrade',grades.reflex||'-');setText('#dodgeBestGrade',grades.dodge||'-');

 // Zgodność ze starym interfejsem, jeśli któryś element nadal istnieje.
 setText('#memoryBest',fmt(Number(state.memoryBest)||0));
 setText('#medals',fmt(Number(state.medals)||0));
}



function safeOpenCase(type='gold'){
 try{
  const normalized=String(type||'gold').toLowerCase();

  if(typeof openSkinCase==='function')return openSkinCase(normalized);
  if(typeof openCrate==='function')return openCrate(normalized);
  if(typeof openLootCase==='function')return openLootCase(normalized);

  if(normalized==='gold'){
   const price=Number(state.goldCasePrice||250);
   if((state.gems||0)<price)return toast(`Potrzebujesz ${price} 💎`);

   state.gems-=price;

   const pool=skins.filter(skin=>skin.id!=='dev');
   const weights={common:420,uncommon:280,rare:160,epic:80,legendary:40,mythic:18,secret:2};
   const total=pool.reduce((sum,skin)=>sum+(weights[skin.rarity]||10),0);
   let roll=Math.random()*total;
   let won=pool[0]||skins[0];

   for(const skin of pool){
    roll-=weights[skin.rarity]||10;
    if(roll<=0){won=skin;break}
   }

   const duplicate=state.ownedSkins.includes(won.id);
   if(duplicate)state.gems+=10;
   else state.ownedSkins.push(won.id);

   if(typeof showSkinOpening==='function')showSkinOpening(won,duplicate);
   else if(typeof showCaseResult==='function')showCaseResult(won,duplicate);
   else toast(duplicate?`Powtórka: ${won.name} • +10 💎`:`Zdobyto skin: ${won.name}`);

   if(typeof sfx==='function')sfx(duplicate?'buy':'good');
   save();
   render();
   return won
  }

  toast('Ta skrzynka nie jest jeszcze dostępna');
  return null
 }catch(error){
  console.error('safeOpenCase:',error);
  if(typeof saveDiagnostic==='function')saveDiagnostic('Case opening',error.message,error.stack||'');
  toast('Nie udało się otworzyć skrzynki');
  return null
 }
}

function openGoldCase(){return safeOpenCase('gold')}
function openBasicCase(){return safeOpenCase('basic')}
function openSilverCase(){return safeOpenCase('silver')}
function openDiamondCase(){return safeOpenCase('diamond')}

window.safeOpenCase=safeOpenCase;
window.openGoldCase=openGoldCase;
window.openBasicCase=openBasicCase;
window.openSilverCase=openSilverCase;
window.openDiamondCase=openDiamondCase;

function renderSkins(){
 const grid=safe$('#skinGrid');
 const activeName=safe$('#activeSkinName');
 const ownedCount=safe$('#ownedSkinCount');
 const navDot=safe$('#skinDot');

 state.ownedSkins=Array.isArray(state.ownedSkins)?state.ownedSkins:['classic'];
 if(!state.ownedSkins.includes('classic'))state.ownedSkins.unshift('classic');
 if(!skins.some(s=>s.id===state.activeSkin)||!state.ownedSkins.includes(state.activeSkin))state.activeSkin='classic';

 const selected=skins.find(s=>s.id===state.activeSkin)||skins[0];
 if(activeName)activeName.textContent=selected.name;
 if(ownedCount)ownedCount.textContent=state.ownedSkins.filter(id=>skins.some(s=>s.id===id)).length;
 if(navDot)navDot.textContent=state.ownedSkins.filter(id=>skins.some(s=>s.id===id)).length;
 if(!grid)return;

 const rarityOrder={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,secret:6};
 const rarityNames={common:'COMMON',uncommon:'UNCOMMON',rare:'RARE',epic:'EPIC',legendary:'LEGENDARY',mythic:'MYTHIC',secret:'DEVELOPER'};
 const filter=state.skinFilter||'all';

 const visible=skins.filter(skin=>{
  const owned=state.ownedSkins.includes(skin.id);
  return filter==='all'||(filter==='owned'&&owned)||(filter==='locked'&&!owned)
 }).sort((a,b)=>(rarityOrder[a.rarity]??99)-(rarityOrder[b.rarity]??99)||a.name.localeCompare(b.name,'pl'));

 const groups=[...new Set(visible.map(s=>s.rarity))];
 grid.innerHTML=groups.map(rarity=>{
  const cards=visible.filter(s=>s.rarity===rarity).map(skin=>{
   const owned=state.ownedSkins.includes(skin.id);
   const equipped=state.activeSkin===skin.id;
   const hasArenaEffect=(rarityOrder[skin.rarity]??0)>=3;
   return `<article class="card skin-card ${equipped?'active':''} ${owned?'owned':'locked'}" style="--skinColor:${skin.color||'#fff'}">
    <div class="skin-preview">${skin.emoji||'🙂'}</div>
    <div class="skin-rarity rarity-${skin.rarity}">${rarityNames[skin.rarity]||skin.rarity.toUpperCase()}</div>
    <h3>${safeText(skin.name)}</h3>
    <p class="muted">${safeText(skin.desc||'')}</p>
    ${hasArenaEffect?'<div class="skin-arena-badge">✨ Efekt areny</div>':''}
    <div class="skin-card-status">${equipped?'✅ Aktywny':owned?'🔓 Posiadany':'🔒 Nieodblokowany'}</div>
    <button class="skin-equip-btn" data-skin-id="${skin.id}" ${!owned||equipped?'disabled':''}>${equipped?'Aktywny':owned?'Załóż':'Zablokowany'}</button>
   </article>`
  }).join('');
  return `<section class="skin-rarity-group"><h2>${rarityNames[rarity]||rarity.toUpperCase()} <small>${visible.filter(s=>s.rarity===rarity).length}</small></h2><div class="grid">${cards}</div></section>`
 }).join('')||'<div class="card muted">Brak skinów dla wybranego filtra.</div>';

 grid.querySelectorAll('[data-skin-id]').forEach(button=>button.onclick=()=>equipSkin(button.dataset.skinId));
 $$('.skin-filter-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.skinFilter===filter))
}

function renderSkinOrbit(){
 const orbit=safe$('#skinOrbitFx');if(!orbit)return;
 const skin=skins.find(item=>item.id===state.activeSkin)||skins[0];if(!skin){orbit.innerHTML='';return}
 const counts={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,secret:6};
 const count=counts[String(skin.rarity||'common').toLowerCase()]??1;
 if(state.ecoMode||state.effectsLevel===0||count===0){orbit.innerHTML='';return}
 const symbols={gold:['🪙','✨','💰'],matrix:['0','1','⌁'],void:['✦','◆','●'],dev:['</>','⚙','⌘'],classic:['✨']},pool=symbols[skin.id]||['✨','✦','•'];
 orbit.innerHTML=Array.from({length:count},(_,i)=>`<span class="skin-orbit-particle" style="--delay:${-(i*(5.5/Math.max(1,count))).toFixed(2)}s;--radius:${118+(i%2)*18}px;--skin-color:${skin.color||'#fff'}">${pool[i%pool.length]}</span>`).join('')
}

function clearSkinArenaEffects(){
 document.body.classList.remove('arena-skin-epic','arena-skin-legendary','arena-skin-mythic','arena-skin-secret','arena-effect-glitch','arena-effect-lava','arena-effect-ice','arena-effect-void','arena-effect-rainbow','arena-effect-gold')
}


let skinFxTimer=null;
let skinFxSignature='';

function ensureSkinEffectField(){
 const arena=safe$('.arena');
 if(!arena)return null;

 let field=safe$('#skinEffectField');
 if(!field){
  field=document.createElement('div');
  field.id='skinEffectField';
  field.className='skin-effect-field';
  arena.insertBefore(field,arena.firstChild)
 }
 return field
}

function skinEffectConfig(skin){
 const configs={
  glitch:{symbols:['0','1','▰','⌁','▓'],className:'fx-glitch',interval:[170,300],life:[1100,1900]},
  lava:{symbols:['🔥','✦','•','▲'],className:'fx-lava',interval:[210,360],life:[1300,2100]},
  ice:{symbols:['❄️','✧','◆','❅'],className:'fx-ice',interval:[230,390],life:[1500,2300]},
  void:{symbols:['●','◆','✦','◉'],className:'fx-void',interval:[260,430],life:[1700,2600]},
  rainbow:{symbols:['✦','●','✨','◆'],className:'fx-rainbow',interval:[190,330],life:[1400,2300]},
  gold:{symbols:['🪙','✨','◆','✦'],className:'fx-gold',interval:[210,360],life:[1300,2200]},
  dev:{symbols:['</>','0','1','▰'],className:'fx-glitch',interval:[150,270],life:[1000,1700]}
 };
 return configs[skin?.id]||{
  symbols:['✨','✦','•'],
  className:'fx-generic',
  interval:[260,420],
  life:[1400,2200]
 }
}

function spawnSkinEffectParticle(skin){
 const field=ensureSkinEffectField();
 if(!field||!skin||state.ecoMode)return;

 const ranks={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,secret:6};
 if((ranks[skin.rarity]||0)<3)return;

 const config=skinEffectConfig(skin);
 const particle=document.createElement('span');
 particle.className=`skin-fx-particle ${config.className}`;

 // Losowy punkt w pierścieniu za klikerem.
 const angle=Math.random()*Math.PI*2;
 const radius=34+Math.random()*18;
 const x=50+Math.cos(angle)*radius;
 const y=50+Math.sin(angle)*radius*.82;

 particle.style.left=x+'%';
 particle.style.top=y+'%';
 particle.style.setProperty('--fx-size',(15+Math.random()*24)+'px');
 particle.style.setProperty('--fx-rotate',(-45+Math.random()*90)+'deg');
 particle.style.setProperty('--fx-drift-x',(-30+Math.random()*60)+'px');
 particle.style.setProperty('--fx-drift-y',(-35-Math.random()*55)+'px');

 const life=config.life[0]+Math.random()*(config.life[1]-config.life[0]);
 particle.style.animationDuration=life+'ms';
 particle.textContent=config.symbols[Math.floor(Math.random()*config.symbols.length)];

 field.appendChild(particle);
 setTimeout(()=>particle.remove(),life+150)
}

function stopSkinEffectField(){
 clearTimeout(skinFxTimer);
 skinFxTimer=null;
 const field=safe$('#skinEffectField');
 if(field){
  field.classList.remove('active');
  field.innerHTML=''
 }
 skinFxSignature=''
}

function startSkinEffectField(skin){
 stopSkinEffectField();

 const field=ensureSkinEffectField();
 if(!field||!skin||state.ecoMode)return;

 const ranks={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,secret:6};
 if((ranks[skin.rarity]||0)<3)return;

 field.classList.add('active');
 field.dataset.skin=skin.id;
 skinFxSignature=skin.id+'|'+skin.rarity;

 const config=skinEffectConfig(skin);

 const loop=()=>{
  if(state.ecoMode||state.activeSkin!==skin.id){
   stopSkinEffectField();
   return
  }

  const burst=Math.random()<.38?2:1;
  for(let i=0;i<burst;i++)spawnSkinEffectParticle(skin);

  const delay=config.interval[0]+Math.random()*(config.interval[1]-config.interval[0]);
  skinFxTimer=setTimeout(loop,delay)
 };

 for(let i=0;i<14;i++){
  setTimeout(()=>spawnSkinEffectParticle(skin),i*90)
 }
 skinFxTimer=setTimeout(loop,250)
}

function applySkinArenaEffects(skin){
 clearSkinArenaEffects();
 if(!skin||state.ecoMode){
  stopSkinEffectField();
  return
 }

 const ranks={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,secret:6};
 if((ranks[skin.rarity]||0)<3){
  stopSkinEffectField();
  return
 }

 document.body.classList.add('arena-skin-'+skin.rarity);

 const map={
  glitch:'arena-effect-glitch',
  lava:'arena-effect-lava',
  ice:'arena-effect-ice',
  void:'arena-effect-void',
  rainbow:'arena-effect-rainbow',
  gold:'arena-effect-gold',
  dev:'arena-effect-glitch'
 };
 if(map[skin.id])document.body.classList.add(map[skin.id]);

 const signature=skin.id+'|'+skin.rarity;
 if(signature!==skinFxSignature||!safe$('#skinEffectField')?.classList.contains('active'))startSkinEffectField(skin)
}



function createSkinClickText(text,x,y,options={}){
 const layer=safe$('#effectLayer')||safe$('.arena')||document.body;
 if(!layer)return null;

 const theme=skinTextTheme();
 const el=document.createElement('div');
 el.className=`effect skin-click-text skin-theme-${theme.className} ${options.critical?'critical':''}`;
 el.textContent=text;

 const rect=layer.getBoundingClientRect();
 const fallbackX=rect.width/2;
 const fallbackY=rect.height/2;
 const localX=Number.isFinite(x)?x-rect.left:fallbackX;
 const localY=Number.isFinite(y)?y-rect.top:fallbackY;

 el.style.left=Math.max(20,Math.min(rect.width-20,localX))+'px';
 el.style.top=Math.max(20,Math.min(rect.height-20,localY))+'px';
 el.style.setProperty('--text-drift-x',(-30+Math.random()*60)+'px');
 el.style.setProperty('--text-rotate',(-7+Math.random()*14)+'deg');

 layer.appendChild(el);
 setTimeout(()=>el.remove(),options.critical?1250:950);
 return el
}

function showSkinClickValue(value,x,y,critical=false){
 const amount=Math.max(1,Math.floor(Number(value)||1));
 const label=critical
  ?`${skinCriticalLabel()} +${fmt(amount)}`
  :`+${fmt(amount)}`;
 return createSkinClickText(label,x,y,{critical})
}

function skinTextTheme(){
 const id=state.activeSkin||'classic';
 const themes={
  classic:{className:'text-classic',crit:'KRYTYCZNY NOOB!',combo:'COMBO'},
  banana:{className:'text-banana',crit:'BANANOWY CRIT!',combo:'BANANA COMBO'},
  matrix:{className:'text-matrix',crit:'SYSTEM CRIT!',combo:'MATRIX COMBO'},
  cyber:{className:'text-cyber',crit:'CYBER CRIT!',combo:'CYBER COMBO'},
  lava:{className:'text-lava',crit:'LAVA CRIT!',combo:'INFERNO COMBO'},
  ice:{className:'text-ice',crit:'FROST CRIT!',combo:'FROST COMBO'},
  toxic:{className:'text-toxic',crit:'TOXIC CRIT!',combo:'TOXIC COMBO'},
  glitch:{className:'text-glitch',crit:'GLITCH CRIT!',combo:'ERROR COMBO'},
  rainbow:{className:'text-rainbow',crit:'RAINBOW CRIT!',combo:'RAINBOW COMBO'},
  void:{className:'text-void',crit:'VOID CRIT!',combo:'VOID COMBO'},
  gold:{className:'text-gold',crit:'GOLDEN CRIT!',combo:'GOLD COMBO'},
  dev:{className:'text-dev',crit:'DEV CRIT!',combo:'DEV COMBO'}
 };
 return themes[id]||themes.classic
}
function applySkinTextTheme(){
 const theme=skinTextTheme();
 document.body.dataset.skinText=theme.className;
 const combo=safe$('#comboText')||safe$('#combo');
 if(combo){
  combo.classList.remove(...[...combo.classList].filter(c=>c.startsWith('skin-text-')));
  combo.classList.add('skin-text-'+theme.className)
 }
}


let lastManualClickAt=0;
const MAX_COMBO=50;
const COMBO_WINDOW_MS=1150;


const CLICK_BATCH_INTERVAL_MS=50;
const MAX_EFFECTS_PER_SECOND=9;
const MAX_SOUNDS_PER_SECOND=7;

let clickBatchCount=0;
let clickBatchPoints=0;
let clickBatchCriticalPoints=0;
let clickBatchTimer=null;
let clickEffectWindowStart=0;
let clickEffectsThisWindow=0;
let clickSoundWindowStart=0;
let clickSoundsThisWindow=0;
let lastHudBatchRender=0;

function canShowClickEffect(){
 const now=performance.now();
 if(now-clickEffectWindowStart>=1000){
  clickEffectWindowStart=now;
  clickEffectsThisWindow=0
 }
 if(clickEffectsThisWindow>=MAX_EFFECTS_PER_SECOND)return false;
 clickEffectsThisWindow++;
 return true
}

function canPlayClickSound(){
 const now=performance.now();
 if(now-clickSoundWindowStart>=1000){
  clickSoundWindowStart=now;
  clickSoundsThisWindow=0
 }
 if(clickSoundsThisWindow>=MAX_SOUNDS_PER_SECOND)return false;
 clickSoundsThisWindow++;
 return true
}

function queueManualClickReward(points,critical=false,x=null,y=null){
 const safePoints=Math.max(0,Number(points)||0);
 clickBatchCount++;
 clickBatchPoints+=safePoints;
 if(critical)clickBatchCriticalPoints+=safePoints;

 if(canShowClickEffect()){
  showSkinClickValue(safePoints,x,y,critical)
 }
 if(canPlayClickSound()&&typeof sfx==='function'){
  sfx(critical?'crit':'click')
 }

 if(!clickBatchTimer){
  clickBatchTimer=setTimeout(flushManualClickBatch,CLICK_BATCH_INTERVAL_MS)
 }
}

function flushManualClickBatch(){
 clickBatchTimer=null;
 if(clickBatchPoints<=0&&clickBatchCount<=0)return;

 const points=clickBatchPoints;
 clickBatchCount=0;
 clickBatchPoints=0;
 clickBatchCriticalPoints=0;

 if(points>0)addPoints(points);

 const now=performance.now();
 if(now-lastHudBatchRender>=100){
  lastHudBatchRender=now;
  if(typeof renderHud==='function'){
   try{renderHud()}catch(error){console.error('renderHud batch:',error)}
  }
 }
}

function registerManualCombo(){
 const now=Date.now();
 if(lastManualClickAt&&now-lastManualClickAt<=COMBO_WINDOW_MS){
  state.combo=Math.min(50,Math.max(1,Number(state.combo)||1)+1)
 }else{
  state.combo=1
 }
 lastManualClickAt=now;
 state.maxCombo=Math.max(Number(state.maxCombo)||0,state.combo);
 refreshComboDisplay()
}

function decayComboIfNeeded(){
 if(lastManualClickAt&&Date.now()-lastManualClickAt>COMBO_WINDOW_MS&&Number(state.combo)>1){
  refreshComboDisplay()
 }
}

function refreshComboDisplay(){
 const comboValue=Math.min(50,Math.max(1,Number(state.combo)||1));
 const text=formatSkinCombo(comboValue);
 const nodes=[...document.querySelectorAll('#comboText,#combo,.combo-text,.combo-label,[data-combo-display]')];
 [...new Set(nodes)].forEach(el=>{
  el.textContent=text;
  el.dataset.combo=String(comboValue);
  applySkinTextClass(el)
 })
}
function applySkinTextClass(element){
 if(!element)return;
 const theme=skinTextTheme();
 [...element.classList]
  .filter(className=>className.startsWith('skin-theme-'))
  .forEach(className=>element.classList.remove(className));
 element.classList.add('skin-theme-'+theme.className)
}

function formatSkinCombo(value){
 const theme=skinTextTheme();
 const comboValue=Math.min(50,Math.max(1,Number(value ?? state.combo)||1));
 return comboValue>=MAX_COMBO?`${theme.combo} x${comboValue} • MAX`:`${theme.combo} x${comboValue}`
}
function skinCriticalLabel(){
 return skinTextTheme().crit
}

function applySkin(){if(typeof applyTextureVariables==='function')applyTextureVariables();
 if(typeof refreshVisibleTextures==='function')refreshVisibleTextures();
 try{
  const storedSkin=localStorage.getItem('unc_active_skin');
  const storedRevision=Number(localStorage.getItem('unc_active_skin_revision')||0);
  if(storedSkin&&skins.some(x=>x.id===storedSkin)&&storedRevision>Number(state.activeSkinRevision||0)){
   state.activeSkin=storedSkin;
   state.activeSkinRevision=storedRevision
  }
  const skin=skins.find(x=>x.id===state.activeSkin)||skins[0];
  if(!skin)return;
  const button=safe$('#clicker');
  if(button){
   skins.forEach(x=>{if(x.cls)button.classList.remove(x.cls)});
   if(skin.cls)button.classList.add(skin.cls)
  }
  applySkinArenaEffects(skin);
  if(typeof renderSkinOrbit==='function')renderSkinOrbit();applySkinTextTheme()
 }catch(error){
  console.error('Skin render error:',error);
  if(typeof saveDiagnostic==='function')saveDiagnostic('Skin render',error.message,error.stack||'')
 }
}
function equipSkin(id){
 if(!skins.some(skin=>skin.id===id))return;
 if(!state.ownedSkins.includes(id))return toast('Nie posiadasz tego skina');

 state.activeSkin=id;
 if(typeof applyTextureVariables==='function')applyTextureVariables();
 if(typeof refreshVisibleTextures==='function')refreshVisibleTextures();
 state.activeSkinRevision=Date.now();
 localStorage.setItem('unc_active_skin',id);
 localStorage.setItem('unc_active_skin_revision',String(state.activeSkinRevision));

 applySkin();
 renderSkins();
 save();
 toast('Wyposażono skin: '+(skins.find(s=>s.id===id)?.name||id))
}


if(typeof window.renderSkinOrbit!=='function')window.renderSkinOrbit=function(){};function bossDamageUpgradeMax(){return 10}
function bossDamageUpgradeCost(){return Math.floor(125000*Math.pow(2.15,state.bossDamageLevel||0))}
function bossBlockerUpgradeMax(){return 8}
function bossBlockerUpgradeCost(){return Math.floor(220000*Math.pow(2.28,state.bossBlockerDelayLevel||0))}
function bossDamageUpgradeMultiplier(){return 1+Math.min(bossDamageUpgradeMax(),state.bossDamageLevel||0)*.14}
function bossBlockerDelayMultiplier(){return 1+Math.min(bossBlockerUpgradeMax(),state.bossBlockerDelayLevel||0)*.13}
function buyBossDamageUpgrade(){
 const level=state.bossDamageLevel||0;
 if(level>=bossDamageUpgradeMax())return toast('Maksymalny poziom');
 const cost=bossDamageUpgradeCost();
 if(state.points<cost)return toast('Za mało punktów');
 state.points-=cost;
 state.bossDamageLevel=level+1;
 sfx('buy');
 render()
}
function buyBossBlockerUpgrade(){
 const level=state.bossBlockerDelayLevel||0;
 if(level>=bossBlockerUpgradeMax())return toast('Maksymalny poziom');
 const cost=bossBlockerUpgradeCost();
 if(state.points<cost)return toast('Za mało punktów');
 state.points-=cost;
 state.bossBlockerDelayLevel=level+1;
 sfx('buy');
 render()
}



function renderBossUpgrades(){
 if(typeof bindBossUpgradeButtons==='function')bindBossUpgradeButtons()
}



const PROFILE_FRAME_NAMES={
 default:'Domyślna',
 arcade:'Arcade',
 collector:'Kolekcjoner',
 developer:'Developer',neon:'Neon',gold:'Złota'
};
const PROFILE_BACKGROUND_NAMES={
 default:'Domyślne',
 wealth:'Bogactwo',
 casino:'Kasyno',
 reflex:'Reflex',gold:'Złote'
};


function syncProfileStyleRewardsFromAchievements(){
 state.ownedProfileFrames=Array.isArray(state.ownedProfileFrames)?state.ownedProfileFrames:['default'];
 state.ownedProfileBackgrounds=Array.isArray(state.ownedProfileBackgrounds)?state.ownedProfileBackgrounds:['default'];

 const claimed=new Set(
  Array.isArray(state.claimedAchievements)
   ?state.claimedAchievements
   :Array.isArray(state.achievementsClaimed)
    ?state.achievementsClaimed
    :[]
 );

 achievements.forEach(achievement=>{
  if(!claimed.has(achievement.id)||!achievement.special)return;
  const reward=achievement.special;

  if(reward.type==='frame'&&!state.ownedProfileFrames.includes(reward.id)){
   state.ownedProfileFrames.push(reward.id)
  }
  if(reward.type==='background'&&!state.ownedProfileBackgrounds.includes(reward.id)){
   state.ownedProfileBackgrounds.push(reward.id)
  }
 })
}

function normalizeProfileStyles(){
 syncProfileStyleRewardsFromAchievements();
 state.ownedProfileFrames=Array.isArray(state.ownedProfileFrames)?state.ownedProfileFrames:['default'];
 state.ownedProfileBackgrounds=Array.isArray(state.ownedProfileBackgrounds)?state.ownedProfileBackgrounds:['default'];
 if(!state.ownedProfileFrames.includes('default'))state.ownedProfileFrames.unshift('default');
 if(!state.ownedProfileBackgrounds.includes('default'))state.ownedProfileBackgrounds.unshift('default');
 if(!state.ownedProfileFrames.includes(state.profileFrame))state.profileFrame='default';
 if(!state.ownedProfileBackgrounds.includes(state.profileBackground))state.profileBackground='default'
}


function renderLiveProfilePreview(){
 const preview=safe$('#profileStylePreview');
 if(!preview)return;
 const name=safe$('#profileStylePreviewName');
 if(name)name.textContent=state.playerName||'Gracz';
 const score=preview.querySelector('strong');
 if(score)score.textContent=fmt(state.points||0)+' ⭐';
 preview.dataset.frame=state.profileFrame||'default';
 preview.dataset.background=state.profileBackground||'default';
 if(typeof applyProfileTextureToElement==='function'){
  applyProfileTextureToElement(preview,state.profileFrame||'default',state.profileBackground||'default')
 }
}

function renderProfileStyleSettings(){renderLiveProfilePreview();
 syncProfileStyleRewardsFromAchievements();
 if(typeof applyTextureVariables==='function')applyTextureVariables();
 if(typeof refreshVisibleTextures==='function')refreshVisibleTextures();
 normalizeProfileStyles();

 const frameOptions=safe$('#profileFrameOptions');
 const backgroundOptions=safe$('#profileBackgroundOptions');
 const preview=safe$('#profileStylePreview');
 const previewName=safe$('#profileStylePreviewName');

 if(previewName)previewName.textContent=safeText(state.playerName||'Gracz');

 if(preview){
  preview.className=`profile-style-preview profile-frame-${state.profileFrame||'default'} profile-bg-${state.profileBackground||'default'}`
 }

 if(frameOptions){
  frameOptions.innerHTML=state.ownedProfileFrames.map(id=>`
   <button class="profile-style-option ${state.profileFrame===id?'active':''}" data-profile-frame="${id}">
    <span class="profile-style-mini profile-frame-${id}">
     <span>1.</span><strong>Gracz</strong><em>123M ⭐</em>
    </span>
    <b>${PROFILE_FRAME_NAMES[id]||id}</b>
   </button>
  `).join('')
 }

 if(backgroundOptions){
  backgroundOptions.innerHTML=state.ownedProfileBackgrounds.map(id=>`
   <button class="profile-style-option ${state.profileBackground===id?'active':''}" data-profile-background="${id}">
    <span class="profile-style-mini profile-bg-${id}">
     <span>1.</span><strong>Gracz</strong><em>123M ⭐</em>
    </span>
    <b>${PROFILE_BACKGROUND_NAMES[id]||id}</b>
   </button>
  `).join('')
 }

 requestAnimationFrame(()=>{
  if(typeof refreshVisibleTextures==='function')refreshVisibleTextures()
 });

 requestAnimationFrame(()=>{
  if(typeof applyProfileStyleOptionTextures==='function')applyProfileStyleOptionTextures()
 });
}

function equipProfileFrame(id){
 normalizeProfileStyles();
 if(!state.ownedProfileFrames.includes(id))return;
 state.profileFrame=id;
 if(typeof applyTextureVariables==='function')applyTextureVariables();
 if(typeof refreshVisibleTextures==='function')refreshVisibleTextures();
 state.profileStyleDirty=true;
 renderProfileStyleSettings();renderLiveProfilePreview();
 if(typeof refreshVisibleTextures==='function')refreshVisibleTextures();
 save();
 const status=safe$('#profileStyleSaveStatus');
 if(status)status.textContent='Niezapisane zmiany wyglądu.'
}

function equipProfileBackground(id){
 normalizeProfileStyles();
 if(!state.ownedProfileBackgrounds.includes(id))return;
 state.profileBackground=id;
 if(typeof applyTextureVariables==='function')applyTextureVariables();
 if(typeof refreshVisibleTextures==='function')refreshVisibleTextures();
 state.profileStyleDirty=true;
 renderProfileStyleSettings();renderLiveProfilePreview();
 if(typeof refreshVisibleTextures==='function')refreshVisibleTextures();
 save();
 const status=safe$('#profileStyleSaveStatus');
 if(status)status.textContent='Niezapisane zmiany wyglądu.'
}


async function saveProfileStyleNow(){
 const button=safe$('#saveProfileStyle');
 const status=safe$('#profileStyleSaveStatus');

 try{
  if(button)button.disabled=true;
  if(status)status.textContent='Zapisywanie wyglądu profilu online...';

  normalizeProfileStyles();
  state.profileStyleDirty=false;
  save();

  if(typeof savePlayerProfile!=='function'){
   throw new Error('Funkcja zapisu profilu nie została załadowana')
  }

  const profileSaved=await savePlayerProfile(true);
  if(profileSaved!==true){
   throw new Error('Supabase odrzucił zapis profilu')
  }

  if(!db||!playerId){
   throw new Error('Brak połączenia z Supabase')
  }

  const {data:row,error:verifyError}=await db
   .from('players')
   .select('player_id,save_data,last_seen')
   .eq('player_id',playerId)
   .maybeSingle();

  if(verifyError)throw verifyError;
  if(!row)throw new Error('Nie znaleziono profilu po zapisie');

  const saved=parseRemoteSaveData(row.save_data)||{};
  const expectedFrame=state.profileFrame||'default';
  const expectedBackground=state.profileBackground||'default';

  if((saved.profileFrame||'default')!==expectedFrame){
   throw new Error('Ramka nie została zapisana w profilu online')
  }
  if((saved.profileBackground||'default')!==expectedBackground){
   throw new Error('Tło nie zostało zapisane w profilu online')
  }

  if(typeof loadBoard==='function'){
   await loadBoard()
  }else if(typeof loadOnlineLeaderboard==='function'){
   await loadOnlineLeaderboard()
  }

  if(typeof renderBoard==='function')renderBoard();

  if(status){
   status.textContent='Wygląd profilu zapisany online i zaktualizowany w rankingu.'
  }
  return true
 }catch(error){
  console.error('Profile style online save:',error);
  if(status){
   status.textContent='Błąd zapisu online: '+(error?.message||'nieznany błąd')
  }
  if(typeof saveDiagnostic==='function'){
   saveDiagnostic(
    'Profile style online save',
    error?.message||String(error),
    error?.stack||''
   )
  }
  return false
 }finally{
  if(button)button.disabled=false
 }
}

window.saveProfileStyleNow=saveProfileStyleNow;

window.equipProfileFrame=equipProfileFrame;
window.equipProfileBackground=equipProfileBackground;

function renderSettingsStatistics(){
 const set=(id,value)=>{const el=safe$(id);if(el)el.textContent=value};
 const clicks=Number(state.totalClicks??state.clicks??0);
 const combo=Number(state.bestCombo??state.maxCombo??0);
 const seconds=Number(state.playSeconds??state.totalPlaySeconds??0);
 const crates=Number(state.eventStats?.crates??state.cratesOpened??0);
 const minigames=Number(state.eventStats?.minigames??state.minigamesPlayed??0);
 const defeated=state.worldBossesDefeated;
 const worldBosses=Array.isArray(defeated)
  ?defeated.length
  :(defeated&&typeof defeated==='object'?Object.values(defeated).filter(Boolean).length:0);

 set('#settingsStatClicks',fmt(clicks));
 set('#settingsStatCombo','x'+fmt(combo));
 set('#settingsStatRebirths',fmt(Number(state.rebirths||0)));
 set('#settingsStatPlaytime',fmt(Math.floor(seconds/60))+' min');
 set('#settingsStatCrates',fmt(crates));
 set('#settingsStatMinigames',fmt(minigames));
 set('#settingsStatSkins',fmt(state.ownedSkins?.length||0));
 set('#settingsStatWorlds',fmt(state.unlockedWorlds?.length||0));
 set('#settingsStatPetBonus','x'+Number(petMultiplier()).toFixed(2));
 set('#settingsStatExp','x'+Number(expMultiplier()).toFixed(2));
 set('#settingsStatRebirthMult','x'+Number(rebirthMultiplier()).toFixed(2));
 set('#settingsStatWorldBosses',fmt(worldBosses));
 set('#settingsStatBosses',fmt(Number(state.bossWins||0)));
 set('#settingsStatCasino',`${fmt(Number(state.casinoGames||0))} / ${fmt(Number(state.casinoWins||0))} wygranych`)
}

let bossCooldownUiTimer=setInterval(()=>{
 if(document.visibilityState==='visible'){
  try{
   refreshBossUnlockUi();
   const worldPanel=document.querySelector('[data-collection-panel="worlds"].active');
   if(worldPanel&&typeof renderWorlds==='function')renderWorlds()
  }catch(error){
   console.warn('Boss cooldown UI:',error)
  }
 }
},1000);


(function setupSettingsSoundToggle(){
 const KEY='noob_sound_enabled';

 function currentValue(){
  if(typeof state!=='undefined'){
   if(typeof state.soundOn==='boolean')return state.soundOn;
   if(typeof state.soundEnabled==='boolean')return state.soundEnabled;
   if(typeof state.sfxOn==='boolean')return state.sfxOn
  }
  const saved=localStorage.getItem(KEY);
  return saved===null?true:saved==='true'
 }

 function updateState(value){
  localStorage.setItem(KEY,String(value));
  if(typeof state!=='undefined'){
   state.soundOn=value;
   state.soundEnabled=value;
   state.sfxOn=value
  }
  if(typeof save==='function'){
   try{save()}catch(error){console.warn('Nie udało się zapisać ustawienia dźwięku',error)}
  }
 }

 function sync(){
  const toggle=document.querySelector('#settingsSoundToggle');
  if(toggle)toggle.checked=currentValue()
 }

 document.addEventListener('change',event=>{
  if(event.target?.id==='settingsSoundToggle')updateState(event.target.checked)
 });
 document.addEventListener('DOMContentLoaded',sync);
 window.syncSettingsSoundToggle=sync
})();
