import { requiredPlaysThisTurn } from "../config.constants.js";
import { canPlay, ensure, totalRemaining, isMyTurn } from "../model/gameModel.js";

export function createUIView(){
  const el = {
    modeBadge: document.getElementById("mode-badge"),
    roomInfo: document.getElementById("room-info"),
    turnBadge: document.getElementById("turn-badge"),
    status: document.getElementById("status"),
    info: document.getElementById("info"),

    nameInput: document.getElementById("name-input"),
    joinCodeInput: document.getElementById("join-code-input"),

    playersWrap: document.getElementById("playersWrap"),
    playersList: document.getElementById("playersList"),

    hand: document.getElementById("hand"),
    piles: [0,1,2,3].map(i=>document.getElementById("pile-"+i)),

    endOverlay: document.getElementById("end-overlay"),
    endDeck: document.getElementById("end-deck"),
    endTotal: document.getElementById("end-total"),

    loseOverlay: document.getElementById("lose-overlay"),
    loseDeck: document.getElementById("lose-deck"),
    loseTotal: document.getElementById("lose-total"),
    loseReason: document.getElementById("lose-reason"),

    aiOverlay: document.getElementById("ai-overlay"),
    aiContent: document.getElementById("ai-content"),
  };

  function setStatus(t){ el.status.innerText = t || ""; }
  function setInfo(t){ el.info.innerHTML = t || ""; }

  function updateModeBadge(mode){
    el.modeBadge.textContent = (mode==="solo") ? "MODE : SOLO" : "MODE : MULTI";
  }
  function updateRoomInfo(mode, code){
    el.roomInfo.textContent = (mode==="online" && code) ? ("ROOM : "+code) : "";
  }
  function updateTurnBadge(mode, state, getPlayerName){
    if(mode!=="online" || !state?.currentPlayerId){ el.turnBadge.textContent=""; return; }
    el.turnBadge.textContent = "TOUR : " + getPlayerName(state.currentPlayerId).toUpperCase();
  }

  function gradientForValue(v){
    const t = (v - 1) / 99;
    const startHue = 210;
    const endHue = 380;
    let h = startHue + (t * (endHue - startHue));
    const c1 = `hsl(${h % 360}, 85%, 55%)`;
    const c2 = `hsl(${(h + 30) % 360}, 90%, 65%)`;
    return { c1, c2 };
  }
  function applyCardColors(node, value){
    const g = gradientForValue(value);
    node.style.setProperty("--c1", g.c1);
    node.style.setProperty("--c2", g.c2);
  }
  function cardHTML(value){ return `<div class="big">${value}</div>`; }

  function showWinScreen(state){
    el.endDeck.innerText = String(state?.deck?.length || 0);
    el.endTotal.innerText = String(state ? totalRemaining(state) : 0);
    el.endOverlay.classList.add("show");
  }
  function hideWinScreen(){ el.endOverlay?.classList.remove("show"); }

  function showLoseScreen(state, reason){
    el.loseDeck.innerText = String(state?.deck?.length || 0);
    el.loseTotal.innerText = String(state ? totalRemaining(state) : 0);
    el.loseReason.innerText = reason || "Plus aucun coup possible.";
    el.loseOverlay.classList.add("show");
  }
  function hideLoseScreen(){ el.loseOverlay?.classList.remove("show"); }

  function showAI(){ el.aiOverlay.classList.add("show"); }
  function hideAI(){ el.aiOverlay.classList.remove("show"); }

  function renderPlayers({ mode, state, localPlayerId, getPlayerName }){
    if(!el.playersWrap || !el.playersList) return;
    const online = (mode === "online");
    el.playersWrap.style.display = online ? "block" : "none";
    if(!online || !state){ el.playersList.innerHTML=""; return; }

    const order = state.playerOrder || [];
    const active = state.currentPlayerId;
    el.playersList.innerHTML = "";

    order.forEach((pid, idx)=>{
      const row = document.createElement("div");
      row.className = "playerRow" + (pid === active ? " active" : "");

      const left = document.createElement("div");
      left.className = "playerLeft";

      const dot = document.createElement("div");
      dot.className = "playerDot";

      const name = document.createElement("div");
      const you = (pid === localPlayerId) ? " (toi)" : "";
      name.textContent = `${idx+1}. ${getPlayerName(pid)}${you}`;

      left.appendChild(dot);
      left.appendChild(name);

      const meta = document.createElement("div");
      meta.className = "playerMeta";
      meta.textContent = (pid === active) ? "À jouer" : "";

      row.appendChild(left);
      row.appendChild(meta);
      el.playersList.appendChild(row);
    });
  }

  function render({ mode, state, currentRoomCode, localPlayerId, selectedIndex, getPlayerName }){
    updateModeBadge(mode);
    updateRoomInfo(mode, currentRoomCode);
    updateTurnBadge(mode, state, getPlayerName);
    renderPlayers({ mode, state, localPlayerId, getPlayerName });

    if(!state){
      setInfo("En attente...");
      el.hand.innerHTML="";
      hideWinScreen();
      hideLoseScreen();
      return { disableBoard:true, myTurn:false };
    }

    ensure(state, localPlayerId);
    const hand = state.hands[localPlayerId] || [];
    hand.sort((a,b)=>a-b);

    const plays = state.playsThisTurnByPlayer?.[localPlayerId] ?? 0;
    const req = requiredPlaysThisTurn(state);
    const myTurn = isMyTurn(state, localPlayerId);
    const disableBoard = state.gameOver || (mode==="online" && !myTurn);

    let extra = "";
    if(mode==="online" && state.currentPlayerId){
      extra += "<br/>JOUEUR ACTIF : <b style='color:#facc15'>"+getPlayerName(state.currentPlayerId).toUpperCase()+"</b>";
    }
    extra += "<br/>COUPS CE TOUR : <b>"+plays+"</b> / "+req;

    setInfo(
      "DECK : <b>"+(state.deck?.length||0)+"</b> — TOTAL : <b>"+totalRemaining(state)+"</b><br/>" + extra
    );

    const selectedCard = (selectedIndex!=null) ? hand[selectedIndex] : null;

    for(let i=0;i<4;i++){
      const btn = el.piles[i];
      btn.disabled = disableBoard;
      btn.classList.remove("playable","not-playable");

      const v = state.piles[i].value;
      btn.innerHTML = cardHTML(v);
      applyCardColors(btn, v);

      if(!disableBoard && selectedCard != null){
        const ok = canPlay(state.piles[i], selectedCard);
        btn.classList.add(ok ? "playable" : "not-playable");
      }
    }

    el.hand.innerHTML = "";
    hand.forEach((c,i)=>{
      const node = document.createElement("div");
      node.className = "hand-card card" + (selectedIndex===i ? " selected" : "");
      node.innerHTML = cardHTML(c);
      applyCardColors(node, c);
      if(disableBoard) node.classList.add("disabled");
      node.dataset.index = String(i);
      el.hand.appendChild(node);
    });

    if(state.gameOver){
      if(state.gameResult?.type === "lose"){
        hideWinScreen();
        showLoseScreen(state, state.gameResult?.reason);
      }else{
        hideLoseScreen();
        showWinScreen(state);
      }
    }else{
      hideWinScreen();
      hideLoseScreen();
    }

    return { disableBoard, myTurn };
  }

  return {
    el,
    setStatus,
    setInfo,
    render,
    cardHTML,
    applyCardColors,
    showAI, hideAI
  };
}
