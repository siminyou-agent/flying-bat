'use strict';
// Schematic motion studies, not a physical origami solver. Photographs remain
// the reference for exact proportions and layer placement.
window.BatAnimation = (() => {
  const ns='http://www.w3.org/2000/svg';
  const colors={paper:'#527f72',back:'#a4c6ac',moving:'#eac56e',edge:'#254f43'};
  const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const face=(points,color=colors.paper)=>({points,color});
  const flap=(from,to)=>({from,to});
  const center=rect(200,65,200,290);
  const flared=[[200,65],[400,65],[470,320],[400,355],[200,355],[130,320]];
  const roof=[[300,65],[400,155],[470,320],[400,355],[200,355],[130,320],[200,155]];
  const body=[[200,185],[400,185],[470,285],[400,340],[200,340],[130,285]];
  const shoulders=[[235,185],[365,185],[470,285],[400,340],[200,340],[130,285]];
  const bat=[[300,285],[245,250],[130,205],[180,145],[240,170],[300,195],[360,170],[420,145],[470,205],[355,250]];
  const triangleDown=[[200,185],[400,185],[300,330]];
  const triangleUp=[[200,235],[400,235],[300,115]];
  const half=[[300,180],[355,150],[445,260],[400,355],[300,355]];
  const action=(label,instruction,base,moving=[],crease=null,extra={})=>({label,instruction,base,moving,crease,...extra});
  const scenes=[
    [action('Meet your bat','Move the slider to give your finished bat a gentle test glide.',[face(bat),face([[300,195],[320,240],[300,285],[280,240]],colors.back)],[],null,{fly:true})],
    [action('1 · Fold in half','Bring the left edge across to the right edge. The dashed line stays still.',[face(rect(300,75,200,280))],[flap(rect(100,75,200,280),[[500,75],[300,75],[300,355],[500,355]])],[[300,75],[300,355]]),
     action('2 · Open again','Open the folded half back out. Keep the center crease.',[face(rect(300,75,200,280))],[flap([[500,75],[300,75],[300,355],[500,355]],rect(100,75,200,280))],[[300,75],[300,355]])],
    [action('1 · Left edge in','Bring the left edge to the center line.',[face(rect(200,65,300,290))],[flap(rect(100,65,100,290),[[300,65],[200,65],[200,355],[300,355]])],[[200,65],[200,355]],{centerLine:true}),
     action('2 · Right edge in','Bring the right edge to meet the left flap at the center.',[face(center),face(rect(200,65,100,290),colors.back)],[flap(rect(400,65,100,290),[[400,65],[300,65],[300,355],[400,355]])],[[400,65],[400,355]],{centerLine:true})],
    [action('1 · Flare right','Swing the lower part of the right flap outward; the top stays near the middle.',[face(center)],[flap([[300,65],[400,355],[300,355]],[[300,65],[400,355],[470,305]])],[[300,65],[400,355]]),
     action('2 · Flare left','Mirror the same diagonal fold on the left.',[face(center),face([[300,65],[400,355],[470,305]],colors.back)],[flap([[300,65],[200,355],[300,355]],[[300,65],[200,355],[130,305]])],[[300,65],[200,355]])],
    [action('1 · Right corner','Fold the top-right corner diagonally down toward the middle.',[face(roof),face([[200,65],[300,65],[200,165]])],[flap([[300,65],[400,65],[400,165]],[[300,65],[300,165],[400,165]])],[[300,65],[400,165]]),
     action('2 · Left corner','Match it on the left to form the pointed top.',[face(roof),face([[300,65],[300,165],[400,165]],colors.back)],[flap([[200,65],[300,65],[200,165]],[[300,165],[300,65],[200,165]])],[[300,65],[200,165]])],
    [action('1 · Turn over','Turn the entire paper over. Keep the point at the top.',[face(roof),face([[200,155],[300,65],[400,155]],colors.back)],[],null,{flip:true,reverse:[face(roof)]}),
     action('2 · Point down','Lower the top point to the bottom edge around the horizontal crease.',[face(body)],[flap([[200,185],[400,185],[300,40]],triangleDown)],[[200,185],[400,185]])],
    [action('1 · Small right corner','Fold only the small upper-right corner down; leave the big flap in place.',[face(body),face(triangleDown,colors.back)],[flap([[365,185],[400,185],[425,220]],[[365,185],[365,220],[425,220]])],[[365,185],[425,220]]),
     action('2 · Small left corner','Make the matching small corner fold on the left.',[face(shoulders),face(triangleDown,colors.back)],[flap([[235,185],[200,185],[175,220]],[[235,185],[235,220],[175,220]])],[[235,185],[175,220]])],
    [action('1 · Point up','Lift the downward-pointing flap up over the small corner folds.',[face(shoulders)],[flap([[200,235],[400,235],[300,355]],triangleUp)],[[200,235],[400,235]]),
     action('2 · Turn over','Turn the entire model over. The little point remains at the top.',[face(shoulders),face(triangleUp,colors.back)],[],null,{flip:true,reverse:[face(triangleUp,colors.back),face(shoulders)]})],
    [action('1 · Little point down','Fold the small exposed triangle down over the top edge.',[face(shoulders)],[flap([[255,185],[345,185],[300,125]],[[255,185],[345,185],[300,245]])],[[255,185],[345,185]]),
     action('2 · Close in half','Bring the left wing to the right along the original center line.',[face([[300,185],[365,185],[470,285],[400,340],[300,340]])],[flap([[300,185],[235,185],[130,285],[200,340],[300,340]],[[300,185],[365,185],[470,285],[400,340],[300,340]])],[[300,185],[300,340]])],
    [action('1 · First wing','Fold one wing down while leaving a narrow strip of body to hold.',[face(half)],[flap([[320,210],[355,150],[445,260],[400,335],[320,335]],[[320,210],[275,185],[170,265],[210,335],[320,335]])],[[320,210],[320,335]]),
     action('2 · Turn over','Turn the model over to reach the second wing.',[face(half),face([[320,210],[275,185],[170,265],[210,335],[320,335]],colors.back)],[],null,{flip:true,reverse:[face([[320,210],[275,185],[170,265],[210,335],[320,335]],colors.back),face(half)]}),
     action('3 · Other wing','Repeat the same wing fold on the other side.',[face(half),face([[320,210],[275,185],[170,265],[210,335],[320,335]],colors.back)],[flap([[320,210],[355,150],[445,260],[400,335],[320,335]],[[320,210],[275,185],[170,265],[210,335],[320,335]])],[[320,210],[320,335]]),
     action('4 · Open wings','Gently spread both wings into a balanced flying position.',[face([[290,195],[310,195],[310,320],[290,320]])],[flap([[290,195],[270,150],[255,205],[270,300],[290,320]],[[290,195],[180,145],[130,205],[245,290],[290,320]]),flap([[310,195],[330,150],[345,205],[330,300],[310,320]],[[310,195],[420,145],[470,205],[355,290],[310,320]])],null,{openWings:true})],
    [action('Gentle glide','Hold the center body and toss gently forward. Balanced wings make the difference.',[face(bat),face([[300,195],[320,240],[300,285],[280,240]],colors.back)],[],null,{fly:true})]
  ];
  let step=0,index=0,progress=0,playing=false,frame=0,last=0;
  const $=id=>document.getElementById(id);
  function svg(tag,attrs,parent){const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));parent.append(el);return el;}
  function polygon(points,color,parent){svg('polygon',{points:points.map(p=>p.join(',')).join(' '),fill:color,stroke:colors.edge,'stroke-width':1.6,'stroke-linejoin':'round'},parent);}
  function draw(){
    const a=scenes[step][index],paper=$('paper-scene'),guides=$('fold-guides');paper.replaceChildren();guides.replaceChildren();
    paper.removeAttribute('transform');
    const t=progress;let base=a.base;
    if(a.flip){const scale=Math.cos(t*Math.PI);paper.setAttribute('transform',`translate(300 0) scale(${Math.abs(scale)<.012?.012:Math.abs(scale)} 1) translate(-300 0)`);if(t>.5)base=a.reverse;}
    if(a.fly){const x=Math.sin(t*Math.PI*2)*65,y=-Math.sin(t*Math.PI)*65;paper.setAttribute('transform',`translate(${x} ${y}) rotate(${-Math.sin(t*Math.PI*2)*8} 300 240)`);}
    base.forEach(f=>polygon(f.points,f.color,paper));
    a.moving.forEach(f=>{
      // Cosine projection keeps endpoints aligned; a small lift suggests depth.
      const mix=(1-Math.cos(t*Math.PI))/2;
      const pts=f.from.map((p,i)=>{const q=f.to[i],travel=Math.hypot(q[0]-p[0],q[1]-p[1]);return [p[0]+(q[0]-p[0])*mix,p[1]+(q[1]-p[1])*mix-Math.sin(t*Math.PI)*travel*.18];});
      polygon(pts,t>.5?'#d8b35e':colors.moving,paper);
    });
    if(a.centerLine)svg('line',{x1:300,y1:65,x2:300,y2:355,stroke:'#edf5e6','stroke-width':2,'stroke-dasharray':'5 5'},guides);
    if(a.crease){const [p,q]=a.crease;svg('line',{x1:p[0],y1:p[1],x2:q[0],y2:q[1],stroke:'#fff','stroke-width':4,'stroke-dasharray':'7 6'},guides);svg('line',{x1:p[0],y1:p[1],x2:q[0],y2:q[1],stroke:colors.edge,'stroke-width':1.6,'stroke-dasharray':'7 6'},guides);}
    if(a.moving.length&&t<.97){const f=a.moving[0];let best=0;f.from.forEach((p,i)=>{if(Math.hypot(p[0]-f.to[i][0],p[1]-f.to[i][1])>Math.hypot(f.from[best][0]-f.to[best][0],f.from[best][1]-f.to[best][1]))best=i;});const p=f.from[best],q=f.to[best];svg('path',{d:`M${p[0]} ${p[1]} Q${(p[0]+q[0])/2} ${Math.min(p[1],q[1])-65} ${q[0]} ${q[1]}`,fill:'none',stroke:'#b86d32','stroke-width':2.5,'stroke-dasharray':'5 5','marker-end':'url(#arrowhead)',opacity:.8},guides);}
    $('fold-progress').value=Math.round(t*1000);$('fold-percent').textContent=`${Math.round(t*100)}%`;
    $('fold-progress').setAttribute('aria-valuetext',`${Math.round(t*100)} percent folded`);
    window.batFoldFrame={action:a,progress:t,key:`${step}:${index}`};
    window.dispatchEvent(new CustomEvent('bat-fold-frame',{detail:window.batFoldFrame}));
  }
  function stop(){playing=false;cancelAnimationFrame(frame);$('play-fold').textContent=progress>=1?'↺ Replay fold':'▶ Play fold';}
  function tick(now){if(!playing)return;if(!last)last=now;progress=Math.min(1,progress+(now-last)/2600);last=now;draw();if(progress>=1){stop();return;}frame=requestAnimationFrame(tick);}
  function selectAction(i){stop();index=i;progress=0;const a=scenes[step][i];$('animation-instruction').textContent=a.instruction;$('diagram-title').textContent=a.label;$('diagram-desc').textContent=a.instruction+' Gold shows the moving paper. Dashed lines show the crease.';$('next-action').hidden=scenes[step].length<2;$('next-action').disabled=i===scenes[step].length-1;$('action-tabs').replaceChildren(...scenes[step].map((a,n)=>{const b=document.createElement('button');b.textContent=a.label;b.setAttribute('aria-pressed',String(i===n));b.onclick=()=>selectAction(n);return b;}));draw();$('play-fold').textContent='▶ Play fold';}
  $('play-fold').onclick=()=>{if(playing){stop();return;}if(progress>=1)progress=0;playing=true;last=0;$('play-fold').textContent='Ⅱ Pause';frame=requestAnimationFrame(tick);};
  $('replay-fold').onclick=()=>{progress=0;stop();draw();};
  $('fold-progress').addEventListener('input',e=>{stop();progress=Number(e.target.value)/1000;draw();});
  $('next-action').onclick=()=>{if(index+1<scenes[step].length)selectAction(index+1);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  return {setStep(n){step=n;selectAction(0);}};
})();
