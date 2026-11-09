/* Deterministic economy shared by the game and progression simulations. No browser APIs. */
(function(root){
  'use strict';
  const U=[
    {id:'chickens',icon:'🐔',name:'More chickens',desc:'More eggs every second',base:12,growth:1.23,newBase:10,newGrowth:1.20},
    {id:'coops',icon:'🏠',name:'Bigger coops',desc:'More production and storage',base:85,growth:1.5,newBase:50,newGrowth:1.42},
    {id:'trucks',icon:'🚚',name:'Delivery trucks',desc:'Ship more eggs at full value',base:160,growth:1.65,newBase:65,newGrowth:1.5},
    {id:'feed',icon:'🌽',name:'Premium feed',desc:'Boost every chicken',base:500,growth:1.75,newBase:220,newGrowth:1.6},
    {id:'hatchery',icon:'🥚',name:'Super hatchery',desc:'Multiply your entire farm',base:2200,growth:2,newBase:1000,newGrowth:2.25},
    {id:'drones',icon:'🚁',name:'Farm drones',desc:'Automate faster harvesting',base:11000,growth:2.2,newBase:5500,newGrowth:2}
  ];
  const R=[
    {id:'tap',icon:'👆',name:'Golden touch',desc:'Earn more from each tap',base:60,growth:2.4,max:12},
    {id:'speed',icon:'⚡',name:'Rapid production',desc:'Multiply coins per second',base:180,growth:2.8,max:12},
    {id:'offline',icon:'🌙',name:'Night shift',desc:'Increase offline earnings (up to 8 hours)',base:400,growth:3,max:6}
  ];
  const modern=s=>s.economyVersion===2;
  const multiplier=s=>1+s.seeds*.18;
  const price=(s,a,n=s.u[a.id]??s.r[a.id])=>Math.ceil((modern(s)&&a.newBase||a.base)*Math.pow(modern(s)&&a.newGrowth||a.growth,n));
  const production=s=>.7*s.u.chickens*(1+s.u.coops*.65)*(1+s.u.feed*.45)*Math.pow(modern(s)?1.65:1.85,s.u.hatchery)*(1+s.u.drones*.55)*(1+s.r.speed*.4)*multiplier(s);
  const shipping=s=>.9*Math.pow(1+s.u.trucks*.6,1.5)*(1+s.u.coops*.45)*(1+s.u.feed*.45)*Math.pow(modern(s)?1.65:1.85,s.u.hatchery)*(1+s.u.drones*.55)*(1+s.r.speed*.4)*multiplier(s);
  const capacity=s=>Math.max(50,production(s)*25*(1+s.u.coops*.5));
  const rate=s=>modern(s)?Math.min(production(s),shipping(s))+.7*Math.max(0,production(s)-shipping(s)):(s.u.chickens*(1+s.u.coops*.65)*(1+s.u.feed*.45)*(1+s.u.trucks*.35)*Math.pow(1.85,s.u.hatchery)*(1+s.u.drones*.55)*(1+s.r.speed*.4)*multiplier(s))*.7;
  const tapValue=s=>Math.max(1,rate(s)*.18)*(1+s.r.tap*.6);
  function earn(s,value){s.coins+=value;s.earned+=value;s.allTime+=value;return value;}
  function advance(s,seconds,{offline=false}={}){
    const dt=Number.isFinite(seconds)?Math.max(0,Math.min(offline?8*3600:86400,seconds)):0;
    if(!dt)return 0;
    const efficiency=offline?.35+s.r.offline*.1:1;
    if(!modern(s))return earn(s,rate(s)*dt*efficiency);
    const stock=Math.max(0,s.logistics?.stock||0),produced=production(s)*dt*efficiency;
    const delivered=Math.min(shipping(s)*dt*efficiency,stock+produced);
    const waiting=stock+produced-delivered,overflow=Math.max(0,waiting-capacity(s));
    s.logistics={...s.logistics,stock:Math.min(capacity(s),waiting)};
    return earn(s,delivered+overflow*.7);
  }
  const prestigeTarget=s=>modern(s)?1000:1000*Math.pow(12,s.world);
  // A square-root reward makes longer runs worthwhile without exponential seed inflation.
  const prestigeReward=s=>Math.floor(5*Math.sqrt(Math.max(0,s.earned)/prestigeTarget(s)));
  const deliveryValue=s=>modern(s)?Math.max(15,rate(s)*12):Math.max(100,rate(s)*35);
  function deliver(s,now=Date.now()){if(now-s.express<45000)return 0;const value=earn(s,deliveryValue(s));s.express=now;return value;}
  function prestige(s,now=Date.now()){
    if(s.earned<prestigeTarget(s))return null;
    return FarmModel.migrate({...fresh(now),seeds:s.seeds+prestigeReward(s),world:s.world+1,allTime:s.allTime,
      properties:s.properties,bestHarvest:Math.max(s.bestHarvest||0,s.earned)});
  }
  function fresh(now=Date.now()){
    return FarmModel.migrate({economyVersion:2,coins:0,earned:0,allTime:0,seeds:0,world:0,
      u:{chickens:1,coops:0,trucks:0,feed:0,hatchery:0,drones:0},r:{tap:0,speed:0,offline:0},last:now,express:now,logistics:{stock:0}});
  }
  function load(value,now=Date.now()){
    if(!value||!Number.isFinite(value.coins)||!value.u||!value.r)throw Error('Invalid save');
    // Legacy saves stay on their exact economy until the player explicitly prestiges.
    return FarmModel.migrate({...fresh(now),...value,economyVersion:value.economyVersion===2?2:1,
      u:{...fresh(now).u,...value.u},r:{...fresh(now).r,...value.r},logistics:{...value.logistics,stock:Math.max(0,Number(value.logistics?.stock)||0)}});
  }
  function buy(s,a,type){
    const n=s[type][a.id],cost=price(s,a,n);
    if(n>=(a.max||Infinity)||s.coins<cost)return false;
    s.coins-=cost;s[type][a.id]++;return true;
  }
  function goal(s){
    for(const id of ['chickens','coops','trucks','feed','hatchery','drones']){
      if(s.u[id]<(id==='chickens'?2:1)){
        const item=U.find(a=>a.id===id),cost=price(s,item);
        return {text:item.name+' · '+cost+' coins',progress:Math.min(1,s.coins/cost)};
      }
    }
    const target=nextHarvest(s);
    return {text:'Harvest '+target+' coins this run',progress:Math.min(1,s.earned/target)};
  }
  function nextHarvest(s){
    const exponent=Math.max(0,Math.floor(Math.log10(Math.max(1000,s.earned)/1000)));
    for(const factor of [1,3,10]){const target=1000*Math.pow(10,exponent)*factor;if(s.earned<target)return target;}
  }
  root.Economy=Object.freeze({U,R,modern,multiplier,price,production,shipping,capacity,rate,tapValue,earn,advance,
    deliveryValue,deliver,prestigeTarget,prestigeReward,prestige,fresh,load,buy,goal,nextHarvest});
})(typeof window==='undefined'?globalThis:window);
