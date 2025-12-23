import { createUIView } from "./view/uiView.js";
import { createGeminiClient } from "./model/aiModel.js";
import { initFirebase, createRoom, joinRoom, subscribeRoom, updateGame } from "./model/roomModel.js";
import { createGameController } from "./controller/gameController.js";

const { firebaseAvailable, db } = initFirebase();

const room = {
  db,
  firebaseAvailable,
  getRoomRef: (code)=> db.collection("rooms").doc(code),
  createRoom: async (hostId, hostName)=> createRoom(db, hostId, hostName),
  joinRoom: async (code, pid, name)=> joinRoom(db, code, pid, name),
  subscribeRoom: (ref, cb)=> subscribeRoom(ref, cb),
  updateGame: async (ref, game)=> updateGame(ref, game),
};

const ai = createGeminiClient({ apiKey: "" }); // injecte ta clé si besoin
const ui = createUIView();

createGameController({ ui, room, ai });
