import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const text=await readFile(new URL('../rewards.js',import.meta.url),'utf8');
const rewards=await import('data:text/javascript,'+encodeURIComponent(text));
const {FREE_BADGES,LOCKED_BADGES,badgeCost,initialRewards,normalizeRewards,badgeProgress,applyCompletedBadgeVideo,isBadgeUnlocked,rewardsStorageKey}=rewards;

test('cinco insignias originales libres y once por videos progresivos',()=>{
 assert.deepEqual(FREE_BADGES,['◆','⚡','★','✦','☣']);
 assert.equal(LOCKED_BADGES.length,11);
 assert.equal(badgeCost('🛡'),1);
 assert.equal(badgeCost('👑'),2);
 assert.equal(badgeCost('🐉'),3);
 assert.equal(badgeCost('♜'),11);
});
test('solo se desbloquea tras completar cada video de una insignia',()=>{
 let state=initialRewards();
 assert.equal(isBadgeUnlocked('◆',state),true);
 assert.equal(isBadgeUnlocked('🛡',state),false);
 state=applyCompletedBadgeVideo('👑',state);
 assert.deepEqual(badgeProgress('👑',state),{required:2,completed:1,remaining:1,unlocked:false});
 assert.equal(isBadgeUnlocked('🛡',state),false);
 state=applyCompletedBadgeVideo('👑',state);
 assert.equal(isBadgeUnlocked('👑',state),true);
 state=applyCompletedBadgeVideo('👑',state);
 assert.equal(badgeProgress('👑',state).completed,2);
 assert.equal(badgeProgress('🐉',state).completed,0);
});
test('solo permite insignias conocidas y limpia estados adulterados',()=>{
 const state=normalizeRewards({unlocked:['👑','👑','???'],progress:{'🛡':-44,'🐉':300}});
 assert.deepEqual(state.unlocked,['👑']);
 assert.equal(state.progress['🛡'],0);
 assert.equal(state.progress['🐉'],3);
 assert.equal(state.progress['👑'],2);
 assert.equal(isBadgeUnlocked('XXX',state),false);
});
test('el progreso se identifica por usuario, no por dispositivos diferentes',()=>{
 assert.equal(rewardsStorageKey('user-123'),'3line57_cosmetics_user-123');
 assert.notEqual(rewardsStorageKey('user-123'),rewardsStorageKey('user-456'));
});
