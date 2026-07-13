
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
$$('[data-exchange-amount]').forEach(button=>{
 button.onclick=()=>{
  exchangeAmount=button.dataset.exchangeAmount;
  $$('[data-exchange-amount]').forEach(x=>x.classList.toggle('active',x===button));
  updateExchangePreview()
 }
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
try{loadMinigameLeaderboards()}catch(error){console.error('Minigame boards:',error)}
try{renderMiniCooldowns()}catch(error){console.error('Cooldowns:',error)}
try{renderCasino()}catch(error){console.error('Casino:',error)}

if(!window.__v06UiTimer){
 window.__v06UiTimer=setInterval(()=>{
  try{renderCasino()}catch(error){console.error('Casino render:',error)}
  try{renderMiniCooldowns()}catch(error){console.error('Minigame cooldowns:',error)}
 },1000)
}
