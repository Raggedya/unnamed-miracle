// Optional, isolated reporting. No control flow waits for this module or its requests.
(async()=>{
 const config=await fetch('reporting.json',{cache:'no-store'}).then(r=>r.json());
 if(!config.enabled||!['local-test','live'].includes(config.environment))return;
 const endpoint=new URL(config.endpoint,location.href);if(endpoint.origin!==location.origin)return;
 const machine=document.querySelector('.music-machine'),player=document.querySelector('[data-youtube-player]');
 const send=(kind,detail={},id=crypto.randomUUID())=>{
  const body=JSON.stringify({release:config.release,eventId:id,kind,...detail});
  // Retry the same event ID, never a new count. Bound retries and request time.
  const attempt=async n=>{try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit',signal:AbortSignal.timeout(4000)});if(r.status>=500)throw Error();}catch{if(n<2)setTimeout(()=>void attempt(n+1),1000*(n+1));}};
  setTimeout(()=>void attempt(0),0);
 };
 // Store only one random visit event ID per machine/tab. No visitor identity sent.
 try{const key='um-visit:'+config.environment+':'+config.machine;let id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id);}send('visit',{},id);}catch{/* Cannot reliably deduplicate visits without tab storage; omit rather than inflate. */}
 machine.addEventListener('unnamed:spin-complete',e=>send('spin',{videoId:e.detail.videoId}));
 const actions=await fetch('actions.json').then(r=>r.json());const byId=new Map(actions.map(a=>[a.id,a]));
 // Bubble after the carousel's capture-stage swipe cancellation and clone routing.
 document.querySelector('#left-controls').addEventListener('click',e=>{
  const tile=e.target.closest('[data-reporting-button]');if(!tile||tile.disabled||e.defaultPrevented)return;
  const a=byId.get(tile.dataset.reportingButton);if(!a)return;
  const video=machine.dataset.revealedVideoId;
  const destination=a.url||(['play','youtube'].includes(a.action)&&video?'https://www.youtube.com/watch?v='+video:'action:'+a.action);
  send('button',{buttonId:a.id,destination});
 });
 let load=null,timer;
 const subscribe=()=>{
  if(!load)return;
  try{player.contentWindow.postMessage(JSON.stringify({event:'listening',id:'um-reporting'}),'https://www.youtube.com');player.contentWindow.postMessage(JSON.stringify({event:'command',func:'addEventListener',args:['onStateChange']}),'https://www.youtube.com');}catch{}
 };
 const reset=()=>{
  clearInterval(timer);load=null;
  try{const u=new URL(player.src);if(u.origin!=='https://www.youtube.com'||!u.pathname.startsWith('/embed/'))return;load={videoId:u.pathname.split('/').pop(),id:crypto.randomUUID(),started:false};subscribe();timer=setInterval(subscribe,1000);setTimeout(()=>clearInterval(timer),15000);}catch{}
 };
 new MutationObserver(()=>{load=null;clearInterval(timer);}).observe(player,{attributes:true,attributeFilter:['src']});player.addEventListener('load',reset);reset();
 window.addEventListener('message',e=>{
  if(e.origin!=='https://www.youtube.com'||e.source!==player.contentWindow||!load||load.started)return;
  try{const d=typeof e.data==='string'?JSON.parse(e.data):e.data;const state=d.event==='onStateChange'?d.info:d.event==='infoDelivery'?d.info?.playerState:null;
   if(state===1){load.started=true;clearInterval(timer);send('video',{videoId:load.videoId},load.id);}
  }catch{}
 });
})().catch(()=>{});
