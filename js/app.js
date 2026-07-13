function showView(id){
 if(id!=='minigames'&&(aimRunning||parkourRunning||memoryRunning)){stopAllMinigames(false);hideGames()}
 if(!featureUnlocked(id)){
  toast(lockedFeatureMessage(id));
  renderFeatureLocks();
  return
 }
 $$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+id));
 $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
 scrollTo({top:0,behavior:'smooth'});render()
}

$$('.nav-btn').forEach(b=>b.onclick=()=>showView(b.dataset.view));
$('#clicker').onclick=doClick;$('#unlockCasino').onclick=unlockCasino;$('#spinSlots').onclick=spinSlots;$('#guessLower').onclick=()=>playHigherLower(false);$('#guessHigher').onclick=()=>playHigherLower(true);$$('[data-roulette]').forEach(b=>b.onclick=()=>playRoulette(b.dataset.roulette));$$('.bet-btn').forEach(b=>b.onclick=()=>{casinoBet=+b.dataset.bet;$$('.bet-btn').forEach(x=>x.classList.toggle('active',x===b))});$('#openGoldCrate').onclick=openGoldCase;$('#goldClose').onclick=()=>{state.activeSkin=$('#goldClose').dataset.skin;$('#goldCrateOverlay').classList.remove('show');render()};$('#quickClick').onclick=()=>quickBuy('click');$('#quickAuto').onclick=()=>quickBuy('auto');$('#openCrate').onclick=openCrate;$('#crateClose').onclick=()=>$('#crateOverlay').classList.remove('show');$('#rebirthBtn').onclick=rebirth;$('#dailyBtn').onclick=claimDaily;$('#saveScore').onclick=saveOnline;
$('#challengeBossBtn').onclick=spawnWorldBoss;$('#clearDiagnostics').onclick=clearDiagnostics;$('#sendFeedback').onclick=sendFeedback;$('#refreshFeedback').onclick=loadFeedback;$('#feedbackText').oninput=e=>$('#feedbackCount').textContent=e.target.value.length;$('#feedbackName').value=$('#playerName').value||'Gracz';$('#bossResultClose').onclick=()=>$('#bossResultOverlay').classList.remove('show');$('#soundBtn').onclick=()=>{state.sound=!state.sound;render()};$('#musicBtn').onclick=()=>setMusic(!state.music);$('#resetBtn').onclick=()=>{if(confirm('Usunąć cały lokalny postęp?')){localStorage.removeItem(SAVE_KEY);location.reload()}};
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');boardMode=b.dataset.board;loadBoard()});
function isTypingElement(el){return !!el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable||el.closest?.('[contenteditable="true"]'))}
document.addEventListener('keydown',e=>{
 if(isTypingElement(document.activeElement))return;
 if(e.code==='Escape'&&(aimRunning||parkourRunning||memoryRunning)){e.preventDefault();stopAllMinigames(false);hideGames();return}
 if(e.code==='Space'&&parkourRunning){e.preventDefault();if(!e.repeat)parkourJump();return}
 if((e.code==='Space'||e.code==='Enter')&&!e.repeat&&$('#view-game').classList.contains('active')){e.preventDefault();doClick()}
});

setInterval(()=>{state.playSeconds++;state.lastSeen=Date.now();if(state.auto>0){state.points+=pps();addXp(Math.max(1,Math.floor(state.auto/3)))}if(state.playSeconds%10===0)render();else{renderHud();save()}},1000);
setInterval(tickEvent,1000);setInterval(loadBoard,30000);
applyOfflineEarnings();if(state.music)setMusic(true);render();loadBoard();loadFeedback();tickEvent();
if(worldProgressWasReset){
 setTimeout(()=>toast('🌍 Postęp światów został zresetowany. Reszta zapisu została zachowana.'),700)
}


/* 0.5c profile/admin initialization — isolated from gameplay bindings */
bindProfileSettings();
bindAdminPanel();
renderProfileSettings();
refreshAdminSession();
profileAutoTimer=setInterval(automaticLeaderboardSave,45000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)automaticLeaderboardSave()});
