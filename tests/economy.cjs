const assert=require('node:assert/strict');require('../farm-model.js');require('../economy.js');
const E=globalThis.Economy;
const close=(a,b,message)=>assert(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),message+': '+a+' vs '+b);
const legacy={coins:10000,earned:20000,allTime:30000,seeds:13,world:3,u:{chickens:23,coops:3,trucks:4,feed:2,hatchery:1,drones:2},r:{tap:2,speed:4,offline:5},last:1000,express:500,properties:{'sunny-acres':{id:'sunny-acres',name:'My original farm',custom:7},future:{id:'future',balance:123}}};
const loaded=E.load(legacy,2000);
for(const k of Object.keys(legacy))assert.deepEqual(loaded[k],legacy[k],'preserved '+k);
assert.equal(loaded.economyVersion,1);assert.equal(E.load(loaded).economyVersion,1);
const expected=23*(1+3*.65)*(1+2*.45)*(1+4*.35)*1.85*(1+2*.55)*(1+4*.4)*(1+13*.18)*.7;
close(E.rate(loaded),expected,'unchanged legacy rate');assert.equal(E.price(loaded,E.U[1]),Math.ceil(85*1.5**3));
const before=loaded.coins;E.advance(loaded,3600,{offline:true});close(loaded.coins-before,expected*3600*.85,'legacy offline');
assert.equal(E.prestigeTarget(loaded),1000*12**3);
loaded.earned=E.prestigeTarget(loaded)*4;const snapshot=JSON.stringify(loaded),next=E.prestige(loaded,9000);
assert.equal(JSON.stringify(loaded),snapshot,'prestige result does not mutate old run');assert.equal(next.seeds,23);assert.equal(next.world,4);assert.equal(next.coins,0);assert.equal(next.logistics.stock,0);assert.equal(next.r.speed,0);assert.equal(next.economyVersion,2);assert.equal(next.express,9000);assert.deepEqual(next.properties,legacy.properties);assert.equal(next.allTime,loaded.allTime);assert.equal(next.bestHarvest,loaded.earned);
assert.equal(E.prestige(E.fresh()),null,'prestige gated');
// Shipping buffer and surplus sales conserve every unit, paying a documented discount only on overflow.
for(const chickens of [1,5,30,100])for(const trucks of [0,2,8]){
 const s=E.fresh(0);s.u.chickens=chickens;s.u.trucks=trucks;
 const initial=s.logistics.stock=E.capacity(s);
 const p=E.production(s),ship=E.shipping(s),seconds=120;
 const gain=E.advance(s,seconds),delivered=Math.min(ship*seconds,initial+p*seconds);
 const overflow=Math.max(0,initial+p*seconds-delivered-E.capacity(s));
 close(gain,delivered+.7*overflow,'shipping and local sales');
 close(delivered+overflow+s.logistics.stock,initial+p*seconds,'conservation');
 assert(s.logistics.stock>=0&&s.logistics.stock<=E.capacity(s));
 assert(gain>=.7*p*seconds-1e-6,'never stalls when shipping limited');
 if(ship<p)close(gain/seconds,E.rate(s),'steady income estimate');
 const once=E.fresh(0);once.u.chickens=chickens;once.u.trucks=trucks;
 const chunks=structuredClone(once);E.advance(once,3600,{offline:true});for(let i=0;i<3600;i++)E.advance(chunks,1,{offline:true});
 close(once.coins,chunks.coins,'offline independent of timestep');close(once.logistics.stock,chunks.logistics.stock,'buffer independent of timestep');
}
let s=E.fresh(0);s.u.chickens=50;const hour=structuredClone(s),long=structuredClone(s);E.advance(hour,28800,{offline:true});E.advance(long,864000,{offline:true});assert.deepEqual(long,hour,'offline cap8h');
const noTime=JSON.stringify(s);for(const dt of [0,-1,NaN,Infinity])E.advance(s,dt);assert.equal(JSON.stringify(s),noTime);
assert.equal(E.deliver(s,44999),0);assert(E.deliver(s,45000)>0);assert.equal(E.deliver(s,45001),0);
for(const a of [...E.U,...E.R]){
 const x=E.fresh(0);x.coins=1e7;const type=E.U.includes(a)?'u':'r',cost=E.price(x,a),rate=E.rate(x);
 assert(E.buy(x,a,type));assert.equal(x.coins,1e7-cost);assert(E.rate(x)>=rate);
}
assert.equal(E.load({coins:1,u:{chickens:9},r:{offline:2}}).u.coops,0,'partial saves fill defaults');
assert.deepEqual(E.load(E.fresh(100),100),E.fresh(100),'modern save roundtrip');
const report=require('../scripts/simulate-economy.cjs').createReport();
assert.deepEqual(report,require('../docs/progression-v2.2.json'),'recorded simulation output stays reproducible');
assert(report.idle[0].firstBuy>=10&&report.idle[0].firstBuy<=30);assert(report.active[0].firstBuy>=3&&report.active[0].firstBuy<=15);
assert(report.idle[0].seconds>=180&&report.idle[0].seconds<=420);assert(report.active[0].seconds>=90&&report.active[0].seconds<=240);
for(const runs of [report.idle,report.active]){
 for(let i=1;i<runs.length;i++)for(const mark of [100,500,1000])assert(runs[i].milestones[mark]<runs[i-1].milestones[mark],'familiar milestone accelerates');
 assert(runs.at(-1).seconds<runs[0].seconds*.6);assert(runs[0].income>.7*10,'compounding within first run');
}
assert(report.idle[0].maxPurchaseWait<=35&&report.active[0].maxPurchaseWait<=25,'frequent achievable purchases');
assert(report.higherGoals[0].seconds>report.stretch[0].seconds,'higher goals take a longer run');
assert(report.recordChase.every(run=>run.seconds<600),'optional record chase stays achievable');
assert(report.stretch[0].seconds>report.active[0].seconds);assert(report.stretch[0].reward>report.active[0].reward);
console.log('PASS legacy compatibility, additive saves, prestige/identity retention, storage conservation, no-stall floor, offline timestep/cap, delivery cooldown, purchases and multi-cycle pacing budgets.');
