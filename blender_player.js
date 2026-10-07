'use strict';
window.BatAnimation=(()=>{
  const $=id=>document.getElementById(id),video=$('fold-film');
  let chapters=[],step=0,actions=[],index=0,progress=0,mode='film',playing=false,raf=0,last=0;
  const active=()=>actions[index];
  const duration=()=>active()?active().end-active().start:3;
  function announce(){
    if(!active())return;
    const time=active().start+Math.min(duration()-1/24,progress*duration());
    window.batModelFrame={time,index:active().index,step,progress};
    window.dispatchEvent(new CustomEvent('bat-model-frame',{detail:window.batModelFrame}));
    $('fold-progress').value=Math.round(progress*1000);$('fold-percent').textContent=`${Math.round(progress*100)}%`;
    $('fold-progress').setAttribute('aria-valuetext',`${Math.round(progress*100)} percent through this action`);
  }
  function stop(){playing=false;cancelAnimationFrame(raf);video.pause();$('play-fold').textContent=progress>=1?'↺ Replay fold':'▶ Play fold';}
  function seek(){if(video.readyState>=1)video.currentTime=Math.min(video.duration-1/24,progress*duration());announce();}
  function tick(now){
    if(!playing)return;
    if(mode==='film')progress=Math.min(1,video.currentTime/duration());
    else if(last)progress=Math.min(1,progress+(now-last)/1000*Number($('film-speed').value)/duration());
    last=now;announce();if(progress>=1){stop();return;}raf=requestAnimationFrame(tick);
  }
  function selectAction(i){
    stop();index=i;progress=0;
    $('animation-instruction').textContent=active().title;
    $('action-tabs').replaceChildren(...actions.map((a,n)=>{const b=document.createElement('button');b.textContent=actions.length>1?`${n+1} · ${a.title}`:a.title;b.setAttribute('aria-pressed',String(n===i));b.onclick=()=>selectAction(n);return b;}));
    $('next-action').hidden=actions.length<2;$('next-action').disabled=i===actions.length-1;
    $('film-status').hidden=true;
    video.src=`media/fold-${String(active().index).padStart(2,'0')}.mp4?v=white-paper-1`;video.load();
    video.dataset.action=String(active().index);$('play-fold').textContent='▶ Play fold';announce();
  }
  function setStep(n){step=n;if(!chapters.length)return;actions=chapters.filter(a=>a.step===(step===0?10:step));selectAction(0);}
  function setMode(next){stop();mode=next;$('film-panel').hidden=mode!=='film';$('three-panel').hidden=mode!=='model';$('mode-film').setAttribute('aria-pressed',String(mode==='film'));$('mode-model').setAttribute('aria-pressed',String(mode==='model'));if(mode==='film')seek();window.dispatchEvent(new CustomEvent('bat-model-view',{detail:{visible:mode==='model'}}));announce();}
  $('mode-film').onclick=()=>setMode('film');$('mode-model').onclick=()=>setMode('model');
  $('play-fold').onclick=async()=>{
    if(playing){stop();return;}if(!active())return;
    if(progress>=.99){progress=0;seek();}
    playing=true;last=0;$('play-fold').textContent='Ⅱ Pause';
    if(mode==='film'){
      video.playbackRate=Number($('film-speed').value);
      try{await video.play();}catch{stop();$('film-status').textContent='Tap Play again when the clip has loaded, or choose Rotate model.';$('film-status').hidden=false;return;}
    }
    if(playing)raf=requestAnimationFrame(tick);
  };
  $('replay-fold').onclick=()=>{progress=0;stop();seek();};
  $('fold-progress').addEventListener('input',e=>{stop();progress=Number(e.target.value)/1000;seek();});
  $('film-speed').onchange=()=>{video.playbackRate=Number($('film-speed').value);};
  $('next-action').onclick=()=>{if(index+1<actions.length)selectAction(index+1);};
  video.addEventListener('loadedmetadata',()=>{seek();video.playbackRate=Number($('film-speed').value);});
  video.addEventListener('ended',()=>{progress=1;stop();announce();});
  video.addEventListener('error',()=>{$('film-status').textContent='The film could not load. Try Rotate model, or reload the page.';$('film-status').hidden=false;});
  $('watch-film').onclick=()=>{stop();$('full-film').preload='metadata';$('full-film').src='media/full-fold.mp4?v=white-paper-1';$('full-film').load();$('film-viewer').showModal();};
  $('close-film').onclick=()=>$('film-viewer').close();$('film-viewer').addEventListener('close',()=>$('full-film').pause());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  fetch('media/chapters.json').then(r=>{if(!r.ok)throw new Error('Chapter data unavailable');return r.json();}).then(data=>{chapters=data.actions;setStep(step);}).catch(()=>{$('animation-instruction').textContent='The animation could not load. Refresh to try again; the photo tutorial below is still available.';});
  return {setStep};
})();
