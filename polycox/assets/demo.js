import {installControlCarousel} from './atelier-carousel.js';
import {makeArtistLinkGlyph} from './artist-link-icons.js';
import {icon} from './action-icons.js';
import './stationary-play.js?v=polly-brass-2';

const $=s=>document.querySelector(s), machine=$('.music-machine'), strip=$('#cta-strip');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController();
let transitionHold=false,holdTimer;
const supported=new Set(['play','spin-again','youtube']);
const tiles=[];
try {
 const response=await fetch('actions.json');
 if(!response.ok)throw new Error('Actions unavailable');
 for(const config of await response.json()){
  if(!config.label||(!supported.has(config.action)&&!/^https?:\/\//i.test(config.url||'')))continue;
  const tile=document.createElement(config.url?'a':'button');
  if(config.id)tile.dataset.reportingButton=config.id;
  if(config.url){tile.href=config.url;tile.target='_blank';tile.rel='noopener noreferrer';}
  else{tile.type='button';tile.disabled=true;tile.dataset.demoAction=config.action;}
  const glyph=makeArtistLinkGlyph(config.icon,'assets/chain-icons');
  if(['play','replay','share','heart'].includes(config.icon))icon(glyph,config.icon);
  const label=document.createElement('b');label.textContent=config.label;
  tile.append(glyph,label);tile.setAttribute('aria-label',config.label);strip.append(tile);
  tiles.push({tile,config});
 }
}catch(error){console.error(error);}
const carousel=installControlCarousel($('#left-controls'),strip,$('#cta-previous'),$('#cta-next'),reduced,abort.signal);
function sync(){
 const state=machine.dataset.machineState;
 const busy=transitionHold||['BOOT','LEVER_PULL','SPINNING','READY_TO_PLAY','OPENING_VIDEO'].includes(state);
 carousel.setLauncherActive(busy);
 for(const {tile,config} of tiles){
  if(config.url)continue;
  const source=$(`[data-action="${config.action}"]`);
  const disabled=config.action==='youtube'?!machine.dataset.revealedVideoId:!!source?.disabled;
  if(tile.disabled!==disabled)tile.disabled=disabled;
 }
}
// Capture close/return immediately, before the original 850 ms closing delay.
function hold(){transitionHold=true;carousel.setLauncherActive(true);clearTimeout(holdTimer);holdTimer=setTimeout(()=>{transitionHold=false;sync();},1000);}
strip.addEventListener('click',event=>{
 const tile=event.target.closest('[data-demo-action]');if(!tile)return;
 const action=tile.dataset.demoAction;
 if(action==='youtube'){
  const id=machine.dataset.revealedVideoId;
  if(id)window.open('https://www.youtube.com/watch?v='+encodeURIComponent(id),'_blank','noopener,noreferrer');
 }else{
  if(action==='spin-again')hold();
  $(`[data-action="${action}"]`).click();
 }
});
$('.lever').addEventListener('pointerdown',hold);
$('.lever').addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key))hold();});
new MutationObserver(sync).observe(machine,{attributes:true,attributeFilter:['data-machine-state','data-video-open','data-revealed-video-id']});
new MutationObserver(sync).observe($('.machine-controls'),{subtree:true,attributes:true,attributeFilter:['disabled']});
sync();
