function hideGames(){
 ['aimStage','parkourStage','memoryStage'].forEach(id=>{let el=$('#'+id);if(el){el.classList.add('hidden');el.classList.remove('running')}})
}
function stopAllMinigames(reward=false){stopAimGame(reward);stopParkour(reward);stopMemory(reward)}
function prepareMinigame(stageId){
 if(!featureUnlocked('minigames')){toast(lockedFeatureMessage('minigames'));return false}
 showView('minigames');hideGames();
 let stage=$('#'+stageId);
 if(!stage){saveDiagnostic('Minigra','Brak elementu '+stageId);toast('Błąd minigry — zapisano diagnostykę');return false}
 stage.classList.remove('hidden');stage.classList.add('running');return true
}
function miniReward(score){
 state.eventStats.minigames++;
 let gems=Math.floor(score/52*gemRewardMultiplier());
 let coins=Math.floor(score/230*(1+(state.coinBoost||0)*.10)*coinRewardMultiplier());
 if(score>=24&&gems<1)gems=1;if(score>=85&&coins<1)coins=1;
 state.gems+=gems;state.coins+=coins;state.medals+=Math.max(0,Math.floor(score/80));grantPetXp(8+score*.12);
 toast(`Nagroda: +${gems} 💎, +${coins} 🟡`);if(gems+coins>0)sfx('good');render()
}

/* AIM */
function moveAim(){
 let f=$('#aimField'),t=$('#aimTarget');if(!f||!t||!aimRunning)return;
 let rect=f.getBoundingClientRect(),size=Math.max(42,72-aimScore*.22);
 t.style.width=size+'px';t.style.height=size+'px';
 t.style.left=Math.random()*Math.max(0,rect.width-size-8)+'px';
 t.style.top=Math.random()*Math.max(0,rect.height-size-8)+'px'
}
function startAimGame(){
 stopAllMinigames(false);if(!prepareMinigame('aimStage'))return;
 aimRunning=true;aimScore=0;aimCombo=0;aimTimer=20;
 $('#aimScore').textContent='0';$('#aimCombo').textContent='0';$('#aimTime').textContent='20.0';
 requestAnimationFrame(moveAim);clearInterval(aimLoop);let last=performance.now();
 aimLoop=setInterval(()=>{if(!aimRunning)return;let now=performance.now();aimTimer-=Math.min(.2,(now-last)/1000);last=now;$('#aimTime').textContent=Math.max(0,aimTimer).toFixed(1);if(aimTimer<=0)stopAimGame(true)},100)
}
function stopAimGame(reward=true){
 if(!aimRunning)return;aimRunning=false;clearInterval(aimLoop);$('#aimStage')?.classList.remove('running');
 state.aimBest=Math.max(state.aimBest,aimScore);if(reward)miniReward(aimScore);else renderHud()
}
$('#aimTarget').onclick=e=>{e.stopPropagation();if(!aimRunning)return;aimScore+=1+Math.floor(aimCombo/8);aimCombo++;$('#aimScore').textContent=aimScore;$('#aimCombo').textContent=aimCombo;floating(e.clientX,e.clientY,'+'+(1+Math.floor((aimCombo-1)/8)));sfx('click');moveAim()};
$('#aimField').onclick=e=>{if(!aimRunning||e.target===$('#aimTarget'))return;aimCombo=0;$('#aimCombo').textContent='0';sfx('bad')};

/* PARKOUR */
function startParkour(){
 stopAllMinigames(false);if(!prepareMinigame('parkourStage'))return;
 let c=$('#parkourCanvas');if(!c?.getContext){saveDiagnostic('Parkour','Canvas niedostępny');return}
 parkourData={ctx:c.getContext('2d'),p:{x:110,y:255,w:34,h:45,vy:0},obs:[],score:0,speed:5,last:performance.now(),spawn:0};parkourRunning=true;parkourLoop()
}
function parkourJump(){if(parkourRunning&&parkourData&&parkourData.p.y>=254)parkourData.p.vy=-13}
function parkourLoop(){
 if(!parkourRunning||!parkourData)return;
 let d=parkourData,c=$('#parkourCanvas'),x=d.ctx,now=performance.now(),dt=Math.min(2,(now-d.last)/16.67);d.last=now;
 d.score+=d.speed*.08*dt;d.speed=5+Math.min(8,d.score/120);d.spawn-=dt;
 if(d.spawn<=0){d.obs.push({x:c.width+20,y:235+Math.random()*35,w:28+Math.random()*28,h:60+Math.random()*40});d.spawn=70-Math.min(35,d.score/20)+Math.random()*30}
 d.p.vy+=.75*dt;d.p.y+=d.p.vy*dt;if(d.p.y>255){d.p.y=255;d.p.vy=0}
 d.obs.forEach(o=>o.x-=d.speed*dt);d.obs=d.obs.filter(o=>o.x>-80);
 let p=d.p,hit=d.obs.some(o=>p.x<o.x+o.w&&p.x+p.w>o.x&&p.y<o.y+o.h&&p.y+p.h>o.y);
 x.clearRect(0,0,c.width,c.height);let g=x.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#18062f');g.addColorStop(1,'#6a288e');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
 x.fillStyle='#2d103e';x.fillRect(0,300,c.width,30);x.fillStyle='#ff83cc';x.fillRect(p.x,p.y,p.w,p.h);x.fillStyle='#fff';x.font='bold 13px Arial';x.fillText('NOOB',p.x-3,p.y+27);
 d.obs.forEach(o=>{x.fillStyle='#36e7ff';x.fillRect(o.x,o.y,o.w,o.h);x.fillStyle='#fff';x.font='bold 11px Arial';x.fillText('LAG',o.x+3,o.y+20)});
 $('#parkourScore').textContent=Math.floor(d.score);$('#parkourSpeed').textContent=(d.speed/5).toFixed(1);
 if(hit){stopParkour(true);return}parkourFrame=requestAnimationFrame(parkourLoop)
}
function stopParkour(reward=true){
 if(!parkourRunning)return;parkourRunning=false;cancelAnimationFrame(parkourFrame);$('#parkourStage')?.classList.remove('running');
 let score=Math.floor(parkourData?.score||0);state.parkourBest=Math.max(state.parkourBest,score);parkourData=null;
 if(reward)miniReward(Math.floor(score*.55));else renderHud()
}
$('#parkourCanvas').addEventListener('pointerdown',e=>{e.preventDefault();parkourJump()});

/* MEMORY */
function buildMemory(){
 let grid=$('#memoryGrid');if(!grid)return;
 grid.innerHTML=['🙂','🤖','🍌','👾','🗿','🐲','😹','👑','🌈'].map((e,i)=>`<button class="memory-tile" data-i="${i}">${e}</button>`).join('');
 $$('.memory-tile').forEach(b=>b.onclick=()=>memoryPick(+b.dataset.i))
}
async function flashMemory(){
 $('#memoryStatus').textContent='Patrz uważnie…';await new Promise(r=>setTimeout(r,450));
 for(let n of memorySequence){if(!memoryRunning)return;let b=$(`.memory-tile[data-i="${n}"]`);b?.classList.add('flash');tone(320+n*45,.16,'triangle',.035);await new Promise(r=>setTimeout(r,360));b?.classList.remove('flash');await new Promise(r=>setTimeout(r,100))}
 if(memoryRunning)$('#memoryStatus').textContent='Teraz Ty!'
}
function startMemory(){
 stopAllMinigames(false);if(!prepareMinigame('memoryStage'))return;
 memoryRunning=true;memorySequence=[];memoryInput=[];memoryRound=1;buildMemory();nextMemory()
}
function nextMemory(){if(!memoryRunning)return;memoryInput=[];memorySequence.push(Math.floor(Math.random()*9));$('#memoryRound').textContent=memoryRound;flashMemory()}
function memoryPick(i){
 if(!memoryRunning||$('#memoryStatus').textContent!=='Teraz Ty!')return;
 let index=memoryInput.length;memoryInput.push(i);let b=$(`.memory-tile[data-i="${i}"]`);b?.classList.add('flash');setTimeout(()=>b?.classList.remove('flash'),160);
 if(memorySequence[index]!==i){$('#memoryStatus').textContent='Pomyłka!';setTimeout(()=>stopMemory(true),600);return}
 if(memoryInput.length===memorySequence.length){memoryRound++;setTimeout(nextMemory,650)}
}
function stopMemory(reward=true){
 if(!memoryRunning)return;memoryRunning=false;$('#memoryStage')?.classList.remove('running');
 let score=Math.max(0,memoryRound-1);state.memoryBest=Math.max(state.memoryBest,score);
 if(reward)miniReward(score*9);else renderHud()
}
