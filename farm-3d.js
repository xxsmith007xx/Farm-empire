// Visual adapter only. The original game owns all progress and earnings.
const host = document.getElementById('scene');
const fallback = document.getElementById('farm');
const toggle = document.getElementById('viewToggle');
let renderer, scene, camera, frameId, observer, active = false, failed = false;
let inView = true, reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const chickens = [], coops = [], trucks = [];
let lastFrame = 0, lastSync = -1, world = -1;
function use3D(value) {
  active = value && !failed;
  window.farmView3DActive = active;
  fallback.style.visibility = active ? 'hidden' : 'visible';
  if (renderer) renderer.domElement.hidden = !active;
  toggle.textContent = active ? 'Use 2D' : 'Use 3D';
  toggle.setAttribute('aria-pressed', String(active));
  cancelAnimationFrame(frameId);
  if (active && !document.hidden && inView) frameId = requestAnimationFrame(frame);
}
function fail(error) {
  failed = true;
  use3D(false);
  toggle.textContent = '2D mode';
  toggle.disabled = true;
  toggle.title = '3D unavailable. Your farm and progress still work.';
  observer?.disconnect();
  if (renderer) {
    renderer.domElement.remove();
    renderer.dispose();
  }
  if (scene) {
    const geometries = new Set(), materials = new Set();
    scene.traverse(o => { if(o.geometry) geometries.add(o.geometry); if(o.material) materials.add(o.material); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  }
  console.warn('Farm 3D unavailable; using original 2D renderer.', error);
}
let THREE;
try {
  THREE = await import('./vendor/three.module.min.js');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 800 / 530, .1, 100);
  camera.position.set(17, 18, 23); camera.lookAt(0, 0, 0);
  renderer = new THREE.WebGLRenderer({antialias: false, alpha: false, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.domElement.className = 'farm3d';
  renderer.domElement.setAttribute('aria-label', '3D farm with roaming chickens, barns, coops and delivery trucks; tap to collect coins');
  renderer.domElement.addEventListener('webglcontextlost', e => {e.preventDefault(); fail('WebGL context lost');});
  host.insertBefore(renderer.domElement, toggle);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x60845c, 2.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-7,17,9); scene.add(sun);
  const mat = c => new THREE.MeshLambertMaterial({color:c});
  const grass = mat(0x75b956), path = mat(0xe2c68a), red = mat(0xc95845), roof = mat(0x774334);
  const white = mat(0xfff4d5), orange = mat(0xe68c2d), black = mat(0x202a2a), yellow = mat(0xf3bf45);
  const boxGeometry = new THREE.BoxGeometry(1,1,1), sphereGeometry = new THREE.SphereGeometry(1,8,6);
  function box(w,h,d,m,x,y,z,parent=scene) {
    const o = new THREE.Mesh(boxGeometry,m); o.scale.set(w,h,d); o.position.set(x,y,z); parent.add(o); return o;
  }
  function ball(r,m,x,y,z,parent) {
    const o = new THREE.Mesh(sphereGeometry,m); o.scale.setScalar(r); o.position.set(x,y,z); parent.add(o); return o;
  }
  box(27,.45,22,grass,0,-.25,0); box(27,.05,3,path,0,.01,8);
  box(6,3.9,4.5,red,-5,1.95,-5);
  for(const side of [-1,1]) {const r=box(3.9,.25,5.3,roof,-5+side*1.7,4.4,-5);r.rotation.z=-side*.48;}
  box(2.2,2.7,.12,roof,-5,1.35,-2.7); box(.14,2.7,.15,white,-5,1.35,-2.6);
  box(1.1,1.1,.14,white,-7,2.7,-2.7);
  for(let i=0;i<12;i++) {box(.15,1,.15,white,-12+i*2.2,.5,-10);}
  box(25,.12,.12,white,0,.7,-10);
  for(let i=0;i<5;i++) {
    const g=new THREE.Group(); scene.add(g);g.position.set(4+(i%2)*4,0,-6+Math.floor(i/2)*4);
    box(2.8,1.7,2.3,white,0,.85,0,g);box(3.2,.3,2.7,roof,0,1.85,0,g);box(.8,1,.1,roof,0,.5,1.2,g);coops.push(g);
  }
  // Shared low-poly geometry and materials keep mobile GPU allocation bounded.
  for(let i=0;i<32;i++) {
    const g=new THREE.Group();scene.add(g);
    ball(.38,white,0,.55,0,g);ball(.25,white,0,.88,.2,g);ball(.12,orange,0,.84,.47,g);
    ball(.045,black,-.12,.95,.39,g);ball(.045,black,.12,.95,.39,g);ball(.13,red,0,1.16,.17,g);
    ball(.21,white,-.35,.58,0,g);ball(.21,white,.35,.58,0,g);chickens.push(g);
  }
  for(let i=0;i<3;i++) {
    const g=new THREE.Group();scene.add(g);
    box(2.7,1.3,1.5,yellow,0,1,0,g);box(1.1,1.5,1.5,white,1.7,1,0,g);
    box(.7,.55,1.55,path,1.8,1.4,0,g);
    for(const x of [-.8,1.8])for(const z of [-.8,.8])ball(.35,black,x,.35,z,g);
    trucks.push(g);
  }
  function sync() {
    const s = window.farmView.snapshot();
    chickens.forEach((o,i)=>o.visible=i<Math.min(32,5+s.chickens*2));
    coops.forEach((o,i)=>o.visible=i<Math.min(5,1+s.coops));
    trucks.forEach((o,i)=>o.visible=i<Math.min(3,1+s.trucks));
    if(world!==s.world) {world=s.world;scene.background=new THREE.Color(world%4===3?0x8fb2d6:0x9edaf5);grass.color.setHex(world%4===3?0x638a72:0x75b956);}
  }
  function resize() {
    if(failed)return;
    try {const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}catch(e){fail(e);}
  }
  observer=new ResizeObserver(resize);observer.observe(host);resize();
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;use3D(active);}).observe(host);
  let start;
  renderer.domElement.addEventListener('pointerdown',e=>{if(e.isPrimary)start={x:e.clientX,y:e.clientY,id:e.pointerId};});
  renderer.domElement.addEventListener('pointercancel',()=>{start=null;});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(start&&e.pointerId===start.id&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<12) {
      const value=window.farmView.tap(), label=document.createElement('span');label.className='float';label.textContent='+'+value;
      const b=host.getBoundingClientRect();label.style.left=(e.clientX-b.left)+'px';label.style.top=(e.clientY-b.top)+'px';host.append(label);setTimeout(()=>label.remove(),800);
    }
    start=null;
  });
  sync(); toggle.disabled=false; toggle.onclick=()=>use3D(!active);
  document.addEventListener('visibilitychange',()=>use3D(active));
  use3D(true);
} catch(e) {fail(e);}
function frame(now) {
  if(!active||failed||document.hidden||!inView)return;
  frameId=requestAnimationFrame(frame);
  if(now-lastFrame<(reducedMotion?200:1000/30))return;
  lastFrame=now;
  try {
    // Keep visual time independent of earnings and save timestamps.
    const t=reducedMotion?0:now/1000;
    if(now-lastSync>500){lastSync=now; // Snapshot is read-only and contains no save data.
      const s=window.farmView.snapshot();
      chickens.forEach((o,i)=>o.visible=i<Math.min(32,5+s.chickens*2));
      coops.forEach((o,i)=>o.visible=i<Math.min(5,1+s.coops));
      trucks.forEach((o,i)=>o.visible=i<Math.min(3,1+s.trucks));
      if(world!==s.world){world=s.world;scene.background=new THREE.Color(world%4===3?0x8fb2d6:0x9edaf5);}
    }
    chickens.forEach((c,i)=>{if(!c.visible)return;const a=t*(.25+(i%5)*.035)+i*2.4;c.position.set(Math.sin(a)*9,Math.sin(t*5+i)*.035,Math.cos(a*.7)*3.8+1);c.rotation.y=Math.atan2(Math.cos(a),-.7*Math.sin(a*.7));});
    trucks.forEach((o,i)=>{o.position.set(((t*2+i*10)%34)-17,0,8);});
    renderer.render(scene,camera);
  }catch(e){fail(e);}
}
