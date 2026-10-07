import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const $=id=>document.getElementById(id);
const host=$('three-viewport');
let renderer,controls,scene,camera,paper,key='',objects=[],crease,mode='3d',ready=false;
const point=(p,z=0)=>new THREE.Vector3((p[0]-300)/100,(215-p[1])/100,z);
const cameraViews={angle:[3,2.7,6],front:[0,0,7.2],side:[7,.2,.6],back:[0,0,-7.2]};

function showMode(next){
  mode=next;$('three-panel').hidden=next!=='3d';$('two-panel').hidden=next!=='2d';
  $('mode-3d').setAttribute('aria-pressed',String(next==='3d'));
  $('mode-2d').setAttribute('aria-pressed',String(next==='2d'));
  if(ready&&next==='3d'){resize();renderFrame(window.batFoldFrame);}
}
$('mode-3d').onclick=()=>showMode('3d');$('mode-2d').onclick=()=>showMode('2d');

function render(){if(ready&&mode==='3d')renderer.render(scene,camera);}
function resize(){if(!ready||!host.clientWidth)return;const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
function setCamera(name){
  camera.position.set(...cameraViews[name]);camera.up.set(0,1,0);controls.target.set(0,-.15,0);controls.update();
  document.querySelectorAll('button[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===name)));render();
}
function disposePaper(){
  const geometries=new Set(),materials=new Set();paper.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());paper.clear();objects=[];crease=null;
}
function makeFace(coords,color,layer,moving=null){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords.flatMap(p=>[...point(p).toArray()]),3));
  const contour=coords.map(p=>new THREE.Vector2(p[0],-p[1]));
  const tris=THREE.ShapeUtils.triangulateShape(contour,[]);
  geometry.setIndex(tris.flat());geometry.computeVertexNormals();
  // Each paper face has a colored front and a paler reverse, both lit in 3D.
  const front=new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0,side:THREE.FrontSide});
  const back=new THREE.MeshStandardMaterial({color:new THREE.Color(color).lerp(new THREE.Color('#eff1d0'),.28),roughness:.9,side:THREE.BackSide});
  const group=new THREE.Group();group.add(new THREE.Mesh(geometry,front),new THREE.Mesh(geometry,back));
  const edgeGeometry=new THREE.BufferGeometry();edgeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(coords.flatMap(p=>point(p).toArray()),3));
  const edge=new THREE.LineLoop(edgeGeometry,new THREE.LineBasicMaterial({color:'#254f43',transparent:true,opacity:.75}));group.add(edge);paper.add(group);
  const obj={coords,geometry,edgeGeometry,group,layer,moving};objects.push(obj);return obj;
}
function hingeFor(f,a){
  const fixed=f.from.map((p,i)=>({p,i})).filter(({p,i})=>Math.hypot(p[0]-f.to[i][0],p[1]-f.to[i][1])<.01);
  const ends=a.crease||(fixed.length>=2?[fixed[0].p,fixed[fixed.length-1].p]:[f.from[0],f.from[f.from.length-1]]);
  const origin=point(ends[0]),axis=point(ends[1]).sub(origin).normalize();
  const coords=a.openWings?f.to:f.from;
  let maxCross=0;
  coords.forEach(p=>{const cross=new THREE.Vector3().crossVectors(axis,point(p).sub(origin)).z;if(Math.abs(cross)>Math.abs(maxCross))maxCross=cross;});
  return {origin,axis,sign:maxCross>=0?1:-1,openWings:!!a.openWings};
}
function build(a){
  disposePaper();
  a.base.forEach((f,i)=>makeFace(f.points,f.color,i));
  a.moving.forEach((f,i)=>makeFace(a.openWings?f.to:f.from,'#eac56e',a.base.length+i,hingeFor(f,a)));
  if(a.crease){
    const geometry=new THREE.BufferGeometry().setFromPoints(a.crease.map(p=>point(p,.035)));
    crease=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:'#fffbed',dashSize:.09,gapSize:.065,depthTest:false}));crease.computeLineDistances();crease.renderOrder=5;paper.add(crease);
  }
}
function renderFrame(frame){
  if(!ready||!frame)return;
  const {action:a,progress:t}=frame;
  if(frame.key!==key){key=frame.key;build(a);}
  const spacing=.012+Number($('layer-spacing').value)/100*.25;
  paper.rotation.set(0,a.flip?Math.PI*t:0,0);paper.position.set(0,0,0);
  if(a.fly){paper.position.set(Math.sin(t*Math.PI*2)*.5,Math.sin(t*Math.PI)*.55,0);paper.rotation.z=Math.sin(t*Math.PI*2)*.12;}
  objects.forEach(o=>{
    const pos=o.geometry.getAttribute('position'),edges=o.edgeGeometry.getAttribute('position');
    o.coords.forEach((p,i)=>{
      const v=point(p);
      if(o.moving){const h=o.moving,angle=h.sign*(h.openWings?(1-t)*Math.PI/2:t*Math.PI);v.sub(h.origin).applyAxisAngle(h.axis,angle).add(h.origin);}
      v.z+=o.layer*spacing;pos.setXYZ(i,v.x,v.y,v.z);edges.setXYZ(i,v.x,v.y,v.z);
    });
    pos.needsUpdate=true;edges.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();o.edgeGeometry.computeBoundingSphere();
  });
  if(crease)crease.position.z=(a.base.length+1)*spacing;
  // Read-only diagnostics allow browser checks to verify real 3D geometry and camera changes.
  host.dataset.depth=String(Math.max(0,...objects.flatMap(o=>Array.from(o.geometry.attributes.position.array).filter((_,i)=>i%3===2))));
  host.dataset.frame=`${frame.key}:${t.toFixed(3)}`;
  render();
}
try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label','3D folded paper. Drag to rotate, pinch or scroll to zoom. Camera preset buttons are available above.');
  renderer.domElement.setAttribute('role','img');renderer.domElement.tabIndex=0;
  host.append(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,1,.1,100);
  scene.add(new THREE.HemisphereLight('#ffffff','#c4d3bd',2.7));
  const sun=new THREE.DirectionalLight('#fff7df',2.4);sun.position.set(-3,5,6);scene.add(sun);
  const fill=new THREE.DirectionalLight('#dceef7',1.7);fill.position.set(2,-2,-5);scene.add(fill);
  paper=new THREE.Group();scene.add(paper);
  controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=3.2;controls.maxDistance=12;controls.enableDamping=false;controls.rotateSpeed=.7;controls.zoomSpeed=.8;controls.panSpeed=.6;
  controls.addEventListener('change',()=>{host.dataset.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');render();});
  controls.addEventListener('start',()=>document.querySelectorAll('button[data-camera]').forEach(b=>b.setAttribute('aria-pressed','false')));
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('three-status').textContent='3D graphics paused. Refresh to restore them, or use the 2D view.';$('three-status').hidden=false;showMode('2d');});
  renderer.domElement.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();e.stopPropagation();
    const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
    if(e.key==='ArrowLeft')spherical.theta-=.15;if(e.key==='ArrowRight')spherical.theta+=.15;if(e.key==='ArrowUp')spherical.phi-=.15;if(e.key==='ArrowDown')spherical.phi+=.15;
    if(e.key==='+')spherical.radius=Math.max(3.2,spherical.radius*.9);if(e.key==='-')spherical.radius=Math.min(12,spherical.radius*1.1);
    spherical.makeSafe();camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();render();
  });
  ready=true;$('three-status').hidden=true;host.dataset.ready='true';setCamera('angle');resize();
  new ResizeObserver(resize).observe(host);
  document.querySelectorAll('button[data-camera]').forEach(b=>b.onclick=()=>setCamera(b.dataset.camera));$('reset-camera').onclick=()=>setCamera('angle');
  $('layer-spacing').addEventListener('input',()=>renderFrame(window.batFoldFrame));
  window.addEventListener('bat-fold-frame',e=>renderFrame(e.detail));renderFrame(window.batFoldFrame);
}catch(error){
  $('three-status').textContent='3D is unavailable in this browser. The 2D animated guide is still available.';
  $('mode-3d').disabled=true;showMode('2d');
  const note=document.createElement('p');note.className='schematic-note';note.textContent=$('three-status').textContent;$('two-panel').before(note);
}
