const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader']});
 const context=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];
 for(const level of [0,1,3,6,10]){
   const save={coins:1e7,earned:500,allTime:1e7,seeds:3,world:0,u:{chickens:level+1,coops:level,trucks:level,feed:level,hatchery:level,drones:level},r:{tap:0,speed:0,offline:0},last:Date.now(),express:0};
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(s=>localStorage.setItem('sunny-acres-v2',JSON.stringify(s)),save);await p.goto('http://127.0.0.1:8765');await p.waitForFunction(()=>window.farmView3DActive);
   const {expected,actual}=await p.evaluate(()=>({expected:FarmModel.milestones(window.farmView.snapshot()),actual:JSON.parse(document.querySelector('.farm3d').dataset.rendered)}));
   assert.equal(actual.coops,expected.coops);assert.equal(actual.silos,expected.silos);assert.equal(actual.trees,expected.landscaping);assert.equal(actual.paths,expected.paths);assert.equal(actual.fences,expected.fences);assert.equal(actual.land,expected.land);assert.equal(actual.barn,1+expected.barn*.13);assert.equal(actual.trailers,expected.vehicle>=2?expected.trucks:0);
   await p.evaluate(()=>dispatchEvent(new Event('pagehide')));
   const migrated=await p.evaluate(()=>JSON.parse(localStorage.getItem('sunny-acres-v2')));assert.equal(migrated.schemaVersion,4);assert.equal(migrated.activePropertyId,'sunny-acres');assert.equal(migrated.seeds,3);
   await p.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'farm-tier-'+level+'.png')});await p.close();
 }
 assert.deepEqual(errors,[]);await b.close();console.log('PASS mobile rendered milestones and legacy-save browser migration at five progression levels.');
})().catch(e=>{console.error(e);process.exit(1);});
