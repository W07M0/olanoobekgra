
let casinoBet=10,casinoBusy=false,currentCasinoCard=7,exchangeCurrency='coins',exchangeAmount=250;
const casinoUpgradeDefs=[
 {id:'payout',icon:'💰',name:'Lepsze wypłaty',desc:'+2% do wypłat za poziom',max:20,base:450,growth:1.72},
 {id:'supply',icon:'🎁',name:'Większa paczka',desc:'+7% żetonów z paczki godzinowej',max:20,base:600,growth:1.76},
 {id:'luck',icon:'🍀',name:'Złota kostka',desc:'+0,5% szans na podwójną wygraną',max:15,base:900,growth:1.85},
 {id:'limit',icon:'🎩',name:'High Roller',desc:'Większy dozwolony zakład',max:12,base:1200,growth:1.92},
 {id:'xp',icon:'🏨',name:'Casino XP',desc:'+5% Casino XP za poziom',max:20,base:700,growth:1.78}
];
const slotSymbols=[{s:'🙂',w:30,p:2.4},{s:'🍌',w:24,p:3},{s:'🤖',w:18,p:4},{s:'💎',w:13,p:6},{s:'👑',w:9,p:10},{s:'777',w:6,p:18}];

function casinoAvailable(){return state.casinoUnlocked}
function casinoXpNeed(level){return Math.floor(90+level*level*24)}
function casinoPayoutMult(){return 1+(state.casinoUpgrades.payout||0)*.02}
function casinoMaxBet(){return 100+(state.casinoLevel-1)*25+(state.casinoUpgrades.limit||0)*100}
function casinoUpgradeCost(def){return Math.floor(def.base*Math.pow(def.growth,state.casinoUpgrades[def.id]||0))}
function weightedSlot(){const total=slotSymbols.reduce((a,x)=>a+x.w,0),r=Math.random()*total;let s=0;for(const x of slotSymbols){s+=x.w;if(r<=s)return x}return slotSymbols[0]}
function addCasinoXp(amount){
 amount*=1+(state.casinoUpgrades.xp||0)*.05;state.casinoXp+=amount;
 while(state.casinoXp>=casinoXpNeed(state.casinoLevel)){state.casinoXp-=casinoXpNeed(state.casinoLevel);state.casinoLevel++;toast(`Casino Level ${state.casinoLevel}!`);sfx('good')}
}
function casinoPay(cost,payout,label){
 state.casinoChips-=cost;
 let final=Math.floor(payout*casinoPayoutMult());
 if(final>0&&Math.random()<(state.casinoUpgrades.luck||0)*.005){final*=2;label+=' • ZŁOTA KOSTKA x2!'}
 state.casinoChips+=final;state.casinoGames++;const profit=final-cost;state.casinoProfit=(state.casinoProfit||0)+profit;
 addCasinoXp(8+cost*.08);
 if(profit>0){state.casinoWins++;sfx('good');if(final>=cost*8)confetti()}else sfx('bad');
 toast(label.replace('{payout}',final));render()
}
function unlockCasino(){
 if(!featureUnlocked('casino'))return toast(lockedFeatureMessage('casino'));
 if(state.level<8)return toast('Potrzebujesz poziomu 8');
 state.casinoUnlocked=true;sfx('good');confetti();toast('Noob Casino odblokowane!');render()
}
function canCasinoPlay(){
 if(casinoBusy||!state.casinoUnlocked)return false;
 if(casinoBet>casinoMaxBet()){toast(`Maksymalna stawka: ${casinoMaxBet()} żetonów`);return false}
 if(state.casinoChips<casinoBet){toast('Za mało żetonów');return false}
 return true
}
function spinSlots(){
 if(!canCasinoPlay())return;casinoBusy=true;const result=[weightedSlot(),weightedSlot(),weightedSlot()],box=$('#slots');box.classList.add('spinning');$('#slotsResult').textContent='Kręcenie…';
 let ticks=0,timer=setInterval(()=>{$$('#slots span').forEach(x=>x.textContent=weightedSlot().s);if(++ticks>=14){clearInterval(timer);box.classList.remove('spinning');$$('#slots span').forEach((x,i)=>x.textContent=result[i].s);
  let payout=0,label='Pudło.';
  if(result.every(x=>x.s===result[0].s)){payout=Math.floor(casinoBet*result[0].p*.82);label='JACKPOT! +{payout} 🎲'}
  else{const pair=result.find(x=>result.filter(y=>y.s===x.s).length===2);if(pair){payout=Math.floor(casinoBet*1.08);label='Para — +{payout} 🎲'}}
  casinoBusy=false;$('#slotsResult').textContent=label.replace('{payout}',Math.floor(payout*casinoPayoutMult()));casinoPay(casinoBet,payout,label)
 }},75)
}
function playRoulette(choice){
 if(!canCasinoPlay())return;casinoBusy=true;const n=Math.floor(Math.random()*37),color=n===0?'green':n%2===0?'black':'red',wheel=$('#casinoWheel');
 wheel.classList.remove('spin');void wheel.offsetWidth;wheel.classList.add('spin');$('#rouletteResult').textContent='Koło się kręci…';
 setTimeout(()=>{const win=choice===color,payout=win?Math.floor(casinoBet*(color==='green'?10:1.72)):0;casinoBusy=false;$('#wheelNumber').textContent=n;const label=win?'Wygrana +{payout} 🎲':'Przegrana.';$('#rouletteResult').textContent=label.replace('{payout}',Math.floor(payout*casinoPayoutMult()));casinoPay(casinoBet,payout,label)},1350)
}
function cardValue(){return 2+Math.floor(Math.random()*13)}
function showCard(v){currentCasinoCard=v;$('#currentCard').textContent=v<=10?v:['J','Q','K','A'][v-11];$('#cardSuit').textContent=rand(['♠','♥','♣','♦'])}
function playHigherLower(higher){
 if(!canCasinoPlay())return;casinoBusy=true;const old=currentCasinoCard,next=cardValue();$('#cardsResult').textContent='Odkrywanie…';
 setTimeout(()=>{showCard(next);let payout=0,label;if(next===old){payout=casinoBet;label='Remis — zwrot {payout} 🎲'}else{const win=higher?next>old:next<old;payout=win?Math.floor(casinoBet*1.62):0;label=win?'Dobrze! +{payout} 🎲':'Źle.'}casinoBusy=false;$('#cardsResult').textContent=label.replace('{payout}',Math.floor(payout*casinoPayoutMult()));casinoPay(casinoBet,payout,label)},550)
}
function spinFortune(){
 if(state.casinoLevel<5)return toast('Potrzebujesz Casino Level 5');
 if(!canCasinoPlay())return;casinoBusy=true;const mult=rand([0,0,.5,1,1.2,1.5,2,3,5]),payout=Math.floor(casinoBet*mult);
 $('#fortuneWheel').classList.add('spin');$('#fortuneResult').textContent='Koło się kręci…';
 setTimeout(()=>{$('#fortuneWheel').classList.remove('spin');casinoBusy=false;const label=payout>0?`Mnożnik x${mult} — +{payout} 🎲`:'Puste pole.';$('#fortuneResult').textContent=label.replace('{payout}',Math.floor(payout*casinoPayoutMult()));casinoPay(casinoBet,payout,label)},1500)
}
function claimCasinoSupply(){
 const hour=3600000,left=hour-(Date.now()-(state.lastCasinoSupply||0));if(left>0)return toast(`Paczka za ${Math.ceil(left/60000)} min`);
 const roll=Math.random();let amount=roll<.60?80:roll<.85?120:roll<.95?180:roll<.99?300:777;
 amount=Math.floor(amount*(1+(state.casinoUpgrades.supply||0)*.07));
 state.casinoChips+=amount;state.lastCasinoSupply=Date.now();state.casinoSupplyCount=(state.casinoSupplyCount||0)+1;
 sfx('good');if(amount>=300)confetti();toast(`Paczka: +${amount} żetonów`);render()
}
function updateCasinoMarket(){
 if(Date.now()<(state.casinoMarketNext||0))return;
 state.casinoMarket=Math.round((Math.random()*20-10)*10)/10;
 state.casinoMarketNext=Date.now()+(10+Math.floor(Math.random()*6))*60000;
}
function exchangeBulkBonus(amount){
 if(amount>=5000)return 1.16;
 if(amount>=2500)return 1.11;
 if(amount>=1000)return 1.06;
 if(amount>=500)return 1.02;
 return 1
}
function coinExchange(amount){
 amount=Math.max(0,Math.floor(Number(amount)||0));
 const base=amount*.10;
 return Math.floor(base*exchangeBulkBonus(amount)*(1+state.casinoMarket/100))
}
function gemExchange(amount){
 amount=Math.max(0,Math.floor(Number(amount)||0));
 const base=amount*.30;
 return Math.floor(base*exchangeBulkBonus(amount))
}
function readExchangeAmount(){
 const input=$('#exchangeAmountInput');
 let amount=Math.floor(Number(input?.value ?? exchangeAmount)||0);
 amount=Math.max(0,Math.min(Math.floor(amount),Math.floor(state.casinoChips)));
 exchangeAmount=amount;
 if(input&&Number(input.value)!==amount)input.value=String(amount);
 return amount
}
function updateExchangePreview(){
 const amount=readExchangeAmount();
 const receive=exchangeCurrency==='coins'?coinExchange(amount):gemExchange(amount);
 if($('#exchangeSpend'))$('#exchangeSpend').textContent=fmt(amount);
 if($('#exchangeReceive'))$('#exchangeReceive').textContent=fmt(receive);
 if($('#exchangeIcon'))$('#exchangeIcon').textContent=exchangeCurrency==='coins'?'🟡':'💎';
 if($('#confirmExchange'))$('#confirmExchange').disabled=amount<1||receive<1||amount>state.casinoChips
}
function setExchangeMaximum(){
 const input=$('#exchangeAmountInput');
 if(input)input.value=String(Math.floor(state.casinoChips));
 updateExchangePreview()
}
function setExchangePercent(percent){
 const input=$('#exchangeAmountInput');
 if(input)input.value=String(Math.floor(state.casinoChips*percent/100));
 updateExchangePreview()
}
function confirmExchange(){
 const amount=readExchangeAmount();
 if(amount<1)return toast('Wpisz liczbę żetonów');
 if(state.casinoChips<amount)return toast('Masz za mało żetonów');
 const receive=exchangeCurrency==='coins'?coinExchange(amount):gemExchange(amount);
 if(receive<1)return toast('Ta liczba żetonów jest zbyt mała na wymianę');
 state.casinoChips-=amount;
 if(exchangeCurrency==='coins')state.coins+=receive;
 else state.gems+=receive;
 toast(`Wymieniono ${fmt(amount)} żetonów na ${fmt(receive)} ${exchangeCurrency==='coins'?'Noob Coinów':'diamentów'}`);
 save();render()
}
function buyCasinoUpgrade(id){
 const def=casinoUpgradeDefs.find(x=>x.id===id),lvl=state.casinoUpgrades[id]||0;if(!def||lvl>=def.max)return;
 const cost=casinoUpgradeCost(def);if(state.casinoChips<cost)return toast('Za mało żetonów');
 state.casinoChips-=cost;state.casinoUpgrades[id]++;sfx('buy');render()
}
function renderCasinoUpgrades(){
 const box=$('#casinoUpgradeGrid');if(!box)return;
 box.innerHTML=casinoUpgradeDefs.map(def=>{const lvl=state.casinoUpgrades[def.id]||0,cost=casinoUpgradeCost(def);return`<div class="card casino-upgrade"><div class="big">${def.icon}</div><h3>${def.name}</h3><p>${def.desc}</p><b>Lv.${lvl}/${def.max}</b><button onclick="buyCasinoUpgrade('${def.id}')" ${lvl>=def.max||state.casinoChips<cost?'disabled':''}>${lvl>=def.max?'MAX':fmt(cost)+' 🎲'}</button></div>`}).join('')
}
function renderCasino(){
 updateCasinoMarket();
 $('#casinoChips').textContent=fmt(state.casinoChips);$('#casinoLevel').textContent=state.casinoLevel;$('#casinoLevelText').textContent=state.casinoLevel;
 $('#casinoLocked').classList.toggle('hidden',state.casinoUnlocked);$('#casinoContent').classList.toggle('hidden',!state.casinoUnlocked);
 const need=casinoXpNeed(state.casinoLevel);$('#casinoXpText').textContent=`${Math.floor(state.casinoXp)} / ${need} XP`;$('#casinoXpBar').style.width=Math.min(100,state.casinoXp/need*100)+'%';
 const left=Math.max(0,3600000-(Date.now()-(state.lastCasinoSupply||0)));$('#claimCasinoSupply').disabled=left>0;$('#casinoSupplyInfo').textContent=left>0?`Następna paczka za ${Math.ceil(left/60000)} min`:'Paczka jest gotowa.';
 $('#casinoMarketValue').textContent=(state.casinoMarket>=0?'+':'')+state.casinoMarket.toFixed(1)+'%';$('#casinoMarketValue').className='market-value '+(state.casinoMarket>=0?'up':'down');
 $('#casinoMarketText').textContent=state.casinoMarket>=0?'Nooby masowo kupują.':'Nooby panikują i sprzedają.';
 const ml=Math.max(0,state.casinoMarketNext-Date.now());$('#casinoMarketTimer').textContent=`${String(Math.floor(ml/60000)).padStart(2,'0')}:${String(Math.floor(ml/1000)%60).padStart(2,'0')}`;
 $('#casinoGames').textContent=state.casinoGames||0;$('#casinoWins').textContent=state.casinoWins||0;$('#casinoProfit').textContent=(state.casinoProfit>=0?'+':'')+fmt(state.casinoProfit||0);$('#casinoSupplyCount').textContent=state.casinoSupplyCount||0;
 $('#fortuneGame').classList.toggle('locked-game',state.casinoLevel<5);
 renderCasinoUpgrades();updateExchangePreview()
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
 let query=db.from('scores').select('player_name,score,updated_at').order(boardMode==='recent'?'updated_at':'score',{ascending:false}).limit(10);
 let {data,error}=await query;if(error){console.error(error);return}onlineBoard=data||[];renderBoard()
}
function renderBoard(){let list=onlineBoard.length?onlineBoard:[...state.leaderboard].sort((a,b)=>b.score-a.score).slice(0,10);$('#leaderboard').innerHTML=list.length?list.map((r,i)=>`<div class="board-row"><b>${i+1}.</b><span>${esc(r.player_name??r.name)}</span><b>${fmt(r.score)}</b></div>`).join(''):'<p class="muted">Brak wyników.</p>'}
async function saveOnline(){
 let name=($('#playerName').value.trim()||'Gracz').slice(0,14),score=Math.floor(state.points);
 if(Date.now()-lastSaveOnline<10000)return toast('Zapisuj maksymalnie raz na 10 sekund');lastSaveOnline=Date.now();
 if(!db){state.leaderboard.push({name,score});toast('Zapisano lokalnie');render();return}
 let {error}=await db.rpc('submit_score',{p_player_id:playerId,p_player_name:name,p_score:score});if(error){console.error(error);toast('Błąd zapisu — sprawdź SQL Supabase');return}toast('Wynik zapisany online!');loadBoard()
}
