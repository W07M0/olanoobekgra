
const MusicPlayer = (() => {
 const STORAGE_KEY='noob_music_player_v1';
 const state={
  index:0,
  volume:.35,
  playing:false,
  muted:false
 };

 let audio=null;
 let els={};

 function loadSaved(){
  try{
   const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
   if(Number.isFinite(saved.index))state.index=Math.max(0,saved.index);
   if(Number.isFinite(saved.volume))state.volume=Math.min(1,Math.max(0,saved.volume));
   state.muted=!!saved.muted
  }catch{}
 }

 function save(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify({
   index:state.index,
   volume:state.volume,
   muted:state.muted
  }))
 }

 function playlist(){
  return Array.isArray(window.MUSIC_PLAYLIST)?window.MUSIC_PLAYLIST:[]
 }

 function ensureAudio(){
  if(audio)return audio;
  audio=new Audio();
  audio.preload='metadata';
  audio.volume=state.volume;
  audio.muted=state.muted;

  audio.addEventListener('ended',next);
  audio.addEventListener('play',()=>{
   state.playing=true;
   render()
  });
  audio.addEventListener('pause',()=>{
   state.playing=false;
   render()
  });
  audio.addEventListener('error',()=>{
   setStatus('Nie udało się wczytać utworu');
   if(playlist().length>1)setTimeout(next,1200)
  });

  return audio
 }

 function current(){
  const list=playlist();
  if(!list.length)return null;
  if(state.index>=list.length)state.index=0;
  return list[state.index]
 }

 function setStatus(text){
  if(els.status)els.status.textContent=text
 }

 function loadTrack(autoplay=false){
  const track=current();
  const player=ensureAudio();

  if(!track){
   player.pause();
   player.removeAttribute('src');
   setStatus('Brak utworów w playliście');
   render();
   return
  }

  const file=String(track.file||'').trim();
  if(!file){
   setStatus('Utwór nie ma podanej ścieżki');
   return
  }

  const url=new URL(file,document.baseURI);
  const pageParams=new URLSearchParams(location.search);
  const cache=pageParams.get('musicv')||pageParams.get('v')||'06cmusicplayer';
  url.searchParams.set('v',cache);

  player.src=url.href;
  player.volume=state.volume;
  player.muted=state.muted;
  player.load();

  setStatus(track.title||file.split('/').pop());

  if(autoplay){
   player.play().catch(()=>{
    state.playing=false;
    render()
   })
  }

  save();
  render()
 }

 function playPause(){
  const player=ensureAudio();
  if(!playlist().length){
   setStatus('Dodaj utwory w js/music-playlist.js');
   return
  }
  if(!player.src)loadTrack(false);

  if(player.paused){
   player.play().catch(()=>{
    setStatus('Kliknij ponownie, aby uruchomić muzykę')
   })
  }else{
   player.pause()
  }
 }

 function next(){
  const list=playlist();
  if(!list.length)return;
  state.index=(state.index+1)%list.length;
  loadTrack(true)
 }

 function previous(){
  const list=playlist();
  if(!list.length)return;
  state.index=(state.index-1+list.length)%list.length;
  loadTrack(true)
 }

 function setVolume(value){
  state.volume=Math.min(1,Math.max(0,Number(value)||0));
  if(audio)audio.volume=state.volume;
  if(els.volumeValue)els.volumeValue.textContent=Math.round(state.volume*100)+'%';
  save()
 }

 function toggleMute(){
  state.muted=!state.muted;
  if(audio)audio.muted=state.muted;
  save();
  render()
 }

 function render(){
  const track=current();
  if(els.title)els.title.textContent=track?.title||'Brak utworów';
  if(els.counter)els.counter.textContent=playlist().length?`${state.index+1}/${playlist().length}`:'0/0';
  if(els.play)els.play.textContent=state.playing?'⏸':'▶';
  if(els.mute)els.mute.textContent=state.muted?'🔇':'🔊';
  if(els.volume)els.volume.value=String(state.volume);
  if(els.volumeValue)els.volumeValue.textContent=Math.round(state.volume*100)+'%'
 }

 function bind(){
  els={
   root:document.querySelector('#musicPlayer'),
   title:document.querySelector('#musicTrackTitle'),
   status:document.querySelector('#musicTrackStatus'),
   counter:document.querySelector('#musicTrackCounter'),
   play:document.querySelector('#musicPlayPause'),
   prev:document.querySelector('#musicPrevious'),
   next:document.querySelector('#musicNext'),
   mute:document.querySelector('#musicMute'),
   volume:document.querySelector('#musicVolume'),
   volumeValue:document.querySelector('#musicVolumeValue')
  };

  if(!els.root)return;

  els.play?.addEventListener('click',playPause);
  els.prev?.addEventListener('click',previous);
  els.next?.addEventListener('click',next);
  els.mute?.addEventListener('click',toggleMute);
  els.volume?.addEventListener('input',event=>setVolume(event.target.value));

  loadSaved();
  ensureAudio();
  render();

  if(playlist().length){
   state.index=Math.min(state.index,playlist().length-1);
   loadTrack(false)
  }else{
   setStatus('Dodaj MP3 do assets/music i wpisy do playlisty')
  }
 }

 return{
  bind,
  playPause,
  next,
  previous,
  setVolume,
  toggleMute,
  reloadPlaylist:()=>loadTrack(false)
 }
})();

window.MusicPlayer=MusicPlayer;
document.addEventListener('DOMContentLoaded',()=>MusicPlayer.bind());
