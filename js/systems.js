function bossPowerSnapshot(){
 const rawClick=Math.max(1,clickValue());
 const mult=Math.max(1,totalMultiplier());
 const softenedMult=1+Math.sqrt(mult)/2;
 return {rawClick,mult,softenedMult}
}
function bossTargetHits(worldIdx,isEndgame=false){
 if(isEndgame)return 420+Math.min(280,state.level*3+state.rebirths*15);
 return 90+worldIdx*22;
}
function calculatedWorldBossHp(w){
 const p=bossPowerSnapshot(),idx=worldIndex(w.id);
 return Math.floor(p.rawClick*bossTargetHits(idx,false)*p.softenedMult)
}
function calculatedEndgameBossHp(){
 const p=bossPowerSnapshot();
 return Math.floor(p.rawClick*bossTargetHits(worlds.length-1,true)*(1+Math.sqrt(p.mult)*0.65))
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
 let maxHp=Math.max(w.bossHp||500,calculatedWorldBossHp(w));
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

const playerTitles=[
 {name:'Początkujący Noob',test:()=>true},
 {name:'Klikający Noob',test:()=>state.level>=5},
 {name:'Pro Noob',test:()=>state.level>=10},
 {name:'Mistrz Lagów',test:()=>state.level>=20},
 {name:'Legendarny Noob',test:()=>state.level>=35},
 {name:'Władca Rebirthów',test:()=>state.rebirths>=5},
 {name:'Kosmiczny Noob',test:()=>state.unlockedWorlds.includes('galaxy')},
 {name:'Golden Noob',test:()=>state.ownedSkins.includes('gold')},
 {name:'Developer Noob',test:()=>state.unlockedWorlds.includes('dev')}
];
function currentTitle(){return [...playerTitles].reverse().find(t=>t.test())?.name||playerTitles[0].name}

let boss=null,bossTimer=null,lastBossLevel=state.lastBossLevel||0;
const bossTemplates=[
 {name:'Lag Monster',emoji:'👾',desc:'Pożera klatki na sekundę.',mult:1},
 {name:'Banana King',emoji:'🍌',desc:'Władca śliskich porażek.',mult:1.25},
 {name:'Golden Bot',emoji:'🤖',desc:'Klikaj szybciej niż jego skrypty.',mult:1.6},
 {name:'Void Noob',emoji:'🕳️',desc:'Każde kliknięcie znika w pustce.',mult:2.1}
];
function maybeSpawnBoss(){
 scheduleEndgameBossCheck();
 let w=world();
 if(!worldBossDefeated(w.id) && !boss){
  let threshold=Math.max(w.minLevel,3);
  if(state.level>=threshold && state.totalClicks%35===0)spawnWorldBoss()
 }
}
function spawnBoss(){spawnWorldBoss()}
function damageBoss(amount){
 if(!boss)return;if(boss.blocked)return
 let capped=Math.min(Math.max(1,amount),boss.maxHp*.035);boss.hp=Math.max(0,boss.hp-capped);
 renderBoss();if(boss.hp<=0)finishBoss(true)
}
function renderBoss(){
 if(!boss)return;
 $('#bossName').textContent=boss.emoji+' '+boss.name;$('#bossDesc').textContent=boss.desc;
 $('#bossTime').textContent=boss.time;$('#bossHp').textContent=fmt(boss.hp)+'/'+fmt(boss.maxHp);
 $('#bossReward').textContent=fmt(boss.rewardPoints)+' ⭐ + '+boss.rewardGems+' 💎 + '+(boss.rewardCoins||0)+' 🟡';
 $('#bossHealthBar').style.width=(boss.hp/boss.maxHp*100)+'%'
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


function renderHud(){
 $('#points').textContent=fmt(state.points);
 $('#gems').textContent=fmt(state.gems);
 $('#coins').textContent=fmt(state.coins);
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
 $('#playerTitle').textContent='Tytuł: '+currentTitle();
 if(boss)renderBoss();
}
function trimEffects(){
 const limits=[['.float',8],['.skin-local-particle',30],['.weather-particle',20],['.world-particle',12],['.rain',55]];
 for(const [selector,max] of limits){
  const nodes=$$(selector);
  nodes.slice(0,Math.max(0,nodes.length-max)).forEach(n=>n.remove())
 }
}

function render(){
 renderHud();
 $('[data-bind="points"]')?.replaceChildren(document.createTextNode(fmt(state.points)));
 $$('[data-bind="gems"]').forEach(e=>e.textContent=fmt(state.gems));$$('[data-bind="coins"]').forEach(e=>e.textContent=fmt(state.coins));
 $('#points').textContent=fmt(state.points);$('#playerTitle').textContent='Tytuł: '+currentTitle();
 let wb=worldBossDefeated(world().id);$('#challengeBossBtn').textContent=wb&&state.world!=='dev'?'✅ Boss świata pokonany':'⚔️ Zmierz się z '+world().bossName;
 $('#challengeBossBtn').disabled=wb&&state.world!=='dev';$('#gems').textContent=fmt(state.gems);$('#coins').textContent=fmt(state.coins);
 $('#perClick').textContent=fmt(clickValue());$('#pps').textContent=fmt(pps());$('#level').textContent=state.level;$('#multiplier').textContent='x'+totalMultiplier().toFixed(2);
 $('#xpBar').style.width=Math.min(100,state.xp/needXp()*100)+'%';$('#expMult').textContent='x'+expMultiplier().toFixed(2);$('#xpNeed').textContent=fmt(Math.max(0,needXp()-state.xp));$('#combo').textContent='COMBO x'+combo;$('#combo').classList.toggle('hot',combo>=8);$('#aura').style.setProperty('--combo',Math.min(100,combo/20*100)+'%');
 $('#quickClickCost').textContent='Koszt: '+fmt(state.clickCost);$('#quickAutoCost').textContent='Koszt: '+fmt(state.autoCost);$('#quickClick').disabled=state.points<state.clickCost;$('#quickAuto').disabled=state.points<state.autoCost;
 $('#rebirthGain').textContent=rebirthGain()+' 🟡';$('#rebirthBtn').disabled=rebirthGain()<1;
 $('#soundBtn').textContent=state.sound?'🔊':'🔇';$('#musicBtn').textContent=state.music?'🎶':'🎵';
 document.body.dataset.world=state.world;
 let cw=world();document.documentElement.style.setProperty('--worldAccent',cw.accent||'#ff3e9d');
 $('#worldEmoji').textContent=cw.emoji;$('#worldName').textContent=cw.name;$('#worldFlavor').textContent=cw.desc;
 renderFeatureLocks();applyFeatureViewLocks();renderPatchNotes();renderCollection();renderDiagnostics();renderPets();renderShop();renderWorlds();renderSkins();renderCasino();renderMiniStats();maybeSpawnBoss();renderAchievements();renderQuests();renderStats();renderDaily();renderBoard();applySkin();save()
}
function nextFeatureUnlock(){
 let entries=Object.entries(featureUnlocks).filter(([_,lvl])=>lvl>state.level).sort((a,b)=>a[1]-b[1]);
 return entries.length?`${entries[0][0]} — poziom ${entries[0][1]}`:'wszystko odblokowane'
}
function renderStats(){$('#statsBox').innerHTML=`Kliknięcia: <b>${fmt(state.totalClicks)}</b><br>Najlepsze combo: <b>x${state.bestCombo}</b><br>Rebirthy: <b>${state.rebirths}</b><br>Czas gry: <b>${Math.floor(state.playSeconds/60)} min</b><br>Skrzynki: <b>${state.eventStats.crates}</b><br>Minigry: <b>${state.eventStats.minigames||0}</b><br>Skiny: <b>${state.ownedSkins.length}</b><br>Światy: <b>${state.unlockedWorlds.length}/${worlds.length}</b><br>Następna funkcja: <b>${nextFeatureUnlock()}</b><br>Bonus petów: <b>x${petMultiplier().toFixed(2)}</b><br>EXP: <b>x${expMultiplier().toFixed(2)}</b><br>Rebirth mnożnik: <b>x${rebirthMultiplier().toFixed(2)}</b><br>Bossy światów: <b>${state.worldBossesDefeated.length}/${worlds.length}</b><br>Bossy razem: <b>${state.bossWins||0}</b><br>Kasyno: <b>${state.casinoWins||0}/${state.casinoGames||0} wygranych</b>`}
function upgradeCard(u){
 const lvl=u.get(),isMax=lvl>=u.max,c=cost(u),cur=currencyIcon(u.currency);
 const cardClass=u.permanent?'permanent-card':'temporary-card';
 return`<div class="card ${cardClass}">
  <div class="big">${u.icon}</div>
  <h3>${u.name} <small>Lv.${lvl}/${u.max}</small></h3>
  <p class="muted">${u.desc}</p>
  <div class="price">${isMax?'<span class="upgrade-max">MAKSYMALNY POZIOM</span>':fmt(c)+' '+cur}</div>
  <button onclick="buyUpgrade('${u.id}')" ${isMax||state[u.currency]<c?'disabled':''}>${isMax?'MAX':'Kup'}</button>
 </div>`
}
function renderShop(){
 const temporary=upgrades.filter(u=>!u.permanent);
 const permanent=upgrades.filter(u=>u.permanent);
 $('#temporaryShopGrid').innerHTML=temporary.map(upgradeCard).join('');
 $('#permanentShopGrid').innerHTML=permanent.map(upgradeCard).join('')
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
function renderPets(){
 $('#petDot').textContent=state.pets.length;
 $('#equippedCount').textContent=state.equipped.length+'/'+maxPetSlots();
 $('#petBonus').textContent='x'+petMultiplier().toFixed(2);
 $('#petExpBonus').textContent='x'+petExpMultiplier().toFixed(2);

 $('#petOrbit').innerHTML=state.equipped.map(uid=>{
  const instance=getPetInstance(uid),base=getPetBase(instance),evo=PET_EVOLUTIONS[instance?.evolution||0];
  return instance?`<span class="orbit-pet rarity-${base.rarity}" style="filter:drop-shadow(0 0 ${8+instance.evolution*5}px ${evo.color})">${base.emoji}</span>`:''
 }).join('');

 const groups=pets.map(base=>{
  const instances=state.pets.filter(p=>p.type===base.id).sort((a,b)=>b.evolution-a.evolution||b.level-a.level);
  if(!instances.length)return'';
  const fusionButtons=[0,1,2].map(tier=>{
   const available=instances.filter(p=>p.evolution===tier&&!state.equipped.includes(p.uid)).length;
   const next=PET_EVOLUTIONS[tier+1];
   return`<button class="small-btn fusion-btn" onclick="fusePets('${base.id}',${tier})" ${available<3?'disabled':''}>Połącz 3× ${PET_EVOLUTIONS[tier].short} → ${next.short} <small>(${available}/3)</small></button>`
  }).join('');
  return`<div class="pet-group card rarity-${base.rarity}">
   <div class="pet-group-head"><div class="big">${base.emoji}</div><div><h3>${base.name}</h3><p class="muted">${base.rarity.toUpperCase()} • bazowo x${base.mult.toFixed(2)} • egzemplarze: ${instances.length}</p></div></div>
   <div class="pet-instance-list">${instances.map(renderPetInstance).join('')}</div>
   <div class="pet-fusions"><b>🧬 Ewolucja noobka</b>${fusionButtons}</div>
  </div>`
 }).join('');
 $('#petGrid').innerHTML=groups||'<div class="card"><h3>Brak petów</h3><p class="muted">Otwórz pierwszą skrzynkę, aby zdobyć noobka.</p></div>'
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
function weightedPet(){let adjusted=pets.map((p,i)=>({...p,w:p.chance*Math.pow(1+(state.luck||0)*.08,i/2)})),total=adjusted.reduce((a,p)=>a+p.w,0),r=Math.random()*total,sum=0;for(let p of adjusted){sum+=p.w;if(r<=sum)return p}return pets[0]}
function openCrate(){
 if(!featureUnlocked('pets'))return toast(lockedFeatureMessage('pets'));
 if(state.coins<100)return toast('Potrzebujesz 100 Noob Coinów');
 state.coins-=100;state.eventStats.crates++;
 $('#crateOverlay').classList.add('show');$('#crateTitle').textContent='Otwieranie skrzynki…';$('#crateResult').textContent='';$('#crateClose').classList.add('hidden');sfx('buy');
 setTimeout(()=>{
  let base=weightedPet(),instance={uid:createPetUid(),type:base.id,level:1,xp:0,evolution:0};
  state.pets.push(instance);
  $('#crateTitle').textContent=base.emoji+' '+base.name;
  $('#crateResult').innerHTML=`Rzadkość: <b>${base.rarity.toUpperCase()}</b><br>Mnożnik: <b>x${base.mult}</b><br>Nowy osobny egzemplarz`;
  $('#crateClose').classList.remove('hidden');sfx(['legendary','mythic','secret'].includes(base.rarity)?'good':'buy');
  if(['legendary','mythic','secret'].includes(base.rarity))confetti();render()
 },1700)
}

function renderWorldPath(){
 $('#worldPath').innerHTML=worlds.map((w,i)=>{
  let done=worldBossDefeated(w.id),current=state.world===w.id;
  return `<div class="world-path-node ${done?'done':current?'current':''}"><div>${w.emoji}</div><small>${i+1}</small><div>${done?'✓':current?'•':'🔒'}</div></div>`
 }).join('')
}
function renderWorlds(){
 renderWorldPath();
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
function renderAchievements(){$('#achievementGrid').innerHTML=achievements.map(a=>{let done=a.test(),claimed=state.claimedAchievements.includes(a.id);return`<div class="achievement ${done?'done':''}"><div class="badge">${a.icon}</div><div style="flex:1"><h3>${a.name}</h3><p class="muted">${a.desc}</p><button class="small-btn" onclick="claimAchievement('${a.id}')" ${!done||claimed?'disabled':''}>${claimed?'Odebrane':'Odbierz '+a.reward[1]+' '+(a.reward[0]==='gems'?'💎':'🟡')}</button></div></div>`}).join('')}
function claimAchievement(id){let a=achievements.find(x=>x.id===id);if(!a||!a.test()||state.claimedAchievements.includes(id))return;state[a.reward[0]]+=a.reward[1];state.claimedAchievements.push(id);sfx('good');render()}
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
 renderHud();trimEffects()
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


function renderMiniStats(){$('#medals').textContent=state.medals;$('#aimBest').textContent=state.aimBest;$('#parkourBest').textContent=state.parkourBest+' m';$('#memoryBest').textContent=state.memoryBest}
function renderSkins(){let a=skins.find(s=>s.id===state.activeSkin)||skins[0];$('#skinDot').textContent=state.ownedSkins.length;$('#ownedSkinCount').textContent=state.ownedSkins.length;$('#activeSkinName').textContent=a.name;$('#skinGrid').innerHTML=skins.map(s=>{let o=state.ownedSkins.includes(s.id),x=state.activeSkin===s.id;return `<div class="card skin-card ${x?'active':''}" style="--skinColor:${s.color}"><div class="skin-preview">${s.emoji}</div><h3>${s.name}</h3><p class="muted">${s.rarity.toUpperCase()} • ${s.desc}</p><button onclick="equipSkin('${s.id}')" ${!o?'disabled':''}>${x?'Aktywny':o?'Załóż':'Nieodblokowany'}</button></div>`}).join('')}

function renderSkinOrbit(){
 const host=$('#skinOrbitFx');
 if(!host)return;

 const skin=skins.find(s=>s.id===state.activeSkin)||skins[0];
 host.innerHTML='';

 const ringCounts={
  common:0,
  rare:0,
  epic:1,
  legendary:2,
  mythic:3,
  secret:4
 };
 const count=ringCounts[skin.rarity]||0;

 for(let i=0;i<count;i++){
  const ring=document.createElement('i');
  ring.className='skin-ring';
  ring.style.setProperty('--ring',skin.color||'#fff');
  ring.style.inset=`${3+i*12}px`;
  ring.style.animationDelay=`${-i*.42}s`;
  ring.style.animationDuration=`${1.7+i*.28}s`;
  host.append(ring);
 }

 if(['legendary','mythic','secret'].includes(skin.rarity)){
  const symbol=document.createElement('span');
  symbol.className='skin-orbit-symbol';
  symbol.textContent=skin.emoji||'✨';
  symbol.style.color=skin.color||'#fff';
  host.append(symbol);
 }
}

function applySkin(){
 try{
  const skin=skins.find(x=>x.id===state.activeSkin)||skins[0];
  const button=$('#clicker');
  if(!button)return;

  skins.forEach(x=>{
   if(x.cls)button.classList.remove(x.cls)
  });

  if(skin.cls)button.classList.add(skin.cls);
  renderSkinOrbit()
 }catch(error){
  console.error('Skin render error:',error);
  saveDiagnostic?.('Skin render',error.message,error.stack||'')
 }
}
function equipSkin(id){if(state.ownedSkins.includes(id)){state.activeSkin=id;sfx('buy');render()}}
function randomSkin(){let a=skins.filter(s=>s.id!=='classic'),r=Math.random()*a.reduce((n,s)=>n+s.weight,0),sum=0;for(let s of a){sum+=s.weight;if(r<=sum)return s}return a[0]}
function openGoldCase(){if(!featureUnlocked('skins'))return toast(lockedFeatureMessage('skins'));if(state.gems<25)return toast('Potrzebujesz 25 diamentów');state.gems-=25;let w=randomSkin(),pool=[];for(let i=0;i<28;i++)pool.push(i===24?w:randomSkin());$('#goldCrateOverlay').classList.add('show');$('#goldClose').classList.add('hidden');$('#goldResult').textContent='';$('#goldTitle').textContent='GOLD NOOB CASE';$('#rouletteStrip').innerHTML=pool.map(s=>`<div class="roulette-item" style="--c:${s.color}">${s.emoji}</div>`).join('');$('#rouletteStrip').style.transition='none';$('#rouletteStrip').style.transform='translateX(0)';requestAnimationFrame(()=>requestAnimationFrame(()=>{$('#rouletteStrip').style.transition='transform 4s cubic-bezier(.12,.7,.12,1)';$('#rouletteStrip').style.transform='translateX(-2090px)'}));setTimeout(()=>{if(!state.ownedSkins.includes(w.id))state.ownedSkins.push(w.id);$('#goldTitle').textContent=w.emoji+' '+w.name;$('#goldResult').innerHTML=`Rzadkość: <b style="color:${w.color}">${w.rarity.toUpperCase()}</b><br>${w.desc}`;$('#goldClose').classList.remove('hidden');$('#goldClose').dataset.skin=w.id;if(w.id==='gold'||w.rarity==='legendary')confetti();sfx('good');render()},4200)}
