const fs=require('node:fs');require('../farm-model.js');require('../economy.js');
const E=globalThis.Economy;
// One purchase decision per second; no lookahead. Compare affordable ROI including tap/express gains.
function simulate({active=false,cycles=5,harvest=1000,legacy=false}={}){
 let s=E.fresh(0);if(legacy)s.economyVersion=1;
 const runs=[];
 for(let run=0;run<cycles;run++){
  let t=0,firstBuy=null,milestones={},buys=0,lastBuy=0,maxPurchaseWait=0;
  for(;t<4*3600;t++){
   E.advance(s,1);
   if(active)E.earn(s,E.tapValue(s)); // One tap per second, not perfect rapid tapping.
   if(active)E.deliver(s,(t+1)*1000);
   for(const mark of [10,50,100,500,1000,3000,10000,30000,100000,1000000])if(s.earned>=mark&&milestones[mark]===undefined)milestones[mark]=t+1;
   if(s.earned>=Math.max(Array.isArray(harvest)?harvest[run]:harvest,E.prestigeTarget(s)))break;
   const candidates=[...E.U.map(a=>({a,type:'u'})),...E.R.filter(a=>a.id==='speed'||active&&a.id==='tap').map(a=>({a,type:'r'}))];
   let best;
   for(const c of candidates){
    if(s[c.type][c.a.id]>=(c.a.max||Infinity))continue;
    const cost=E.price(s,c.a);if(cost>s.coins)continue;
    const copy=structuredClone(s);E.buy(copy,c.a,c.type);
    const gain=E.rate(copy)-E.rate(s)+(active?E.tapValue(copy)-E.tapValue(s)+(E.deliveryValue(copy)-E.deliveryValue(s))/45:0);
    const score=gain/cost;
    if(score>0&&(!best||score>best.score))best={...c,score};
   }
   if(best){E.buy(s,best.a,best.type);buys++;maxPurchaseWait=Math.max(maxPurchaseWait,t+1-lastBuy);lastBuy=t+1;if(firstBuy===null)firstBuy=t+1;}
  }
  runs.push({run:run+1,seeds:s.seeds,multiplier:E.multiplier(s),seconds:t+1,firstBuy,buys,maxPurchaseWait,milestones,reward:E.prestigeReward(s),income:E.rate(s),upgrades:{...s.u},research:{...s.r}});
  s=E.prestige(s,0);if(!s)throw Error('Simulation could not prestige');
 }
 return runs;
}
function createReport(){return {assumptions:'1s decisions; affordable marginal-ROI upgrades/research. Idle: no clicks/delivery. Active: 1 tap/s and express every45s. Prestige at target. No offline time. Not measured player behavior.',
 idle:simulate(),active:simulate({active:true}),stretch:simulate({active:true,harvest:10000,cycles:3}),higherGoals:simulate({active:true,harvest:100000,cycles:3}),recordChase:simulate({active:true,harvest:[1000,10000,100000],cycles:3}),legacyFirst:simulate({legacy:true,cycles:1})};}
if(require.main===module){const text=JSON.stringify(createReport(),null,2);console.log(text);if(process.argv[2])fs.writeFileSync(process.argv[2],text+'\n');}
module.exports={simulate,createReport};
