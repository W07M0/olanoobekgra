const SUPABASE_URL="https://xyfrdlzjjntqkcvcagem.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_UTnddl3EL-TvuN3w6AK-_Q_RHyYHFHJ";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const db=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const SAVE_KEY='olaUltimateSaveV1',PLAYER_KEY='olaNoobPlayerId';
let playerId=localStorage.getItem(PLAYER_KEY)||crypto.randomUUID();localStorage.setItem(PLAYER_KEY,playerId);

const defaults={
 points:0,gems:0,coins:0,level:1,xp:0,totalClicks:0,bestCombo:1,playSeconds:0,
 perClick:1,auto:0,clickCost:20,autoCost:75,crit:0,rain:0,comboPower:0,gemChance:0,luck:0,autoBoost:0,clickBurst:0,coinBoost:0,offlineLevel:0,petSlots:0,rainSpeed:0,petPower:0,petGemBonus:0,petCoinBonus:0,expBoost:0,comboExp:0,worldExpBoost:0,petExpBonus:0,permRebirthPower:0,permGemIncome:0,permBossLoot:0,permClickPower:0,permAutoPower:0,
 rebirths:0,world:'neon',unlockedWorlds:['neon'],pets:[],equipped:[],
 sound:true,music:false,lastDaily:0,dailyStreak:0,claimedAchievements:[],quests:null,
 leaderboard:[],medals:0,aimBest:0,parkourBest:0,memoryBest:0,reflexBest:0,dodgeBest:0,minigameCooldowns:{aim:0,parkour:0,reflex:0,dodge:0},minigameRecords:{aim:0,parkour:0,reflex:0,dodge:0},minigameBestGrades:{aim:'-',parkour:'-',reflex:'-',dodge:'-'},arcadeCycle:{aim:false,parkour:false,reflex:false,dodge:false},arcadeBuffUntil:0,ownedSkins:['classic'],activeSkin:'classic',goldCases:0,casinoUnlocked:false,casinoGames:0,casinoWins:0,casinoProfit:0,casinoChips:0,casinoLevel:1,casinoXp:0,lastCasinoSupply:0,casinoSupplyCount:0,casinoMarket:0,casinoMarketNext:0,casinoUpgrades:{payout:0,supply:0,luck:0,limit:0,xp:0},lastSeen:Date.now(),worldBossesDefeated:[],lastEndgameBossAt:0,eventStats:{golden:0,rain:0,crates:0,minigames:0},achievementStats:{arcadePlayed:0,casinoPlayed:0,casinoWins:0,maxCasinoChips:0,chipsToGems:0,chipsToCoins:0,portals:0,hospitals:0,aimTrueStreak:0,aimBestTrueStreak:0,reflexPerfectRun:false,dodgeNoLifeLost:false},profileFrame:'default',profileBackground:'default',ownedProfileFrames:['default'],ownedProfileBackgrounds:['default'],achievementBonuses:{bossDamage:0,petLuck:0,globalPoints:0},specialPetClaimed:false,skinFilter:'all',achievementCategory:'all',achievementSort:'ready',achievementSearch:'',collectionTab:'pets',totalPointsEarned:0,worldBossProgress:{},worldBossStartedAt:{}
};
let state=Object.assign(structuredClone(defaults),JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'));

const V06_MIGRATION_KEY='ultimateNoob_v06_migrated';
function migrateStateV06(){
 // Preserve all existing currencies and progression.
 state.points=Math.max(0,Number(state.points)||0);
 state.gems=Math.max(0,Number(state.gems)||0);
 state.coins=Math.max(0,Number(state.coins)||0);

 state.minigameCooldowns={
  aim:0,parkour:0,reflex:0,dodge:0,
  ...(state.minigameCooldowns||{})
 };

 state.minigameRecords={
  aim:Number(state.minigameRecords?.aim ?? state.aimBest ?? 0)||0,
  parkour:Number(state.minigameRecords?.parkour ?? state.parkourBest ?? 0)||0,
  reflex:Number(state.minigameRecords?.reflex ?? state.reflexBest ?? 0)||0,
  dodge:Number(state.minigameRecords?.dodge ?? state.dodgeBest ?? 0)||0
 };

 state.casinoChips=Math.max(0,Number(state.casinoChips)||0);
 state.casinoLevel=Math.max(1,Number(state.casinoLevel)||1);
 state.casinoXp=Math.max(0,Number(state.casinoXp)||0);
 state.lastCasinoSupply=Math.max(0,Number(state.lastCasinoSupply)||0);
 state.casinoSupplyCount=Math.max(0,Number(state.casinoSupplyCount)||0);
 state.casinoMarket=Math.max(-10,Math.min(10,Number(state.casinoMarket)||0));
 state.casinoMarketNext=Math.max(0,Number(state.casinoMarketNext)||0);
 state.casinoUpgrades={
  payout:0,supply:0,luck:0,limit:0,xp:0,
  ...(state.casinoUpgrades||{})
 };

 localStorage.setItem(V06_MIGRATION_KEY,'done');
 localStorage.setItem(SAVE_KEY,JSON.stringify(state));
}
migrateStateV06();


const PET_INSTANCE_MIGRATION_KEY='olaPetInstances_v05b';
function createPetUid(){
 try{return crypto.randomUUID()}catch{return 'pet_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)}
}
function normalizePetInstance(value){
 if(typeof value==='string')return{uid:createPetUid(),type:value,level:1,xp:0,evolution:0};
 return{
  uid:value?.uid||createPetUid(),
  type:value?.type||value?.id||'dog',
  level:Math.max(1,Math.min(50,Number(value?.level)||1)),
  xp:Math.max(0,Number(value?.xp)||0),
  evolution:Math.max(0,Math.min(3,Number(value?.evolution)||0))
 }
}
function migratePetInstancesV05b(){
 const oldPets=Array.isArray(state.pets)?state.pets:[];
 const oldEquipped=Array.isArray(state.equipped)?state.equipped:[];
 const instances=oldPets.map(normalizePetInstance);

 let equippedUids=[];
 for(const old of oldEquipped){
  if(typeof old==='string'){
   const direct=instances.find(p=>p.uid===old&&!equippedUids.includes(p.uid));
   const byType=instances.find(p=>p.type===old&&!equippedUids.includes(p.uid));
   const chosen=direct||byType;
   if(chosen)equippedUids.push(chosen.uid)
  }else if(old?.uid&&instances.some(p=>p.uid===old.uid)){
   equippedUids.push(old.uid)
  }
 }
 state.pets=instances;
 state.equipped=[...new Set(equippedUids)].slice(0,Math.min(5,3+(state.petSlots||0)));
 localStorage.setItem(PET_INSTANCE_MIGRATION_KEY,'done');
 localStorage.setItem(SAVE_KEY,JSON.stringify(state))
}
migratePetInstancesV05b();


const WORLD_RESET_MIGRATION_KEY='olaWorldReset_v04c';
function applyWorldProgressResetV04c(){
 if(localStorage.getItem(WORLD_RESET_MIGRATION_KEY)==='done')return false;

 // Resetujemy wyłącznie progres lokacji i bossów świata.
 state.world='neon';
 state.unlockedWorlds=['neon'];
 state.worldBossesDefeated=[];
 state.lastEndgameBossAt=0;
 state.lastBossLevel=0;

 localStorage.setItem(WORLD_RESET_MIGRATION_KEY,'done');
 localStorage.setItem(SAVE_KEY,JSON.stringify(state));
 return true
}
const worldProgressWasReset=applyWorldProgressResetV04c();

state.eventStats=Object.assign({},defaults.eventStats,state.eventStats||{});
let combo=1,lastClick=0;
let eventEnds=Date.now()+45000,currentEvent=null,eventMultiplier=1,boardMode='global',onlineBoard=[],audioCtx,musicTimer,lastSaveOnline=0;

const words=['NOOB','N00B','NOOBEK','EZ','BOT','SKILL ISSUE','XD','ULTRA NOOB','MEGA NOOB','L'];
const colors=['#ff3e9d','#36e7ff','#ffd34e','#815cff','#4dffad','#ff765e','#fff'];
const fonts=['Impact','Arial Black','Comic Sans MS','Georgia','Courier New','fantasy'];
const pets=[
 {id:'dog',name:'Noob Dog',emoji:'🐶',rarity:'common',mult:1.10,chance:25},
 {id:'banana',name:'Banana Noob',emoji:'🍌',rarity:'common',mult:1.95,chance:19},
 {id:'slime',name:'Lag Slime',emoji:'🟢',rarity:'common',mult:1.18,chance:16},
 {id:'cat',name:'Meme Cat',emoji:'😹',rarity:'rare',mult:1.35,chance:12},
 {id:'robot',name:'Bot 3000',emoji:'🤖',rarity:'rare',mult:1.50,chance:9},
 {id:'penguin',name:'Frozen Penguin',emoji:'🐧',rarity:'rare',mult:1.62,chance:6.5},
 {id:'ghost',name:'404 Ghost',emoji:'👻',rarity:'epic',mult:1.85,chance:4.5},
 {id:'sigma',name:'Sigma Noob',emoji:'🗿',rarity:'epic',mult:2.10,chance:3.2},
 {id:'wizard',name:'XP Wizard',emoji:'🧙',rarity:'epic',mult:2.25,chance:2.4,exp:1.08},
 {id:'dragon',name:'Noob Dragon',emoji:'🐲',rarity:'legendary',mult:3.50,chance:1.3},
 {id:'phoenix',name:'Rebirth Phoenix',emoji:'🔥',rarity:'legendary',mult:4.20,chance:.7,exp:1.12},
 {id:'angel',name:'Golden Angel',emoji:'😇',rarity:'mythic',mult:5.50,chance:.28,exp:1.18},
 {id:'devpet',name:'Developer Pet',emoji:'💻',rarity:'secret',mult:8.00,chance:.12,exp:1.25}
];
const worlds=[
 {id:'neon',bossHp:500,bossName:'Piwniczny Lag',bossEmoji:'👾',requiresBoss:null,minLevel:1,name:'Neonowa Piwnica',emoji:'🌃',cost:0,currency:'points',rebirths:0,mult:1,gemMult:1,coinMult:1,petMult:1,cls:'world-neon',rain:'NOOB',accent:'#ff3e9d',desc:'Migające monitory, stare klawiatury i pierwszy krok na drodze do zostania największym noobem.'},
 {id:'forest',bossHp:900,bossName:'Leśny Troll',bossEmoji:'🌲',requiresBoss:'neon',minLevel:3,name:'Las Noobów',emoji:'🌲',cost:8000,currency:'points',rebirths:0,mult:1.45,gemMult:1.01,coinMult:1,petMult:1.02,cls:'world-forest',rain:'🍃',accent:'#4dffad',desc:'Drzewa szepczą „skill issue”, a każdy krzak wygląda jak idealne miejsce na ukrycie skrzynki.'},
 {id:'banana',bossName:'Król Bananów',bossEmoji:'🍌',requiresBoss:'forest',minLevel:5,name:'Wyspa Bananów',emoji:'🍌',cost:28000,currency:'points',rebirths:0,mult:2.3,gemMult:1.02,coinMult:1.02,petMult:1.03,cls:'world-banana',rain:'🍌',accent:'#ffd34e',desc:'Słońce, palmy i banany spadające z nieba. Nikt nie wie, kto je rzuca.'},
 {id:'desert',bossHp:2600,bossName:'Meme Skorpion',bossEmoji:'🦂',requiresBoss:'banana',minLevel:8,name:'Pustynia Memów',emoji:'🏜️',cost:75000,currency:'points',rebirths:1,mult:2.7,gemMult:1.03,coinMult:1.01,petMult:1.04,cls:'world-desert',rain:'XD',accent:'#ff9d00',desc:'Piasek, kaktusy i stare memy. Nawet tumbleweedy potrafią tutaj lagować.'},
 {id:'factory',bossHp:4500,bossName:'Bot Overseer',bossEmoji:'🤖',requiresBoss:'desert',minLevel:10,name:'Fabryka Botów',emoji:'🏭',cost:180000,currency:'points',rebirths:1,mult:3.6,gemMult:1.04,coinMult:1.04,petMult:1.06,cls:'world-factory',rain:'🤖',accent:'#36e7ff',desc:'Tysiące botów klikają bez przerwy. Czasem jeden z nich zaczyna podejrzanie dobrze grać.'},
 {id:'ice',bossName:'Lodowy Noob',bossEmoji:'❄️',requiresBoss:'factory',minLevel:12,name:'Lodowa Kraina',emoji:'❄️',cost:35,currency:'gems',rebirths:1,mult:4.7,gemMult:1.07,coinMult:1.02,petMult:1.06,cls:'world-ice',rain:'❄️',accent:'#baf8ff',desc:'Mróz zamraża klawiatury, a noobki ślizgają się prosto w przepaść.'},
 {id:'ocean',bossHp:12000,bossName:'Kraken Lagów',bossEmoji:'🐙',requiresBoss:'ice',minLevel:15,name:'Ocean Lagów',emoji:'🌊',cost:55,currency:'gems',rebirths:2,mult:5.9,gemMult:1.09,coinMult:1.03,petMult:1.07,cls:'world-ocean',rain:'🐟',accent:'#36e7ff',desc:'Każda fala dodaje 300 ms pingu. Ryby teleportują się zamiast pływać.'},
 {id:'volcano',bossHp:20000,bossName:'Wulkaniczny Troll',bossEmoji:'🌋',requiresBoss:'ocean',minLevel:18,name:'Wulkan Trolli',emoji:'🌋',cost:110,currency:'coins',rebirths:2,mult:7.3,gemMult:1.04,coinMult:1.08,petMult:1.08,cls:'world-volcano',rain:'🔥',accent:'#ff5a00',desc:'Lawa bulgocze, trollface’y patrzą ze ścian, a każdy most wygląda jak pułapka.'},
 {id:'sky',bossHp:34000,bossName:'Strażnik Chmur',bossEmoji:'☁️',requiresBoss:'volcano',minLevel:22,name:'Sky Islands',emoji:'☁️',cost:2600000,currency:'points',rebirths:3,mult:9.1,gemMult:1.08,coinMult:1.05,petMult:1.10,cls:'world-sky',rain:'⭐',accent:'#ffffff',desc:'Wyspy unoszą się nad chmurami. Jeden zły skok i zaczynasz lot bez biletu powrotnego.'},
 {id:'castle',bossHp:56000,bossName:'Król Noobów',bossEmoji:'👑',requiresBoss:'sky',minLevel:26,name:'Królestwo Noobów',emoji:'🏰',cost:180,currency:'coins',rebirths:3,mult:11.2,gemMult:1.06,coinMult:1.10,petMult:1.12,cls:'world-castle',rain:'👑',accent:'#ffd34e',desc:'Dom legendarnych wojowników, którzy nadal nie opanowali podwójnego skoku.'},
 {id:'galaxy',bossHp:90000,bossName:'Kosmiczny Bot',bossEmoji:'🛰️',requiresBoss:'castle',minLevel:30,name:'Kosmiczna Stacja',emoji:'🛰️',cost:7000000,currency:'points',rebirths:4,mult:13.8,gemMult:1.11,coinMult:1.06,petMult:1.14,cls:'world-galaxy',rain:'🪐',accent:'#815cff',desc:'Poza granicami internetu krąży stacja zbudowana z klawiatur i czystego lagowania.'},
 {id:'void',bossName:'Władca Pustki',bossEmoji:'🕳️',requiresBoss:'galaxy',minLevel:36,name:'Pustka Skill Issue',emoji:'🕳️',cost:180,currency:'gems',rebirths:5,mult:17,gemMult:1.14,coinMult:1.10,petMult:1.16,cls:'world-void',rain:'L',accent:'#b25cff',desc:'Miejsce, do którego trafiają najbardziej spektakularne porażki. Nie każdy znajduje wyjście.'},
 {id:'rainbow',bossName:'Tęczowy Chaos',bossEmoji:'🌈',requiresBoss:'void',minLevel:42,name:'Rainbow Dimension',emoji:'🌈',cost:350,currency:'gems',rebirths:7,mult:21,gemMult:1.18,coinMult:1.12,petMult:1.18,cls:'world-rainbow',rain:'🌈',accent:'#ff6bd6',desc:'Kolory zmieniają się szybciej niż zdanie noobka po przegranej.'},
 {id:'goldrealm',bossName:'Golden Overlord',bossEmoji:'💰',requiresBoss:'rainbow',minLevel:50,name:'Golden Noob Realm',emoji:'👑',cost:420,currency:'coins',rebirths:10,mult:26,gemMult:1.20,coinMult:1.18,petMult:1.22,cls:'world-gold',rain:'GOLD',accent:'#ffd34e',desc:'Złote posągi, złote skrzynki i najbogatsze noobki całego multiwersum.'},
 {id:'dev',bossName:'Developer Boss',bossEmoji:'💻',requiresBoss:'goldrealm',minLevel:60,name:'Developer Dimension',emoji:'💻',cost:0,currency:'points',rebirths:15,mult:32,gemMult:1.22,coinMult:1.20,petMult:1.25,cls:'world-dev',rain:'404',accent:'#4dffad',desc:'Sekretna warstwa gry. Kod spada z nieba, a błędy są tutaj częścią wystroju.'}
];


const GAME_VERSION='0.6c';

const DIAGNOSTICS_KEY='olaNoobDiagnostics_v04f';
function getDiagnostics(){try{return JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY)||'[]')}catch{return[]}}
function saveDiagnostic(kind,message,stack=''){
 let list=getDiagnostics();
 const signature=String(kind)+'|'+String(message)+'|'+(document.querySelector('.view.active')?.id||'unknown');
 const recent=list.find(x=>x.signature===signature&&Date.now()-new Date(x.time).getTime()<30000);
 if(recent)return;
 list.unshift({time:new Date().toISOString(),kind:String(kind).slice(0,30),message:String(message).slice(0,500),stack:String(stack||'').slice(0,1000),view:document.querySelector('.view.active')?.id||'unknown',version:GAME_VERSION,signature});
 localStorage.setItem(DIAGNOSTICS_KEY,JSON.stringify(list.slice(0,15)));renderDiagnostics()
}
function renderDiagnostics(){
 let status=$('#diagnosticsStatus'),log=$('#diagnosticsLog');if(!status||!log)return;
 let list=getDiagnostics();status.classList.toggle('has-errors',list.length>0);
 status.textContent=list.length?`Wykryto ${list.length} zapisanych problemów.`:'Brak wykrytych błędów.';
 log.textContent=list.map(x=>`[${new Date(x.time).toLocaleString('pl-PL')}] ${x.kind} — ${x.message}\nWidok: ${x.view}\n${x.stack||''}`).join('\n\n')
}
function clearDiagnostics(){localStorage.removeItem(DIAGNOSTICS_KEY);renderDiagnostics();toast('Diagnostyka wyczyszczona')}
window.addEventListener('error',e=>saveDiagnostic('JavaScript',e.message,e.error?.stack||`${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection',e=>saveDiagnostic('Promise',e.reason?.message||e.reason,e.reason?.stack||''));

const patchNotes=[
 {version:'0.6c',date:'Aktualna wersja',title:'Collection, Bosses & Progression Rework',summary:'Stałe HP bossów, uporządkowane skiny, sklep i osiągnięcia.',changes:['Bossowie mają stałe HP zależne od świata, a nie mocy kliknięcia gracza.','Skiny są grupowane według rzadkości i mają filtry.','Skiny Epic+ zmieniają otoczenie klikera.','Permanentny sklep podzielono na diamenty i Noob Coiny.','Osiągnięcia mają kategorie, wyszukiwarkę, sortowanie i nagrody specjalne.','Dodano ramki i tła nicku widoczne w rankingach.','Najtrudniejsze osiągnięcie może dać specjalnego peta Ultimate Noob.','Usunięto tytuły oraz ścieżkę bossów.','Kolekcja jest głównym centrum petów, skinów, osiągnięć i światów.']},
 {version:'0.6b',date:'Aktualna wersja',title:'Achievements & Reflex Navigation',summary:'Nowe osiągnięcia minigier i kasyna oraz poprawione przewijanie Reflex.',changes:['Noob Reflex przewija ekran do planszy i ustawia fokus.','Dodano osiągnięcia minigier i kasyna.','Dodano paski postępu osiągnięć.']},
 {version:'0.6a-ui-boss-admin',date:'Rozszerzenie 0.6a',title:'UI, Boss & Admin Polish',summary:'Poprawki Ridera, bossów, statystyk i panelu administratora.',changes:['Portal Ridera jest nieunikniony.','Szpital Ridera działa jak przeszkoda na ziemi.','Naprawiono cooldown Aim.','Dodano dwa ulepszenia bossów.','Przeszkody bossów pojawiają się na klikerze.','Dodano prywatne najlepsze oceny minigier.','Usunięto panel Co nowego.','Statystyki przeniesiono do Ustawień.','Administrator może edytować podstawowe dane profilu.']},
 {
  version:'0.6a-readability',
  date:'Rozszerzenie 0.6a',
  title:'Readability & Gameplay Polish',
  summary:'Lepsza czytelność minigier i uczciwsze mechaniki.',
  changes:[
   'Reflex ma ciaśniejsze okno trafienia i feedback Perfect/Good/Miss.',
   'Życia są widoczne bezpośrednio w HUD Ridera i Dodge.',
   'Pickupy mają wyraźniejszy glow.',
   'Portal Ridera jest widoczny na trasie i czyści pobliskie przeszkody.',
   'Dodano rzadki szpital +1 HP w Noob Rider.',
   'Fake cele w Aim są identyczne kształtem, ale ciemniejsze.',
   'Dodano krótkie opisy najważniejszych zakładek i minigier.'
  ]
 },
 {
  version:'0.6a-gameplay',
  date:'Rozszerzenie 0.6a',
  title:'Minigame mechanics rework',
  summary:'Głębsze mechaniki wszystkich minigier i nowy balans nagród.',
  changes:[
   'Nowy Noob Reflex w stylu Guitar Hero.',
   'Bomby w Reflex odejmują punkty, a combo daje dodatkowy czas.',
   'Noob Rider przyspiesza i ma portale co 10 000 metrów.',
   'Rider oraz Dodge korzystają z trzech żyć.',
   'Brainrot Dodge przyspiesza i ma pozytywne oraz negatywne pickupy.',
   'Ocena wpływa na mnożnik nagród.',
   'Nagrody minigier zwiększono o 50%.',
   'Zagranie we wszystkie minigry daje buff na 3 godziny.',
   'Zmieniono bazowe kursy kasyna.'
  ]
 },
 {
  version:'0.6a-skinfix',
  date:'Poprawka 0.6a',
  title:'Skin Grid Restore',
  summary:'Przywrócono brakującą listę skinów.',
  changes:[
   'Przywrócono funkcję renderSkins.',
   'Zakładka pokazuje posiadane, aktywne i zablokowane skiny.',
   'Dodano czytelne oznaczenia rzadkości.',
   'Naprawiono wyposażanie skinów z kart.','Mniejsze hitboxy Noob Ridera.','Fake cele w Aim Lab znikają szybciej.'
  ]
 },
 {version:'0.6a-fix',date:'Poprawka 0.6a',title:'Aim, Skins & Exchange Fix',summary:'Ruchome cele, działające skiny i lepszy kurs diamentów.',changes:['Ruchome cele w Aim Lab.','Stałe 1,15 s na trafienie.','Fake cele podobne do normalnych.','Lepszy kurs diamentów.','Naprawiono renderSkinOrbit.']},
 {
  version:'0.6a',date:'Aktualna wersja',title:'Quality of Life',
  summary:'Dopracowanie minigier, kasyna, petów, skinów i wygody obsługi.',
  changes:[
   'Po uruchomieniu minigry ekran automatycznie przewija się do planszy.',
   'Po zamknięciu wyniku strona wraca do kart minigier.',
   'Aim Lab ma czytelniejszy fake target i spokojniejsze tempo.',
   'Noob Rider ma pewniejszy skok spacją i dotykiem.',
   'Reflex działa wolniej i stabilniej.',
   'Nagrody minigier obejmują EXP, punkty, diamenty i Noob Coiny.',
   'Kasjer pozwala wpisać dowolną liczbę żetonów.',
   'Poprawiono czytelność kart petów i skinów.',
   'Zmniejszono nadmiar animacji w trybie oszczędnym.',
   'Dodano drobne poprawki responsywności.'
  ]
 },
 {
  version:'0.6',date:'Poprzednia aktualizacja',title:'Minigames & Casino Rework',
  summary:'Przebudowane minigry i osobna progresja kasyna.',
  changes:[
   'Dodano cztery zręcznościowe minigry.',
   'Każda minigra ma osobny cooldown 30 sekund.',
   'Nagrody zależą od osiągniętego wyniku.',
   'Dodano rankingi TOP 3 minigier.',
   'Kasyno korzysta z osobnych żetonów.',
   'Dodano godzinową paczkę żetonów.',
   'Dodano Casino Level, Casino XP i ulepszenia.',
   'Dodano pakietową wymianę żetonów.',
   'Kurs Noob Coinów zmienia się od -10% do +10%.'
  ]
 },
 {
  version:'0.5d',date:'Poprzednia aktualizacja',title:'Polish & Overhaul',
  summary:'Duże porządki interfejsu, petów, skinów i ustawień.',
  changes:[
   'Przebudowano wygląd menu bocznego i kart.',
   'Orbita petów jest wycentrowana względem klikera.',
   'Karty petów są czytelniejsze i bardziej kompaktowe.',
   'Ekran zdobycia peta pokazuje wyraźną ikonę i rzadkość.',
   'Skiny mają mocniejsze efekty zależne od rzadkości.',
   'Usunięto ręczne dodawanie wyniku do rankingu.',
   'Usunięto eksport, import, ręczny zapis i reset dla zwykłego gracza.',
   'Ustawienia zostały uproszczone.',
   'Poprawiono responsywność i ograniczono nadmiar efektów.',
   'Zachowano dotychczasowy zapis i całą zawartość gry.'
  ]
 },
 {
  version:'0.5c-r3',date:'Poprawka 0.5c',title:'Pets, Cases & Rebrand Fix',
  summary:'Naprawione pety widmo, zgodne losowania i nowy wygląd klikera.',
  changes:[
   'Usunięto nieistniejące pety z listy wyposażonych.',
   'Licznik wyposażonych petów pokazuje tylko prawdziwe egzemplarze.',
   'Animacja skinów zawsze zatrzymuje się na faktycznie wygranym skinie.',
   'Dodano animację pękającego jajka przy zdobywaniu peta.',
   'Pety kosztują teraz 30 diamentów zamiast Noob Coinów.',
   'Usunięto odniesienia do Oli i zmieniono nazwę na Ultimate Noob Clicker.',
   'Zdjęcie na głównym przycisku zastąpiono napisem NOOB.'
  ]
 },
 {
  version:'0.5c-r2',date:'Poprawka 0.5c',title:'Ranking Compatibility Fix',
  summary:'Przywrócono stare wpisy rankingowe i zgodność z tabelą scores.',
  changes:[
   'Ranking punktów pokazuje stare wpisy z tabeli scores, gdy tabela players jest pusta.',
   'Nowe zapisy trafiają do profilu players i zgodnościowego wpisu scores.',
   'Rankingi poziomu i rebirthów używają nowych profili.',
   'Dodano opcjonalny SQL do migracji starych wyników do tabeli players.',
   'Nie zmieniono numeru wyświetlanej wersji gry — nadal 0.5c.'
  ]
 },
 {
  version:'0.5c',date:'Poprzednia aktualizacja',title:'Profiles & Ranking — Fixed',
  summary:'Profile graczy i panel admina dodane bez naruszania systemów gry.',
  changes:[
   'Naprawiono ranking i przywrócono funkcję saveOnline.',
   'Kasyno, skiny, pety i minigry pozostają na stabilnym kodzie 0.5b.',
   'Dodano zapamiętywany nick i stały Player ID.',
   'Dodano automatyczne rankingi punktów, poziomu i rebirthów.',
   'Dodano panel ustawień, eksport i import zapisu.',
   'Dodano tryb oszczędny i regulację efektów.',
   'Dodano panel administratora przez Supabase Auth.',
   'Profil i admin działają w osobnym module, bez nadpisywania systemów gry.'
  ]
 },
 {
  version:'0.5b',date:'Poprzednia aktualizacja',title:'Pet Evolution Update',
  summary:'Osobne egzemplarze petów, poziomy, ewolucje i porządki w panelu bocznym.',
  changes:[
   'Każdy zdobyty pet jest teraz osobnym egzemplarzem z unikalnym identyfikatorem.',
   'Można wyposażyć kilka takich samych petów.',
   'Pety zdobywają EXP za klikanie, minigry, bossów i rebirth.',
   'Dodano poziomy petów oraz paski doświadczenia.',
   'Trzy duplikaty można połączyć w Mega Nooba, Ultra Nooba lub Boskiego Nooba.',
   'Dodano usuwanie petów z obowiązkowym potwierdzeniem.',
   'Stare zapisy petów są automatycznie migrowane bez utraty kolekcji.',
   'Usunięto wewnętrzne suwaki z prawego panelu.'
  ]
 },
 {
  version:'0.5a',date:'Poprzednia aktualizacja',title:'Economy & Progression Update',
  summary:'Naprawa klikera i feedbacku oraz nowy permanentny sklep.',
  changes:[
   'Naprawiono brakującą funkcję spawnSkinParticles.',
   'Naprawiono wysyłanie komentarzy do Supabase.',
   'Sklep podzielono na ulepszenia tymczasowe i permanentne.',
   'Ulepszenia za diamenty i Noob Coiny pozostają po rebirth.',
   'Zwiększono nagrody bossów i dostępność diamentów z minigier.',
   'Wzmocniono Noob Coiny, zachowując malejącą skuteczność.',
   'Rebirth resetuje tylko podstawowe ulepszenia kupowane za punkty.'
  ]
 },
 {
  version:'0.5',date:'Poprzednia aktualizacja',title:'Technical Foundation Update',
  summary:'Kod gry został rozdzielony na moduły bez resetowania postępu.',
  changes:[
   'Rozdzielono HTML, CSS i JavaScript na osobne pliki.',
   'Systemy gry podzielono na dane, rdzeń, bossów i UI, minigry, integracje oraz start aplikacji.',
   'Dodano stronę testów technicznych sprawdzającą pliki i najważniejsze funkcje.',
   'Dodano plik .nojekyll dla prostszego publikowania na GitHub Pages.',
   'Zachowano istniejący localStorage, Supabase i cały postęp graczy.'
  ]
 },
 {
  version:'0.4g',date:'Poprzednia aktualizacja',title:'Skin Renderer Hotfix',
  summary:'Naprawiono błąd, który blokował renderowanie zakładek.',
  changes:[
   'Przywrócono brakującą funkcję renderSkinOrbit.',
   'Efekty orbitujące ponownie działają dla rzadkich skinów.',
   'Błąd efektu skina nie może już zatrzymać całego interfejsu.',
   'Diagnostyka nie zapisuje już wielokrotnie tego samego błędu w krótkim czasie.',
   'Naprawiono renderowanie wszystkich zakładek zależnych od funkcji render().'
  ]
 },
 {
  version:'0.4f',date:'Poprzednia aktualizacja',title:'Skin Renderer Hotfix',
  summary:'Naprawione minigry, pisanie spacją i diagnostyka błędów.',
  changes:[
   'Przebudowano uruchamianie Aim Lab, Parkour i Memory.',
   'Spacja działa jako klik tylko na ekranie gry.',
   'W formularzach i polach tekstowych spacja działa normalnie.',
   'Parkour nadal używa spacji do skakania.',
   'Wyjście z zakładki poprawnie zatrzymuje aktywną minigrę.',
   'Dodano lokalny rejestr błędów JavaScript w zakładce Feedback.',
   'Przywrócono zbalansowane nagrody minigier.'
  ]
 },
 {
  version:'0.4e',date:'Poprzednia aktualizacja',title:'Skin Renderer Hotfix',
  summary:'Mocniejsi bossowie, częstsze blokady i przebudowany balans całej progresji.',
  changes:[
   'HP bossa zależy od obrażeń kliknięcia i zmiękczonego mnożnika gracza.',
   'Bossowie wymagają większej liczby trafień i nie mogą zostać zabici jednym kliknięciem.',
   'Blokady pojawiają się średnio co 7–12 sekund.',
   'Późniejsi bossowie tworzą więcej blokad, a część wymaga kilku kliknięć.',
   'Noob Coiny używają malejących przyrostów zamiast liniowego +25% za sztukę.',
   'Zmniejszono mnożniki późnych światów, nagrody minigier i wypłaty kasyna.',
   'Zwiększono koszt EXP na wysokich poziomach i wygładzono nagrody rebirth.'
  ]
 },
 {
  version:'0.4d',date:'Poprzednia aktualizacja',title:'Skin Renderer Hotfix',
  summary:'Lżejsi bossowie, przeszkadzajki i zapis komentarzy graczy.',
  changes:[
   'Bossowie światów mają teraz stałe HP zależne od lokacji.',
   'Usunięto agresywne skalowanie HP do siły gracza.',
   'Bossowie endgame skalują się łagodnie i mają ograniczony wzrost.',
   'Podczas walki pojawiają się cele blokujące atak na bossa.',
   'Dodano Player Feedback zapisywany online przez Supabase.',
   'Gracze mogą dodawać opinie, bugi, pomysły i uwagi o balansie.'
  ]
 },
 {
  version:'0.4c',date:'Poprzednia aktualizacja',title:'Skin Renderer Hotfix',
  summary:'Jednorazowe cofnięcie wyłącznie postępu światów i bossów.',
  changes:[
   'Wszyscy gracze wracają jednorazowo do Neonowej Piwnicy.',
   'Lista odblokowanych światów zostaje zresetowana do pierwszej lokacji.',
   'Bossów światów trzeba ponownie pokonać po kolei.',
   'Punkty, poziom, EXP, pety, skiny, waluty, ulepszenia i rebirthy pozostają bez zmian.',
   'Reset uruchamia się tylko raz na danym zapisie i nie powtarza się przy kolejnych wejściach.'
  ]
 },
 {
  version:'0.4b',date:'Poprzednia aktualizacja',title:'Skin Renderer Hotfix',
  summary:'Naprawa prawej kolumny oraz wyraźnie płynniejsze klikanie.',
  changes:[
   'Naprawiono uszkodzony kontener klikera, który przenosił zakładki i bossa pod stronę.',
   'Ranking, questy, statystyki i aktualności pozostają po prawej stronie.',
   'Kliknięcie aktualizuje teraz tylko licznik i HUD, zamiast przebudowywać wszystkie zakładki.',
   'Ograniczono liczbę cząsteczek, efektów pogodowych i animacji działających jednocześnie.',
   'Pogoda jest generowana tylko na ekranie głównym i działa rzadziej.',
   'Zmniejszono częstotliwość pełnego renderowania interfejsu.'
  ]
 },
 {
  version:'0.4a',date:'Poprzednia aktualizacja',title:'World Boss Progression',
  summary:'Każdy świat ma własnego bossa i trzeba przechodzić lokacje po kolei.',
  changes:[
   'Każdy świat ma przypisanego unikalnego bossa.',
   'Kolejny świat wymaga pokonania bossa poprzedniej lokacji.',
   'Nie można już przeskakiwać światów samymi walutami lub minigrami.',
   'Dodano ścieżkę postępu bossów w zakładce Światy.',
   'W ostatnim świecie losowy boss endgame pojawia się co kilka minut.',
   'Boss endgame skaluje HP i nagrody do aktualnej siły gracza.'
  ]
 },
 {
  version:'0.4',date:'Poprzednia aktualizacja',title:'Skin Renderer Hotfix',
  summary:'Nowy układ prawej kolumny, bossy, pogoda światów i kolekcja.',
  changes:[
   'Przywrócono ranking, questy, statystyki i aktualności po prawej stronie.',
   'Dodano bossów pojawiających się co kilka poziomów.',
   'Dodano animowane przejścia i celebrację odblokowania świata.',
   'Każdy świat ma własną pogodę i muzyczny motyw.',
   'Rzadkie pety otrzymały mocniejsze aury.',
   'Dodano kolekcję petów i skinów z szansami zdobycia.',
   'Dodano tytuły gracza zależne od poziomu, rebirthów i osiągnięć.'
  ]
 },
 {
  version:'0.3',date:'Poprzednia aktualizacja',title:'Skin Effects Update',
  summary:'Duże ulepszenie skinów i system historii aktualizacji.',
  changes:[
   'Każdy skin otrzymał wyraźniejszy efekt wizualny.',
   'Rzadkie i epickie skiny mają dodatkowe warstwy animacji.',
   'Legendarne, mythic i secret skiny generują efekty wokół klikera.',
   'Każdy skin ma własny dźwięk kliknięcia.',
   'Gold Noob tworzy lokalny deszcz złota i pieniędzy przy klikerze.',
   'Usunięto napisy z nazwami skinów bezpośrednio na klikerze.',
   'Dodano zakładkę Patch notes z historią poprzednich aktualizacji.'
  ]
 },
 {
  version:'0.2',date:'Poprzednia aktualizacja',title:'Worlds, Pets & EXP',
  summary:'Rozbudowa progresji, petów, skinów i poziomów.',
  changes:[
   'Dodano 15 światów z wymaganiami poziomów i rebirthów.',
   'Dodano bariery poziomowe dla głównych funkcji.',
   'Rozszerzono kolekcję petów i skinów.',
   'Dodano ulepszenia EXP i pety zwiększające doświadczenie.',
   'Dodano kasyno z trzema grami na wirtualne Noob Coiny.',
   'Zbalansowano nagrody z minigier.'
  ]
 },
 {
  version:'0.1',date:'Pierwsze wydanie',title:'Ultimate Noob Clicker',
  summary:'Pierwsza kompletna wersja clickera.',
  changes:[
   'Klikanie, combo i deszcz noobków.',
   'Sklep ulepszeń oraz auto-clicker.',
   'Pety, skrzynki, światy i rebirth.',
   'Minigry Aim Lab, Parkour i Memory.',
   'Globalny ranking Supabase.',
   'Osiągnięcia, questy i dzienne nagrody.'
  ]
 }
];
let selectedPatch='0.6b';
function renderPatchNotes(){
 let list=$('#patchList'),content=$('#patchContent');if(!list||!content)return;
 list.innerHTML=patchNotes.map(p=>`<button class="patch-btn ${p.version===selectedPatch?'active':''}" onclick="selectPatch('${p.version}')">Wersja ${p.version}<small>${p.title}</small></button>`).join('');
 let p=patchNotes.find(x=>x.version===selectedPatch)||patchNotes[0];
 content.innerHTML=`<div class="patch-date">${p.date}</div><h2>Wersja ${p.version} — ${p.title}</h2><p class="muted">${p.summary}</p><ul>${p.changes.map(c=>`<li>${c}</li>`).join('')}</ul>`
}
function selectPatch(version){selectedPatch=version;renderPatchNotes()}

const featureUnlocks={
 shop:2,
 pets:4,
 minigames:6,
 skins:7,
 casino:8,
 worlds:3,
 rebirth:10,
 awards:2,
 patchnotes:1,
 collection:5,
 feedback:1
};
function requiredLevelForFeature(id){return featureUnlocks[id]||1}
function featureUnlocked(id){return state.level>=requiredLevelForFeature(id)}
function lockedFeatureMessage(id){
 const names={shop:'Sklep',pets:'Pety',minigames:'Minigry',skins:'Skiny',casino:'Kasyno',worlds:'Światy',rebirth:'Rebirth',awards:'Nagrody',patchnotes:'Patch notes',collection:'Kolekcja',feedback:'Feedback'};
 return `${names[id]||id} odblokuje się na poziomie ${requiredLevelForFeature(id)}`
}

const upgrades=[
 {id:'click',icon:'⚡',name:'Mocniejszy klik',desc:'+1 bazowy punkt za klik',currency:'points',permanent:false,base:25,growth:1.78,max:60,get:()=>state.perClick-1,buy:()=>state.perClick++},
 {id:'auto',icon:'🤖',name:'Auto-noob',desc:'+1 bazowy punkt na sekundę',currency:'points',permanent:false,base:90,growth:1.92,max:45,get:()=>state.auto,buy:()=>state.auto++},
 {id:'crit',icon:'🎯',name:'Krytyczny noob',desc:'+2% szansy na krytyka x5',currency:'points',permanent:false,base:220,growth:2.05,max:15,get:()=>state.crit,buy:()=>state.crit++},
 {id:'rain',icon:'🌧️',name:'Moc deszczu',desc:'+35% nagrody za deszcz',currency:'points',permanent:false,base:400,growth:2.08,max:15,get:()=>state.rain,buy:()=>state.rain++},
 {id:'autoBoost',icon:'🏭',name:'Fabryka noobów',desc:'+20% wydajności auto-nooba',currency:'points',permanent:false,base:1800,growth:2.25,max:12,get:()=>state.autoBoost||0,buy:()=>state.autoBoost++},
 {id:'burst',icon:'💥',name:'Siła kliknięcia',desc:'+12% do każdego ręcznego kliknięcia',currency:'points',permanent:false,base:2600,growth:2.22,max:12,get:()=>state.clickBurst||0,buy:()=>state.clickBurst++},
 {id:'combo',icon:'🔥',name:'Combo booster',desc:'+3,5% punktów za każde combo (limit)',currency:'gems',permanent:true,base:6,growth:1.72,max:18,get:()=>state.comboPower,buy:()=>state.comboPower++},
 {id:'gem',icon:'💎',name:'Łowca diamentów',desc:'+0,4% szansy na diament',currency:'gems',permanent:true,base:10,growth:1.82,max:15,get:()=>state.gemChance,buy:()=>state.gemChance++},
 {id:'luck',icon:'🍀',name:'Szczęście skrzynek',desc:'Lepsza szansa na rzadkie pety i skiny',currency:'gems',permanent:true,base:15,growth:1.9,max:10,get:()=>state.luck||0,buy:()=>state.luck++},
 {id:'petSlots',icon:'🐾',name:'Dodatkowy slot peta',desc:'+1 slot, maksymalnie 5 petów',currency:'gems',permanent:true,base:35,growth:2.8,max:2,get:()=>state.petSlots||0,buy:()=>state.petSlots++},
 {id:'petPower',icon:'🦴',name:'Trening petów',desc:'+6% do bonusu wszystkich petów',currency:'gems',permanent:true,base:18,growth:1.85,max:15,get:()=>state.petPower||0,buy:()=>state.petPower++},
 {id:'petGem',icon:'🎟️',name:'Arcade Sponsor',desc:'+5% diamentów wyłącznie z minigier',currency:'gems',permanent:true,base:35,growth:2.05,max:10,get:()=>state.petGemBonus||0,buy:()=>state.petGemBonus++},
 {id:'petCoin',icon:'🎁',name:'Event Collector',desc:'+5% Noob Coinów z eventów i nagród dziennych',currency:'gems',permanent:true,base:45,growth:2.1,max:10,get:()=>state.petCoinBonus||0,buy:()=>state.petCoinBonus++},
 {id:'coinBoost',icon:'🎰',name:'Casino Broker',desc:'+4% wypłat żetonów w kasynie',currency:'gems',permanent:true,base:55,growth:2.12,max:10,get:()=>state.coinBoost||0,buy:()=>state.coinBoost++},
 {id:'offline',icon:'🌙',name:'Offline Noob',desc:'+10 minut naliczania offline na poziom',currency:'gems',permanent:true,base:18,growth:1.8,max:12,get:()=>state.offlineLevel||0,buy:()=>state.offlineLevel++},
 {id:'exp',icon:'📘',name:'Noob Akademia',desc:'+8% EXP ze wszystkich źródeł',currency:'gems',permanent:true,base:16,growth:1.75,max:20,get:()=>state.expBoost||0,buy:()=>state.expBoost++},
 {id:'comboExp',icon:'🔥',name:'Combo Mastery',desc:'+1% punktów za każde 5 combo, maksymalnie +30%',currency:'gems',permanent:true,base:32,growth:1.95,max:12,get:()=>state.comboExp||0,buy:()=>state.comboExp++},
 {id:'worldExp',icon:'🌍',name:'World Conqueror',desc:'+5% obrażeń bossom za poziom',currency:'coins',permanent:true,base:30,growth:2.05,max:12,get:()=>state.worldExpBoost||0,buy:()=>state.worldExpBoost++},
 {id:'petExp',icon:'🍀',name:'Pet Luck',desc:'+4% względnej szansy na rzadszego peta',currency:'gems',permanent:true,base:42,growth:2.08,max:12,get:()=>state.petExpBonus||0,buy:()=>state.petExpBonus++},
 {id:'rainSpeed',icon:'⛈️',name:'Szybszy deszcz',desc:'Deszcz co 1 combo wcześniej (minimum x5)',currency:'gems',permanent:true,base:25,growth:2.1,max:3,get:()=>state.rainSpeed||0,buy:()=>state.rainSpeed++},
 {id:'permClick',icon:'🔨',name:'Rdzeń klikera',desc:'+10% stałej mocy ręcznego kliku',currency:'gems',permanent:true,base:35,growth:1.95,max:15,get:()=>state.permClickPower||0,buy:()=>state.permClickPower++},
 {id:'permAuto',icon:'⚙️',name:'Wieczny automat',desc:'+12% stałej mocy auto-nooba',currency:'gems',permanent:true,base:40,growth:2,max:15,get:()=>state.permAutoPower||0,buy:()=>state.permAutoPower++},
 {id:'permGems',icon:'💎',name:'Diamentowa licencja',desc:'+8% gemów z minigier i bossów',currency:'coins',permanent:true,base:14,growth:1.85,max:15,get:()=>state.permGemIncome||0,buy:()=>state.permGemIncome++},
 {id:'permBoss',icon:'🏆',name:'Łowca bossów',desc:'+10% wszystkich nagród z bossów',currency:'coins',permanent:true,base:18,growth:1.9,max:15,get:()=>state.permBossLoot||0,buy:()=>state.permBossLoot++},
 {id:'permRebirth',icon:'♻️',name:'Rdzeń rebirthu',desc:'+8% do bonusu pochodzącego z Noob Coinów',currency:'coins',permanent:true,base:22,growth:2.05,max:12,get:()=>state.permRebirthPower||0,buy:()=>state.permRebirthPower++}

];

const skins=[
 {id:'classic',name:'Klasyczny Noob',emoji:'🙂',rarity:'common',color:'#ff83cc',weight:28,cls:'',desc:'Oryginalny wygląd.',sound:'classic',particles:['NOOB']},
 {id:'banana',name:'Banana Skin',emoji:'🍌',rarity:'common',color:'#ffd34e',weight:18,cls:'skin-banana',desc:'Żółty chaos i zero powagi.',sound:'banana',particles:['🍌','BANAN']},
 {id:'matrix',name:'Matrix Noob',emoji:'🟩',rarity:'rare',color:'#4dffad',weight:15,cls:'skin-matrix',desc:'Kod spływa po ekranie.',sound:'matrix',particles:['0','1','</>']},
 {id:'cyber',name:'Cyber Noob',emoji:'🤖',rarity:'rare',color:'#36e7ff',weight:14,cls:'skin-cyber',desc:'Skanujące neonowe linie.',sound:'cyber',particles:['⚡','⌁','CYBER']},
 {id:'lava',name:'Lava Noob',emoji:'🌋',rarity:'rare',color:'#ff5a00',weight:12,cls:'skin-lava',desc:'Pulsująca magma.',sound:'lava',particles:['🔥','💥','LAVA']},
 {id:'ice',name:'Frozen Noob',emoji:'❄️',rarity:'epic',color:'#baf8ff',weight:7.5,cls:'skin-ice',desc:'Lodowy blask.',sound:'ice',particles:['❄️','✦','ICE']},
 {id:'toxic',name:'Toxic Noob',emoji:'☣️',rarity:'epic',color:'#83ff31',weight:6.5,cls:'skin-toxic',desc:'Radioaktywny skill issue.',sound:'toxic',particles:['☣️','🟢','TOXIC']},
 {id:'glitch',name:'Glitch Noob',emoji:'👾',rarity:'epic',color:'#b25cff',weight:5.5,cls:'skin-glitch',desc:'Cyfrowe zakłócenia.',sound:'glitch',particles:['ERROR','404','▓']},
 {id:'rainbow',name:'Rainbow Noob',emoji:'🌈',rarity:'legendary',color:'#ff6bd6',weight:3.5,cls:'skin-rainbow',desc:'Wirująca tęcza.',sound:'rainbow',particles:['🌈','⭐','✨']},
 {id:'void',name:'Void Noob',emoji:'🕳️',rarity:'legendary',color:'#7a3cff',weight:2.2,cls:'skin-void',desc:'Ciemność, która patrzy z powrotem.',sound:'void',particles:['●','VOID','✦']},
 {id:'gold',name:'GOLD NOOB',emoji:'👑',rarity:'mythic',color:'#ffd34e',weight:1.2,cls:'skin-gold',desc:'Najrzadszy złoty skin z własną aurą.',sound:'gold',particles:['🪙','💰','GOLD']},
 {id:'dev',name:'Developer Skin',emoji:'💻',rarity:'secret',color:'#4dffad',weight:.6,cls:'skin-dev',desc:'Wygląda jak błąd, działa jak legenda.',sound:'dev',particles:['</>','404','BUG']}
];
let aimRunning=false,aimTimer=0,aimScore=0,aimCombo=0,aimLoop,parkourRunning=false,parkourFrame,parkourData,memoryRunning=false,memorySequence=[],memoryInput=[],memoryRound=1;

const achievements=[
 {id:'arcade1',icon:'🎮',name:'Pierwszy krok',desc:'Ukończ 1 minigrę',test:()=>state.achievementStats.arcadePlayed>=1,progress:()=>state.achievementStats.arcadePlayed,target:1,reward:['gems',3]},
 {id:'arcade25',icon:'🕹️',name:'Arcade Fan',desc:'Ukończ 25 minigier',test:()=>state.achievementStats.arcadePlayed>=25,progress:()=>state.achievementStats.arcadePlayed,target:25,reward:['coins',20]},
 {id:'arcade100',icon:'🏆',name:'Arcade Master',desc:'Ukończ 100 minigier',test:()=>state.achievementStats.arcadePlayed>=100,progress:()=>state.achievementStats.arcadePlayed,target:100,reward:['gems',40]},
 {id:'aim90',icon:'🎯',name:'Celny Noob',desc:'Zdobądź 90% accuracy w Aim',test:()=>Math.floor((state.minigameRecords.aim||0)/100)>=90,progress:()=>Math.floor((state.minigameRecords.aim||0)/100),target:90,reward:['gems',10]},
 {id:'aim98',icon:'🔭',name:'Snajper',desc:'Zdobądź 98% accuracy w Aim',test:()=>Math.floor((state.minigameRecords.aim||0)/100)>=98,progress:()=>Math.floor((state.minigameRecords.aim||0)/100),target:98,reward:['gems',25]},
 {id:'aimstreak100',icon:'👀',name:'Nie dałem się nabrać',desc:'Traf 100 prawdziwych celów z rzędu',test:()=>state.achievementStats.aimBestTrueStreak>=100,progress:()=>state.achievementStats.aimBestTrueStreak,target:100,reward:['coins',50]},
 {id:'reflexs',icon:'⚡',name:'Reflex Pro',desc:'Zdobądź ocenę S w Reflex',test:()=>({D:1,C:2,B:3,A:4,S:5,SS:6,SSS:7}[state.minigameBestGrades.reflex]||0)>=5,progress:()=>({D:1,C:2,B:3,A:4,S:5,SS:6,SSS:7}[state.minigameBestGrades.reflex]||0),target:5,reward:['gems',15]},
 {id:'reflexperfect',icon:'💥',name:'Perfekcyjny Reflex',desc:'Ukończ Reflex bez Miss i bomby',test:()=>state.achievementStats.reflexPerfectRun,progress:()=>state.achievementStats.reflexPerfectRun?1:0,target:1,reward:['coins',70]},
 {id:'rider25k',icon:'🛒',name:'Maratończyk',desc:'Przejedź 25 000 m',test:()=>state.minigameRecords.parkour>=25000,progress:()=>state.minigameRecords.parkour,target:25000,reward:['gems',25]},
 {id:'portal20',icon:'🌀',name:'Lucky Portal',desc:'Przejdź przez 20 portali',test:()=>state.achievementStats.portals>=20,progress:()=>state.achievementStats.portals,target:20,reward:['gems',20]},
 {id:'hospital10',icon:'🏥',name:'Pierwsza pomoc',desc:'Zbierz 10 szpitali',test:()=>state.achievementStats.hospitals>=10,progress:()=>state.achievementStats.hospitals,target:10,reward:['gems',15]},
 {id:'dodgeperfect',icon:'🧠',name:'Przetrwanie',desc:'Ukończ Dodge bez utraty życia',test:()=>state.achievementStats.dodgeNoLifeLost,progress:()=>state.achievementStats.dodgeNoLifeLost?1:0,target:1,reward:['coins',40]},
 {id:'casino1',icon:'🎲',name:'Pierwszy zakład',desc:'Zagraj pierwszy raz w kasynie',test:()=>state.achievementStats.casinoPlayed>=1,progress:()=>state.achievementStats.casinoPlayed,target:1,reward:['gems',2]},
 {id:'casino10new',icon:'🍀',name:'Szczęściarz',desc:'Wygraj 10 razy w kasynie',test:()=>state.achievementStats.casinoWins>=10,progress:()=>state.achievementStats.casinoWins,target:10,reward:['gems',10]},
 {id:'casino100new',icon:'💰',name:'Hazardzista kasyna',desc:'Wygraj 100 razy w kasynie',test:()=>state.achievementStats.casinoWins>=100,progress:()=>state.achievementStats.casinoWins,target:100,reward:['coins',60]},
 {id:'chips10k',icon:'🪙',name:'Milioner Żetonów',desc:'Posiadaj 10 000 żetonów',test:()=>state.achievementStats.maxCasinoChips>=10000,progress:()=>state.achievementStats.maxCasinoChips,target:10000,reward:['gems',50]},
 {id:'cashgems5k',icon:'💎',name:'Diamentowy Kasjer',desc:'Wymień 5000 żetonów na diamenty',test:()=>state.achievementStats.chipsToGems>=5000,progress:()=>state.achievementStats.chipsToGems,target:5000,reward:['gems',30]},
 {id:'cashcoins20k',icon:'🟡',name:'Bogaty Noob',desc:'Wymień 20 000 żetonów na Noob Coiny',test:()=>state.achievementStats.chipsToCoins>=20000,progress:()=>state.achievementStats.chipsToCoins,target:20000,reward:['coins',100]},

 {id:'click1',icon:'👆',name:'Pierwszy klik',desc:'Kliknij pierwszy raz',test:()=>state.totalClicks>=1,reward:['gems',1]},
 {id:'click100',icon:'💯',name:'Setka',desc:'Wykonaj 100 kliknięć',test:()=>state.totalClicks>=100,reward:['gems',3]},
 {id:'combo20',icon:'🔥',name:'Combo Master',desc:'Osiągnij combo x20',test:()=>state.bestCombo>=20,reward:['gems',5]},
 {id:'rich',icon:'💰',name:'Noob milioner',desc:'Zdobądź 1 000 000 punktów',test:()=>state.points>=1e6,reward:['coins',5]},
 {id:'pet3',icon:'🐾',name:'Drużyna petów',desc:'Wyposaż 3 pety',test:()=>state.equipped.length>=3,reward:['gems',8]},
 {id:'worlds',icon:'🌍',name:'Podróżnik',desc:'Odblokuj 10 światów',test:()=>state.unlockedWorlds.length>=10,reward:['coins',10]},
 {id:'rebirth',icon:'♻️',name:'Od nowa',desc:'Wykonaj rebirth',test:()=>state.rebirths>=1,reward:['gems',15]},
 {id:'crate10',icon:'🎁',name:'Hazardzista',desc:'Otwórz 10 skrzynek',test:()=>state.eventStats.crates>=10,reward:['coins',8]},
 {id:'aim50',icon:'🎯',name:'Aim Noob',desc:'Zdobądź 50 w Aim Labie',test:()=>state.aimBest>=50,reward:['gems',12]},
 {id:'parkour500',icon:'🧱',name:'Parkour Noob',desc:'Przebiegnij 500 m',test:()=>state.parkourBest>=500,reward:['coins',12]},
 {id:'goldskin',icon:'👑',name:'Złoty Noob',desc:'Zdobądź Gold Nooba',test:()=>state.ownedSkins.includes('gold'),reward:['gems',25]},
 {id:'casino10',icon:'🎰',name:'Kasynowy noob',desc:'Wygraj 10 gier w kasynie',test:()=>state.casinoWins>=10,reward:['gems',10]},
 {id:'goldrealm',icon:'👑',name:'Złote królestwo',desc:'Odblokuj Golden Noob Realm',test:()=>state.unlockedWorlds.includes('goldrealm'),reward:['gems',30]},
 {id:'developer',icon:'💻',name:'Za kulisami',desc:'Wejdź do Developer Dimension',test:()=>state.unlockedWorlds.includes('dev'),reward:['coins',50]},
 {id:'pets10',icon:'🐾',name:'Kolekcjoner petów',desc:'Zdobądź 10 petów',test:()=>state.pets.length>=10,reward:['gems',12]},
 {id:'skins8',icon:'🎨',name:'Szafa noobka',desc:'Odblokuj 8 skinów',test:()=>state.ownedSkins.length>=8,reward:['coins',20]},
 {id:'level60',icon:'📘',name:'Noob profesor',desc:'Osiągnij poziom 60',test:()=>state.level>=60,reward:['gems',60]},
 {id:'boss1',icon:'⚔️',name:'Pogromca noobów',desc:'Pokonaj pierwszego bossa',test:()=>state.bossWins>=1,reward:['gems',8]},
 {id:'boss10',icon:'👑',name:'Boss Slayer',desc:'Pokonaj 10 bossów',test:()=>state.bossWins>=10,reward:['coins',25]},
 {id:'allworldbosses',icon:'🌍',name:'Pogromca światów',desc:'Pokonaj bossów wszystkich światów',test:()=>state.worldBossesDefeated.length>=worlds.length,reward:['gems',100]}
];

const achievementMeta={
 click1:{category:'clicking'},click100:{category:'clicking'},combo20:{category:'clicking'},
 rich:{category:'clicking',special:{type:'background',id:'wealth',name:'Złote tło nicku'}},
 boss1:{category:'bosses'},boss10:{category:'bosses',special:{type:'bonus',key:'bossDamage',value:.03,name:'+3% obrażeń bossom'}},
 arcade1:{category:'minigames'},arcade25:{category:'minigames'},arcade100:{category:'minigames',special:{type:'frame',id:'arcade',name:'Neonowa ramka Arcade'}},
 aim90:{category:'minigames'},aim98:{category:'minigames'},aimstreak100:{category:'minigames'},
 reflexs:{category:'minigames'},reflexperfect:{category:'minigames',special:{type:'background',id:'reflex',name:'Tło Perfect Reflex'}},
 rider25k:{category:'minigames'},portal20:{category:'minigames'},hospital10:{category:'minigames'},dodgeperfect:{category:'minigames'},
 casino1:{category:'casino'},casino10new:{category:'casino'},casino100new:{category:'casino',special:{type:'background',id:'casino',name:'Kasynowe tło nicku'}},
 chips10k:{category:'casino'},cashgems5k:{category:'casino'},cashcoins20k:{category:'casino'},
 pet3:{category:'pets'},pets10:{category:'pets'},crate10:{category:'pets'},
 skins8:{category:'skins',special:{type:'frame',id:'collector',name:'Kolekcjonerska ramka'}},goldskin:{category:'skins'},
 worlds:{category:'secret'},goldrealm:{category:'secret'},developer:{category:'secret',special:{type:'frame',id:'developer',name:'Developer frame'}},
 level60:{category:'secret',special:{type:'pet',id:'overlord',name:'Ultimate Noob Pet'}},
 rebirth:{category:'secret'}
};
achievements.forEach(a=>Object.assign(a,{category:achievementMeta[a.id]?.category||'secret',special:achievementMeta[a.id]?.special||null}));

