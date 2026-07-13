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
 leaderboard:[],medals:0,aimBest:0,parkourBest:0,memoryBest:0,ownedSkins:['classic'],activeSkin:'classic',goldCases:0,casinoUnlocked:false,casinoGames:0,casinoWins:0,casinoProfit:0,lastSeen:Date.now(),worldBossesDefeated:[],lastEndgameBossAt:0,eventStats:{golden:0,rain:0,crates:0,minigames:0}
};
let state=Object.assign(structuredClone(defaults),JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'));

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


const GAME_VERSION='0.5a';

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
 {
  version:'0.5a',date:'Aktualna wersja',title:'Economy & Progression Update',
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
let selectedPatch='0.5a';
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
 {id:'petGem',icon:'💠',name:'Diamentowe pety',desc:'+3,5% diamentów z nagród za poziom i minigry',currency:'gems',permanent:true,base:24,growth:1.95,max:10,get:()=>state.petGemBonus||0,buy:()=>state.petGemBonus++},
 {id:'petCoin',icon:'🪙',name:'Monetowe pety',desc:'+4% Noob Coinów z minigier i nagród',currency:'gems',permanent:true,base:28,growth:2,max:10,get:()=>state.petCoinBonus||0,buy:()=>state.petCoinBonus++},
 {id:'coinBoost',icon:'🟡',name:'Noob Coin Booster',desc:'+15% Noob Coinów z minigier',currency:'gems',permanent:true,base:22,growth:2,max:10,get:()=>state.coinBoost||0,buy:()=>state.coinBoost++},
 {id:'offline',icon:'🌙',name:'Offline Noob',desc:'+10 minut naliczania offline na poziom',currency:'gems',permanent:true,base:18,growth:1.8,max:12,get:()=>state.offlineLevel||0,buy:()=>state.offlineLevel++},
 {id:'exp',icon:'📘',name:'Noob Akademia',desc:'+8% EXP ze wszystkich źródeł',currency:'gems',permanent:true,base:16,growth:1.75,max:20,get:()=>state.expBoost||0,buy:()=>state.expBoost++},
 {id:'comboExp',icon:'📈',name:'EXP za combo',desc:'Więcej EXP przy długich combo',currency:'gems',permanent:true,base:20,growth:1.82,max:15,get:()=>state.comboExp||0,buy:()=>state.comboExp++},
 {id:'worldExp',icon:'🌍',name:'Światowy trening',desc:'+4% EXP za każdy poziom ulepszenia',currency:'coins',permanent:true,base:18,growth:1.9,max:15,get:()=>state.worldExpBoost||0,buy:()=>state.worldExpBoost++},
 {id:'petExp',icon:'🎓',name:'Szkoła petów',desc:'+3,5% EXP za pety',currency:'gems',permanent:true,base:26,growth:1.9,max:12,get:()=>state.petExpBonus||0,buy:()=>state.petExpBonus++},
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
