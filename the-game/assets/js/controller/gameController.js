import { BRAVO_VIDEO_URL } from "../config.constants.js";
import { newGameState, ensure, applyPlay, applyEndTurn, checkLoseCondition, isMyTurn } from "../model/gameModel.js";
import { buildHintPrompt } from "../model/aiModel.js";
import { animatePlay } from "../view/animView.js";

export function createGameController({ ui, room, ai }){
  let mode = "solo";
  let state = null;
  let selectedIndex = null;
  let lastSelectedCardEl = null;

  let currentRoomCode = null;
  let roomRef = null;
  let unsubscribeRoom = null;
  let lastRoomData = null;

  let localPlayerId = localStorage.getItem("thegame_player_id");
  if(!localPlayerId){
    localPlayerId = "player-"+Math.random().toString(36).substring(2,10);
    localStorage.setItem("thegame_player_id", localPlayerId);
  }

  let localName = localStorage.getItem("thegame_name") || "";
  ui.el.nameInput.value = localName;

  function getPlayerName(pid){
    const p = lastRoomData?.players?.[pid];
    return (p?.name) ? p.name : pid.slice(-4);
  }

  function requireName(){
    const n = (localName||"").trim();
    if(n.length < 2){ ui.setStatus("Pseudo requis."); return false; }
    return true;
  }

  function subscribe(code){
    if(unsubscribeRoom) unsubscribeRoom();
    roomRef = room.getRoomRef(code);
    unsubscribeRoom = room.subscribeRoom(roomRef, (snap)=>{
      if(!snap.exists){
        ui.setStatus("Partie fermée.");
        return;
      }
      lastRoomData = snap.data || {};
      state = lastRoomData.game || null;
      render();
    });
  }

  function startSolo(){
    if(unsubscribeRoom) unsubscribeRoom();
    unsubscribeRoom=null; roomRef=null; currentRoomCode=null; lastRoomData=null;
    mode="solo";
    state=newGameState(localPlayerId);
    selectedIndex=null; lastSelectedCardEl=null;
    ui.setStatus("Mode solo démarré.");
    render();
  }

  async function createOnlineRoom(){
    if(!room.db) return ui.setStatus("Erreur connexion.");
    if(!requireName()) return;

    const { code } = await room.createRoom(localPlayerId, localName);
    currentRoomCode = code;
    mode = "online";
    ui.setStatus("Room: " + code);
    subscribe(code);
  }

  async function joinOnlineRoom(){
    if(!room.db) return ui.setStatus("Erreur connexion.");
    if(!requireName()) return;

    const code = (ui.el.joinCodeInput.value || "").trim().toUpperCase();
    if(!code) return ui.setStatus("Code vide.");

    const res = await room.joinRoom(code, localPlayerId, localName);
    if(!res.ok) return ui.setStatus(res.msg);

    mode="online";
    currentRoomCode = code;
    ui.setStatus("Rejoint.");
    subscribe(code);
  }

  async function saveState(st){
    state = st;
    if(mode==="solo") return;
    if(!roomRef) return;
    await room.updateGame(roomRef, st);
  }

  async function onPileClick(pileIdx){
    if(!state) return ui.setStatus("Lance une partie.");
    if(selectedIndex == null) return ui.setStatus("Sélectionne une carte.");

    const st = (mode==="solo") ? state : structuredClone(state);
    ensure(st, localPlayerId);

    const hand = st.hands[localPlayerId] || [];
    hand.sort((a,b)=>a-b);
    const cardValue = hand[selectedIndex];
    const pileBtn = document.getElementById("pile-"+pileIdx);

    const res = applyPlay(st, localPlayerId, selectedIndex, pileIdx);
    ui.setStatus(res.msg);

    if(res.ok){
      animatePlay({
        cardEl: lastSelectedCardEl,
        pileBtn,
        cardHTML: ()=>ui.cardHTML(cardValue),
        applyCardColors: (node)=>ui.applyCardColors(node, cardValue)
      });
      selectedIndex = null;
      lastSelectedCardEl = null;
      await saveState(st);
    }
    render();
  }

  async function onEndTurn(){
    if(!state) return;

    const st = (mode==="solo") ? state : structuredClone(state);
    const res = applyEndTurn(st, localPlayerId, getPlayerName);
    ui.setStatus(res.msg);
    if(res.ok) await saveState(st);
    render();
  }

  async function onAIHint(){
    if(!state) return;

    ui.showAI();
    ui.el.aiContent.innerText = "Calcul des probabilités...";

    const myHand = state.hands?.[localPlayerId] || [];
    const p0 = state.piles[0].value;
    const p1 = state.piles[1].value;
    const p2 = state.piles[2].value;
    const p3 = state.piles[3].value;

    const prompt = buildHintPrompt({ p0,p1,p2,p3, hand: myHand });
    const result = await ai.callGemini(prompt);

    ui.el.aiContent.innerText = result;
  }

  async function maybeCommitLose(){
    if(!state || state.gameOver) return;

    const myTurn = isMyTurn(state, localPlayerId);
    if(mode === "online" && !myTurn) return;

    const st = (mode==="solo") ? state : structuredClone(state);
    const changed = checkLoseCondition(st, getPlayerName);
    if(changed){
      await saveState(st);
    }
  }

  function render(){
    ui.render({
      mode,
      state,
      currentRoomCode,
      localPlayerId,
      selectedIndex,
      getPlayerName
    });

    maybeCommitLose().catch(()=>{});

    ui.el.hand.onclick = (e)=>{
      const cardEl = e.target.closest(".hand-card");
      if(!cardEl) return;

      const idx = Number(cardEl.dataset.index);
      if(cardEl.classList.contains("disabled")) return ui.setStatus("Attends ton tour.");

      if(selectedIndex === idx){
        selectedIndex = null;
        lastSelectedCardEl = null;
      }else{
        selectedIndex = idx;
        lastSelectedCardEl = cardEl;
      }
      render();
    };
  }

  // Bind piles
  ui.el.piles.forEach((btn, i)=> btn.onclick = ()=>onPileClick(i));

  // Bind UI buttons
  document.getElementById("btn-solo").onclick = startSolo;
  document.getElementById("btn-create-online").onclick = createOnlineRoom;
  document.getElementById("btn-join-online").onclick = joinOnlineRoom;
  document.getElementById("end-turn").onclick = onEndTurn;

  document.getElementById("new-game").onclick = ()=>{
    if(mode==="online") startSolo();
    else{
      state = newGameState(localPlayerId);
      selectedIndex=null;
      lastSelectedCardEl=null;
      ui.setStatus("Reset.");
      render();
    }
  };

  document.getElementById("btn-save-name").onclick = ()=>{
    localName = (ui.el.nameInput.value || "").trim().slice(0,12);
    localStorage.setItem("thegame_name", localName);
    ui.setStatus("Enregistré.");
    render();
  };

  document.getElementById("btn-ai-hint").onclick = onAIHint;
  document.getElementById("btn-close-ai").onclick = ui.hideAI;

  document.getElementById("btn-video").onclick = ()=> window.open(BRAVO_VIDEO_URL, "_blank");
  document.getElementById("btn-close-end").onclick = ()=> document.getElementById("end-overlay")?.classList.remove("show");
  document.getElementById("btn-replay").onclick = startSolo;

  document.getElementById("btn-close-lose").onclick = ()=> document.getElementById("lose-overlay")?.classList.remove("show");
  document.getElementById("btn-replay-lose").onclick = startSolo;

  // init
  startSolo();
}
