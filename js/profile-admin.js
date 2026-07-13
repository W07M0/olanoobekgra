
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
async function savePlayerProfile(showError=false){
 if(!db||!state.playerName)return false;
 const {error}=await db.rpc('save_player_profile',{
  p_player_id:playerId,p_player_name:state.playerName,
  p_best_score:Math.floor(state.points),p_level:state.level,
  p_rebirths:state.rebirths,p_game_version:GAME_VERSION
 });
 if(error){
  console.error(error);
  saveDiagnostic?.('Profil',error.message,error.stack||'');
  $('#profileStatus')&&($('#profileStatus').textContent='Błąd profilu: '+error.message);
  if(showError)toast('Błąd profilu: '+error.message);
  return false
 }
 $('#profileStatus')&&($('#profileStatus').textContent='Profil zsynchronizowany: '+new Date().toLocaleTimeString('pl-PL'));
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
   .select('player_id,player_name,best_score,level,rebirths,last_seen,is_banned')
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
}
function renderBoard(){
 const target=$('#leaderboard');if(!target)return;
 const rows=onlineBoard||[];

 if(!rows.length){
  target.innerHTML=`<p class="muted">Brak wyników dla tego rankingu.<br><small>${boardMode==='score'?'Ustaw nick lub zapisz wynik ręcznie.':'Rankingi poziomu i rebirthów zapełnią się po zapisaniu nowych profili.'}</small></p>`;
  return
 }

 target.innerHTML=rows.map((row,index)=>{
  const value=boardMode==='level'
   ?`Lv.${row.level||1}`
   :boardMode==='rebirths'
    ?`${row.rebirths||0} ♻️`
    :fmt(row.best_score||0);

  const own=row.player_id===playerId;
  const legacy=row.source==='scores';
  return`<div class="board-row ${own?'own-row':''}">
   <b>${index+1}.</b>
   <span>${safeText(row.player_name||'Gracz')}${own?' • Ty':''}${legacy?' <small>stary wpis</small>':''}</span>
   <b>${value}</b>
  </div>`
 }).join('')
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
