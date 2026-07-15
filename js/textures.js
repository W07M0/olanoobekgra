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

function texturePath(map,id,fallback='default'){return map[id]||map[fallback]||''}
function applyTextureVariables(){
 const frame=state?.profileFrame||'default';
 const background=state?.profileBackground||'default';
 const skin=state?.activeSkin||'classic';
 document.documentElement.style.setProperty('--profile-frame-texture',`url("${texturePath(PROFILE_FRAME_TEXTURES,frame)}")`);
 document.documentElement.style.setProperty('--profile-background-texture',`url("${texturePath(PROFILE_BACKGROUND_TEXTURES,background)}")`);
 document.documentElement.style.setProperty('--skin-texture',`url("${texturePath(SKIN_TEXTURES,skin,'classic')}")`);
}
window.PROFILE_FRAME_TEXTURES=PROFILE_FRAME_TEXTURES;
window.PROFILE_BACKGROUND_TEXTURES=PROFILE_BACKGROUND_TEXTURES;
window.SKIN_TEXTURES=SKIN_TEXTURES;
window.applyTextureVariables=applyTextureVariables;
