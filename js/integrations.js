
const PLAYER_NAME_PATTERN=/^[\p{L}\p{N}_ .-]{3,16}$/u;
let adminSession=null,adminVerified=false,activeAdminTab='players',autoProfileTimer=null;
function cleanPlayerName(v){return String(v||'').trim().replace(/\s+/g,' ').slice(0,16)}
function validatePlayerName(name){
 if(!PLAYER_NAME_PATTERN.test(name))return'Nick musi mieć 3–16 znaków';
 if(/^(admin|administrator|developer|system|moderator|supabase)$/i.test(name))return'Ta nazwa jest zarezerwowana';
 return''
}
function applyPerformanceSettings(){
 document.body.classList.toggle('effects-low',state.effectsLevel===0);
 document.body.classList.toggle('eco-mode',state.ecoMode)
}
function renderSettings(){
 if(!$('#settingsPlayerName'))return;
 $('#settingsPlayerName').value=state.playerName||'';$('#settingsPlayerId').value=playerId;
 $('#settingsSound').checked=state.sound;$('#settingsMusic').checked=state.music;
 $('#settingsAutoBoard').checked=state.autoLeaderboard;$('#settingsEffects').value=String(state.effectsLevel);$('#settingsEco').checked=state.ecoMode;
 $('#rankingProfileName').textContent=state.playerName||'Ustaw nick w profilu';$('#playerName').value=state.playerName||'';
 $('#profileStatus').textContent=state.playerName?'Profil gotowy — automatyczny ranking aktywny.':'Ustaw nick, aby włączyć ranking.';
 applyPerformanceSettings()
}
async function savePlayerNameSetting(){
 const name=cleanPlayerName($('#settingsPlayerName').value),problem=validatePlayerName(name);if(problem)return toast(problem);
 if(state.playerName&&name!==state.playerName&&Date.now()-(state.nameChangedAt||0)<3600000)return toast('Nick można zmienić raz na godzinę');
 state.playerName=name;state.nameChangedAt=Date.now();localStorage.setItem('olaPlayerName',name);save();renderSettings();await savePlayerProfile(true);toast('Nick zapisany')
}
async function savePlayerProfile(showError=false){
 if(!db||!state.playerName)return false;
 const {error}=await db.rpc('save_player_profile',{p_player_id:playerId,p_player_name:state.playerName,p_best_score:Math.floor(state.points),p_level:state.level,p_rebirths:state.rebirths,p_game_version:GAME_VERSION});
 if(error){console.error(error);saveDiagnostic?.('Profil',error.message,error.stack||'');if(showError)toast('Błąd profilu: '+error.message);return false}
 $('#profileStatus')&&($('#profileStatus').textContent='Profil zsynchronizowany: '+new Date().toLocaleTimeString('pl-PL'));return true
}
async function autoSaveLeaderboard(){if(state.autoLeaderboard&&state.playerName&&db){await savePlayerProfile(false);loadBoard()}}
function exportGameSave(){save();const blob=new Blob([JSON.stringify({game:'ola-to-noobek',version:GAME_VERSION,exportedAt:new Date().toISOString(),state,playerId},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ola-noobek-save-${Date.now()}.json`;a.click();URL.revokeObjectURL(a.href)}
async function importGameSave(file){if(!file)return;try{const parsed=JSON.parse(await file.text()),incoming=parsed.state||parsed;if(!incoming||typeof incoming!=='object')throw new Error('Nieprawidłowy zapis');localStorage.setItem('olaImportBackup',localStorage.getItem(SAVE_KEY)||'{}');localStorage.setItem(SAVE_KEY,JSON.stringify(incoming));location.reload()}catch(e){toast(e.message)}}
function resetWholeSave(){if(prompt('Wpisz dokładnie: RESET NOOB')!=='RESET NOOB')return;localStorage.removeItem(SAVE_KEY);location.reload()}
function bindSettings(){
 $('#savePlayerName').onclick=savePlayerNameSetting;$('#copyPlayerId').onclick=async()=>{await navigator.clipboard.writeText(playerId);toast('Player ID skopiowane')};
 $('#settingsSound').onchange=e=>{state.sound=e.target.checked;save()};$('#settingsMusic').onchange=e=>{state.music=e.target.checked;setMusic(state.music);save()};
 $('#settingsAutoBoard').onchange=e=>{state.autoLeaderboard=e.target.checked;save()};$('#settingsEffects').onchange=e=>{state.effectsLevel=+e.target.value;applyPerformanceSettings();save()};
 $('#settingsEco').onchange=e=>{state.ecoMode=e.target.checked;applyPerformanceSettings();save()};$('#manualSave').onclick=()=>{save();autoSaveLeaderboard();toast('Zapisano')};
 $('#exportSave').onclick=exportGameSave;$('#importSave').onchange=e=>importGameSave(e.target.files?.[0]);$('#resetSave').onclick=resetWholeSave
}

let casinoBet=5,casinoBusy=false,currentCasinoCard=7;
const slotSymbols=[
 {s:'🙂',w:28,p:2.5},{s:'🍌',w:24,p:3},{s:'🤖',w:19,p:4},{s:'💎',w:14,p:6},{s:'👑',w:9,p:10},{s:'GOLD',w:6,p:18}
];
function casinoAvailable(){return state.casinoUnlocked}
function weightedSlot(){let total=slotSymbols.reduce((a,x)=>a+x.w,0),r=Math.random()*total,sum=0;for(let x of slotSymbols){sum+=x.w;if(r<=sum)return x}return slotSymbols[0]}
function casinoPay(cost,payout,label){
 state.coins-=cost;state.coins+=payout;state.casinoGames++;let profit=payout-cost;state.casinoProfit+=profit;
 if(profit>0){state.casinoWins++;sfx('good');if(payout>=cost*8)confetti()}else sfx('bad');
 toast(label);render()
}
function unlockCasino(){if(!featureUnlocked('casino'))return toast(lockedFeatureMessage('casino'));
 if(state.casinoUnlocked)return;
 
 if(state.coins<75)return toast('Potrzebujesz 75 Noob Coinów');
 state.coins-=75;state.casinoUnlocked=true;sfx('good');confetti();toast('Noob Casino odblokowane!');render()
}
function canCasinoPlay(){if(casinoBusy)return false;if(!state.casinoUnlocked)return false;if(state.coins<casinoBet){toast('Za mało Noob Coinów');return false}return true}
function spinSlots(){
 if(!canCasinoPlay())return;casinoBusy=true;let box=$('#slots');box.classList.add('spinning');$('#slotsResult').textContent='Kręcenie…';sfx('buy');
 let result=[weightedSlot(),weightedSlot(),weightedSlot()];
 let ticks=0,timer=setInterval(()=>{$$('#slots span').forEach(x=>x.textContent=weightedSlot().s);if(++ticks>=12){clearInterval(timer);box.classList.remove('spinning');$$('#slots span').forEach((x,i)=>x.textContent=result[i].s);
  let payout=0,label='Pudło — noob kasyno wygrywa.';
  if(result.every(x=>x.s===result[0].s)){payout=Math.floor(casinoBet*result[0].p*.82);label='JACKPOT '+result[0].s+'! +'+payout+' 🟡'}
  else{let pair=result.find(x=>result.filter(y=>y.s===x.s).length===2);if(pair){payout=Math.floor(casinoBet*1.12);label='Para '+pair.s+' — zwrot '+payout+' 🟡'}}
  casinoBusy=false;$('#slotsResult').textContent=label;casinoPay(casinoBet,payout,label)
 }},80)
}
function playRoulette(choice){
 if(!canCasinoPlay())return;casinoBusy=true;let n=Math.floor(Math.random()*37),color=n===0?'green':n%2===0?'black':'red',wheel=$('#casinoWheel');
 wheel.classList.remove('spin');void wheel.offsetWidth;wheel.classList.add('spin');$('#rouletteResult').textContent='Koło się kręci…';sfx('buy');
 setTimeout(()=>{wheel.classList.remove('spin');$('#wheelNumber').textContent=n;let win=choice===color,payout=win?Math.floor(casinoBet*(color==='green'?10:1.75)):0;
 let names={red:'czerwone',black:'czarne',green:'zielone'},label=`Wypadło ${n} — ${names[color]}. ${win?'Wygrana '+payout+' 🟡':'Przegrana.'}`;
 casinoBusy=false;$('#rouletteResult').textContent=label;casinoPay(casinoBet,payout,label)},1350)
}
function cardValue(){return 2+Math.floor(Math.random()*13)}
function showCard(v){currentCasinoCard=v;$('#currentCard').textContent=v<=10?v:['J','Q','K','A'][v-11];$('#cardSuit').textContent=rand(['♠','♥','♣','♦'])}
function playHigherLower(higher){
 if(!canCasinoPlay())return;casinoBusy=true;let old=currentCasinoCard,next=cardValue();$('#cardsResult').textContent='Odkrywanie karty…';sfx('buy');
 setTimeout(()=>{showCard(next);let payout=0,label;
 if(next===old){payout=casinoBet;label='Remis — stawka zwrócona.'}
 else{let win=higher?next>old:next<old;payout=win?Math.floor(casinoBet*1.68):0;label=win?'Dobrze! Wygrana '+payout+' 🟡':'Źle — noob kasyno zabiera stawkę.'}
 casinoBusy=false;$('#cardsResult').textContent=label;casinoPay(casinoBet,payout,label)},500)
}
function renderCasino(){
 $('#casinoCoins').textContent=fmt(state.coins);$('#casinoDot').textContent=state.casinoUnlocked?'🎰':'🔒';
 $('#casinoLocked').classList.toggle('hidden',state.casinoUnlocked);$('#casinoContent').classList.toggle('hidden',!state.casinoUnlocked);
 $('#casinoGames').textContent=state.casinoGames||0;$('#casinoWins').textContent=state.casinoWins||0;
 let p=state.casinoProfit||0;$('#casinoProfit').textContent=(p>=0?'+':'')+fmt(p);$('#casinoProfit').style.color=p>=0?'var(--green)':'var(--red)';
}


function spawnWorldParticle(){}


let feedbackCooldown=0;
function safeText(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function loadFeedback(){
 let box=$('#feedbackList');if(!box)return;
 if(!db){box.innerHTML='<p class="muted">Supabase nie jest dostępny.</p>';return}
 box.innerHTML='<p class="muted">Ładowanie komentarzy…</p>';
 let {data,error}=await db.from('player_feedback').select('player_name,feedback_type,message,created_at').eq('is_visible',true).order('created_at',{ascending:false}).limit(30);
 if(error){console.error(error);box.innerHTML='<p class="muted">Nie udało się pobrać feedbacku. Uruchom plik SQL dla wersji 0.4d.</p>';return}
 box.innerHTML=(data||[]).length?(data||[]).map(f=>`<div class="feedback-item"><div class="feedback-head"><div><b>${safeText(f.player_name)}</b> <span class="feedback-type">${safeText(f.feedback_type)}</span></div><span class="feedback-date">${new Date(f.created_at).toLocaleString('pl-PL')}</span></div><div class="feedback-body">${safeText(f.message)}</div></div>`).join(''):'<p class="muted">Brak komentarzy. Napisz pierwszy!</p>'
}
async function sendFeedback(){
 if(Date.now()-feedbackCooldown<20000)return toast('Odczekaj chwilę przed kolejną wiadomością');
 let name=($('#feedbackName').value.trim()||$('#playerName').value.trim()||'Gracz').slice(0,20);
 let type=$('#feedbackType').value;
 let message=$('#feedbackText').value.trim().slice(0,500);
 if(message.length<5)return toast('Wiadomość jest za krótka');
 if(!db)return toast('Supabase nie jest dostępny');
 let {error}=await db.rpc('submit_feedback',{p_player_id:playerId,p_player_name:name,p_feedback_type:type,p_message:message,p_game_version:GAME_VERSION});
 if(error){console.error(error);saveDiagnostic?.('Feedback',error.message,error.stack||'');toast('Nie udało się wysłać: '+(error.message||'błąd Supabase'));return}
 feedbackCooldown=Date.now();
 $('#feedbackText').value='';$('#feedbackCount').textContent='0';toast('Dziękujemy za feedback!');loadFeedback()
}

async function loadBoard(){
 if(!db)return;
 const metric=['score','level','rebirths'].includes(boardMode)?boardMode:'score';
 const column=metric==='score'?'best_score':metric;
 const {data,error}=await db.from('players').select('player_id,player_name,best_score,level,rebirths,last_seen,is_banned').eq('is_banned',false).order(column,{ascending:false}).limit(10);
 if(error){console.error(error);return}onlineBoard=data||[];renderBoard()
}
function renderBoard(){
 let list=onlineBoard||[];
 $('#leaderboard').innerHTML=list.length?list.map((r,i)=>{
  const value=boardMode==='level'?`Lv.${r.level}`:boardMode==='rebirths'?`${r.rebirths} ♻️`:fmt(r.best_score);
  return`<div class="board-row ${r.player_id===playerId?'own-row':''}"><b>${i+1}.</b><span>${safeText(r.player_name)}${r.player_id===playerId?' • Ty':''}</span><b>${value}</b></div>`
 }).join(''):'<p class="muted">Brak wyników.</p>'
}


async function refreshAdminSession(){if(!db)return;const {data:{session}}=await db.auth.getSession();adminSession=session;if(!session)return setAdminState(false);const {data,error}=await db.rpc('is_current_user_admin');setAdminState(!error&&data===true)}
function setAdminState(v){adminVerified=v;$('#adminNavBtn').classList.toggle('hidden',!v);$('#adminLogout').classList.toggle('hidden',!adminSession);$('#adminLogin').classList.toggle('hidden',!!adminSession);$('#adminLoginStatus').textContent=v?'Zalogowano jako administrator.':adminSession?'Brak uprawnień administratora.':'Administrator nie jest zalogowany.';if(v)loadAdminDashboard()}
async function adminLogin(){const {data,error}=await db.auth.signInWithPassword({email:$('#adminEmail').value.trim(),password:$('#adminPassword').value});if(error)return toast(error.message);adminSession=data.session;await refreshAdminSession()}
async function adminLogout(){await db.auth.signOut();adminSession=null;setAdminState(false);showView('settings')}
async function adminRpc(name,args={}){if(!adminVerified)throw new Error('Brak uprawnień');const {data,error}=await db.rpc(name,args);if(error)throw error;return data}
async function loadAdminDashboard(){if(!adminVerified)return;try{const s=await adminRpc('admin_dashboard_summary');$('#adminSummary').innerHTML=[['Gracze',s.players],['Aktywni 24h',s.active_24h],['Feedback',s.feedback],['Zablokowani',s.banned]].map(x=>`<div class="card"><b>${x[1]}</b><small>${x[0]}</small></div>`).join('');await Promise.all([loadAdminPlayers(),loadAdminFeedback(),loadAdminActions()])}catch(e){toast(e.message)}}
async function loadAdminPlayers(q=''){const rows=await adminRpc('admin_list_players',{p_query:q});$('#adminPlayersList').innerHTML=(rows||[]).map(p=>`<div class="admin-item"><div class="admin-item-head"><b>${safeText(p.player_name)}</b><span>${fmt(p.best_score)} ⭐</span></div><div class="admin-meta">${p.player_id} • Lv.${p.level} • ${p.rebirths} rebirth • ${p.is_banned?'ZABLOKOWANY':'aktywny'}</div><div class="admin-actions-row"><button class="small-btn admin-warning" onclick="adminResetScore('${p.player_id}')">Reset wyniku</button><button class="small-btn ${p.is_banned?'':'admin-danger'}" onclick="adminSetBan('${p.player_id}',${!p.is_banned})">${p.is_banned?'Odblokuj':'Zablokuj'}</button></div></div>`).join('')}
async function loadAdminFeedback(){const rows=await adminRpc('admin_list_feedback');$('#adminFeedbackList').innerHTML=(rows||[]).map(f=>`<div class="admin-item"><div class="admin-item-head"><b>${safeText(f.player_name)} • ${safeText(f.feedback_type)}</b><span>${f.is_visible?'Widoczny':'Ukryty'}</span></div><div class="feedback-body">${safeText(f.message)}</div><div class="admin-actions-row"><button class="small-btn" onclick="adminSetFeedback(${f.id},${!f.is_visible})">${f.is_visible?'Ukryj':'Pokaż'}</button></div></div>`).join('')}
async function loadAdminActions(){const rows=await adminRpc('admin_list_actions');$('#adminActionsList').innerHTML=(rows||[]).map(a=>`<div class="admin-item"><b>${safeText(a.action_type)}</b><div class="admin-meta">${new Date(a.created_at).toLocaleString('pl-PL')} • ${safeText(a.target_id||'')}</div></div>`).join('')}
async function adminSetBan(id,b){if(!confirm('Potwierdź zmianę blokady gracza'))return;await adminRpc('admin_set_player_ban',{p_player_id:id,p_banned:b});loadAdminDashboard()}
async function adminResetScore(id){if(!confirm('Zresetować wynik?'))return;await adminRpc('admin_reset_player_score',{p_player_id:id});loadAdminDashboard()}
async function adminSetFeedback(id,v){await adminRpc('admin_set_feedback_visibility',{p_feedback_id:id,p_visible:v});loadAdminFeedback()}
function bindAdmin(){$('#adminLogin').onclick=adminLogin;$('#adminLogout').onclick=adminLogout;$('#refreshAdmin').onclick=loadAdminDashboard;$('#adminSearchPlayers').onclick=()=>loadAdminPlayers($('#adminPlayerSearch').value.trim());$$('.admin-tabs .tab').forEach(b=>b.onclick=()=>{$$('.admin-tabs .tab').forEach(x=>x.classList.toggle('active',x===b));$$('.admin-panel').forEach(x=>x.classList.toggle('active',x.id==='admin-'+b.dataset.adminTab))});db?.auth.onAuthStateChange(()=>setTimeout(refreshAdminSession,0))}
