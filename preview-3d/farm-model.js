/* Shared progression and save boundary; no income or building simulation. */
(function(root){
  'use strict';
  const HOME='sunny-acres';
  function migrate(save){
    const properties={...(save.properties||{})};
    properties[HOME]={id:HOME,name:'Sunny Acres',...(properties[HOME]||{})};
    // Only Sunny Acres is playable today. Preserve future records without granting income.
    return {...save,schemaVersion:4,activePropertyId:HOME,properties};
  }
  function milestones(s){
    const n=k=>Math.max(0,Number(s[k])||0);
    const score=n('coops')+n('feed')+n('hatchery')*2+n('drones')*2+Math.min(4,n('world'));
    const tier=score>=16?4:score>=9?3:score>=4?2:score>=1?1:0;
    return Object.freeze({tier,name:['Homestead','Growing Acres','Country Estate','Harvest Hub','Sunny Acres Landmark'][tier],
      land:1+tier*.12,coops:Math.min(7,1+n('coops')),barn:Math.min(3,Math.floor(n('coops')/3)+Math.floor(n('hatchery')/2)),
      silos:Math.min(3,Math.floor(n('feed')/2)+n('hatchery')),landscaping:Math.min(12,tier*2+n('feed')),
      fences:4+tier*2,paths:1+Math.min(3,tier),vehicle:Math.min(3,Math.floor(n('trucks')/2)),
      trucks:Math.min(3,1+n('trucks')),chickens:Math.min(32,5+n('chickens')*2)});
  }
  root.FarmModel=Object.freeze({HOME,migrate,milestones});
})(typeof window==='undefined'?globalThis:window);
