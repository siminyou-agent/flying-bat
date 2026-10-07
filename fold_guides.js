'use strict';
window.BatGuides=(()=>{
  let data=null,pending=null,enabled=true;
  const ns='http://www.w3.org/2000/svg';
  function element(parent,tag,attrs){const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);parent.append(el);return el;}
  function path(parent,points,attrs){return element(parent,'path',{d:points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' '),fill:'none','stroke-linecap':'round','stroke-linejoin':'round',...attrs});}
  function load(){
    if(!pending)pending=fetch('media/fold-guides.json?v=crease-guides-1').then(r=>{if(!r.ok)throw new Error('Fold guides unavailable');return r.json();}).then(value=>{data=value;return value;});
    return pending;
  }
  function draw(svg,frame,project,width,height){
    svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.dataset.kind='none';
    if(!enabled||!data||!frame||!width||!height)return;
    const action=data.actions[frame.index];if(!action?.frames.length)return;
    const local=Math.max(0,Math.min(action.frames.length-1,Math.round((frame.time-action.start)*data.fps)));
    const guide=action.frames[local];
    const line=guide.crease.map(project),arrow=guide.arrow.map(project);
    if(line.length===2&&line.every(Boolean)){
      path(svg,line,{stroke:'#fffef5','stroke-width':7,'stroke-dasharray':'9 6'});
      path(svg,line,{stroke:'#cd2040','stroke-width':3.5,'stroke-dasharray':'9 6','data-guide':'crease'});
      for(const p of line){element(svg,'circle',{cx:p[0],cy:p[1],r:4,fill:'#fffef5'});element(svg,'circle',{cx:p[0],cy:p[1],r:2,fill:'#cd2040'});}
    }
    if(arrow.length>1&&arrow.every(Boolean)){
      const length=arrow.reduce((sum,p,i)=>i?sum+Math.hypot(p[0]-arrow[i-1][0],p[1]-arrow[i-1][1]):0,0);
      if(length>12){
        path(svg,arrow,{stroke:'#fffef5','stroke-width':6});path(svg,arrow,{stroke:'#1160ca','stroke-width':3,'data-guide':'direction'});
        const end=arrow.at(-1),tail=[...arrow].reverse().find(p=>Math.hypot(p[0]-end[0],p[1]-end[1])>4)||arrow[0];
        const distance=Math.max(.01,Math.hypot(end[0]-tail[0],end[1]-tail[1]));const dx=(end[0]-tail[0])/distance,dy=(end[1]-tail[1])/distance;
        for(const [size,color] of [[12,'#fffef5'],[9,'#1160ca']])element(svg,'polygon',{points:[end,[end[0]-dx*size-dy*size*.55,end[1]-dy*size+dx*size*.55],[end[0]-dx*size+dy*size*.55,end[1]-dy*size-dx*size*.55]].map(p=>p.join(',')).join(' '),fill:color});
      }
    }
    element(svg,'rect',{x:10,y:10,width:action.label.length*7.4+18,height:27,rx:6,fill:'#fffef5','fill-opacity':.96});
    const label=element(svg,'text',{x:19,y:28,fill:action.kind==='fold'?'#cd2040':'#1160ca','font-size':11,'font-family':'system-ui,sans-serif','font-weight':750});label.textContent=action.label;
    svg.dataset.kind=action.kind;svg.dataset.action=String(frame.index);
  }
  return {load,draw,get enabled(){return enabled;},setEnabled(value){enabled=Boolean(value);window.dispatchEvent(new Event('bat-guides-change'));}};
})();
