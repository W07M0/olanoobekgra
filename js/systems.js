
/* v0.6 stable runtime fallbacks */

if(typeof window.renderPets!=='function')window.renderPets=function(){};
if(typeof window.renderMiniStats!=='function')window.renderMiniStats=function(){};
if(typeof window.renderMiniCooldowns!=='function')window.renderMiniCooldowns=function(){};
if(typeof window.loadMinigameLeaderboards!=='function')window.loadMinigameLeaderboards=async function(){};


let boss=null;
let bossSpawnTimer=0;

function activeBossWorld(){
 if(!boss)return null;
 return worlds.find(world=>world.id===boss.worldId)||world()
}

function maybeSpawnBoss(){
 if(boss)return boss;
 const current=world();
 if(!current)return null;

 // Boss pojawia się tylko w głównej grze i po osiągnięciu wymagań świata.
 if(typeof currentView!=='undefined'&&currentView!=='game')return null;
 if((state.level||1)<Math.max(1,current.unlockLevel||1))return null;

 const now=Date.now();
 if(now-bossSpawnTimer<12000)return null;
 bossSpawnTimer=now;

 const maxHp=calculatedWorldBossHp(current);
 boss={
  worldId:current.id,
  name:current.bossName||current.boss||('Boss '+current.name),
  emoji:current.bossEmoji||'👹',
  maxHp,
  hp:maxHp,
  startedAt:now,
  blockers:[],
  active:true
 };

 if(typeof startBossBlockers==='function'){
  try{startBossBlockers()}catch(error){console.warn('Boss blockers:',error)}
 }
 return boss
}

function clearBoss(){
 boss=null;
 if(typeof clearBossBlockers==='function'){
  try{clearBossBlockers()}catch(error){console.warn('Clear boss blockers:',error)}
 }
}

const WORLD_BOSS_FIXED_HP=[50000, 250000, 1200000, 6000000, 30000000, 150000000, 750000000, 4000000000, 18000000000, 75000000000, 300000000000, 1100000000000, 4000000000000, 14000000000000, 50000000000000];
function calculatedWorldBossHp(w){
 const idx=Math.max(0,worldIndex(w.id));
 return WORLD_BOSS_FIXED_HP[idx]||WORLD_BOSS_FIXED_HP[WORLD_BOSS_FIXED_HP.length-1]
}
function calculatedEndgameBossHp(){
 const base=WORLD_BOSS_FIXED_HP[WORLD_BOSS_FIXED_HP.length-1];
 return Math.floor(base*(1+Math.min(3,state.rebirths*.04)))
}


function worldIndex(id){return worlds.findIndex(w=>w.id===id)}
function worldBossDefeated(id){return state.worldBossesDefeated.includes(id)}
function canUnlockWorld(w){
 if(!w.requiresBoss)return true;
 return worldBossDefeated(w.requiresBoss)
}
function markWorldBossDefeated(worldId){
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
 if(boss)return;
 let w=world();
 if(worldBossDefeated(w.id) && w.id!=='dev'){toast('Boss tego świata został już pokonany');return}
 let t=currentWorldBossTemplate();
 let maxHp=calculatedWorldBossHp(w);
 boss={...t,hp:maxHp,maxHp,time:65,rewardPoints:Math.floor(maxHp*2.25),rewardGems:Math.max(2,Math.ceil((worldIndex(w.id)+1)/2)),rewardCoins:Math.max(1,Math.floor(worldIndex(w.id)/3)+1),blocked:false,blockersCleared:0};
 $('#bossPanel').classList.remove('hidden');renderBoss();scheduleBossBlocker(true);
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
 let layer=$('#bossBlockerLayer');layer.innerHTML='';layer.classList.remove('hidden');
 $('#bossPanel').classList.add('blocked');
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
 $('#bossBlockerLayer').classList.add('hidden');$('#bossBlockerLayer').innerHTML='';
 $('#bossPanel').classList.remove('blocked');toast('⚔️ Atak odblokowany!');scheduleBossBlocker()
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
 $('#bossPanel').classList.remove('hidden');renderBoss();scheduleBossBlocker(true);
 clearInterval(bossTimer);bossTimer=setInterval(()=>{
  if(!boss)return clearInterval(bossTimer);
  boss.time--;renderBoss();if(boss.time<=0)finishBoss(false)
 },1000)
}
function scheduleEndgameBossCheck(){
 if(state.world==='dev'){
  $('#endgameBossBanner').classList.remove('hidden');
  if(endgameBossReady()&&!boss)spawnEndgameBoss()
 }else $('#endgameBossBanner').classList.add('hidden')
}

function currentTitle(){return ''}

function spawnBoss(){spawnWorldBoss()}
function damageBoss(amount){
 if(!boss)return;if(boss.blocked)return
 let capped=Math.min(Math.max(1,amount),(boss?.maxHp||1)*.035);boss.hp=Math.max(0,(boss?.hp||0)-capped);
 renderBoss();if((boss?.hp||0)<=0)finishBoss(true)
}
function renderBoss(){
 if(!boss)return;
 $('#bossName').textContent=(boss?.emoji||'👹')+' '+(boss?.name||'Boss');$('#bossDesc').textContent=boss.desc;
 $('#bossTime').textContent=boss.time;$('#bossHp').textContent=fmt((boss?.hp||0))+'/'+fmt((boss?.maxHp||1));
 $('#bossReward').textContent=fmt(boss.rewardPoints)+' ⭐ + '+boss.rewardGems+' 💎 + '+(boss.rewardCoins||0)+' 🟡';
 $('#bossHealthBar').style.width=((boss&&(boss?.maxHp||1)?(boss?.hp||0)/(boss?.maxHp||1):0)*100)+'%'
}
function finishBoss(win){
 if(!boss)return;clearInterval(bossTimer);clearTimeout(blockerTimeout);$('#bossBlockerLayer').classList.add('hidden');$('#bossBlockerLayer').innerHTML='';$('#bossPanel').classList.remove('blocked');let defeated={...boss};
 if(win){
  const lootMult=1+(state.permBossLoot||0)*.10;
  defeated.rewardPoints=Math.floor(defeated.rewardPoints*lootMult);
  defeated.rewardGems=Math.max(1,Math.floor(defeated.rewardGems*lootMult*gemRewardMultiplier()));
  defeated.rewardCoins=Math.max(1,Math.floor((defeated.rewardCoins||0)*lootMult*coinRewardMultiplier()));
  state.points+=defeated.rewardPoints;state.gems+=defeated.rewardGems;state.coins+=defeated.rewardCoins;
  state.bossWins=(state.bossWins||0)+1;
  if(defeated.isWorldBoss)markWorldBossDefeated(defeated.worldId);
  grantPetXp(70+Math.max(0,worldIndex(defeated.worldId))*18);
  sfx('good');confetti()
 }
 $('#bossResultIcon').textContent=win?'🏆':'💨';
 $('#bossResultTitle').textContent=win?(defeated.isWorldBoss?'Strażnik świata pokonany!':'Boss pokonany!'):'Boss uciekł!';
 $('#bossResultText').textContent=win?`Zdobywasz ${fmt(defeated.rewardPoints)} punktów, ${defeated.rewardGems} gemów i ${defeated.rewardCoins||0} Noob Coinów.`:'Spróbuj ponownie za chwilę.';
 $('#bossResultOverlay').classList.add('show');boss=null;$('#bossPanel').classList.add('hidden');render()
}
function showWorldTransition(w,newUnlock=false){
 $('#transitionEmoji').textContent=w.emoji;$('#transitionName').textContent=w.name;$('#transitionDesc').textContent=w.desc;
 $('#worldTransition').classList.add('show');document.body.classList.add('world-switching');
 if(newUnlock)confetti();
 setTimeout(()=>{$('#worldTransition').classList.remove('show');document.body.classList.remove('world-switching')},1800)
}
function weatherSymbol(w){
 const map={neon:'✦',forest:'🍃',banana:'🍌',desert:'•',factory:'⚙️',ice:'❄️',ocean:'💧',volcano:'🔥',sky:'☁️',castle:'👑',galaxy:'✨',void:'●',rainbow:'🌈',goldrealm:'🪙',dev:'0'};
 return map[w.id]||w.rain||'✨'
}
function spawnWeather(){trimEffects();
 if(document.hidden)return;let host=$('#worldWeather'),w=world(),count=['legendary','mythic'].includes((skins.find(s=>s.id===state.activeSkin)||{}).rarity)?2:1;
 for(let i=0;i<count;i++){
  let p=document.createElement('span');p.className='weather-particle';p.textContent=weatherSymbol(w);
  p.style.left=Math.random()*100+'vw';p.style.fontSize=(12+Math.random()*18)+'px';
  p.style.setProperty('--weatherDur',(6+Math.random()*8)+'s');p.style.setProperty('--weatherX',(Math.random()*160-80)+'px');p.style.setProperty('--weatherRot',(Math.random()*720-360)+'deg');
  host.append(p);setTimeout(()=>p.remove(),14500)
 }
}
setInterval(()=>{if($('#view-game').classList.contains('active'))spawnWeather()},1800);setInterval(scheduleEndgameBossCheck,15000);

function playWorldMusicNote(){
 if(!state.music)return;let w=world(),sets={
  neon:[220,277,330],forest:[196,247,294],banana:[262,330,392],desert:[165,220,247],factory:[110,220,440],ice:[440,554,659],ocean:[174,233,349],volcano:[98,147,196],sky:[523,659,784],castle:[196,294,392],galaxy:[220,330,495],void:[55,82,110],rainbow:[262,330,392,523],goldrealm:[330,440,660],dev:[110,220,880]
 };let arr=sets[w.id]||[220,277,330];tone(rand(arr),.24,w.id==='factory'||w.id==='dev'?'square':'triangle',.011)
}


function renderCollection(){
 let petCounts={};state.pets.forEach(instance=>petCounts[instance.type]=(petCounts[instance.type]||0)+1);
 $('#petCollectionGrid').innerHTML=pets.map(p=>{
  let owned=(petCounts[p.id]||0)>0;
  return`<div class="card collection-card ${owned?'':'locked'}">
   <div class="big">${owned?p.emoji:'❓'}</div><h3>${owned?p.name:'Nieodkryty pet'}</h3>
   <p class="chance">Szansa: ${p.chance}%</p><p class="${owned?'owned':'muted'}">${owned?'Posiadasz: '+petCounts[p.id]:'Nie zdobyto'}</p>
  </div>`
 }).join('');
 $('#skinCollectionGrid').innerHTML=skins.map(s=>{let owned=state.ownedSkins.includes(s.id);return`<div class="card collection-card ${owned?'':'locked'}" style="border-top:4px solid ${s.color}"><div class="big">${owned?s.emoji:'❓'}</div><h3>${owned?s.name:'Nieodkryty skin'}</h3><p class="chance">Waga losowania: ${s.weight}</p><p class="${owned?'owned':'muted'}">${owned?'Odblokowany':'Nie zdobyto'}</p></div>`}).join('');
 let ownedPets=new Set(state.pets.map(p=>p.type)).size,totalOwned=ownedPets+state.ownedSkins.length,total=pets.length+skins.length;
 $('#collectionProgress').textContent=Math.floor(totalOwned/total*100)+'%'
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
  let view=$('#view-'+id);if(!view)return;
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


function renderHud(){try{
 const activeBoss=typeof boss!=='undefined'?boss:null;

 $('#points').textContent=fmt(state.points);
 if($('#gems'))$('#gems').textContent=fmt(state.gems);
 if($('#coins'))$('#coins').textContent=fmt(state.coins);
 $$('[data-bind="points"]').forEach(e=>e.textContent=fmt(state.points));
 $$('[data-bind="gems"]').forEach(e=>e.textContent=fmt(state.gems));$$('[data-bind="coins"]').forEach(e=>e.textContent=fmt(state.coins));
 $('#perClick').textContent=fmt(clickValue());
 $('#pps').textContent=fmt(pps());
 $('#level').textContent=state.level;
 $('#multiplier').textContent='x'+totalMultiplier().toFixed(2);
 $('#xpBar').style.width=Math.min(100,state.xp/needXp()*100)+'%';
 $('#expMult').textContent='x'+expMultiplier().toFixed(2);
 $('#xpNeed').textContent=fmt(Math.max(0,needXp()-state.xp));
 $('#combo').textContent='COMBO x'+combo;
 $('#combo').classList.toggle('hot',combo>=8);
 $('#aura').style.setProperty('--combo',Math.min(100,combo/20*100)+'%');
 $('#quickClickCost').textContent='Koszt: '+fmt(state.clickCost);
 $('#quickAutoCost').textContent='Koszt: '+fmt(state.autoCost);
 $('#quickClick').disabled=state.points<state.clickCost;
 $('#quickAuto').disabled=state.points<state.autoCost;
 if($('#playerTitle'))$('#playerTitle').remove();
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
function render(){
 if(typeof renderHud==='function'){try{renderHud()}catch(error){console.error('renderHud:',error)}}
 $('[data-bind="points"]')?.replaceChildren(document.createTextNode(fmt(state.points)));
 $$('[data-bind="gems"]').forEach(e=>e.textContent=fmt(state.gems));$$('[data-bind="coins"]').forEach(e=>e.textContent=fmt(state.coins));
 $('#points').textContent=fmt(state.points);if($('#playerTitle'))$('#playerTitle').remove();
 let wb=worldBossDefeated(world().id);$('#challengeBossBtn').textContent=wb&&state.world!=='dev'?'✅ Boss świata pokonany':'⚔️ Zmierz się z '+world().bossName;
 $('#challengeBossBtn').disabled=wb&&state.world!=='dev';if($('#gems'))$('#gems').textContent=fmt(state.gems);if($('#coins'))$('#coins').textContent=fmt(state.coins);
 $('#perClick').textContent=fmt(clickValue());$('#pps').textContent=fmt(pps());$('#level').textContent=state.level;$('#multiplier').textContent='x'+totalMultiplier().toFixed(2);
 $('#xpBar').style.width=Math.min(100,state.xp/needXp()*100)+'%';$('#expMult').textContent='x'+expMultiplier().toFixed(2);$('#xpNeed').textContent=fmt(Math.max(0,needXp()-state.xp));$('#combo').textContent='COMBO x'+combo;$('#combo').classList.toggle('hot',combo>=8);$('#aura').style.setProperty('--combo',Math.min(100,combo/20*100)+'%');
 $('#quickClickCost').textContent='Koszt: '+fmt(state.clickCost);$('#quickAutoCost').textContent='Koszt: '+fmt(state.autoCost);$('#quickClick').disabled=state.points<state.clickCost;$('#quickAuto').disabled=state.points<state.autoCost;
 $('#rebirthGain').textContent=rebirthGain()+' 🟡';$('#rebirthBtn').disabled=rebirthGain()<1;
 $('#soundBtn').textContent=state.sound?'🔊':'🔇';$('#musicBtn').textContent=state.music?'🎶':'🎵';
 document.body.dataset.world=state.world;
 let cw=world();document.documentElement.style.setProperty('--worldAccent',cw.accent||'#ff3e9d');
 $('#worldEmoji').textContent=cw.emoji;$('#worldName').textContent=cw.name;$('#worldFlavor').textContent=cw.desc;
 if(typeof renderFeatureLocks==='function'){try{renderFeatureLocks()}catch(error){console.error('renderFeatureLocks:',error)}}applyFeatureViewLocks();if(typeof renderPatchNotes==='function'){try{renderPatchNotes()}catch(error){console.error('renderPatchNotes:',error)}}if(typeof renderCollection==='function'){try{renderCollection()}catch(error){console.error('renderCollection:',error)}}if(typeof renderDiagnostics==='function'){try{renderDiagnostics()}catch(error){console.error('renderDiagnostics:',error)}}if(typeof renderPets==='function'){try{renderPets()}catch(error){console.error('renderPets:',error)}}if(typeof renderShop==='function'){try{renderShop()}catch(error){console.error('renderShop:',error)}}if(typeof renderWorlds==='function'){try{renderWorlds()}catch(error){console.error('renderWorlds:',error)}}if(typeof renderSkins==='function'){try{renderSkins()}catch(error){console.error('renderSkins:',error)}}if(typeof renderCasino==='function'){try{renderCasino()}catch(error){console.error('renderCasino:',error)}}if(typeof renderMiniCooldowns==='function')if(typeof renderMiniCooldowns==='function'){try{renderMiniCooldowns()}catch(error){console.error('renderMiniCooldowns:',error)}}if(typeof renderMiniStats==='function'){try{renderMiniStats()}catch(error){console.error('renderMiniStats:',error)}}if(typeof maybeSpawnBoss==='function'){try{maybeSpawnBoss()}catch(error){console.error('maybeSpawnBoss:',error)}}if(typeof renderAchievements==='function'){try{renderAchievements()}catch(error){console.error('renderAchievements:',error)}}safeGameRender('renderQuests',()=>typeof renderQuests==='function'&&renderQuests());renderStats();safeGameRender('renderSettingsStatistics',()=>typeof renderSettingsStatistics==='function'&&renderSettingsStatistics());safeGameRender('renderDaily',()=>typeof renderDaily==='function'&&renderDaily());safeGameRender('renderBoard',()=>typeof renderBoard==='function'&&renderBoard());applySkin();save()
}
function nextFeatureUnlock(){
 let entries=Object.entries(featureUnlocks).filter(([_,lvl])=>lvl>state.level).sort((a,b)=>a[1]-b[1]);
 return entries.length?`${entries[0][0]} — poziom ${entries[0][1]}`:'wszystko odblokowane'
}
function renderStats(){
 const box=$('#statsBox');
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
 const damage=$('#bossDamageUpgradeBtn');
 const blocker=$('#bossBlockerUpgradeBtn');
 if(damage)damage.onclick=buyBossDamageUpgrade;
 if(blocker)blocker.onclick=buyBossBlockerUpgrade
}

function renderShop(){
 const temporaryGrid=$('#temporaryShopGrid');
 const gemGrid=$('#permanentGemShopGrid');
 const coinGrid=$('#permanentCoinShopGrid');
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
function renderPets(){
 try{
  sanitizeEquippedPets();
  const setText=(s,v)=>{const el=$(s);if(el)el.textContent=v};
  setText('#petDot',state.pets.length);
  setText('#equippedCount',state.equipped.length+'/'+maxPetSlots());
  setText('#petBonus','x'+petMultiplier().toFixed(2));
  setText('#petExpBonus','x'+petExpMultiplier().toFixed(2));

  const orbit=$('#petOrbit');
  if(orbit){
   orbit.innerHTML=state.equipped.map(uid=>{
    const instance=getPetInstance(uid),base=getPetBase(instance),evo=PET_EVOLUTIONS[instance?.evolution||0];
    return instance?`<span class="orbit-pet rarity-${base.rarity}" style="filter:drop-shadow(0 0 ${8+instance.evolution*5}px ${evo.color})">${base.emoji}</span>`:''
   }).join('')
  }

  const container=$('#petGroups')||$('#petGrid')||$('#petsGrid');
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
  const container=$('#petGroups')||$('#petGrid')||$('#petsGrid');
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
 const overlay=$('#crateOverlay'),egg=$('#petEgg'),glow=$('#eggGlow');
 overlay.classList.add('show');$('#crateTitle').textContent='Jajko zaczyna się ruszać…';$('#petRevealIcon').textContent='❔';$('#petRevealRarity').textContent='';$('#crateResult').textContent='';$('#crateClose').classList.add('hidden');
 egg.className='pet-egg hatching';egg.innerHTML='<span>?</span>';glow.classList.remove('show');sfx('buy');
 setTimeout(()=>{egg.classList.add('cracking');$('#crateTitle').textContent='Coś jest w środku…';$('#petRevealIcon').textContent='✨';tone(180,.09,'square',.035);tone(240,.08,'square',.028,.1)},900);
 setTimeout(()=>{
  egg.classList.remove('hatching');egg.classList.add('opened');glow.classList.add('show');egg.innerHTML=`<span>${base.emoji}</span>`;state.pets.push(instance);
  $('#petRevealIcon').textContent=base.emoji;$('#crateTitle').textContent=base.name;$('#petRevealRarity').textContent=base.rarity.toUpperCase();$('#crateResult').innerHTML=`Mnożnik: <b>x${base.mult}</b><br>Nowy osobny egzemplarz`;
  $('#crateClose').classList.remove('hidden');
  const rare=['legendary','mythic','secret'].includes(base.rarity);sfx(rare?'good':'buy');if(rare)confetti();render()
 },1900)
}

function renderWorldPath(){}
function renderWorlds(){

 $('#worldGrid').innerHTML=worlds.map((w,i)=>{
  let unlocked=state.unlockedWorlds.includes(w.id),active=state.world===w.id;
  let cur=currencyIcon(w.currency),rebirthLocked=state.rebirths<w.rebirths,fundsLocked=state[w.currency]<w.cost,levelLocked=state.level<w.minLevel;
  let bossGate=!canUnlockWorld(w);
  let reqs=[];
  if(w.minLevel>1)reqs.push(`⭐ Poziom ${w.minLevel}`);
  if(w.rebirths>0)reqs.push(`♻️ ${w.rebirths} rebirth${w.rebirths===1?'':'ów'}`);
  if(w.requiresBoss)reqs.push(`⚔️ Boss: ${worlds.find(x=>x.id===w.requiresBoss)?.bossName||w.requiresBoss}`);
  let req=reqs.length?`<div class="world-requirement">${reqs.join(' • ')}</div>`:'';
  let bossDone=worldBossDefeated(w.id);
  let bossStatus=bossDone
   ?`<div class="world-boss-status done">✅ Boss pokonany: ${w.bossEmoji} ${w.bossName}</div>`
   :active
    ?`<div class="world-boss-status pending">⚔️ Do pokonania: ${w.bossEmoji} ${w.bossName}</div>`
    :`<div class="world-boss-status locked">🔒 Strażnik: ${w.bossEmoji} ${w.bossName}</div>`;
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
 let w=worlds.find(x=>x.id===id);if(!w)return;
 let newlyUnlocked=false;
 if(!state.unlockedWorlds.includes(id)){
  if(!canUnlockWorld(w))return toast('Najpierw pokonaj bossa poprzedniego świata');
  if(state.level<w.minLevel)return toast('Potrzebujesz poziomu '+w.minLevel);
  if(state.rebirths<w.rebirths)return toast('Potrzebujesz '+w.rebirths+' rebirthów');
  if(state[w.currency]<w.cost)return toast('Masz za mało '+currencyIcon(w.currency));
  state[w.currency]-=w.cost;state.unlockedWorlds.push(id);newlyUnlocked=true;toast('Odblokowano '+w.name+'!')
 }
 state.world=id;showWorldTransition(w,newlyUnlocked);render()
}
function achievementRewardLabel(a){
 const currency=a.reward?.[0]==='gems'?'💎':a.reward?.[0]==='coins'?'🟡':'⭐';
 const base=a.reward?`${a.reward[1]} ${currency}`:'Brak waluty';
 return a.special?`${base} + ${a.special.name}`:base
}
function renderAchievements(){
 const grid=$('#achievementGrid');if(!grid)return;
 const category=state.achievementCategory||'all';
 const search=(state.achievementSearch||'').toLowerCase();
 const sort=state.achievementSort||'ready';

 let list=achievements.filter(a=>(category==='all'||a.category===category)&&(!search||(a.name+' '+a.desc).toLowerCase().includes(search)));
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
 const searchBox=$('#achievementSearch');if(searchBox&&searchBox.value!==state.achievementSearch)searchBox.value=state.achievementSearch||'';
 const sortBox=$('#achievementSort');if(sortBox)sortBox.value=sort
}
function grantAchievementSpecial(a){
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
function claimAchievement(id){let a=achievements.find(x=>x.id===id);if(!a||!a.test()||state.claimedAchievements.includes(id))return;if(a.reward)state[a.reward[0]]+=a.reward[1];grantAchievementSpecial(a);state.claimedAchievements.push(id);sfx('good');render();save()}
function renderDaily(){let today=Math.floor(Date.now()/86400000),last=Math.floor(state.lastDaily/86400000),can=today>last,rewards=[1,2,3,5,7,10,20];$('#dailyGrid').innerHTML=rewards.map((r,i)=>`<div class="daily ${i===state.dailyStreak%7?'today':''}"><b>Dzień ${i+1}</b><div>💎 ${r}</div></div>`).join('');$('#dailyBtn').disabled=!can;$('#dailyBtn').textContent=can?'Odbierz nagrodę':'Wróć jutro'}
function claimDaily(){let today=Math.floor(Date.now()/86400000),last=Math.floor(state.lastDaily/86400000);if(today<=last)return;if(today-last>1)state.dailyStreak=0;let rewards=[1,2,3,5,7,10,20],r=rewards[state.dailyStreak%7];state.gems+=r;state.dailyStreak++;state.lastDaily=Date.now();confetti();sfx('good');toast('Dzienna nagroda: +'+r+' 💎');render()}


function spawnSkinParticles(intensity=1){
 trimEffects();
 const host=$('#skinParticles');
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
 let crit=Math.random()<Math.min(.32,.05+state.crit*.02),gain=clickValue()*(crit?5:1);addPoints(gain);if(boss)damageBoss(gain);grantPetXp(.08);addXp((1+Math.floor(combo/10))*(1+(state.comboExp||0)*Math.min(combo,25)*.006));
 if(Math.random()<Math.min(.08,.004+state.gemChance*.004)){state.gems++;toast('Znalazłeś diament! 💎')}
 let r=$('#clicker').getBoundingClientRect();floating(e?.clientX||r.left+r.width/2,e?.clientY||r.top+r.height/2,crit?'KRYTYK x5':undefined,crit);
 let b=$('#clicker');b.classList.remove('hit');void b.offsetWidth;b.classList.add('hit');if(crit)sfx('crit');else skinClickSound();spawnSkinParticles(crit?1.7:1);
 if(crit){$('#mainPanel').classList.add('shake');setTimeout(()=>$('#mainPanel').classList.remove('shake'),190);$('#message').textContent='💥 Krytyczny noob! +'+fmt(gain)}
 let rainAt=Math.max(5,8-(state.rainSpeed||0));if(combo>=rainAt&&combo%rainAt===0){let bonus=clickValue()*combo*(1+state.rain*.35);addPoints(bonus);noobRain();$('#message').textContent='🌧️ Deszcz noobków! +'+fmt(bonus)}
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
 ],ev=rand(events);currentEvent=ev;eventMultiplier=ev.mult;eventEnds=Date.now()+ev.dur*1000;state.eventStats.golden++;$('#eventTitle').textContent=ev.name;$('#eventDesc').textContent=ev.desc;toast(ev.name);confetti();render()
}
function tickEvent(){let left=Math.max(0,Math.ceil((eventEnds-Date.now())/1000));$('#eventTimer').textContent='00:'+String(left).padStart(2,'0');if(left<=0){if(currentEvent){currentEvent=null;eventMultiplier=1;$('#eventTitle').textContent='✨ Następny event';$('#eventDesc').textContent='Losowy bonus pojawi się za chwilę.';eventEnds=Date.now()+45000;render()}else startEvent()}}


function renderMiniStats(){
 const setText=(selector,value)=>{
  const el=$(selector);
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


function renderSkins(){
 const grid=$('#skinGrid');
 const activeName=$('#activeSkinName');
 const ownedCount=$('#ownedSkinCount');
 const navDot=$('#skinDot');

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
 const orbit=$('#skinOrbitFx');if(!orbit)return;
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
function applySkinArenaEffects(skin){
 clearSkinArenaEffects();
 if(!skin||state.ecoMode)return;
 const ranks={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,secret:6};
 if((ranks[skin.rarity]||0)<3)return;
 document.body.classList.add('arena-skin-'+skin.rarity);
 const map={glitch:'arena-effect-glitch',lava:'arena-effect-lava',ice:'arena-effect-ice',void:'arena-effect-void',rainbow:'arena-effect-rainbow',gold:'arena-effect-gold',dev:'arena-effect-glitch'};
 if(map[skin.id])document.body.classList.add(map[skin.id])
}

function applySkin(){
 try{
  const skin=skins.find(x=>x.id===state.activeSkin)||skins[0];
  const button=$('#clicker');
  if(!button)return;

  skins.forEach(x=>{if(x.cls)button.classList.remove(x.cls)});
  document.body.classList.remove('arena-skin-epic','arena-skin-legendary','arena-skin-mythic','arena-skin-secret');
  const ranks={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,secret:6};
  if((ranks[skin.rarity]||0)>=3&&!state.ecoMode)document.body.classList.add('arena-skin-'+skin.rarity);

  if(skin.cls)button.classList.add(skin.cls);
  if(typeof renderSkinOrbit==='function')renderSkinOrbit()
 }catch(error){
  console.error('Skin render error:',error);
  saveDiagnostic?.('Skin render',error.message,error.stack||'')
 }

 applySkinArenaEffects(skin);
}
function equipSkin(id){if(state.ownedSkins.includes(id)){state.activeSkin=id;sfx('buy');render()}}
function randomSkin(){let a=skins.filter(s=>s.id!=='classic'),r=Math.random()*a.reduce((n,s)=>n+s.weight,0),sum=0;for(let s of a){sum+=s.weight;if(r<=sum)return s}return a[0]}
function openGoldCase(){
 if(!featureUnlocked('skins'))return toast(lockedFeatureMessage('skins'));
 if(state.gems<25)return toast('Potrzebujesz 25 diamentów');
 state.gems-=25;
 const winner=randomSkin(),isDuplicate=state.ownedSkins.includes(winner.id),targetIndex=24;
 const pool=Array.from({length:30},(_,i)=>i===targetIndex?winner:randomSkin());
 $('#goldCrateOverlay').classList.add('show');$('#goldClose').classList.add('hidden');$('#goldDismiss').classList.add('hidden');$('#goldResult').textContent='';$('#goldTitle').textContent='GOLD NOOB CASE';
 const strip=$('#rouletteStrip');
 strip.innerHTML=pool.map((skin,i)=>`<div class="roulette-item ${i===targetIndex?'winner-preview':''}" data-index="${i}" style="--c:${skin.color}">${skin.emoji}</div>`).join('');
 strip.style.transition='none';strip.style.transform='translateX(0)';
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const win=document.querySelector('.roulette-window'),target=strip.querySelector(`[data-index="${targetIndex}"]`);
  const translate=win.clientWidth/2-(target.offsetLeft+target.offsetWidth/2);
  strip.style.transition='transform 4s cubic-bezier(.12,.7,.12,1)';
  strip.style.transform=`translateX(${translate}px)`
 }));
 setTimeout(()=>{
  if(!isDuplicate)state.ownedSkins.push(winner.id);
  if(isDuplicate)state.gems+=10;
  $('#goldTitle').textContent=winner.emoji+' '+winner.name;
  $('#goldResult').innerHTML=`Rzadkość: <b style="color:${winner.color}">${winner.rarity.toUpperCase()}</b><br>${winner.desc}${isDuplicate?'<br><span class="skin-duplicate-reward">Powtórka — +10 💎</span>':''}`;
  $('#goldClose').classList.remove('hidden');$('#goldDismiss').classList.remove('hidden');$('#goldClose').dataset.skin=winner.id;
  if(winner.id==='gold'||['legendary','mythic','secret'].includes(winner.rarity))confetti();
  sfx('good');render()
 },4200)
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


function renderSettingsStatistics(){
 const set=(id,value)=>{const el=$(id);if(el)el.textContent=value};
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
