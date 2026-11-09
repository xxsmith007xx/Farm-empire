const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const root = require('node:path').resolve(__dirname,'..');
function legacy(s){delete s.economyVersion;delete s.logistics;delete s.bestHarvest;delete s.schemaVersion;delete s.properties;delete s.activePropertyId;return s;}
const origin='http://127.0.0.1:8765';
const seed={coins:1e8,earned:1e8,allTime:2e8,seeds:17,world:2,u:{chickens:42,coops:3,trucks:4,feed:2,hatchery:1,drones:1},r:{tap:2,speed:3,offline:4},last:1700000000000-3600000,express:0,properties:{'sunny-acres':{id:'sunny-acres',name:'Sunny Acres',custom:7},orchard:{id:'orchard',reserved:true}}};
async function open(browser, original=false, block=false) {
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:1700000000000});await page.clock.pauseAt(1700000000000);await context.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await context.addInitScript(s=>localStorage.setItem('sunny-acres-v2',JSON.stringify(s)),seed);
 if(original)await page.route('**/index.html',r=>r.fulfill({contentType:'text/html',body:require('node:child_process').execFileSync('git',['show','ccc15e501298b47cf58deaf628ad681c26232de1:index.html'],{cwd:root,encoding:'utf8'})}));
 if(block==='webgl')await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args);};});
 if(block===true)await page.route('**/vendor/**',r=>r.abort());
 await page.goto(origin+'/index.html');await new Promise(resolve=>setTimeout(resolve,500));
 return {context,page,errors};
}
async function state(page){return page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));const s=JSON.parse(localStorage.getItem('sunny-acres-v2'));delete s.economyVersion;delete s.logistics;delete s.bestHarvest;delete s.schemaVersion;delete s.properties;delete s.activePropertyId;return s;});}
async function exercise(page){
 await page.locator('#collect').evaluate(e=>e.click());await page.locator('#delivery').evaluate(e=>e.click());
 await page.locator('[data-tab="upgrades"]').evaluate(e=>e.click());
 for(let i=0;i<6;i++) await page.locator('#upgradeList .buy').nth(i).evaluate(e=>e.click());
 await page.locator('[data-tab="research"]').evaluate(e=>e.click());
 for(let i=0;i<3;i++)await page.locator('#researchList .buy').nth(i).evaluate(e=>e.click());
 await page.clock.runFor(6000);
 return state(page);
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-webgl']});
 const old=await open(browser,true), modern=await open(browser);
 await modern.page.waitForFunction(()=>window.farmView3DActive===true);
 assert.deepEqual(await state(old.page),await state(modern.page),'legacy load and offline earnings');
 assert.deepEqual(await exercise(old.page),await exercise(modern.page),'all upgrades, research, delivery, collect, passive earnings');
 for(const p of [old.page,modern.page]){
  await p.locator('[data-tab="world"]').evaluate(e=>e.click());p.once('dialog',d=>d.accept());await p.locator('#prestige').evaluate(e=>e.click());
 }
 const beforeNext=await state(old.page),afterNext=await state(modern.page);for(const k of ['coins','earned','allTime','seeds','world','u','r'])assert.deepEqual(afterNext[k],beforeNext[k],'prestige preserves '+k);
 assert.equal(await modern.page.evaluate(()=>JSON.parse(localStorage.getItem('sunny-acres-v2')).economyVersion),2,'legacy opts in on prestige');
 const p=modern.page;
 const metadata=await p.evaluate(()=>JSON.parse(localStorage.getItem('sunny-acres-v2')));assert.equal(metadata.properties['sunny-acres'].custom,7);assert.equal(metadata.properties.orchard.reserved,true,'prestige retains future property records');
 await p.evaluate(()=>{navigator.clipboard.writeText=async text=>{window.testSaveCode=text;};});
 await p.locator('#exportSave').evaluate(e=>e.click());
 const code=await p.evaluate(()=>window.testSaveCode);assert.deepEqual(legacy(JSON.parse(Buffer.from(code,'base64').toString())),await state(p),'export matches save');
 p.once('dialog',async d=>{await d.accept(code);});
 p.on('dialog',async d=>{if(d.type()==='confirm')await d.accept();});
 await p.locator('#importSave').evaluate(e=>e.click());
 assert.deepEqual(legacy(JSON.parse(Buffer.from(code,'base64').toString())),await state(p),'import roundtrip');
 await p.locator('[data-tab="farm"]').evaluate(e=>e.click());
 let before=await state(p);await p.locator('.farm3d').evaluate(e=>{e.dispatchEvent(new PointerEvent('pointerdown',{isPrimary:true,pointerId:1,clientX:150,clientY:120}));e.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:150,clientY:120}));});assert((await state(p)).coins>before.coins,'3D touch earns');
 before=await state(p);
 await p.locator('.farm3d').dispatchEvent('pointerdown',{isPrimary:true,pointerId:1,clientX:100,clientY:100});
 await p.locator('.farm3d').dispatchEvent('pointerup',{pointerId:1,clientX:100,clientY:170});
 assert.equal((await state(p)).coins,before.coins,'scroll gesture does not earn');
 await p.locator('#viewToggle').evaluate(e=>e.click());assert.equal(await p.evaluate(()=>window.farmView3DActive),false);
 before=await state(p);await p.locator('#farm').dispatchEvent('pointerdown',{clientX:150,clientY:120});assert((await state(p)).coins>before.coins,'2D touch earns');
 await p.locator('#viewToggle').evaluate(e=>e.click());
 await p.locator('.farm3d').dispatchEvent('webglcontextlost');
 await p.waitForFunction(()=>!window.farmView3DActive);assert(await p.locator('#viewToggle').isDisabled(),'context loss fallback');
 const blocked=await open(browser,false,true);assert.equal(await blocked.page.evaluate(()=>!!window.farmView3DActive),false);await blocked.page.locator('#collect').evaluate(e=>e.click());assert((await state(blocked.page)).coins>seed.coins,'missing Three.js retains gameplay');
 const noGL=await open(browser,false,'webgl');assert.equal(await noGL.page.evaluate(()=>!!window.farmView3DActive),false);await noGL.page.locator('#collect').evaluate(e=>e.click());assert((await state(noGL.page)).coins>seed.coins,'no WebGL retains gameplay');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'portrait fits');
 await p.setViewportSize({width:844,height:390});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'landscape fits');
 for(const item of [old,modern,blocked,noGL])assert.deepEqual(item.errors,[],'no uncaught errors');
 console.log('PASS Chromium: original save/offline parity; all upgrades/research; passive, collect and delivery income; prestige; 3D/2D touch; scroll rejection; save import/export; Three.js failure, no WebGL and context loss fallback; portrait/landscape.');
 await browser.close();
 try{
  const safari=await webkit.launch({headless:true});const mobile=await open(safari);
  await mobile.page.locator('#collect').evaluate(e=>e.click());assert((await state(mobile.page)).coins>seed.coins);
  console.log('PASS WebKit: mobile load, legacy save, collect. 3D active:',await mobile.page.evaluate(()=>!!window.farmView3DActive));
  assert.deepEqual(mobile.errors,[]);await safari.close();
 }catch(e){console.error('WEBKIT UNAVAILABLE:',e.message);process.exitCode=2;}
})().catch(e=>{console.error(e);process.exit(1);});
