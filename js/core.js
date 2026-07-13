function applyOfflineEarnings(){
 let last=Number(state.lastSeen)||Date.now(),elapsed=Math.max(0,(Date.now()-last)/1000),cap=(state.offlineLevel||0)*600;
 if(cap>0&&elapsed>30&&state.auto>0){
  let seconds=Math.min(elapsed,cap),gain=pps()*seconds*.55;
  state.points+=gain;toast('Offline Noob zarobił '+fmt(gain)+' ⭐')
 }
 state.lastSeen=Date.now()
}

function save(){localStorage.setItem(SAVE_KEY,JSON.stringify(state))}
function fmt(n){if(n>=1e12)return(n/1e12).toFixed(2)+'T';if(n>=1e9)return(n/1e9).toFixed(2)+'B';if(n>=1e6)return(n/1e6).toFixed(2)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return Math.floor(n).toLocaleString('pl-PL')}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function rand(a){return a[Math.floor(Math.random()*a.length)]}
function world(){return worlds.find(w=>w.id===state.world)||worlds[0]}
function maxPetSlots(){return Math.min(5,3+(state.petSlots||0))}
function petMultiplier(){
 let base=state.equipped.reduce((m,id)=>m*(pets.find(p=>p.id===id)?.mult||1),1);
 let upgrade=1+(state.petPower||0)*.06;
 return 1+(base-1)*upgrade
}
function rebirthMultiplier(){
 let c=Math.max(0,state.coins);
 return 1+Math.log2(1+c)*0.22+Math.sqrt(c)*0.035
}
function totalMultiplier(){return rebirthMultiplier()*world().mult*petMultiplier()*world().petMult*eventMultiplier}
function clickValue(){let comboBonus=Math.min(2.5,(combo-1)*state.comboPower*.035);let burst=1+(state.clickBurst||0)*.12;return state.perClick*totalMultiplier()*(1+comboBonus)*burst}
function pps(){return state.auto*totalMultiplier()*(1+(state.autoBoost||0)*.2)}
function gemRewardMultiplier(){return world().gemMult*(1+(state.petGemBonus||0)*.035)}
function coinRewardMultiplier(){return world().coinMult*(1+(state.petCoinBonus||0)*.04)}
function petExpMultiplier(){return state.equipped.reduce((m,id)=>m*(pets.find(p=>p.id===id)?.exp||1),1)*(1+(state.petExpBonus||0)*.035)}
function expMultiplier(){return (1+(state.expBoost||0)*.08)*(1+(state.worldExpBoost||0)*.04)*petExpMultiplier()}
function cost(u){return Math.ceil(u.base*Math.pow(u.growth,u.get()))}
function currencyIcon(c){return c==='points'?'⭐':c==='gems'?'💎':'🟡'}
function needXp(){let base=70+state.level*38+Math.pow(Math.max(0,state.level-25),1.42)*21;return Math.floor(base*(state.level<8?.9:1))}
function rebirthGain(){return Math.max(0,Math.floor(Math.pow(state.points/250000,.42)))}
function toast(t){let e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),1900)}
function ctx(){if(!audioCtx)audioCtx=new(AudioContext||webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}
function tone(f,d=.08,type='square',v=.04,delay=0){if(!state.sound)return;let c=ctx(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(v,c.currentTime+delay+.01);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+d);o.connect(g).connect(c.destination);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+d+.03)}
function skinClickSound(){
 let s=skins.find(x=>x.id===state.activeSkin)||skins[0],t=s.sound||'classic';
 if(t==='classic'){sfx('click');return}
 if(t==='banana'){tone(240,.05,'square',.025);tone(180,.08,'triangle',.02,.035)}
 if(t==='matrix'){tone(520,.035,'square',.022);tone(780,.035,'square',.018,.035)}
 if(t==='cyber'){tone(680,.045,'sawtooth',.026);tone(980,.04,'square',.018,.025)}
 if(t==='lava'){tone(95,.13,'sawtooth',.055);tone(160,.07,'square',.025,.025)}
 if(t==='ice'){tone(900,.08,'sine',.03);tone(1250,.09,'triangle',.018,.03)}
 if(t==='toxic'){tone(145,.1,'square',.035);tone(310,.07,'sawtooth',.025,.025)}
 if(t==='glitch'){tone(rand([110,260,540,820]),.04,'square',.035);tone(rand([80,180,720]),.035,'sawtooth',.022,.018)}
 if(t==='rainbow'){[440,554,659].forEach((f,i)=>tone(f,.07,'triangle',.018,i*.025))}
 if(t==='void'){tone(55,.18,'sine',.06);tone(72,.18,'sawtooth',.025,.02)}
 if(t==='gold'){[520,660,880,1040].forEach((f,i)=>tone(f,.09,'triangle',.022,i*.025))}
 if(t==='dev'){tone(880,.03,'square',.025);tone(220,.03,'square',.025,.025);tone(660,.03,'square',.02,.05)}
}
function sfx(t){if(t==='click'){tone(170+Math.random()*130,.05,'square',.03);tone(75,.09,'sawtooth',.02,.02)}if(t==='crit'){tone(65,.26,'sawtooth',.08);tone(900,.12,'square',.05,.05)}if(t==='buy')[330,440,660,880].forEach((f,i)=>tone(f,.12,'square',.04,i*.05));if(t==='good')[440,660,880].forEach((f,i)=>tone(f,.14,'triangle',.05,i*.06));if(t==='bad')[190,145,100].forEach((f,i)=>tone(f,.15,'sawtooth',.05,i*.08));if(t==='rain')[220,330,440,660,880].forEach((f,i)=>tone(f,.15,'square',.03,i*.04))}
function setMusic(on){state.music=on;clearInterval(musicTimer);if(on){let notes=[220,277,330,440,330,277],i=0;musicTimer=setInterval(()=>{playWorldMusicNote()},720)}save();render()}
function floating(x,y,text=rand(words),big=false){trimEffects();let e=document.createElement('div');e.className='float';e.textContent=text;e.style.left=x+'px';e.style.top=y+'px';e.style.color=rand(colors);e.style.fontFamily=rand(fonts);e.style.fontSize=(big?48:24+Math.random()*24)+'px';e.style.setProperty('--r',(Math.random()*50-25)+'deg');document.body.append(e);setTimeout(()=>e.remove(),950)}
function noobRain(){state.eventStats.rain++;sfx('rain');for(let i=0;i<35+state.rain*8;i++)setTimeout(()=>{let e=document.createElement('div');e.className='rain';e.textContent=Math.random()<.72?(world().rain||rand(words)):rand(words);e.style.left=Math.random()*95+'vw';e.style.color=rand(colors);e.style.fontSize=18+Math.random()*28+'px';e.style.setProperty('--t',1.2+Math.random()*1.4+'s');e.style.setProperty('--spin',(Math.random()*720-360)+'deg');document.body.append(e);setTimeout(()=>e.remove(),2800)},i*22)}
function confetti(){for(let i=0;i<50;i++){let e=document.createElement('i');e.className='confetti';e.style.left=Math.random()*100+'vw';e.style.background=rand(colors);e.style.animationDelay=Math.random()*.5+'s';document.body.append(e);setTimeout(()=>e.remove(),2400)}}
document.addEventListener('pointermove',e=>{if(Math.random()>.65){let t=document.createElement('i');t.className='trail';t.style.left=e.clientX+'px';t.style.top=e.clientY+'px';document.body.append(t);setTimeout(()=>t.remove(),600)}});

function addXp(v){state.xp+=v*expMultiplier();while(state.xp>=needXp()){state.xp-=needXp();state.level++;state.gems+=Math.max(1,Math.floor(Math.max(1,state.level/5)*gemRewardMultiplier()));toast('LEVEL UP! Poziom '+state.level);sfx('good');confetti();
 let unlockedNow=Object.entries(featureUnlocks).filter(([_,lvl])=>lvl===state.level).map(([id])=>id);
 if(unlockedNow.length)setTimeout(()=>toast('🔓 Odblokowano: '+unlockedNow.join(', ')),900)}}
function addPoints(v){state.points+=v}
function newQuests(){return[
 {id:'clicks',name:'Kliknij 250 razy',goal:250,start:state.totalClicks,reward:['gems',5]},
 {id:'earn',name:'Zdobądź 10K punktów',goal:10000,start:state.points,reward:['gems',7]},
 {id:'combo',name:'Zrób combo x15',goal:15,start:0,reward:['coins',2]}
]}
if(!state.quests)state.quests=newQuests();

function questProgress(q){if(q.id==='clicks')return state.totalClicks-q.start;if(q.id==='earn')return state.points-q.start;if(q.id==='combo')return state.bestCombo;return 0}
function claimQuest(i){let q=state.quests[i],p=questProgress(q);if(q.claimed||p<q.goal)return;state[q.reward[0]]+=q.reward[1];q.claimed=true;sfx('good');toast('Quest ukończony!');render()}
function renderQuests(){$('#questList').innerHTML=state.quests.map((q,i)=>{let p=Math.min(q.goal,questProgress(q));return`<div class="quest"><div class="quest-top"><span>${q.name}</span><span>${fmt(p)}/${fmt(q.goal)}</span></div><div class="mini-progress"><i style="width:${p/q.goal*100}%"></i></div><button class="small-btn" onclick="claimQuest(${i})" ${p<q.goal||q.claimed?'disabled':''}>${q.claimed?'Odebrane':'Odbierz '+q.reward[1]+' '+(q.reward[0]==='gems'?'💎':'🟡')}</button></div>`}).join('')}
