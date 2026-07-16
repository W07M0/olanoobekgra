const PROFILE_FRAME_TEXTURES={
  "default":"assets/textures/frames/default.png",
  "arcade":"assets/textures/frames/arcade.png",
  "collector":"assets/textures/frames/collector.png",
  "developer":"assets/textures/frames/developer.png"
};
const PROFILE_BACKGROUND_TEXTURES={
  "default":"assets/textures/backgrounds/default.png",
  "wealth":"assets/textures/backgrounds/wealth.png",
  "casino":"assets/textures/backgrounds/casino.png",
  "reflex":"assets/textures/backgrounds/reflex.png"
};
const SKIN_TEXTURES={
  "banana":"assets/textures/skins/banana.png",
  "classic":"assets/textures/skins/classic.png",
  "cyber":"assets/textures/skins/cyber.png",
  "dev":"assets/textures/skins/dev.png",
  "glitch":"assets/textures/skins/glitch.png",
  "gold":"assets/textures/skins/gold.png",
  "ice":"assets/textures/skins/ice.png",
  "lava":"assets/textures/skins/lava.png",
  "matrix":"assets/textures/skins/matrix.png",
  "rainbow":"assets/textures/skins/rainbow.png",
  "toxic":"assets/textures/skins/toxic.png",
  "void":"assets/textures/skins/void.png"
};

const TEXTURE_CACHE_VERSION='06ctexturebasefix';
const TEXTURE_SCRIPT_URL=document.currentScript?.src||new URL('js/textures.js',document.baseURI).href;
const TEXTURE_ROOT_URL=new URL('../',TEXTURE_SCRIPT_URL);
function normalizeTextureUrl(path){
 if(!path)return '';
 const clean=String(path).replace(/^\.?\//,'');
 return new URL(clean,TEXTURE_ROOT_URL).href+`?v=${TEXTURE_CACHE_VERSION}`
}

function resolveTextureId(map,id,fallback){
 const raw=String(id||'').trim();
 if(map[raw])return raw;
 const lower=raw.toLowerCase();
 const key=Object.keys(map).find(item=>item.toLowerCase()===lower);
 return key||fallback
}

function texturePath(map,id,fallback='default'){id=resolveTextureId(map,id,fallback);
 return normalizeTextureUrl(map[id]||map[fallback]||'')
}
function applyTextureVariables(){
 const source=window.state||{};
 const frame=source.profileFrame||'default';
 const background=source.profileBackground||'default';
 const skin=source.activeSkin||'classic';
 const root=document.documentElement;
 const f=texturePath(PROFILE_FRAME_TEXTURES,frame);
 const b=texturePath(PROFILE_BACKGROUND_TEXTURES,background);
 const s=texturePath(SKIN_TEXTURES,skin,'classic');
 root.style.setProperty('--profile-frame-texture',f?`url("${f}")`:'none');
 root.style.setProperty('--profile-background-texture',b?`url("${b}")`:'none');
 root.style.setProperty('--skin-texture',s?`url("${s}")`:'none');
}
function textureStyleForProfile(frame='default',background='default'){
 const f=texturePath(PROFILE_FRAME_TEXTURES,frame);
 const b=texturePath(PROFILE_BACKGROUND_TEXTURES,background);
 return `--row-frame-texture:${f?`url("${f}")`:'none'};--row-background-texture:${b?`url("${b}")`:'none'}`
}

function applyProfileTextureToElement(element,frame='default',background='default'){
 if(!element)return;

 const safeFrame=frame||'default';
 const safeBackground=background||'default';

 const frameUrl=texturePath(PROFILE_FRAME_TEXTURES,safeFrame,'default');
 const backgroundUrl=texturePath(PROFILE_BACKGROUND_TEXTURES,safeBackground,'default');

 element.style.setProperty(
  '--profile-row-frame',
  frameUrl?`url("${frameUrl}")`:'none'
 );
 element.style.setProperty(
  '--profile-row-background',
  backgroundUrl?`url("${backgroundUrl}")`:'none'
 );

 element.dataset.frame=safeFrame;
 element.dataset.background=safeBackground
}


function findMainClickerElement(){
 return document.querySelector(
  '#noobButton,#clicker,#mainClicker,#clickButton,.noob-button,.click-button,.main-click-button,[data-main-clicker]'
 )
}

function applySkinTextureToElement(element,skin='classic'){
 if(!element)return;
 const safeSkin=resolveTextureId(SKIN_TEXTURES,skin,'classic');
 const skinUrl=texturePath(SKIN_TEXTURES,safeSkin,'classic');

 element.style.setProperty('--skin-texture',skinUrl?`url("${skinUrl}")`:'none');
 element.style.backgroundImage=skinUrl?`url("${skinUrl}")`:'';
 element.style.backgroundSize='cover';
 element.style.backgroundPosition='center';
 element.style.backgroundRepeat='no-repeat';
 element.dataset.skinTexture=safeSkin
}

function refreshVisibleTextures(){
 const source=window.state||{};

 applyTextureVariables();

 applyProfileTextureToElement(
  document.querySelector('#profileStylePreview'),
  source.profileFrame||'default',
  source.profileBackground||'default'
 );

 document.querySelectorAll('.board-row,.leaderboard-row,.mini-profile-row').forEach(row=>{
  applyProfileTextureToElement(
   row,
   row.getAttribute('data-frame')||'default',
   row.getAttribute('data-background')||'default'
  )
 });

 document.querySelectorAll('[data-profile-frame]').forEach(button=>{
  const id=button.dataset.profileFrame||'default';
  const mini=button.querySelector('.profile-style-mini');
  if(!mini)return;
  const url=texturePath(PROFILE_FRAME_TEXTURES,id,'default');
  mini.style.backgroundImage=url?`url("${url}")`:'none'
 });

 document.querySelectorAll('[data-profile-background]').forEach(button=>{
  const id=button.dataset.profileBackground||'default';
  const mini=button.querySelector('.profile-style-mini');
  if(!mini)return;
  const url=texturePath(PROFILE_BACKGROUND_TEXTURES,id,'default');
  mini.style.backgroundImage=url?`url("${url}")`:'none'
 });

 const clicker=findMainClickerElement();
 applySkinTextureToElement(clicker,source.activeSkin||'classic')

 applyProfileStyleOptionTextures();
}


function applyProfileStyleOptionTextures(){
 document.querySelectorAll('[data-profile-frame]').forEach(button=>{
  const preview=button.querySelector('.profile-style-mini');
  if(!preview)return;
  const frameId=button.dataset.profileFrame||'default';
  const bgId=window.state?.profileBackground||'default';
  const frameUrl=texturePath(PROFILE_FRAME_TEXTURES,frameId,'default');
  const bgUrl=texturePath(PROFILE_BACKGROUND_TEXTURES,bgId,'default');
  preview.style.setProperty('--preview-frame-texture',frameUrl?`url("${frameUrl}")`:'none');
  preview.style.setProperty('--preview-background-texture',bgUrl?`url("${bgUrl}")`:'none')
 });

 document.querySelectorAll('[data-profile-background]').forEach(button=>{
  const preview=button.querySelector('.profile-style-mini');
  if(!preview)return;
  const frameId=window.state?.profileFrame||'default';
  const bgId=button.dataset.profileBackground||'default';
  const frameUrl=texturePath(PROFILE_FRAME_TEXTURES,frameId,'default');
  const bgUrl=texturePath(PROFILE_BACKGROUND_TEXTURES,bgId,'default');
  preview.style.setProperty('--preview-frame-texture',frameUrl?`url("${frameUrl}")`:'none');
  preview.style.setProperty('--preview-background-texture',bgUrl?`url("${bgUrl}")`:'none')
 })
}


function refreshActiveSkinTexture(){
 const source=window.state||{};
 const clicker=findMainClickerElement();
 applySkinTextureToElement(clicker,source.activeSkin||'classic')
}

window.PROFILE_FRAME_TEXTURES=PROFILE_FRAME_TEXTURES;
window.PROFILE_BACKGROUND_TEXTURES=PROFILE_BACKGROUND_TEXTURES;
window.SKIN_TEXTURES=SKIN_TEXTURES;
window.TEXTURE_ROOT_URL=TEXTURE_ROOT_URL;
window.texturePath=texturePath;
window.textureStyleForProfile=textureStyleForProfile;
window.applyTextureVariables=applyTextureVariables;
window.applyProfileTextureToElement=applyProfileTextureToElement;
window.applySkinTextureToElement=applySkinTextureToElement;
window.findMainClickerElement=findMainClickerElement;
window.refreshActiveSkinTexture=refreshActiveSkinTexture;
window.refreshVisibleTextures=refreshVisibleTextures;
window.applyProfileStyleOptionTextures=applyProfileStyleOptionTextures;
document.addEventListener('DOMContentLoaded',()=>{
 requestAnimationFrame(()=>refreshVisibleTextures())
});
