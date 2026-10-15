// Reglas puras de turnos; funcionan en CPU, PvP, 3D y WebXR.
// 'random': dado 1–6 al inicio de cada turno.
// 'ascenso': cada jugador avanza de manera independiente 1, 2, 3... conexiones.
export const TURN_RULES=Object.freeze({
 random:Object.freeze({id:'random',label:'MODO GALÁCTICO',short:'DADO ALEATORIO'}),
 ascenso:Object.freeze({id:'ascenso',label:'MODO ASCENSO',short:'1, 2, 3… CONEXIONES'})
});
export function normalizeTurnRule(mode){return mode==='ascenso'?'ascenso':'random';}
export function completedTurnsForPlayer(state,player){
 const explicit=state?.turnCountByPlayer?.[player];
 if(Number.isInteger(explicit)&&explicit>=0)return explicit;
 const turns=Number(state?.turns)||0;
 return Math.max(0,Math.floor((turns+(player===0?1:0))/2));
}
export function turnMoveAllowance(state,player,randomRoll){
 const rule=normalizeTurnRule(state?.ruleMode);
 if(rule==='ascenso')return Math.max(1,completedTurnsForPlayer(state,player)+1);
 return Math.max(1,Math.min(6,Number(randomRoll)||1));
}
export function nextTurnCounts(state,completedPlayer){
 const counts=[completedTurnsForPlayer(state,0),completedTurnsForPlayer(state,1)];
 if(completedPlayer===0||completedPlayer===1)counts[completedPlayer]++;
 return counts;
}
