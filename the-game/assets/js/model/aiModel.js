export function createGeminiClient({ apiKey = "" } = {}){
  async function callGemini(promptText){
    if (!apiKey) return "Clé API manquante.";
    try{
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Pas de réponse de l'IA.";
    }catch(e){
      console.error(e);
      return "Erreur de connexion IA.";
    }
  }
  return { callGemini };
}

export function buildHintPrompt({ p0,p1,p2,p3, hand }){
  return `
Tu es un expert du jeu de cartes coopératif 'The Game'.
Règles :
- Piles 1 & 2 (Descendantes, start 100): On doit jouer une carte INFERIEURE à la pile, OU une carte exactement +10.
- Piles 3 & 4 (Ascendantes, start 1): On doit jouer une carte SUPERIEURE à la pile, OU une carte exactement -10.

État actuel du jeu :
- Pile 1 (Desc): ${p0}
- Pile 2 (Desc): ${p1}
- Pile 3 (Asc): ${p2}
- Pile 4 (Asc): ${p3}

Ma main : [${hand.join(", ")}]

Analyse la situation. Suggère le MEILLEUR coup (carte -> pile) pour minimiser l'écart ou réaliser un "trick" (+10/-10).
Réponds en Français, sois bref (max 2 phrases). Parle comme une IA tactique futuriste.
  `.trim();
}
