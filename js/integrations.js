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
 feedbackCooldown=Date.now();
 let {error}=await db.rpc('submit_feedback',{p_player_id:playerId,p_player_name:name,p_feedback_type:type,p_message:message,p_game_version:GAME_VERSION,signature});
 if(error){console.error(error);toast('Nie udało się wysłać. Sprawdź SQL feedbacku.');return}
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
