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

const TEXTURE_CACHE_VERSION='06ctextureloadfix';
function normalizeTextureUrl(path){
 if(!path)return '';
 const clean=String(path).replace(/^\.?\//,'');
 return new URL(clean,document.baseURI).href+`?v=${TEXTURE_CACHE_VERSION}`
}
function texturePath(map,id,fallback='default'){
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
window.PROFILE_FRAME_TEXTURES=PROFILE_FRAME_TEXTURES;
window.PROFILE_BACKGROUND_TEXTURES=PROFILE_BACKGROUND_TEXTURES;
window.SKIN_TEXTURES=SKIN_TEXTURES;
window.texturePath=texturePath;
window.textureStyleForProfile=textureStyleForProfile;
window.applyTextureVariables=applyTextureVariables;
document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(()=>applyTextureVariables()));
