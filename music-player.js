(() => {
 const $=selector=>document.querySelector(selector);
 const audio=$('#music-audio'),panel=$('#music-panel'),toggle=$('#music-toggle');
 let tracks=[],index=0,mode='all',preferences={};
 try{preferences=JSON.parse(localStorage.getItem('mi-amour-music')||'{}')||{};}catch{}
 const save=()=>{try{localStorage.setItem('mi-amour-music',JSON.stringify({src:tracks[index]?.src,volume:audio.volume,mode}));}catch{}};
 const time=value=>Number.isFinite(value)?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'0:00';
 const status=text=>{$('#music-status').textContent=text;};
 function syncPlayback(){
  const playing=!audio.paused;
  syncPlayButtons();
  status(playing?'NOW PLAYING · 正在播放':'轻点播放，陪你慢慢看');
  if('mediaSession' in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused';
 }
 async function play(){
  if(!tracks.length)return;
  status('正在打开音乐…');
  try{await audio.play();}catch(error){if(error.name!=='AbortError')status(error.name==='NotAllowedError'?'请再点一下播放按钮':'暂时无法播放，请重试或切换歌曲');syncPlayButtons();}
 }
 function syncPlayButtons(){
  document.querySelectorAll('[data-music-play]').forEach(button=>{
   button.textContent=audio.paused?'▶':'Ⅱ';button.setAttribute('aria-label',audio.paused?'播放音乐':'暂停音乐');button.setAttribute('aria-pressed',String(!audio.paused));
  });
  $('.music-shell').classList.toggle('is-playing',!audio.paused);
 }
 function selectTrack(next,autoplay=false){
  index=(next+tracks.length)%tracks.length;
  const track=tracks[index];
  audio.src=track.src;
  $('#music-title').textContent=track.title;
  $('#music-artist').textContent=track.artist;
  $('#music-track').value=String(index);
  $('#music-position').textContent=`${String(index+1).padStart(2,'0')} / ${tracks.length}`;
  $('#music-seek').value=0;$('#music-seek').disabled=true;
  $('#music-elapsed').textContent=$('#music-duration').textContent='0:00';
  syncPlayback();save();
  if('mediaSession' in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:track.artist,album:'mi amour · 私藏歌单'});
  if(autoplay)play();
 }
 const step=direction=>{if(tracks.length)selectTrack(index+direction,true);};
 document.querySelectorAll('[data-music-play]').forEach(button=>button.addEventListener('click',()=>audio.paused?play():audio.pause()));
 document.querySelectorAll('[data-music-step]').forEach(button=>button.addEventListener('click',()=>step(Number(button.dataset.musicStep))));
 toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));});
 document.addEventListener('click',event=>{if(!event.target.closest('.music-shell')){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}});
 $('#music-track').addEventListener('change',event=>selectTrack(Number(event.target.value),true));
 $('#music-mode').addEventListener('click',()=>{mode=mode==='all'?'one':'all';updateMode();save();});
 function updateMode(){audio.loop=mode==='one';$('#music-mode').textContent=mode==='one'?'↻ 单曲循环':'↻ 列表循环';$('#music-mode').setAttribute('aria-pressed',String(mode==='one'));}
 $('#music-volume').addEventListener('input',event=>{audio.volume=Number(event.target.value);$('#music-volume-value').textContent=`${Math.round(audio.volume*100)}%`;save();});
 $('#music-seek').addEventListener('input',event=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(event.target.value);});
 audio.addEventListener('loadedmetadata',()=>{
  const duration=audio.duration;$('#music-duration').textContent=time(duration);
  $('#music-seek').max=Number.isFinite(duration)?duration:0;$('#music-seek').disabled=!Number.isFinite(duration)||duration<=0;
 });
 audio.addEventListener('timeupdate',()=>{$('#music-elapsed').textContent=time(audio.currentTime);$('#music-seek').value=audio.currentTime;$('#music-seek').setAttribute('aria-valuetext',`${time(audio.currentTime)} / ${time(audio.duration)}`);});
 audio.addEventListener('playing',syncPlayback);audio.addEventListener('pause',syncPlayback);
 audio.addEventListener('waiting',()=>status('正在缓冲…'));
 audio.addEventListener('error',()=>{syncPlayButtons();status('这首歌暂时无法加载，请重试或切换歌曲');});
 audio.addEventListener('ended',()=>{if(mode==='all')step(1);});
 if('mediaSession' in navigator){
  for(const [action,handler] of Object.entries({play,pause:()=>audio.pause(),previoustrack:()=>step(-1),nexttrack:()=>step(1),seekto:details=>{if(Number.isFinite(details.seekTime))audio.currentTime=details.seekTime;}})){
   try{navigator.mediaSession.setActionHandler(action,handler);}catch{}
  }
 }
 async function initMusic(){
  try{
   const response=await fetch('music/playlist.json?v=music-2');if(!response.ok)throw new Error('playlist');
   tracks=await response.json();if(!tracks.length)throw new Error('empty');
   $('#music-track').replaceChildren(...tracks.map((track,i)=>new Option(`${String(i+1).padStart(2,'0')} · ${track.title}`,String(i))));
   mode=preferences.mode==='one'?'one':'all';updateMode();
   audio.volume=Number.isFinite(preferences.volume)?Math.max(0,Math.min(1,preferences.volume)):.65;
   $('#music-volume').value=audio.volume;$('#music-volume-value').textContent=`${Math.round(audio.volume*100)}%`;
   document.querySelectorAll('[data-music-play],[data-music-step],#music-track,#music-mode').forEach(button=>button.disabled=false);
   selectTrack(Math.max(0,tracks.findIndex(track=>track.src===preferences.src)));
  }catch{status('歌单暂未加载，请刷新重试');$('#music-title').textContent='私藏歌单';}
 }
 initMusic();
})();
