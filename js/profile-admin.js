
/* Ola to Noobek 0.5c — isolated profile, leaderboard and admin module */
state.playerName=String(state.playerName||localStorage.getItem('olaPlayerName')||'').trim().slice(0,16);
state.nameChangedAt=Number(state.nameChangedAt)||0;
state.effectsLevel=Math.max(0,Math.min(2,Number(state.effectsLevel??2)));
state.ecoMode=Boolean(state.ecoMode);
state.autoLeaderboard=state.autoLeaderboard!==false;

const PROFILE_NAME_PATTERN=/^[\p{L}\p{N}_ .-]{3,16}$/u;
let adminSession=null;
let adminVerified=false;
let profileAutoTimer=null;

function cleanProfileName(value){return String(value||'').trim().replace(/\s+/g,' ').slice(0,16)}
function validateProfileName(name){
 if(!PROFILE_NAME_PATTERN.test(name))return'Nick musi mieć 3–16 znaków';
 if(/^(admin|administrator|developer|system|moderator|supabase)$/i.test(name))return'Ta nazwa jest zarezerwowana';
 return''
}
function applyProfilePerformance(){
 document.body.classList.toggle('effects-low',state.effectsLevel===0);
 document.body.classList.toggle('eco-mode',state.ecoMode)
}
function renderProfileSettings(){
 const nameInput=$('#settingsPlayerName');if(!nameInput)return;
 nameInput.value=state.playerName||'';
 $('#settingsPlayerId').value=playerId;
 $('#settingsSound').checked=state.sound;
 $('#settingsMusic').checked=state.music;
 $('#settingsAutoBoard').checked=state.autoLeaderboard;
 $('#settingsEffects').value=String(state.effectsLevel);
 $('#settingsEco').checked=state.ecoMode;
 $('#rankingProfileName').textContent=state.playerName||'Ustaw nick w profilu';
 $('#playerName').value=state.playerName||'';
 $('#profileStatus').textContent=state.playerName?'Profil gotowy — ranking zapisuje się automatycznie.':'Ustaw nick, aby włączyć ranking.';const auto=$('#autosaveStatus');if(auto)auto.textContent='Automatyczny zapis aktywny';
 applyProfilePerformance()
}

let remoteProfileCheckTimer=null;
let remoteProfileApplying=false;
let lastRemoteProfileUpdatedAt=localStorage.getItem('unc_remote_profile_updated_at')||'';

function parseRemoteSaveData(value){
 if(value&&typeof value==='object')return value;
 if(typeof value==='string'){
  try{return JSON.parse(value)}
  catch(error){console.warn('Nieprawidłowy save_data gracza:',error)}
 }
 return null
}

async function fetchOwnRemoteProfile(){
 if(!db||!playerId)return null;

 let result;
 try{
  result=await adminWithTimeout(
   db.rpc('get_player_full_profile',{p_player_id:playerId}),
   12000
  )
 }catch(error){
  console.warn('Remote profile fetch timeout:',error);
  return null
 }

 if(result.error){
  console.warn('Remote profile fetch error:',result.error);
  return null
 }

 return result.data||null
}

function mergeRemoteState(remoteSave){
 if(!remoteSave||typeof remoteSave!=='object')return false;
 const localProgress=(state.totalClicks||0)+(state.level||1)*100+(state.rebirths||0)*10000+(state.pets?.length||0)*500;
 const remoteProgress=(remoteSave.totalClicks||0)+(remoteSave.level||1)*100+(remoteSave.rebirths||0)*10000+(remoteSave.pets?.length||0)*500;
 if(localProgress>5000&&remoteProgress<localProgress*.05){
  console.warn('Odrzucono podejrzanie pusty zapis online',{localProgress,remoteProgress});
  if(typeof saveDiagnostic==='function')saveDiagnostic('Remote sync','Odrzucono pusty zapis online',JSON.stringify({localProgress,remoteProgress}));
  return false
 }

 const preserved={
  activeSkin:state.activeSkin,
  activeSkinRevision:state.activeSkinRevision||0,
  soundEnabled:state.soundEnabled,
  musicEnabled:state.musicEnabled,
  effectIntensity:state.effectIntensity,
  performanceMode:state.performanceMode,
  playerId:state.playerId
 };

 Object.keys(state).forEach(key=>delete state[key]);
 Object.assign(state,remoteSave,preserved);

 if(typeof normalizeState==='function')normalizeState();
 if(typeof ensureAchievementStats==='function')ensureAchievementStats();
 if(typeof ensureArcadeCycle==='function')ensureArcadeCycle();

 save();
 return true
}

async function syncRemoteProfileToPlayer(force=false){
 if(remoteProfileApplying)return false;

 const row=await fetchOwnRemoteProfile();
 if(!row)return false;

 const updatedAt=row.updated_at||row.last_seen||'';
 if(!force&&updatedAt&&updatedAt===lastRemoteProfileUpdatedAt)return false;

 const remoteSave=parseRemoteSaveData(row.save_data);
 if(!remoteSave||!Object.keys(remoteSave).length)return false;

 remoteProfileApplying=true;
 try{
  const applied=mergeRemoteState(remoteSave);
  if(!applied)return false;

  lastRemoteProfileUpdatedAt=updatedAt||new Date().toISOString();
  localStorage.setItem('unc_remote_profile_updated_at',lastRemoteProfileUpdatedAt);

  if(typeof render==='function')render();
  if(typeof applySkin==='function'){
   try{applySkin()}catch(error){console.warn('Skin after remote sync:',error)}
  }

  
  return true
 }finally{
  setTimeout(()=>{remoteProfileApplying=false},800)
 }
}

function startRemoteProfileWatcher(){
 clearInterval(remoteProfileCheckTimer);
 remoteProfileCheckTimer=setInterval(()=>{
  if(document.visibilityState==='visible')syncRemoteProfileToPlayer(false)
 },30000)
}

async function savePlayerProfile(showError=false){
 if(remoteProfileApplying)return false;
 if(!db||!state.playerName)return false;

 let result=await db.rpc('save_player_full_profile',{
  p_player_id:playerId,
  p_player_name:state.playerName,
  p_best_score:Math.floor(state.points),
  p_level:state.level,
  p_rebirths:state.rebirths,
  p_game_version:GAME_VERSION,
  p_save_data:state
 });


 if(result.error){
  const error=result.error;
  if(/save_player_full_profile|schema cache|function/i.test(error.message||'')){
   error.message='Brakuje aktualnej funkcji save_player_full_profile w Supabase. Stary zapis save_player_profile został wyłączony.'
  }
  console.error(error);
  saveDiagnostic?.('Profil',error.message,error.stack||'');
  $('#profileStatus')&&($('#profileStatus').textContent='Błąd profilu: '+error.message);
  if(showError)toast('Błąd profilu: '+error.message);
  return false
 }

 $('#profileStatus')&&($('#profileStatus').textContent='Pełny zapis zsynchronizowany: '+new Date().toLocaleTimeString('pl-PL'));
 return true
}
async function saveProfileName(){
 const name=cleanProfileName($('#settingsPlayerName').value);
 const issue=validateProfileName(name);if(issue)return toast(issue);
 if(state.playerName&&name!==state.playerName&&Date.now()-(state.nameChangedAt||0)<3600000)return toast('Nick można zmienić raz na godzinę');
 state.playerName=name;state.nameChangedAt=Date.now();
 localStorage.setItem('olaPlayerName',name);save();renderProfileSettings();
 await savePlayerProfile(true)
}
async function automaticLeaderboardSave(){
 if(!state.autoLeaderboard||!state.playerName||!db)return;
 if(Date.now()-lastSaveOnline<15000)return;
 lastSaveOnline=Date.now();
 await savePlayerProfile(false);
 await loadBoard()
}

/* These functions intentionally override only the old leaderboard functions. */
async function loadBoard(){
 if(!db)return renderBoard();

 const metric=['score','level','rebirths'].includes(boardMode)?boardMode:'score';
 const column=metric==='score'?'best_score':metric;

 try{
  const {data,error}=await db.from('players')
   .select('player_id,player_name,best_score,level,rebirths,last_seen,is_banned,save_data')
   .eq('is_banned',false)
   .order(column,{ascending:false})
   .limit(10);

  if(!error&&data?.length){
   onlineBoard=data.map(row=>({...row,source:'players'}));
   return renderBoard()
  }

  // Stare wyniki były zapisywane w tabeli scores.
  // Używamy jej jako zgodności wstecznej, dopóki gracze nie utworzą profili.
  if(metric==='score'){
   const oldResult=await db.from('scores')
    .select('player_id,player_name,score,updated_at')
    .order('score',{ascending:false})
    .limit(10);

   if(!oldResult.error&&oldResult.data?.length){
    onlineBoard=oldResult.data.map(row=>({
     player_id:row.player_id,
     player_name:row.player_name,
     best_score:row.score,
     level:1,
     rebirths:0,
     last_seen:row.updated_at,
     source:'scores'
    }));
    return renderBoard()
   }
  }

  onlineBoard=[];
  if(error)console.warn('Nowy ranking players:',error.message);
  renderBoard()
 }catch(error){
  console.error(error);
  saveDiagnostic?.('Ranking',error.message,error.stack||'');
  onlineBoard=[];
  renderBoard()
 }

 if(typeof renderBoard==='function')renderBoard();
 requestAnimationFrame(()=>applyLeaderboardTextures());
}

function profileTextureStyle(frame,background){
 return typeof window.textureStyleForProfile==='function'
  ?window.textureStyleForProfile(frame,background)
  :''
}


function applyLeaderboardTextures(){
 document.querySelectorAll('.board-row,.leaderboard-row').forEach(row=>{
  const frame=row.dataset.frame||'default';
  const background=row.dataset.background||'default';
  if(typeof window.applyProfileTextureToElement==='function'){
   window.applyProfileTextureToElement(row,frame,background)
  }
 })
}

function renderBoard(){
 const target=$('#leaderboard');if(!target)return;
 const metric=['score','level','rebirths'].includes(boardMode)?boardMode:'score';
 const list=onlineBoard.length
  ?onlineBoard
  :[...state.leaderboard].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,10);

 const valueOf=row=>metric==='level'
  ?Number(row.level||1)
  :metric==='rebirths'
   ?Number(row.rebirths||0)
   :Number(row.best_score??row.score??0);

 const suffix=metric==='level'?' Lv.':metric==='rebirths'?' ♻️':' ⭐';
 target.innerHTML=list.length?list.map((row,index)=>{
  const save=typeof parseAdminSaveData==='function'?parseAdminSaveData(row.save_data):{};
  const frame=(save&&save.profileFrame)||row.profile_frame||'default';
  const background=(save&&save.profileBackground)||row.profile_background||'default';
  return `<div class="board-row profile-frame-${safeText(frame)} profile-bg-${safeText(background)}" data-frame="${frame}" data-background="${background}">
   <b>${index+1}.</b><span>${safeText(row.player_name??row.name)}</span><b>${fmt(valueOf(row))}${suffix}</b>
  </div>`
 }).join(''):'<p class="muted">Brak wyników.</p>'

 requestAnimationFrame(()=>{
  if(typeof refreshVisibleTextures==='function')refreshVisibleTextures()
 });
}
async function saveOnline(){
 if(!state.playerName)return toast('Ustaw nick w Ustawieniach');
 if(Date.now()-lastSaveOnline<8000)return toast('Odczekaj chwilę');
 lastSaveOnline=Date.now();

 const profileSaved=await savePlayerProfile(true);

 // Zachowujemy także stary wpis scores, aby ranking działał
 // podczas przejścia pomiędzy systemami.
 let legacySaved=false;
 if(db){
  const legacy=await db.rpc('submit_score',{
   p_player_id:playerId,
   p_player_name:state.playerName,
   p_score:Math.floor(state.points)
  });
  legacySaved=!legacy.error;
  if(legacy.error)console.warn('Stary ranking scores:',legacy.error.message)
 }

 if(profileSaved||legacySaved){
  toast('Ranking zapisany');
  loadBoard()
 }
}

function exportProfileSave(){
 save();
 const blob=new Blob([JSON.stringify({game:'ola-to-noobek',version:GAME_VERSION,exportedAt:new Date().toISOString(),state,playerId},null,2)],{type:'application/json'});
 const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`ola-noobek-save-${Date.now()}.json`;link.click();URL.revokeObjectURL(link.href)
}
async function importProfileSave(file){
 if(!file)return;
 try{
  const parsed=JSON.parse(await file.text()),incoming=parsed.state||parsed;
  if(!incoming||typeof incoming!=='object')throw new Error('Nieprawidłowy zapis');
  localStorage.setItem('olaImportBackup',localStorage.getItem(SAVE_KEY)||'{}');
  localStorage.setItem(SAVE_KEY,JSON.stringify(incoming));location.reload()
 }catch(error){toast(error.message)}
}
function resetProfileSave(){
 if(prompt('Wpisz dokładnie: RESET NOOB')!=='RESET NOOB')return;
 localStorage.removeItem(SAVE_KEY);location.reload()
}
function bindProfileSettings(){
 $('#savePlayerName').onclick=saveProfileName;
 $('#copyPlayerId').onclick=async()=>{await navigator.clipboard.writeText(playerId);toast('Player ID skopiowane')};
 $('#settingsSound').onchange=e=>{state.sound=e.target.checked;save()};
 $('#settingsMusic').onchange=e=>{state.music=e.target.checked;setMusic(state.music);save()};
 $('#settingsAutoBoard').onchange=e=>{state.autoLeaderboard=e.target.checked;save()};
 $('#settingsEffects').onchange=e=>{state.effectsLevel=+e.target.value;applyProfilePerformance();save()};
 $('#settingsEco').onchange=e=>{state.ecoMode=e.target.checked;applyProfilePerformance();save()};
 
 
 
 
 $$('.board-tabs [data-board]').forEach(button=>button.onclick=()=>{
  boardMode=button.dataset.board;
  $$('.board-tabs [data-board]').forEach(x=>x.classList.toggle('active',x===button));
  loadBoard()
 })
}

async function refreshAdminSession(){
 if(!db)return;
 const {data:{session}}=await db.auth.getSession();adminSession=session;
 if(!session)return setAdminState(false);
 const {data,error}=await db.rpc('is_current_user_admin');
 setAdminState(!error&&data===true)
}
function setAdminState(value){
 adminVerified=value;
 $('#adminNavBtn').classList.toggle('hidden',!value);
 $('#adminLogout').classList.toggle('hidden',!adminSession);
 $('#adminLogin').classList.toggle('hidden',!!adminSession);
 $('#adminLoginStatus').textContent=value?'Zalogowano jako administrator.':adminSession?'Konto nie ma wpisu w admin_users.':'Administrator nie jest zalogowany.';
 if(value)loadAdminDashboard()
}
async function adminLogin(){
 if(!db)return toast('Supabase niedostępny');
 const email=$('#adminEmail').value.trim(),password=$('#adminPassword').value;
 if(!email||!password)return toast('Wpisz e-mail i hasło');
 $('#adminLoginStatus').textContent='Logowanie…';
 const {data,error}=await db.auth.signInWithPassword({email,password});
 if(error){$('#adminLoginStatus').textContent='Błąd: '+error.message;return toast('Logowanie nieudane')}
 adminSession=data.session;await refreshAdminSession()
}
async function adminLogout(){await db.auth.signOut();adminSession=null;setAdminState(false);showView('settings')}
async function adminRpc(name,args={}){
 if(!adminVerified)throw new Error('Brak uprawnień');
 const {data,error}=await db.rpc(name,args);if(error)throw error;return data
}
async function loadAdminDashboard(){
 if(!adminVerified)return;
 try{
  const summary=await adminRpc('admin_dashboard_summary');
  $('#adminSummary').innerHTML=[['Gracze',summary.players],['Aktywni 24h',summary.active_24h],['Feedback',summary.feedback],['Zablokowani',summary.banned]]
   .map(item=>`<div class="card"><b>${item[1]}</b><small>${item[0]}</small></div>`).join('');
  await Promise.all([loadAdminPlayers(),loadAdminFeedback(),loadAdminActions()])
 }catch(error){toast(error.message)}
}
async function loadAdminPlayers(query=''){
 const rows=await adminRpc('admin_list_players',{p_query:query});
 $('#adminPlayersList').innerHTML=(rows||[]).map(p=>`<div class="admin-item">
  <div class="admin-item-head"><b>${safeText(p.player_name)}</b><span>${fmt(p.best_score)} ⭐</span></div>
  <div class="admin-meta">${p.player_id} • Lv.${p.level} • ${p.rebirths} rebirth • ${p.is_banned?'ZABLOKOWANY':'aktywny'}</div>
  <div class="admin-actions-row"><button class="small-btn admin-warning" onclick="adminResetScore('${p.player_id}')">Reset wyniku</button><button class="small-btn ${p.is_banned?'':'admin-danger'}" onclick="adminSetBan('${p.player_id}',${!p.is_banned})">${p.is_banned?'Odblokuj':'Zablokuj'}</button></div>
 </div>`).join('')
}
async function loadAdminFeedback(){
 const rows=await adminRpc('admin_list_feedback');
 $('#adminFeedbackList').innerHTML=(rows||[]).map(f=>`<div class="admin-item"><div class="admin-item-head"><b>${safeText(f.player_name)} • ${safeText(f.feedback_type)}</b><span>${f.is_visible?'Widoczny':'Ukryty'}</span></div><div class="feedback-body">${safeText(f.message)}</div><div class="admin-actions-row"><button class="small-btn" onclick="adminSetFeedback(${f.id},${!f.is_visible})">${f.is_visible?'Ukryj':'Pokaż'}</button></div></div>`).join('')
}
async function loadAdminActions(){
 const rows=await adminRpc('admin_list_actions');
 $('#adminActionsList').innerHTML=(rows||[]).map(a=>`<div class="admin-item"><b>${safeText(a.action_type)}</b><div class="admin-meta">${new Date(a.created_at).toLocaleString('pl-PL')} • ${safeText(a.target_id||'')}</div></div>`).join('')
}
async function adminSetBan(id,value){if(!confirm('Potwierdź zmianę blokady'))return;await adminRpc('admin_set_player_ban',{p_player_id:id,p_banned:value});loadAdminDashboard()}
async function adminResetScore(id){if(!confirm('Zresetować wynik?'))return;await adminRpc('admin_reset_player_score',{p_player_id:id});loadAdminDashboard()}
async function adminSetFeedback(id,value){await adminRpc('admin_set_feedback_visibility',{p_feedback_id:id,p_visible:value});loadAdminFeedback()}
function bindAdminPanel(){
 $('#adminLogin').onclick=adminLogin;$('#adminLogout').onclick=adminLogout;$('#refreshAdmin').onclick=loadAdminDashboard;
 $('#adminSearchPlayers').onclick=()=>loadAdminPlayers($('#adminPlayerSearch').value.trim());
 $$('.admin-tabs .tab').forEach(button=>button.onclick=()=>{
  $$('.admin-tabs .tab').forEach(x=>x.classList.toggle('active',x===button));
  $$('.admin-panel').forEach(x=>x.classList.toggle('active',x.id==='admin-'+button.dataset.adminTab))
 });
 db?.auth.onAuthStateChange(()=>setTimeout(refreshAdminSession,0))
}

let adminEditedProfile=null;

function adminWithTimeout(promise,ms=12000){
 return Promise.race([
  promise,
  new Promise((_,reject)=>setTimeout(()=>reject(new Error('Przekroczono czas oczekiwania na Supabase')),ms))
 ])
}
function parseAdminSaveData(value){
 if(value&&typeof value==='object')return value;
 if(typeof value==='string'){
  try{return JSON.parse(value)}catch(error){console.warn('Nieprawidłowy save_data:',error)}
 }
 return{}
}



function adminInteger(id,fallback=0,min=0,max=Number.MAX_SAFE_INTEGER){
 return Math.trunc(adminNumber(id,fallback,min,max))
}
function normalizeAdminSaveIntegers(save){
 const integerKeys=[
  'points','coins','gems','level','xp','rebirths','totalClicks','bestCombo',
  'playSeconds','medals','goldCases','bossWins','dailyStreak','casinoChips',
  'casinoLevel','casinoXp','casinoGames','casinoWins'
 ];
 integerKeys.forEach(key=>{
  if(key in save)save[key]=Math.trunc(Number(save[key])||0)
 });

 if(save.minigameRecords&&typeof save.minigameRecords==='object'){
  Object.keys(save.minigameRecords).forEach(key=>{
   save.minigameRecords[key]=Math.trunc(Number(save.minigameRecords[key])||0)
  })
 }

 if(Array.isArray(save.pets)){
  save.pets=save.pets.map(pet=>({
   ...pet,
   level:Math.max(1,Math.trunc(Number(pet.level)||1)),
   xp:Math.max(0,Math.trunc(Number(pet.xp)||0)),
   evolution:Math.max(0,Math.min(3,Math.trunc(Number(pet.evolution)||0)))
  }))
 }

 return save
}

function adminNumber(id,fallback=0,min=-Infinity,max=Infinity){
 const value=Number($('#'+id)?.value);
 if(!Number.isFinite(value))return fallback;
 return Math.max(min,Math.min(max,value))
}
function adminText(id,fallback=''){
 return ($('#'+id)?.value??fallback).trim()
}
function adminCsv(id,fallback=[]){
 const value=$('#'+id)?.value;
 if(value==null)return Array.isArray(fallback)?fallback:[];
 return [...new Set(value.split(',').map(item=>item.trim()).filter(Boolean))]
}
function adminSetValue(id,value){
 const element=$('#'+id);
 if(element)element.value=value??''
}
function adminGrade(value){
 const grade=String(value||'-').trim().toUpperCase();
 return ['-','D','C','B','A','S','SS','SSS'].includes(grade)?grade:'-'
}
function adminPetUid(pet){
 return pet?.uid||pet?.instanceId||pet?.id||''
}
function adminPetType(pet){
 return pet?.type||pet?.petId||pet?.baseId||pet?.id||'unknown'
}
function adminBaseSave(){
 if(!adminEditedProfile)return{};
 const textarea=$('#adminSaveJson');
 if(textarea?.value.trim()){
  try{return JSON.parse(textarea.value)}
  catch(error){throw new Error('JSON jest nieprawidłowy: '+error.message)}
 }
 return parseAdminSaveData(adminEditedProfile.save_data)
}
function adminSaveFromForm(baseSave=null){
 const save={...(baseSave||adminBaseSave())};

 save.playerName=adminText('adminEditName',save.playerName||adminEditedProfile?.player_name||'Gracz').slice(0,16);
 save.points=adminNumber('adminEditPoints',Number(save.points)||0,0);
 save.coins=adminNumber('adminEditCoins',Number(save.coins)||0,0);
 save.gems=adminNumber('adminEditGems',Number(save.gems)||0,0);
 save.level=Math.floor(adminNumber('adminEditLevel',Number(save.level)||1,1));
 save.xp=adminNumber('adminEditXp',Number(save.xp)||0,0);
 save.rebirths=Math.floor(adminNumber('adminEditRebirths',Number(save.rebirths)||0,0));
 save.totalClicks=Math.floor(adminNumber('adminEditTotalClicks',Number(save.totalClicks)||0,0));
 save.bestCombo=Math.floor(adminNumber('adminEditBestCombo',Number(save.bestCombo)||1,1));
 save.playSeconds=Math.floor(adminNumber('adminEditPlaySeconds',Number(save.playSeconds)||0,0));
 save.medals=Math.floor(adminNumber('adminEditMedals',Number(save.medals)||0,0));
 save.goldCases=Math.floor(adminNumber('adminEditGoldCases',Number(save.goldCases)||0,0));
 save.bossWins=Math.floor(adminNumber('adminEditBossWins',Number(save.bossWins)||0,0));
 save.dailyStreak=Math.floor(adminNumber('adminEditDailyStreak',Number(save.dailyStreak)||0,0));

 save.world=adminText('adminEditWorld',save.world||'neon')||'neon';
 save.activeSkin=adminText('adminEditActiveSkin',save.activeSkin||'classic')||'classic';
 save.unlockedWorlds=adminCsv('adminEditUnlockedWorlds',save.unlockedWorlds||['neon']);
 if(!save.unlockedWorlds.includes(save.world))save.unlockedWorlds.unshift(save.world);
 save.worldBossesDefeated=adminCsv('adminEditWorldBosses',save.worldBossesDefeated||[]);
 save.ownedSkins=adminCsv('adminEditOwnedSkins',save.ownedSkins||['classic']);
 if(!save.ownedSkins.includes('classic'))save.ownedSkins.unshift('classic');
 if(!save.ownedSkins.includes(save.activeSkin))save.ownedSkins.push(save.activeSkin);

 save.casinoChips=Math.floor(adminNumber('adminEditCasinoChips',Number(save.casinoChips)||0,0));
 save.casinoLevel=Math.floor(adminNumber('adminEditCasinoLevel',Number(save.casinoLevel)||1,1));
 save.casinoXp=Math.floor(adminNumber('adminEditCasinoXp',Number(save.casinoXp)||0,0));
 save.casinoGames=Math.floor(adminNumber('adminEditCasinoGames',Number(save.casinoGames)||0,0));
 save.casinoWins=Math.floor(adminNumber('adminEditCasinoWins',Number(save.casinoWins)||0,0));
 save.casinoProfit=adminNumber('adminEditCasinoProfit',Number(save.casinoProfit)||0);

 save.minigameRecords={
  aim:adminNumber('adminEditAimRecord',Number(save.minigameRecords?.aim)||0,0),
  parkour:adminNumber('adminEditParkourRecord',Number(save.minigameRecords?.parkour)||0,0),
  reflex:adminNumber('adminEditReflexRecord',Number(save.minigameRecords?.reflex)||0,0),
  dodge:adminNumber('adminEditDodgeRecord',Number(save.minigameRecords?.dodge)||0,0),
  ...(save.minigameRecords||{})
 };
 // Nadpisanie po spreadzie, aby wartości formularza zawsze wygrywały.
 save.minigameRecords.aim=adminNumber('adminEditAimRecord',Number(save.minigameRecords.aim)||0,0);
 save.minigameRecords.parkour=adminNumber('adminEditParkourRecord',Number(save.minigameRecords.parkour)||0,0);
 save.minigameRecords.reflex=adminNumber('adminEditReflexRecord',Number(save.minigameRecords.reflex)||0,0);
 save.minigameRecords.dodge=adminNumber('adminEditDodgeRecord',Number(save.minigameRecords.dodge)||0,0);

 save.minigameBestGrades={
  ...(save.minigameBestGrades||{}),
  aim:adminGrade(adminText('adminEditAimGrade',save.minigameBestGrades?.aim||'-')),
  parkour:adminGrade(adminText('adminEditParkourGrade',save.minigameBestGrades?.parkour||'-')),
  reflex:adminGrade(adminText('adminEditReflexGrade',save.minigameBestGrades?.reflex||'-')),
  dodge:adminGrade(adminText('adminEditDodgeGrade',save.minigameBestGrades?.dodge||'-'))
 };

 const petRows=[...document.querySelectorAll('[data-admin-pet-uid]')];
 if(petRows.length){
  save.pets=petRows.filter(row=>row.dataset.deleted!=='1').map(row=>{
   const uid=row.dataset.adminPetUid;
   const original=(Array.isArray(save.pets)?save.pets:[]).find(pet=>adminPetUid(pet)===uid)||{};
   return{
    ...original,
    uid,
    type:row.querySelector('[data-pet-type]')?.value.trim()||adminPetType(original),
    level:Math.floor(Math.max(1,Number(row.querySelector('[data-pet-level]')?.value)||1)),
    xp:Math.max(0,Number(row.querySelector('[data-pet-xp]')?.value)||0),
    evolution:Math.floor(Math.max(0,Math.min(3,Number(row.querySelector('[data-pet-evolution]')?.value)||0)))
   }
  })
 }

 const validPetIds=new Set((Array.isArray(save.pets)?save.pets:[]).map(adminPetUid).filter(Boolean));
 save.equipped=[1,2,3]
  .map(slot=>adminText('adminPetSlot'+slot))
  .filter(uid=>uid&&validPetIds.has(uid))
  .slice(0,3);

 return normalizeAdminSaveIntegers(save)
}

function safeAdminRender(name,callback){
 try{
  if(typeof callback==='function')callback()
 }catch(error){
  console.error(`Admin renderer ${name}:`,error);
  if(typeof saveDiagnostic==='function'){
   saveDiagnostic('Admin renderer',`${name}: ${error.message}`,error.stack||'')
  }
 }
}

function populateAdminForm(save,row={}){
 adminSetValue('adminEditName',row.player_name||save.playerName||'');
 adminSetValue('adminEditPoints',Math.floor(Number(save.points??row.best_score??0)));
 adminSetValue('adminEditCoins',Math.floor(Number(save.coins)||0));
 adminSetValue('adminEditGems',Math.floor(Number(save.gems)||0));
 adminSetValue('adminEditLevel',Math.max(1,Math.floor(Number(save.level??row.level??1))));
 adminSetValue('adminEditXp',Math.max(0,Number(save.xp)||0));
 adminSetValue('adminEditRebirths',Math.max(0,Math.floor(Number(save.rebirths??row.rebirths??0))));
 adminSetValue('adminEditTotalClicks',Math.max(0,Math.floor(Number(save.totalClicks)||0)));
 adminSetValue('adminEditBestCombo',Math.max(1,Math.floor(Number(save.bestCombo)||1)));
 adminSetValue('adminEditPlaySeconds',Math.max(0,Math.floor(Number(save.playSeconds)||0)));
 adminSetValue('adminEditMedals',Math.max(0,Math.floor(Number(save.medals)||0)));
 adminSetValue('adminEditGoldCases',Math.max(0,Math.floor(Number(save.goldCases)||0)));
 adminSetValue('adminEditBossWins',Math.max(0,Math.floor(Number(save.bossWins)||0)));
 adminSetValue('adminEditDailyStreak',Math.max(0,Math.floor(Number(save.dailyStreak)||0)));

 adminSetValue('adminEditWorld',save.world||'neon');
 adminSetValue('adminEditActiveSkin',save.activeSkin||'classic');
 adminSetValue('adminEditUnlockedWorlds',(save.unlockedWorlds||[]).join(', '));
 adminSetValue('adminEditWorldBosses',(save.worldBossesDefeated||[]).join(', '));
 adminSetValue('adminEditOwnedSkins',(save.ownedSkins||[]).join(', '));

 adminSetValue('adminEditCasinoChips',Math.max(0,Math.floor(Number(save.casinoChips)||0)));
 adminSetValue('adminEditCasinoLevel',Math.max(1,Math.floor(Number(save.casinoLevel)||1)));
 adminSetValue('adminEditCasinoXp',Math.max(0,Math.floor(Number(save.casinoXp)||0)));
 adminSetValue('adminEditCasinoGames',Math.max(0,Math.floor(Number(save.casinoGames)||0)));
 adminSetValue('adminEditCasinoWins',Math.max(0,Math.floor(Number(save.casinoWins)||0)));
 adminSetValue('adminEditCasinoProfit',Number(save.casinoProfit)||0);

 adminSetValue('adminEditAimRecord',Number(save.minigameRecords?.aim)||0);
 adminSetValue('adminEditParkourRecord',Number(save.minigameRecords?.parkour)||0);
 adminSetValue('adminEditReflexRecord',Number(save.minigameRecords?.reflex)||0);
 adminSetValue('adminEditDodgeRecord',Number(save.minigameRecords?.dodge)||0);
 adminSetValue('adminEditAimGrade',save.minigameBestGrades?.aim||'-');
 adminSetValue('adminEditParkourGrade',save.minigameBestGrades?.parkour||'-');
 adminSetValue('adminEditReflexGrade',save.minigameBestGrades?.reflex||'-');
 adminSetValue('adminEditDodgeGrade',save.minigameBestGrades?.dodge||'-');

 const equipped=Array.isArray(save.equipped)?save.equipped:[];
 [1,2,3].forEach((slot,index)=>adminSetValue('adminPetSlot'+slot,equipped[index]||''));

 safeAdminRender('equipped pets',()=>renderAdminEquippedPets(save));
 safeAdminRender('all pets',()=>renderAdminAllPets(save));

 const json=$('#adminSaveJson');
 if(json)json.value=JSON.stringify(save,null,2);
 setAdminJsonStatus(true,'JSON poprawny')
}
function setAdminJsonStatus(valid,text){
 const status=$('#adminJsonValidation');
 if(!status)return;
 status.textContent=text;
 status.classList.toggle('valid',valid);
 status.classList.toggle('invalid',!valid)
}
function validateAdminJson(showToast=false){
 const textarea=$('#adminSaveJson');
 try{
  const value=JSON.parse(textarea?.value||'{}');
  if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('Główny element musi być obiektem.');
  setAdminJsonStatus(true,'JSON poprawny');
  if(showToast)toast('JSON jest poprawny');
  return value
 }catch(error){
  setAdminJsonStatus(false,'Błąd JSON');
  if(showToast)toast('Błąd JSON: '+error.message);
  return null
 }
}

function renderAdminEquippedPets(save){
 const box=$('#adminEquippedPets');
 if(!box)return;

 const pets=Array.isArray(save?.pets)?save.pets:[];
 const equipped=Array.isArray(save?.equipped)?save.equipped:[];

 if(!equipped.length){
  box.innerHTML='<div class="admin-empty-pets">Brak wyposażonych petów.</div>';
  return
 }

 box.innerHTML=equipped.map((uid,index)=>{
  const pet=pets.find(item=>adminPetUid(item)===uid);
  const base=pet&&typeof getPetBase==='function'?getPetBase(pet):null;
  const icon=base?.emoji||pet?.emoji||'👻';
  const name=base?.name||pet?.name||adminPetType(pet||{id:uid});

  return `<div class="admin-equipped-pet">
   <div>
    <strong>${icon} ${safeText(name)}</strong>
    <small>Slot ${index+1}</small>
   </div>
   <small class="admin-pet-uid">${safeText(uid)}</small>
   <button type="button" data-admin-remove-equipped="${index}">Usuń ze slotu</button>
  </div>`
 }).join('');

 box.querySelectorAll('[data-admin-remove-equipped]').forEach(button=>{
  button.onclick=()=>{
   const slot=Number(button.dataset.adminRemoveEquipped);
   const input=$('#adminPetSlot'+(slot+1));
   if(input)input.value='';

   const previewSave={
    ...save,
    equipped:[1,2,3]
     .map(number=>$('#adminPetSlot'+number)?.value.trim())
     .filter(Boolean)
   };

   renderAdminEquippedPets(previewSave)
  }
 })
}

function renderAdminAllPets(save){
 const box=$('#adminAllPets');
 if(!box)return;
 const pets=Array.isArray(save?.pets)?save.pets:[];

 if(!pets.length){
  box.innerHTML='<div class="admin-empty-pets">Gracz nie posiada żadnych petów.</div>';
  return
 }

 box.innerHTML=pets.map(pet=>{
  const uid=adminPetUid(pet);
  const base=typeof getPetBase==='function'?getPetBase(pet):null;
  const icon=base?.emoji||pet?.emoji||'🐾';
  const name=base?.name||pet?.name||adminPetType(pet);
  return `<article class="admin-pet-card" data-admin-pet-uid="${safeText(uid)}">
   <div class="admin-pet-card-title">
    <strong>${icon} ${safeText(name)}</strong>
    <button type="button" class="danger-btn" data-delete-admin-pet>Usuń peta</button>
   </div>
   <small>UID: ${safeText(uid)}</small>
   <div class="admin-pet-fields">
    <label>Typ<input data-pet-type value="${safeText(adminPetType(pet))}"></label>
    <label>Poziom<input data-pet-level type="number" min="1" value="${Math.max(1,Number(pet.level)||1)}"></label>
    <label>EXP<input data-pet-xp type="number" min="0" value="${Math.max(0,Number(pet.xp)||0)}"></label>
    <label>Ewolucja 0–3<input data-pet-evolution type="number" min="0" max="3" value="${Math.max(0,Math.min(3,Number(pet.evolution)||0))}"></label>
   </div>
  </article>`
 }).join('');

 box.querySelectorAll('[data-delete-admin-pet]').forEach(button=>{
  button.onclick=()=>{
   const card=button.closest('[data-admin-pet-uid]');
   const uid=card?.dataset.adminPetUid||'';
   if(!card||!confirm(`Usunąć peta ${uid}?`))return;
   card.dataset.deleted='1';
   card.classList.add('deleted');
   button.textContent='Oznaczony do usunięcia';
   button.disabled=true;
   [1,2,3].forEach(slot=>{
    const input=$('#adminPetSlot'+slot);
    if(input?.value.trim()===uid)input.value=''
   })
  }
 })
}



function adminParseIdList(value){
 return [...new Set(String(value||'').split(',').map(item=>item.trim()).filter(Boolean))]
}

async function adminSaveWorldsAndSkins(){
 if(typeof isAdminSession==='function'&&!isAdminSession())return toast('Brak uprawnień administratora');
 if(!adminEditedProfile)return toast('Najpierw pobierz profil gracza');

 const button=$('#adminSaveWorldsSkins');
 const status=$('#adminEditStatus');
 const original=button?.textContent;

 try{
  if(button){button.disabled=true;button.textContent='Zapisywanie...'}

  const save=adminCurrentRemoteSave();
  const playerId=$('#adminEditPlayerId')?.value.trim();
  if(!playerId)throw new Error('Brak Player ID');

  const currentWorld=$('#adminEditWorld')?.value.trim()||save.currentWorld||save.activeWorld||'neon';
  const activeSkin=$('#adminEditActiveSkin')?.value.trim()||save.activeSkin||'classic';
  const unlockedWorlds=adminParseIdList($('#adminEditUnlockedWorlds')?.value);
  const defeatedWorldBosses=adminParseIdList($('#adminEditWorldBosses')?.value);
  const ownedSkins=adminParseIdList($('#adminEditOwnedSkins')?.value);

  save.currentWorld=currentWorld;
  save.activeWorld=currentWorld;
  save.activeSkin=activeSkin;
  save.unlockedWorlds=unlockedWorlds.length?unlockedWorlds:[currentWorld];
  save.defeatedWorldBosses=defeatedWorldBosses;
  save.ownedSkins=ownedSkins.length?ownedSkins:[activeSkin];

  if(!save.unlockedWorlds.includes(currentWorld))save.unlockedWorlds.push(currentWorld);
  if(!save.ownedSkins.includes(activeSkin))save.ownedSkins.push(activeSkin);

  const result=await adminWithTimeout(
   db.rpc('admin_update_player_full_profile',{
    p_player_id:playerId,
    p_player_name:save.playerName||adminEditedProfile.player_name||'Gracz',
    p_save_data:normalizeAdminSaveIntegers(save)
   }),
   12000
  );
  if(result.error)throw result.error;

  adminEditedProfile={...adminEditedProfile,player_name:save.playerName||adminEditedProfile.player_name,save_data:save,updated_at:new Date().toISOString()};
  safeAdminRender('worlds and skins save',()=>populateAdminForm(save,adminEditedProfile));
  if(status)status.textContent=`Zapisano światy (${save.unlockedWorlds.length}), bossów (${save.defeatedWorldBosses.length}) i skiny (${save.ownedSkins.length}).`;
  toast('Światy i skiny zapisane');
  return true
 }catch(error){
  console.error('Admin worlds and skins save:',error);
  if(status)status.textContent='Błąd zapisu światów i skinów: '+(error.message||error);
  toast('Nie udało się zapisać światów i skinów');
  return false
 }finally{
  if(button){button.disabled=false;button.textContent=original}
 }
}
window.adminSaveWorldsAndSkins=adminSaveWorldsAndSkins;

async function adminGrantAllTestCosmetics(){
 if(typeof isAdminSession==='function'&&!isAdminSession()){
  return toast('Brak uprawnień administratora')
 }
 if(!adminEditedProfile){
  return toast('Najpierw pobierz profil gracza')
 }

 const button=$('#adminGrantTestCosmetics');
 const status=$('#adminEditStatus');
 const oldText=button?.textContent;

 try{
  if(button){
   button.disabled=true;
   button.textContent='Nadawanie kosmetyków...'
  }

  const save=adminCurrentRemoteSave();
  const allSkins=[...adminKnownSkinIds()];

  const allFrames=['default','arcade','collector','developer'];
  const allBackgrounds=['default','wealth','casino','reflex'];

  save.ownedSkins=[...new Set(allSkins)];
  save.ownedProfileFrames=[...new Set(allFrames)];
  save.ownedProfileBackgrounds=[...new Set(allBackgrounds)];

  if(!save.ownedSkins.includes(save.activeSkin)){
   save.activeSkin='classic'
  }
  if(!save.ownedProfileFrames.includes(save.profileFrame)){
   save.profileFrame='default'
  }
  if(!save.ownedProfileBackgrounds.includes(save.profileBackground)){
   save.profileBackground='default'
  }

  // Do not touch pets or equipped pet slots.
  const id=$('#adminEditPlayerId')?.value.trim();
  const result=await adminWithTimeout(
   db.rpc('admin_update_player_full_profile',{
    p_player_id:id,
    p_player_name:save.playerName||adminEditedProfile.player_name||'Gracz',
    p_save_data:normalizeAdminSaveIntegers(save)
   }),
   12000
  );

  if(result.error)throw result.error;

  adminEditedProfile={
   ...adminEditedProfile,
   player_name:save.playerName||adminEditedProfile.player_name,
   save_data:save,
   updated_at:new Date().toISOString()
  };

  safeAdminRender('test cosmetics',()=>populateAdminForm(save,adminEditedProfile));

  if(status){
   status.textContent=`Nadano ${save.ownedSkins.length} skinów, ${save.ownedProfileFrames.length} ramek i ${save.ownedProfileBackgrounds.length} teł.`
  }
  toast('Kosmetyki testowe nadane')
 }catch(error){
  console.error('Admin test cosmetics:',error);
  if(status)status.textContent='Błąd nadawania kosmetyków: '+(error.message||error);
  toast('Nie udało się nadać kosmetyków')
 }finally{
  if(button){
   button.disabled=false;
   button.textContent=oldText
  }
 }
}
window.adminGrantAllTestCosmetics=adminGrantAllTestCosmetics;

async function adminLoadPlayerProfile(){
 if(typeof isAdminSession==='function'&&!isAdminSession())return toast('Brak uprawnień administratora');

 const id=$('#adminEditPlayerId')?.value.trim();
 if(!id)return toast('Wpisz Player ID');

 const status=$('#adminEditStatus');
 if(status)status.textContent='Pobieranie pełnego zapisu...';

 let result;
 try{
  result=await adminWithTimeout(db.rpc('admin_get_player_full_profile',{p_player_id:id}),12000)
 }catch(error){
  if(status)status.textContent='Błąd pobierania: '+error.message;
  toast('Nie udało się pobrać profilu');
  return
 }

 if(result.error){
  if(status)status.textContent='Błąd Supabase: '+result.error.message;
  toast('Nie udało się pobrać pełnego profilu');
  return
 }

 const row=result.data;
 if(!row){
  if(status)status.textContent='Nie znaleziono profilu.';
  return
 }

 adminEditedProfile=row;
 const save=parseAdminSaveData(row.save_data);
 safeAdminRender('form',()=>populateAdminForm(save,row));

 if(status){
  status.textContent=Object.keys(save).length
   ?`Pełny profil pobrany: ${Object.keys(save).length} pól, ${Array.isArray(save.pets)?save.pets.length:0} petów.`
   :'Profil istnieje, ale nie ma pełnego zapisu. Gracz musi wejść do gry po aktualizacji.'
 }
}


function adminClone(value){
 return JSON.parse(JSON.stringify(value||{}))
}
function adminCurrentRemoteSave(){
 return adminClone(parseAdminSaveData(adminEditedProfile?.save_data))
}
function adminApplySection(base,section){
 const save=adminClone(base);

 if(section==='basic'){
  save.playerName=adminText('adminEditName',save.playerName||adminEditedProfile?.player_name||'Gracz').slice(0,16);
  save.points=adminNumber('adminEditPoints',Number(save.points)||0,0);
  save.coins=adminNumber('adminEditCoins',Number(save.coins)||0,0);
  save.gems=adminNumber('adminEditGems',Number(save.gems)||0,0);
  save.level=Math.floor(adminNumber('adminEditLevel',Number(save.level)||1,1));
  save.rebirths=Math.floor(adminNumber('adminEditRebirths',Number(save.rebirths)||0,0))
 }

 if(section==='progress'){
  save.xp=adminNumber('adminEditXp',Number(save.xp)||0,0);
  save.totalClicks=Math.floor(adminNumber('adminEditTotalClicks',Number(save.totalClicks)||0,0));
  save.bestCombo=Math.floor(adminNumber('adminEditBestCombo',Number(save.bestCombo)||1,1));
  save.playSeconds=Math.floor(adminNumber('adminEditPlaySeconds',Number(save.playSeconds)||0,0));
  save.medals=Math.floor(adminNumber('adminEditMedals',Number(save.medals)||0,0));
  save.goldCases=Math.floor(adminNumber('adminEditGoldCases',Number(save.goldCases)||0,0));
  save.bossWins=Math.floor(adminNumber('adminEditBossWins',Number(save.bossWins)||0,0));
  save.dailyStreak=Math.floor(adminNumber('adminEditDailyStreak',Number(save.dailyStreak)||0,0))
 }

 if(section==='worlds'){
  save.world=adminText('adminEditWorld',save.world||'neon')||'neon';
  save.activeSkin=adminText('adminEditActiveSkin',save.activeSkin||'classic')||'classic';
  save.unlockedWorlds=adminCsv('adminEditUnlockedWorlds',save.unlockedWorlds||['neon']);
  if(!save.unlockedWorlds.includes(save.world))save.unlockedWorlds.unshift(save.world);
  save.worldBossesDefeated=adminCsv('adminEditWorldBosses',save.worldBossesDefeated||[]);
  save.ownedSkins=adminCsv('adminEditOwnedSkins',save.ownedSkins||['classic']);
  if(!save.ownedSkins.includes('classic'))save.ownedSkins.unshift('classic');
  if(!save.ownedSkins.includes(save.activeSkin))save.ownedSkins.push(save.activeSkin)
 }

 if(section==='casino'){
  save.casinoChips=Math.floor(adminNumber('adminEditCasinoChips',Number(save.casinoChips)||0,0));
  save.casinoLevel=Math.floor(adminNumber('adminEditCasinoLevel',Number(save.casinoLevel)||1,1));
  save.casinoXp=Math.floor(adminNumber('adminEditCasinoXp',Number(save.casinoXp)||0,0));
  save.casinoGames=Math.floor(adminNumber('adminEditCasinoGames',Number(save.casinoGames)||0,0));
  save.casinoWins=Math.floor(adminNumber('adminEditCasinoWins',Number(save.casinoWins)||0,0));
  save.casinoProfit=adminNumber('adminEditCasinoProfit',Number(save.casinoProfit)||0)
 }

 if(section==='minigames'){
  save.minigameRecords={...(save.minigameRecords||{})};
  save.minigameRecords.aim=adminNumber('adminEditAimRecord',Number(save.minigameRecords.aim)||0,0);
  save.minigameRecords.parkour=adminNumber('adminEditParkourRecord',Number(save.minigameRecords.parkour)||0,0);
  save.minigameRecords.reflex=adminNumber('adminEditReflexRecord',Number(save.minigameRecords.reflex)||0,0);
  save.minigameRecords.dodge=adminNumber('adminEditDodgeRecord',Number(save.minigameRecords.dodge)||0,0);
  save.minigameBestGrades={
   ...(save.minigameBestGrades||{}),
   aim:adminGrade(adminText('adminEditAimGrade',save.minigameBestGrades?.aim||'-')),
   parkour:adminGrade(adminText('adminEditParkourGrade',save.minigameBestGrades?.parkour||'-')),
   reflex:adminGrade(adminText('adminEditReflexGrade',save.minigameBestGrades?.reflex||'-')),
   dodge:adminGrade(adminText('adminEditDodgeGrade',save.minigameBestGrades?.dodge||'-'))
  }
 }

 if(section==='pets'){
  const oldPets=Array.isArray(save.pets)?save.pets:[];
  const rows=[...document.querySelectorAll('[data-admin-pet-uid]')];
  save.pets=rows.filter(row=>row.dataset.deleted!=='1').map(row=>{
   const uid=row.dataset.adminPetUid;
   const original=oldPets.find(pet=>adminPetUid(pet)===uid)||{};
   return{
    ...original,
    uid,
    type:row.querySelector('[data-pet-type]')?.value.trim()||adminPetType(original),
    level:Math.floor(Math.max(1,Number(row.querySelector('[data-pet-level]')?.value)||1)),
    xp:Math.max(0,Number(row.querySelector('[data-pet-xp]')?.value)||0),
    evolution:Math.floor(Math.max(0,Math.min(3,Number(row.querySelector('[data-pet-evolution]')?.value)||0)))
   }
  });
  const valid=new Set(save.pets.map(adminPetUid).filter(Boolean));
  save.equipped=(Array.isArray(save.equipped)?save.equipped:[]).filter(uid=>valid.has(uid)).slice(0,3)
 }

 if(section==='equipped'){
  const valid=new Set((Array.isArray(save.pets)?save.pets:[]).map(adminPetUid).filter(Boolean));
  save.equipped=[1,2,3].map(slot=>adminText('adminPetSlot'+slot)).filter(uid=>uid&&valid.has(uid)).slice(0,3)
 }

 if(section==='json'){
  const parsed=validateAdminJson(false);
  if(!parsed)throw new Error('JSON jest nieprawidłowy');
  return parsed
 }

 return normalizeAdminSaveIntegers(save)
}
async function adminSaveSection(section){
 if(typeof isAdminSession==='function'&&!isAdminSession())return toast('Brak uprawnień administratora');
 if(!adminEditedProfile)return toast('Najpierw pobierz profil');

 const status=$('#adminEditStatus');
 const button=document.querySelector(`[data-admin-save-section="${section}"]`);
 const oldText=button?.textContent;
 if(button){button.disabled=true;button.textContent='Zapisywanie...'}

 try{
  const base=adminCurrentRemoteSave();
  const updated=normalizeAdminSaveIntegers(adminApplySection(base,section));
  const id=$('#adminEditPlayerId')?.value.trim();

  const result=await adminWithTimeout(db.rpc('admin_update_player_full_profile',{
   p_player_id:id,
   p_player_name:updated.playerName||adminEditedProfile.player_name||'Gracz',
   p_save_data:normalizeAdminSaveIntegers(updated)
  }),12000);

  if(result.error)throw result.error;

  adminEditedProfile={...adminEditedProfile,player_name:updated.playerName||adminEditedProfile.player_name,save_data:updated,updated_at:new Date().toISOString()};
  safeAdminRender('form',()=>populateAdminForm(updated,adminEditedProfile));
  if(status)status.textContent=`Zapisano sekcję: ${section}.`;
  toast('Sekcja zapisana')
 }catch(error){
  if(status)status.textContent='Błąd zapisu: '+(error.message||error);
  toast('Nie udało się zapisać sekcji')
 }finally{
  if(button){button.disabled=false;button.textContent=oldText}
 }
}


let adminPendingRepair=null;

function adminKnownSkinIds(){
 const ids=new Set(['classic','banana','matrix','cyber','lava','ice','toxic','glitch','rainbow','void','gold','dev']);

 try{
  if(typeof skins!=='undefined'&&Array.isArray(skins)){
   skins.forEach(item=>ids.add(typeof item==='string'?item:item?.id))
  }
 }catch(error){console.warn('Lista skinów:',error)}

 ids.delete(undefined);
 ids.delete(null);
 ids.delete('');
 ids.add('classic');
 return ids
}

function adminKnownWorldIds(){
 const sources=[];
 if(typeof worlds!=='undefined'&&Array.isArray(worlds))sources.push(...worlds);
 if(typeof WORLDS!=='undefined'&&Array.isArray(WORLDS))sources.push(...WORLDS);
 if(typeof worldDefs!=='undefined'&&Array.isArray(worldDefs))sources.push(...worldDefs);

 const ids=sources.map(item=>typeof item==='string'?item:item?.id).filter(Boolean);
 if(!ids.includes('neon'))ids.unshift('neon');
 return new Set(ids)
}

function adminRepairSkins(save,report){
 const known=adminKnownSkinIds();

 const sources=[
  ...(Array.isArray(save.ownedSkins)?save.ownedSkins:[]),
  ...(Array.isArray(save.skinsOwned)?save.skinsOwned:[]),
  ...(Array.isArray(save.unlockedSkins)?save.unlockedSkins:[])
 ].filter(Boolean);

 const before=[...new Set(sources)];
 const cleaned=before.filter(id=>known.has(id));

 if(!cleaned.includes('classic'))cleaned.unshift('classic');

 const removed=before.filter(id=>!known.has(id));

 save.ownedSkins=cleaned;
 if('skinsOwned' in save)save.skinsOwned=[...cleaned];
 if('unlockedSkins' in save)save.unlockedSkins=[...cleaned];

 if(!known.has(save.activeSkin)||!cleaned.includes(save.activeSkin)){
  if(save.activeSkin&&save.activeSkin!=='classic'){
   report.push(`Aktywny skin "${save.activeSkin}" zmieniono na classic.`)
  }
  save.activeSkin='classic'
 }

 if(removed.length){
  report.push(`Usunięto ${removed.length} nieistniejących skinów: ${removed.join(', ')}`)
 }else{
  report.push(`Nie znaleziono nieistniejących skinów. Aktualna liczba: ${cleaned.length}.`)
 }
}

function adminRepairPets(save,report){
 const pets=Array.isArray(save.pets)?save.pets:[];
 const seen=new Set();
 const cleaned=[];
 const removed=[];

 for(const pet of pets){
  const uid=adminPetUid(pet);
  const type=adminPetType(pet);

  if(!uid||seen.has(uid)){
   removed.push(uid||'(bez UID)');
   continue
  }

  let known=true;
  if(typeof petDefs!=='undefined'&&Array.isArray(petDefs)){
   known=petDefs.some(def=>def.id===type)
  }else if(typeof PETS!=='undefined'&&Array.isArray(PETS)){
   known=PETS.some(def=>def.id===type)
  }

  if(!known){
   removed.push(`${uid} (${type})`);
   continue
  }

  seen.add(uid);
  cleaned.push(pet)
 }

 save.pets=cleaned;

 if(removed.length)report.push(`Usunięto pety widmo/duplikaty: ${removed.join(', ')}`);
 else report.push('Nie znaleziono petów widmo.')
}

function adminRepairEquipped(save,report){
 const pets=Array.isArray(save.pets)?save.pets:[];
 const valid=new Set(pets.map(adminPetUid).filter(Boolean));
 const before=Array.isArray(save.equipped)?save.equipped:[];
 const cleaned=[...new Set(before.filter(uid=>valid.has(uid)))].slice(0,3);

 const removed=before.filter(uid=>!cleaned.includes(uid));
 save.equipped=cleaned;

 if(removed.length)report.push(`Usunięto wyposażone pety widmo: ${removed.join(', ')}`);
 else report.push('Wyposażone pety są poprawne.')
}

function adminRepairWorlds(save,report){
 const known=adminKnownWorldIds();
 const before=Array.isArray(save.unlockedWorlds)?save.unlockedWorlds:[];
 const cleaned=[...new Set(before.filter(id=>known.has(id)))];

 if(!cleaned.includes('neon'))cleaned.unshift('neon');

 const removed=before.filter(id=>!cleaned.includes(id));
 save.unlockedWorlds=cleaned;

 if(!known.has(save.world)||!cleaned.includes(save.world)){
  if(save.world&&save.world!=='neon')report.push(`Aktualny świat "${save.world}" zmieniono na neon.`);
  save.world='neon'
 }

 const defeated=Array.isArray(save.worldBossesDefeated)?save.worldBossesDefeated:[];
 const cleanedDefeated=[...new Set(defeated.filter(id=>known.has(id)))];
 const removedBosses=defeated.filter(id=>!cleanedDefeated.includes(id));
 save.worldBossesDefeated=cleanedDefeated;

 if(removed.length)report.push(`Usunięto nieistniejące światy: ${removed.join(', ')}`);
 if(removedBosses.length)report.push(`Usunięto błędnych bossów światów: ${removedBosses.join(', ')}`);
 if(!removed.length&&!removedBosses.length)report.push('Dane światów są poprawne.')
}

function adminRepairSaveData(mode){
 if(!adminEditedProfile)throw new Error('Najpierw pobierz profil');

 const save=adminClone(parseAdminSaveData(adminEditedProfile.save_data));
 const report=[];

 if(mode==='skins'||mode==='all')adminRepairSkins(save,report);
 if(mode==='pets'||mode==='all')adminRepairPets(save,report);
 if(mode==='equipped'||mode==='all')adminRepairEquipped(save,report);
 if(mode==='worlds'||mode==='all')adminRepairWorlds(save,report);

 // Po usunięciu petów zawsze ponownie sprawdź wyposażenie.
 if(mode==='pets')adminRepairEquipped(save,report);

 adminPendingRepair=normalizeAdminSaveIntegers(save);

 const preview=$('#adminRepairPreview');
 if(preview){
  preview.innerHTML=report.map(line=>`<div>• ${safeText(line)}</div>`).join('')
 }

 const saveButton=$('#adminSaveRepair');
 if(saveButton)saveButton.disabled=false;

 const json=$('#adminSaveJson');
 if(json)json.value=JSON.stringify(adminPendingRepair,null,2);
 setAdminJsonStatus(true,'JSON po naprawie');

 safeAdminRender('form',()=>populateAdminForm(adminPendingRepair,adminEditedProfile));
 return adminPendingRepair
}

async function adminSaveRepairedProfile(){
 if(!adminEditedProfile)return toast('Najpierw pobierz profil');
 if(!adminPendingRepair)return toast('Najpierw wykonaj naprawę');

 const button=$('#adminSaveRepair');
 const status=$('#adminEditStatus');
 const oldText=button?.textContent;

 if(button){
  button.disabled=true;
  button.textContent='Zapisywanie naprawy...'
 }

 try{
  const id=$('#adminEditPlayerId')?.value.trim();
  const updated=normalizeAdminSaveIntegers(adminPendingRepair);

  const result=await adminWithTimeout(db.rpc('admin_update_player_full_profile',{
   p_player_id:id,
   p_player_name:updated.playerName||adminEditedProfile.player_name||'Gracz',
   p_save_data:updated
  }),12000);

  if(result.error)throw result.error;

  adminEditedProfile={
   ...adminEditedProfile,
   player_name:updated.playerName||adminEditedProfile.player_name,
   save_data:updated,
   updated_at:new Date().toISOString()
  };

  adminPendingRepair=null;
  safeAdminRender('form',()=>populateAdminForm(updated,adminEditedProfile));

  if(status)status.textContent='Naprawiony profil został zapisany.';
  toast('Naprawa zapisu została zapisana')
 }catch(error){
  if(status)status.textContent='Błąd zapisu naprawy: '+(error.message||error);
  toast('Nie udało się zapisać naprawy')
 }finally{
  if(button){
   button.textContent=oldText||'Zapisz naprawiony profil';
   button.disabled=!adminPendingRepair
  }
 }
}

async function adminSavePlayerProfile(){
 if(typeof isAdminSession==='function'&&!isAdminSession())return toast('Brak uprawnień administratora');
 if(!adminEditedProfile)return toast('Najpierw pobierz profil');

 let updated;
 try{
  updated=normalizeAdminSaveIntegers(adminSaveFromForm())
 }catch(error){
  setAdminJsonStatus(false,'Błąd JSON');
  toast(error.message);
  return
 }

 const id=$('#adminEditPlayerId').value.trim();
 const {error}=await adminWithTimeout(db.rpc('admin_update_player_full_profile',{
  p_player_id:id,
  p_player_name:updated.playerName,
  p_save_data:normalizeAdminSaveIntegers(updated)
 }),12000);

 const status=$('#adminEditStatus');
 if(error){
  if(status)status.textContent='Błąd: '+error.message;
  return
 }

 adminEditedProfile={...adminEditedProfile,player_name:updated.playerName,save_data:updated};
 safeAdminRender('form',()=>populateAdminForm(updated,adminEditedProfile));
 if(status)status.textContent=`Pełny profil zapisany. Pola: ${Object.keys(updated).length}, pety: ${updated.pets?.length||0}.`;
 toast('Pełny profil gracza zaktualizowany')
}

setTimeout(()=>{if($('#adminLoadPlayer'))$('#adminLoadPlayer').onclick=adminLoadPlayerProfile;if($('#adminSavePlayer'))$('#adminSavePlayer').onclick=adminSavePlayerProfile},0);

setTimeout(()=>{
 const clear=$('#adminClearEquippedPets');
 if(clear)clear.onclick=()=>{
  [1,2,3].forEach(slot=>{const input=$('#adminPetSlot'+slot);if(input)input.value='' });
  const box=$('#adminEquippedPets');if(box)box.innerHTML='<div class="admin-empty-pets">Brak wyposażonych petów.</div>'
 }
},0);


setTimeout(()=>{
 const validate=$('#adminJsonValidate');
 const toForm=$('#adminJsonToForm');
 const toJson=$('#adminFormToJson');
 const json=$('#adminSaveJson');

 if(validate)validate.onclick=()=>validateAdminJson(true);
 if(toForm)toForm.onclick=()=>{
  const parsed=validateAdminJson(true);
  if(parsed)safeAdminRender('form',()=>populateAdminForm(parsed,adminEditedProfile||{}))
 };
 if(toJson)toJson.onclick=()=>{
  try{
   const updated=normalizeAdminSaveIntegers(adminSaveFromForm());
   if(json)json.value=JSON.stringify(updated,null,2);
   setAdminJsonStatus(true,'JSON zaktualizowany');
   toast('Formularz przepisany do JSON')
  }catch(error){
   setAdminJsonStatus(false,'Błąd JSON');
   toast(error.message)
  }
 };
 if(json)json.addEventListener('input',()=>setAdminJsonStatus(false,'Niezapisane zmiany'));
},0);

setTimeout(()=>{
 document.querySelectorAll('[data-admin-save-section]').forEach(button=>{
  button.onclick=()=>adminSaveSection(button.dataset.adminSaveSection)
 })
},0);


if(typeof renderAdminEquippedPets==='function'){
 window.renderAdminEquippedPets=renderAdminEquippedPets
}
if(typeof renderAdminAllPets==='function'){
 window.renderAdminAllPets=renderAdminAllPets
}


setTimeout(async()=>{
 await syncRemoteProfileToPlayer(true);
 startRemoteProfileWatcher()
},1200);

document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible')syncRemoteProfileToPlayer(false)
});

setTimeout(()=>{
 document.querySelectorAll('[data-admin-repair]').forEach(button=>{
  button.onclick=()=>{
   try{
    adminRepairSaveData(button.dataset.adminRepair);
    toast('Naprawa przygotowana — sprawdź podsumowanie')
   }catch(error){
    toast(error.message)
   }
  }
 });

 const saveRepair=$('#adminSaveRepair');
 if(saveRepair)saveRepair.onclick=adminSaveRepairedProfile
},0);

setTimeout(()=>{
 const removeSkin=$('#adminRemoveSkinById');
 if(removeSkin)removeSkin.onclick=()=>{
  if(!adminEditedProfile)return toast('Najpierw pobierz profil');

  const id=$('#adminRemoveSkinId')?.value.trim();
  if(!id)return toast('Wpisz ID skina');

  const save=adminClone(parseAdminSaveData(adminEditedProfile.save_data));
  const lists=['ownedSkins','skinsOwned','unlockedSkins'];

  lists.forEach(key=>{
   if(Array.isArray(save[key]))save[key]=save[key].filter(skinId=>skinId!==id)
  });

  if(!Array.isArray(save.ownedSkins))save.ownedSkins=['classic'];
  if(!save.ownedSkins.includes('classic'))save.ownedSkins.unshift('classic');
  if(save.activeSkin===id)save.activeSkin='classic';

  adminPendingRepair=normalizeAdminSaveIntegers(save);

  const preview=$('#adminRepairPreview');
  if(preview)preview.innerHTML=`<div>• Ręcznie usunięto skin: ${safeText(id)}</div>`;

  const saveButton=$('#adminSaveRepair');
  if(saveButton)saveButton.disabled=false;

  const json=$('#adminSaveJson');
  if(json)json.value=JSON.stringify(adminPendingRepair,null,2);

  safeAdminRender('form',()=>populateAdminForm(adminPendingRepair,adminEditedProfile));
  toast('Skin usunięty z przygotowanego zapisu — kliknij Zapisz naprawiony profil')
 }
},0);

if(typeof renderAdminEquippedPets==='function'){
 window.renderAdminEquippedPets=renderAdminEquippedPets
}
if(typeof renderAdminAllPets==='function'){
 window.renderAdminAllPets=renderAdminAllPets
}

setTimeout(()=>{
 const button=$('#adminGrantTestCosmetics');
 if(button)button.onclick=adminGrantAllTestCosmetics
},0);

document.addEventListener('click',event=>{
 const button=event.target.closest('#adminSaveWorldsSkins');
 if(!button)return;
 event.preventDefault();
 adminSaveWorldsAndSkins()
});
