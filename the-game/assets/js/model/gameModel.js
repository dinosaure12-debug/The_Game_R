import { HAND_SIZE, requiredPlaysThisTurn } from "../config.constants.js";

const sortAsc = (a)=> Array.isArray(a) ? a.sort((x,y)=>x-y) : a;

export function canPlay(pile, card){
  const v=pile.value;
  return pile.ascending ? (card>v || card===v-10) : (card<v || card===v+10);
}

export function ensure(st, pid){
  st.hands ??= {};
  st.hands[pid] ??= [];
  st.playsThisTurnByPlayer ??= {};
  st.playsThisTurnByPlayer[pid] ??= 0;
  st.playerOrder ??= [];
  if(!st.playerOrder.includes(pid)) st.playerOrder.push(pid);
  if(!st.currentPlayerId) st.currentPlayerId = st.playerOrder[0] || pid;
  st.gameResult ??= null;
  return st.hands[pid];
}

export function totalRemaining(st){
  const deck = st.deck?.length || 0;
  const hands = Object.values(st.hands || {}).reduce((s,h)=>s+(h?.length||0),0);
  return deck + hands;
}

export function isMyTurn(st, pid){
  return !st?.currentPlayerId || st.currentPlayerId === pid;
}

export function nextPlayer(st, pid){
  const order = st.playerOrder || [];
  if(order.length === 0) return pid;
  const idx = order.indexOf(pid);
  return order[(idx + 1) % order.length];
}

export function drawUpTo(st, pid, size){
  const hand = ensure(st, pid);
  while(hand.length<size && st.deck.length>0) hand.push(st.deck.pop());
  sortAsc(hand);
}

export function newGameState(hostId){
  const deck=[];
  for(let i=2;i<=99;i++) deck.push(i);
  for(let i=deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  const st = {
    deck,
    piles:[
      {value:100,ascending:false},
      {value:100,ascending:false},
      {value:1,ascending:true},
      {value:1,ascending:true}
    ],
    hands:{},
    playerOrder:[hostId],
    currentPlayerId:hostId,
    playsThisTurnByPlayer:{[hostId]:0},
    gameOver:false,
    gameResult:null
  };
  drawUpTo(st, hostId, HAND_SIZE);
  return st;
}

export function hasAnyMoveForPlayer(st, pid){
  ensure(st, pid);
  const hand = st.hands[pid] || [];
  for(const card of hand){
    for(const pile of st.piles){
      if(canPlay(pile, card)) return true;
    }
  }
  return false;
}

export function checkLoseCondition(st, getPlayerName){
  if(st.gameOver) return false;
  const active = st.currentPlayerId;
  if(!active) return false;
  ensure(st, active);
  if(!hasAnyMoveForPlayer(st, active)){
    st.gameOver = true;
    st.gameResult = {
      type:"lose",
      reason: `${getPlayerName(active)} est bloqué : aucun coup possible.`
    };
    return true;
  }
  return false;
}

export function applyPlay(st, pid, handIdx, pileIdx){
  if(st.gameOver) return { ok:false, msg:"Partie terminée." };
  ensure(st, pid);
  if(!isMyTurn(st, pid)) return { ok:false, msg:"Pas ton tour." };

  const hand = st.hands[pid];
  sortAsc(hand);
  if(handIdx<0 || handIdx>=hand.length) return { ok:false, msg:"Erreur carte." };

  const pile = st.piles[pileIdx];
  const card = hand[handIdx];
  if(!canPlay(pile, card)) return { ok:false, msg:"Impossible ici." };

  pile.value = card;
  hand.splice(handIdx,1);
  st.playsThisTurnByPlayer[pid] += 1;

  if(totalRemaining(st) === 0){
    st.gameOver = true;
    st.gameResult = { type:"win", reason:"Plus aucune carte restante." };
    return { ok:true, msg:"VICTOIRE !" };
  }
  return { ok:true, msg:"OK" };
}

export function applyEndTurn(st, pid, getPlayerName){
  if(st.gameOver) return { ok:false, msg:"Partie terminée." };
  ensure(st, pid);
  if(!isMyTurn(st, pid)) return { ok:false, msg:"Pas ton tour." };

  const req = requiredPlaysThisTurn(st);

  if(st.deck.length>0 && st.playsThisTurnByPlayer[pid] < req){
    return { ok:false, msg:`Pose encore ${req - st.playsThisTurnByPlayer[pid]} cartes.` };
  }

  drawUpTo(st, pid, HAND_SIZE);
  st.playsThisTurnByPlayer[pid] = 0;
  st.currentPlayerId = nextPlayer(st, pid);

  if(totalRemaining(st) === 0){
    st.gameOver = true;
    st.gameResult = { type:"win", reason:"Plus aucune carte restante." };
    return { ok:true, msg:"VICTOIRE !" };
  }

  checkLoseCondition(st, getPlayerName);

  if(st.gameOver && st.gameResult?.type === "lose"){
    return { ok:true, msg:"PERDU : "+(st.gameResult.reason || "bloqué") };
  }

  return { ok:true, msg:"Tour terminé." };
}
