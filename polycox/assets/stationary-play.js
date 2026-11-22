// A synchronous user-press bridge to the existing player control. Never queues play.
const machine=document.querySelector('.music-machine'),frame=document.querySelector('[data-youtube-player]');
const group=document.createElement('div');group.className='stationary-play';
group.innerHTML='<button type="button" disabled aria-describedby="stationary-play-cue">▶ Play Video</button><small id="stationary-play-cue" role="status">Spin first to select a video</small>';
document.querySelector('.glass-controls').after(group);
const button=group.querySelector('button'),cue=group.querySelector('small');
let ready=false,failed=false,loadedSource='',timer;
function available(){return ready&&!failed&&loadedSource===frame.src&&machine.dataset.videoOpen==='true'&&['VIDEO_READY','PLAYING'].includes(machine.dataset.machineState);}
function sync(){
 button.disabled=!available();
 cue.textContent=available()?'':failed?'Video unavailable — spin again':!machine.dataset.revealedVideoId?'Spin first to select a video':['LEVER_PULL','SPINNING','READY_TO_PLAY'].includes(machine.dataset.machineState)?'Wait for the reel to settle':'Waiting for the video to be ready';
}
function subscribe(){
 if(!loadedSource.startsWith('https://www.youtube.com/embed/'))return;
 for(const message of [{event:'listening',id:'um-stationary-play'},{event:'command',func:'addEventListener',args:['onReady']},{event:'command',func:'addEventListener',args:['onError']}])frame.contentWindow?.postMessage(JSON.stringify(message),'https://www.youtube.com');
}
function reset(){ready=false;failed=false;loadedSource='';clearInterval(timer);sync();}
new MutationObserver(reset).observe(frame,{attributes:true,attributeFilter:['src']});
frame.addEventListener('load',()=>{reset();loadedSource=frame.src;subscribe();timer=setInterval(subscribe,500);setTimeout(()=>clearInterval(timer),20000);});
window.addEventListener('message',event=>{
 if(event.origin!=='https://www.youtube.com'||event.source!==frame.contentWindow||loadedSource!==frame.src||!loadedSource.startsWith('https://www.youtube.com/embed/'))return;
 try{const data=typeof event.data==='string'?JSON.parse(event.data):event.data;
  if(data.event==='onError'){failed=true;ready=false;clearInterval(timer);}
  else if(data.event==='onReady'||(data.event==='infoDelivery'&&typeof data.info?.playerState==='number')){ready=true;clearInterval(timer);}
  sync();
 }catch{}
});
new MutationObserver(sync).observe(machine,{attributes:true,attributeFilter:['data-machine-state','data-video-open','data-revealed-video-id']});
button.addEventListener('click',()=>{
 if(!available())return;
 // Existing handler immediately sends playVideo to the already-loaded iframe.
 // No src change, seek, timer, re-spin, or reporting event is introduced here.
 document.querySelector('[data-action="play"]').click();
});
sync();
