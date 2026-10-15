// Estado de recompensas cosmeticas V57.7. No es dinero ni puntos canjeables.
// BETA: almacenamiento local por UID. Para economia real, usar servidor fiable
// con validacion de recompensas y reglas de Firestore.
export const FREE_BADGES=['◆','⚡','★','✦','☣'];
export const BADGE_ORDER=['◆','⚡','★','✦','☣','🛡','👑','🐉','🦅','🤖','👾','🔥','❄','⚔','☯','♜'];
export const LOCKED_BADGES=BADGE_ORDER.slice(FREE_BADGES.length);
export const badgeCost=badge=>{
 const i=LOCKED_BADGES.indexOf(badge);
 return i<0?0:i+1;
};
export function initialRewards(){return {schema:1,unlocked:[],progress:{}};}
export function normalizeRewards(input){
 const data=input&&typeof input==='object'?input:{};
 const unlocked=Array.isArray(data.unlocked)?[...new Set(data.unlocked.filter(v=>LOCKED_BADGES.includes(v)))]:[];
 const progress={};
 for(const badge of LOCKED_BADGES){
  const n=Number(data.progress?.[badge]);
  progress[badge]=unlocked.includes(badge)?badgeCost(badge):Number.isFinite(n)?Math.min(badgeCost(badge),Math.max(0,Math.trunc(n))):0;
 }
 return {schema:1,unlocked,progress};
}
export function isBadgeUnlocked(badge,rewards){
 return FREE_BADGES.includes(badge) || normalizeRewards(rewards).unlocked.includes(badge);
}
export function badgeProgress(badge,rewards){
 const data=normalizeRewards(rewards);
 const required=badgeCost(badge);
 const completed=required===0?0:data.progress[badge]||0;
 return {required,completed,remaining:Math.max(0,required-completed),unlocked:required===0||data.unlocked.includes(badge)};
}
export function applyCompletedBadgeVideo(badge,current){
 const cost=badgeCost(badge);
 if(cost===0||!LOCKED_BADGES.includes(badge))return normalizeRewards(current);
 const next=normalizeRewards(current);
 if(next.unlocked.includes(badge))return next;
 next.progress[badge]=Math.min(cost,(next.progress[badge]||0)+1);
 if(next.progress[badge]>=cost)next.unlocked.push(badge);
 return next;
}
export function rewardsStorageKey(uid){
 const valid=String(uid||'local-guest').replace(/[^A-Za-z0-9_-]/g,'').slice(0,128)||'local-guest';
 return '3line57_cosmetics_'+valid;
}
