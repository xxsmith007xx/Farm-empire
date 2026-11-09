const {chromium}=require('playwright');const assert=require('node:assert/strict');require('../farm-model');require('../economy');const E=globalThis.Economy;
const now=1800000000000,key='sunny-acres-v2';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader']});
 const errors=[];
 async function open(seed){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});context.setDefaultTimeout(10000);
  if(seed)await context.addInitScript(({seed,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));},{seed,key});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:now});await p.clock.pauseAt(now);await p.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await p.goto('http://127.0.0.1:8765');return p;
 }
 const click=async(p,selector)=>p.locator(selector).evaluate(e=>e.click());
 const state=async p=>p.evaluate(key=>{dispatchEvent(new Event('pagehide'));return JSON.parse(localStorage.getItem(key));},key);
 const p=await open();assert.equal((await state(p)).economyVersion,2);assert.equal(await p.locator('#rate').textContent(),'0.7');
 await p.clock.runFor(20000);let current=await state(p);assert(Math.abs(current.coins-14)<1e-8);
 await click(p,'[data-tab="upgrades"]');await p.locator('#upgradeList .buy').nth(0).evaluate(e=>e.click());current=await state(p);assert.equal(current.u.chickens,2);assert((await p.locator('#nextGoal').textContent()).includes('Bigger coops'));
 // The renderer's visual mode never drives income. Background time must be credited once.
 const before=structuredClone(current);
 await p.evaluate(()=>{window.testHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.testHidden});document.dispatchEvent(new Event('visibilitychange'));});
 await p.clock.runFor(600000);
 const hidden=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(hidden.coins,before.coins,'no hidden foreground ticking or autosave');
 await p.evaluate(()=>{window.testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 const expected=structuredClone(before);E.advance(expected,600,{offline:true});current=await state(p);assert(Math.abs(current.coins-expected.coins)<1e-7);assert(Math.abs(current.logistics.stock-expected.logistics.stock)<1e-7);
 await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal((await state(p)).coins,current.coins,'resume cannot double claim');
 await p.reload();assert.equal((await state(p)).coins,current.coins,'reload cannot double claim');await p.context().close();
 const seeded=E.fresh(now);seeded.coins=10000;seeded.earned=3000;seeded.allTime=8000;seeded.u.coops=4;seeded.r.speed=2;seeded.logistics.stock=10;seeded.properties={...seeded.properties,orchard:{id:'orchard',name:'Future orchard'},'sunny-acres':{id:'sunny-acres',name:'My Sunny Acres',custom:44}};
 const q=await open(seeded);await click(q,'[data-tab="world"]');
 const info=await q.locator('#prestigeInfo').textContent();assert(info.includes('×1.00 → ×2.44'));assert((await q.locator('#worldTab').textContent()).includes('Prestige is optional'));
 let dialogText;q.once('dialog',async d=>{dialogText=d.message();await d.dismiss();});await click(q,'#prestige');assert.equal((await state(q)).coins,seeded.coins,'cancel keeps run');assert(dialogText.includes('research')&&dialogText.includes('all property records'));
 q.once('dialog',d=>d.accept());await click(q,'#prestige');const after=await state(q);assert.equal(after.seeds,8);assert.equal(after.world,1);assert.equal(after.coins,0);assert.equal(after.r.speed,0);assert.equal(after.logistics.stock,0);assert.equal(after.allTime,8000);assert.equal(after.bestHarvest,3000);assert.deepEqual(after.properties,seeded.properties);assert((await q.locator('#worldName').textContent()).includes('Sunny Acres'));assert.equal(after.economyVersion,2);await q.context().close();
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS new-run income/purchases/goals; hidden time, resume and reload without duplicate income; optional prestige cancellation, reward explanation, resets and permanent identity/property retention.');
})().catch(e=>{console.error(e);process.exit(1);});
