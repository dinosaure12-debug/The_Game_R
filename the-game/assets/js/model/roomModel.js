import { firebaseConfig } from "../config.firebase.js";
import { ensure, drawUpTo, newGameState } from "./gameModel.js";
import { HAND_SIZE } from "../config.constants.js";

export function initFirebase(){
  let firebaseAvailable = true;
  let db = null;
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
  } catch(e){
    console.warn("Firebase error:", e);
    firebaseAvailable = false;
  }
  return { firebaseAvailable, db };
}

export async function createRoom(db, hostId, hostName){
  const code = Math.random().toString(36).substring(2,6).toUpperCase();
  const st = newGameState(hostId);
  const ref = db.collection("rooms").doc(code);
  await ref.set({
    code, createdAt: Date.now(), hostId,
    players: { [hostId]: { joinedAt: Date.now(), name: hostName } },
    game: st
  });
  return { code, ref };
}

export async function joinRoom(db, code, playerId, playerName){
  const ref = db.collection("rooms").doc(code);
  const snap = await ref.get();
  if(!snap.exists) return { ok:false, msg:"Inconnue." };

  const data = snap.data() || {};
  const st = data.game || newGameState(playerId);

  ensure(st, playerId);
  if(st.hands[playerId].length === 0){
    drawUpTo(st, playerId, HAND_SIZE);
  }

  await ref.update({
    ["players."+playerId]: { joinedAt: Date.now(), name: playerName },
    game: st
  });

  return { ok:true, ref };
}

export function subscribeRoom(ref, onData){
  return ref.onSnapshot(s=>{
    if(!s.exists){
      onData({ exists:false, data:null });
      return;
    }
    onData({ exists:true, data: s.data() || {} });
  });
}

export async function updateGame(ref, game){
  await ref.update({ game });
}
