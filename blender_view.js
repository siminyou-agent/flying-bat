import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const $=id=>document.getElementById(id),host=$('three-viewport');
let loading=false,ready=false,visible=false,renderer,scene,camera,controls,mixer,model;
const views={angle:[3.4,5.3,5.4],top:[0,7,.01],side:[6,1.8,0],back:[0,3.5,-6]};
function render(){if(ready&&visible){renderer.render(scene,camera);window.BatGuides.draw($('model-guides'),window.batModelFrame,point=>{const p=new THREE.Vector3(...point).project(camera);return p.z>=-1&&p.z<=1?[(p.x+1)*host.clientWidth/2,(1-p.y)*host.clientHeight/2]:null;},host.clientWidth,host.clientHeight);}}
function resize(){if(!ready||!host.clientWidth)return;renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();render();}
function cameraView(name){camera.position.set(...views[name]);controls.target.set(0,.25,.3);controls.update();document.querySelectorAll('button[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===name)));render();}
function pose(frame){
  if(!ready||!frame)return;
  mixer.setTime(frame.time);model.updateMatrixWorld(true);
  // Quantitative smoke-test diagnostics: the active packet really changes
  // shape with the Blender morph animation; there are no hand-drawn polygons.
  let active=0,morph=0,vertices=0;
  model.traverse(o=>{if(o.isMesh&&o.matrixWorld.determinant()>.1){active++;vertices+=o.geometry.attributes.position.count;morph+=(o.morphTargetInfluences||[]).reduce((sum,v,i)=>sum+v*(i+1),0);}});
  host.dataset.active=String(active);host.dataset.vertices=String(vertices);host.dataset.morph=morph.toFixed(4);host.dataset.frame=frame.time.toFixed(4);render();
}
async function load(){
  if(loading||ready)return;loading=true;
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#30465f');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','The animated Blender paper model. Drag to rotate, pinch or scroll to zoom.');renderer.domElement.tabIndex=0;host.append(renderer.domElement);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(37,1,.05,50);
    scene.add(new THREE.HemisphereLight('#fff8e9','#8f9695',1.5));
    const key=new THREE.DirectionalLight('#fff2da',3);key.position.set(-3,7,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.normalBias=.004;key.shadow.bias=-.00015;scene.add(key);
    const rim=new THREE.DirectionalLight('#d3e5ff',1);rim.position.set(3,3,-4);scene.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#2b3c53',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.075;floor.receiveShadow=true;scene.add(floor);
    controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=3;controls.maxDistance=12;controls.maxPolarAngle=Math.PI*.9;controls.rotateSpeed=.7;controls.enableDamping=false;
    controls.addEventListener('change',()=>{host.dataset.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');render();});
    controls.addEventListener('start',()=>document.querySelectorAll('button[data-camera]').forEach(b=>b.setAttribute('aria-pressed','false')));
    const [asset]=await Promise.all([new GLTFLoader().loadAsync('media/flying_bat.glb?v=yellow-paper-1',e=>{if(e.total)$('three-status').textContent=`Loading Blender model · ${Math.round(e.loaded/e.total*100)}%`;}),window.BatGuides.load()]);
    model=asset.scene;scene.add(model);let count=0;
    model.traverse(o=>{if(o.isMesh){count++;o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const mat of mats){mat.roughness=.92;mat.metalness=0;mat.side=THREE.DoubleSide;}}});
    mixer=new THREE.AnimationMixer(model);for(const clip of asset.animations){const a=mixer.clipAction(clip);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();}
    ready=true;host.dataset.ready='true';host.dataset.meshes=String(count);host.dataset.clips=String(asset.animations.length);$('three-status').hidden=true;cameraView('angle');resize();pose(window.batModelFrame);
    new ResizeObserver(resize).observe(host);
    document.querySelectorAll('button[data-camera]').forEach(b=>b.onclick=()=>cameraView(b.dataset.camera));$('reset-camera').onclick=()=>cameraView('angle');
    renderer.domElement.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();e.stopPropagation();const p=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')p.theta-=.15;if(e.key==='ArrowRight')p.theta+=.15;if(e.key==='ArrowUp')p.phi-=.15;if(e.key==='ArrowDown')p.phi+=.15;if(e.key==='+')p.radius=Math.max(3,p.radius*.9);if(e.key==='-')p.radius=Math.min(12,p.radius*1.1);p.makeSafe();camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(p));controls.update();render();});
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('three-status').hidden=false;$('three-status').textContent='3D graphics paused. Use Film, or refresh to restore the model.';});
  }catch(error){$('three-status').textContent='This browser could not open the 3D model. The Blender film is available in the Film tab.';$('three-status').hidden=false;host.dataset.error=error.message;}
}
window.addEventListener('bat-model-view',e=>{visible=e.detail.visible;if(visible){load();resize();pose(window.batModelFrame);}});
window.addEventListener('bat-model-frame',e=>pose(e.detail));
window.addEventListener('bat-guides-change',render);
