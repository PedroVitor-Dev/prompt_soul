/* ==========================================================================
   Configurações Iniciais
   ========================================================================== */
const DEMO_LIMIT_PER_DAY = 5;
const DEMO_KEY = ""; // ← COLOQUE A SUA KEY AQUI
const MODEL    = "mistralai/mistral-7b-instruct:free";

let currentMode    = "demo";
let generatedTexts = [];
let history        = JSON.parse(localStorage.getItem("ps_history")  || "[]");
let favorites      = JSON.parse(localStorage.getItem("ps_favs")     || "[]");

/* ==========================================================================
   Gestão de Limite (Demo Mode)
   ========================================================================== */
function getUsage() {
  const stored = JSON.parse(localStorage.getItem("ps_usage") || "{}");
  const today  = new Date().toDateString();
  if (stored.date !== today) return { date: today, count: 0 };
  return stored;
}

function incrementUsage() {
  const u = getUsage(); 
  u.count++;
  localStorage.setItem("ps_usage", JSON.stringify(u));
}

function getRemainingDemoUses() { 
  return Math.max(0, DEMO_LIMIT_PER_DAY - getUsage().count); 
}

function updateUsageUI() {
  const remaining = getRemainingDemoUses();
  const pct       = (remaining / DEMO_LIMIT_PER_DAY) * 100;
  
  document.getElementById("usage-count-label").textContent = `${remaining} / ${DEMO_LIMIT_PER_DAY} restantes`;
  
  const fill = document.getElementById("usage-fill");
  fill.style.width = pct + "%";
  fill.classList.toggle("danger", remaining <= 1);
  
  const limited = remaining === 0 && currentMode === "demo";
  document.getElementById("limit-banner").classList.toggle("visible", limited);
  document.getElementById("generate-btn").disabled = limited;
}

/* ==========================================================================
   Interface do Utilizador
   ========================================================================== */
function setMode(mode) {
  currentMode = mode;
  document.getElementById("demo-btn").classList.toggle("active", mode === "demo");
  document.getElementById("advanced-btn").classList.toggle("active", mode === "advanced");
  document.getElementById("api-section").style.display  = mode === "advanced" ? "flex" : "none";
  document.getElementById("demo-meter").style.display   = mode === "demo"     ? "block" : "none";
  document.getElementById("mode-label").textContent     = `Modo: ${mode === "demo" ? "Demo" : "Avançado"}`;
  updateUsageUI();
}

// Banco de ideias traduzidas para o botão "Surpreenda-me"
const surpriseIdeas = [
  "Um mercado cyberpunk iluminado por neon em 2087, ruas molhadas refletindo sinais holográficos",
  "Uma biblioteca ancestral dentro de uma árvore oca gigante, cogumelos brilhantes iluminando as prateleiras",
  "Um farol solitário num asteroide flutuando através de uma nebulosa colorida",
  "Uma baleia mecânica gigante saltando através das nuvens acima de uma cidade Vitoriana",
  "Uma casa de chá japonesa serena no meio de uma tundra congelada sob a aurora boreal",
  "Um salão de baile subaquático onde águas-vivas dançam com piratas fantasmas",
  "Um templo antigo semi-submerso num rio na selva, luz dourada filtrando através das folhas",
  "Uma criança parada diante de uma porta maciça esculpida numa montanha viva, com nuvens saindo dela",
];

function surpriseMe() {
  document.getElementById("idea-input").value = surpriseIdeas[Math.floor(Math.random() * surpriseIdeas.length)];
  randomSelect("sel-style"); 
  randomSelect("sel-light"); 
  randomSelect("sel-camera"); 
  randomSelect("sel-mood");
}

function randomSelect(id) {
  const sel = document.getElementById(id);
  sel.selectedIndex = Math.floor(Math.random() * (sel.options.length - 1)) + 1;
}

/* ==========================================================================
   Comunicação com a API (Geração)
   ========================================================================== */
async function generate() {
  const idea = document.getElementById("idea-input").value.trim();
  if (!idea) { alert("Por favor, descreva a sua ideia de imagem primeiro."); return; }
  
  const style  = document.getElementById("sel-style").value;
  const light  = document.getElementById("sel-light").value;
  const camera = document.getElementById("sel-camera").value;
  const mood   = document.getElementById("sel-mood").value;
  const userKey = document.getElementById("user-key-input").value.trim();
  const apiKey  = currentMode === "advanced" ? userKey : DEMO_KEY;
  
  if (!apiKey) {
    alert(currentMode === "advanced" ? "Por favor, insira a sua chave API do OpenRouter." : "Chave demo não configurada. Use o modo Avançado com a sua própria chave.");
    return;
  }
  
  if (currentMode === "demo" && getRemainingDemoUses() <= 0) { 
    updateUsageUI(); 
    return; 
  }
  
  const params = [style, light, camera, mood].filter(Boolean);
  const paramsStr = params.length ? `\nParameters: ${params.join(", ")}.` : "";
  
  // A instrução ao sistema permanece pedindo saída em INGLÊS para garantir compatibilidade com geradores de imagem
  const systemPrompt = `Você é um engenheiro de prompts especialista. Pegue uma ideia de imagem e expanda em 3 prompts ricos e detalhados em INGLÊS para IAs como Midjourney ou DALL-E.\n\nRegras:\n- Os prompts devem ser distintos em composição ou interpretação.\n- Inclua detalhes técnicos (luz, clima, cores).\n- Mantenha cada prompt entre 60-120 palavras.\n- Rotule exatamente como: VARIATION A:, VARIATION B:, VARIATION C:\n- Não adicione explicações extras.`;
  const userMessage = `Ideia da imagem: "${idea}"${paramsStr}\n\nGere as 3 variações de prompt.`;
  
  showLoading();
  
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": window.location.href, "X-Title": "PromptSoul" },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }], temperature: 0.85, max_tokens: 800 }),
    });
    
    if (!res.ok) { const err = await res.json(); throw new Error(err?.error?.message || `HTTP ${res.status}`); }
    
    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content || "";
    const variations = parseVariations(rawText);
    
    if (variations.length === 0) throw new Error("Não foi possível processar a resposta do modelo.");
    
    if (currentMode === "demo") incrementUsage();
    updateUsageUI();
    
    generatedTexts = variations;
    renderResults(variations, idea);
    saveToHistory(idea, variations);
    
  } catch (err) {
    hideLoading();
    alert("Erro: " + err.message);
  }
}

// Extrai as variações da resposta da IA
function parseVariations(raw) {
  const pattern = /VARIATION\s+[ABC]:\s*([\s\S]*?)(?=VARIATION\s+[ABC]:|$)/gi;
  const matches = [];
  let m;
  while ((m = pattern.exec(raw)) !== null) {
    const text = m[1].trim();
    if (text) matches.push(text);
  }
  if (matches.length === 0) return raw.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 40).slice(0, 3);
  return matches;
}

/* ==========================================================================
   Renderização e Gestão de Estado
   ========================================================================== */
function renderResults(variations, idea) {
  hideLoading();
  const container = document.getElementById("cards-container");
  container.innerHTML = "";
  const labels = ["Variação A", "Variação B", "Variação C"];
  
  variations.forEach((text, i) => {
    const isFav = favorites.some(f => f.text === text);
    const card  = document.createElement("div");
    card.className = "prompt-card" + (isFav ? " favorited" : "");
    card.innerHTML = `
      <div class="card-header">
        <span class="card-tag">${labels[i] || "Variação " + (i+1)}</span>
        <div class="card-actions">
          <button class="icon-btn ${isFav ? "fav-active" : ""}" title="Favoritar" onclick="toggleFavorite(this, ${i})">♥</button>
          <button class="icon-btn" title="Copiar" onclick="copyPrompt(${i})">⎘</button>
        </div>
      </div>
      <div class="card-body"><div class="prompt-text">${escapeHtml(text)}</div></div>`;
    container.appendChild(card);
  });
  
  document.getElementById("results-area").classList.add("visible");
  document.getElementById("empty-state").style.display = "none";
  switchTab("results");
}

function showLoading() {
  document.getElementById("empty-state").style.display = "none";
  document.getElementById("results-area").classList.remove("visible");
  document.getElementById("loading-state").classList.add("visible");
  document.getElementById("generate-btn").disabled = true;
}

function hideLoading() {
  document.getElementById("loading-state").classList.remove("visible");
  document.getElementById("generate-btn").disabled = false;
}

/* ==========================================================================
   Ações Secundárias (Copiar, Favoritar)
   ========================================================================== */
function copyPrompt(index) { navigator.clipboard.writeText(generatedTexts[index]).then(showToast); }
function copyAll() { navigator.clipboard.writeText(generatedTexts.join("\n\n---\n\n")).then(showToast); }

function showToast() {
  const t = document.getElementById("copy-toast");
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

function toggleFavorite(btn, index) {
  const text = generatedTexts[index];
  const card = btn.closest(".prompt-card");
  const exists = favorites.findIndex(f => f.text === text);
  
  if (exists >= 0) { 
    favorites.splice(exists, 1); 
    btn.classList.remove("fav-active"); 
    card.classList.remove("favorited"); 
  } else { 
    favorites.unshift({ text, savedAt: Date.now() }); 
    btn.classList.add("fav-active"); 
    card.classList.add("favorited"); 
  }
  
  localStorage.setItem("ps_favs", JSON.stringify(favorites));
  renderFavorites();
}

function renderFavorites() {
  const list = document.getElementById("favorites-list");
  if (!favorites.length) { 
    list.innerHTML = '<div class="empty-tab">Nenhum favorito ainda. Clique no ♥ em qualquer prompt.</div>'; 
    return; 
  }
  list.innerHTML = favorites.map(f => `<div class="history-item"><div class="history-preview">${escapeHtml(f.text)}</div><div class="history-meta">${timeAgo(f.savedAt)}</div></div>`).join("");
}

/* ==========================================================================
   Histórico Local e Abas
   ========================================================================== */
function saveToHistory(idea, variations) {
  history.unshift({ idea, variations, savedAt: Date.now() });
  if (history.length > 30) history.pop();
  localStorage.setItem("ps_history", JSON.stringify(history));
}

function renderHistory() {
  const list = document.getElementById("history-list");
  if (!history.length) { 
    list.innerHTML = '<div class="empty-tab">Nenhum histórico ainda. Gere alguns prompts!</div>'; 
    return; 
  }
  list.innerHTML = history.map((h, i) => `
    <div class="history-item" onclick="loadFromHistory(${i})">
      <div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--amber);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.1em">${escapeHtml(h.idea.substring(0,40))}${h.idea.length > 40 ? "…" : ""}</div>
        <div class="history-preview">${escapeHtml(h.variations[0] || "")}</div>
      </div>
      <div class="history-meta">${timeAgo(h.savedAt)}</div>
    </div>`).join("");
}

function loadFromHistory(index) {
  const h = history[index];
  document.getElementById("idea-input").value = h.idea;
  generatedTexts = h.variations;
  renderResults(h.variations, h.idea);
}

function switchTab(tab) {
  ["results","history","favorites"].forEach(t => {
    document.getElementById("tab-" + t).style.display = t === tab ? "block" : "none";
    document.getElementById("tab-" + t + "-btn").classList.toggle("active", t === tab);
  });
  if (tab === "history")   renderHistory();
  if (tab === "favorites") renderFavorites();
}

/* ==========================================================================
   Utilitários de Tempo e Texto
   ========================================================================== */
function escapeHtml(s) { 
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); 
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000)    return "agora mesmo";
  if (diff < 3600000)  return Math.floor(diff/60000) + "m atrás";
  if (diff < 86400000) return Math.floor(diff/3600000) + "h atrás";
  return Math.floor(diff/86400000) + "d atrás";
}

// Inicialização
updateUsageUI();
renderHistory();
renderFavorites();