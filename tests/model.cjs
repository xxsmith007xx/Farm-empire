const assert=require('node:assert/strict');require('../farm-model.js');
const {migrate,milestones}=globalThis.FarmModel;
const legacy={coins:123,earned:456,allTime:789,seeds:9,world:4,u:{chickens:20,feed:3},r:{offline:4},last:100,express:200};
const original=JSON.stringify(legacy), migrated=migrate(legacy);
assert.equal(JSON.stringify(legacy),original,'migration does not mutate old saves');
for(const k of Object.keys(legacy))assert.deepEqual(migrated[k],legacy[k]);
assert.equal(migrated.properties['sunny-acres'].name,'Sunny Acres');
assert.deepEqual(migrate(migrated),migrated,'idempotent migration');
const future=migrate({...migrated,properties:{...migrated.properties,orchard:{id:'orchard',income:999},'sunny-acres':{id:'sunny-acres',name:'Home',custom:7}}});
assert.equal(future.properties.orchard.income,999);assert.equal(future.properties['sunny-acres'].custom,7);
assert.equal(future.activePropertyId,'sunny-acres');assert.equal(future.coins,123,'property records grant no income');
let previous=milestones({});
for(let n=0;n<=100;n++){
 const m=milestones({chickens:n,coops:n,feed:n,hatchery:n,drones:n,trucks:n,world:n});
 for(const key of ['land','coops','barn','silos','fences','paths','landscaping','vehicle'])assert(m[key]>=previous[key],key+' grows monotonically');
 assert(m.chickens<=32&&m.coops<=7&&m.trucks<=3&&m.silos<=3&&m.landscaping<=12);
 previous=m;
}
assert.equal(milestones({coops:1}).tier,1);assert.equal(milestones({feed:2}).silos,1);
assert.equal(milestones({trucks:2}).vehicle,1);assert.equal(milestones({trucks:4}).vehicle,2);assert.equal(milestones({trucks:6}).vehicle,3);
assert.equal(milestones({coops:3}).barn,1);assert.equal(milestones({hatchery:2}).barn,1);
console.log('PASS migration preservation, idempotence, future property metadata, bounded and monotonic visual milestones.');
