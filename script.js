/* ==========================================================================
   Configurações Iniciais
   ========================================================================== */
const MODEL = "mistralai/mistral-7b-instruct:free"; // Usado apenas no modo Avançado

let currentMode    = "demo";
let generatedTexts = [];
let history        = JSON.parse(localStorage.getItem("ps_history")  || "[]");
let favorites      = JSON.parse(localStorage.getItem("ps_favs")     || "[]");

/* ==========================================================================
   Gestão de Interface de Uso (Ilimitado)
   ========================================================================== */
function updateUsageUI() {
  const label = document.getElementById("usage-count-label");
  const fill = document.getElementById("usage-fill");
  
  if (currentMode === "demo") {
    label.textContent = "∞ Ilimitado (Modo Local)";
  } else {
    label.textContent = "∞ Ilimitado (Sua API Key)";
  }
  
  fill.style.width = "100%";
  fill.classList.remove("danger");
  document.getElementById("limit-banner").classList.remove("visible");
  document.getElementById("generate-btn").disabled = false;
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
  document.getElementById("mode-label").textContent     = `Modo: ${mode === "demo" ? "Demo (Local)" : "Avançado"}`;
  updateUsageUI();
}

// [ATUALIZAÇÃO] Banco de ideias traduzidas para INGLÊS para prompts perfeitos
const surpriseIdeas = [
  "A neon-lit cyberpunk marketplace in 2087, rain-soaked streets reflecting holographic signs",
  "An ancient library inside a massive hollow tree, glowing mushrooms lighting the shelves",
  "A lonely lighthouse on an asteroid floating through a colorful nebula",
  "A giant mechanical whale breaching through clouds above a Victorian city",
  "A serene Japanese tea house in the middle of a frozen tundra under the northern lights",
  "An underwater ballroom where jellyfish waltz with ghost pirates",
  "A time-worn temple half-submerged in a jungle river, golden light filtering through leaves",
  "A child standing before a massive doorway carved into a living mountain, clouds pouring out"
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
   Motor de Geração (Local vs API)
   ========================================================================== */

async function translateToEnglish(text) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt|en`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (translated && data.responseStatus === 200) return translated;
  } catch (e) {}
  return text; // fallback: retorna o original se falhar
}

async function generate() {
  const rawIdea = document.getElementById("idea-input").value.trim();
  if (!rawIdea) { alert("Por favor, descreva a sua ideia de imagem primeiro."); return; }

  // Tradução automática para inglês
  const idea = await translateToEnglish(rawIdea);
  const style  = document.getElementById("sel-style").value;
  const light  = document.getElementById("sel-light").value;
  const camera = document.getElementById("sel-camera").value;
  const mood   = document.getElementById("sel-mood").value;
  
  showLoading();

  // [MODO DEMO] -> Geração Local Rápida e Gratuita
  if (currentMode === "demo") {
    setTimeout(() => {
      const variations = gerarVariacoesOffline(idea, style, light, camera, mood);
      generatedTexts = variations;
      renderResults(variations, idea);
      saveToHistory(idea, variations);
    }, 600);
    return;
  }

  // [MODO AVANÇADO] -> Geração via API OpenRouter
  const userKey = document.getElementById("user-key-input").value.trim();
  if (!userKey) {
    hideLoading();
    alert("Por favor, insira a sua chave API do OpenRouter no modo Avançado.");
    return;
  }
  
  const params = [style, light, camera, mood].filter(Boolean);
  const paramsStr = params.length ? `\nParameters: ${params.join(", ")}.` : "";
  
  const systemPrompt = `You are an expert AI image prompt engineer. Take a basic image idea and expand it into 3 rich, detailed, professional prompts for AI image generators like Midjourney, DALL-E, or Stable Diffusion.\n\nRules:\n- Each prompt must be distinct — different framing, composition, or artistic interpretation\n- Include technical photography/art details: lighting, mood, composition, color palette, texture\n- Keep each prompt between 60-120 words\n- Label them exactly as: VARIATION A:, VARIATION B:, VARIATION C:\n- Do NOT add explanations — only the prompts themselves`;
  const userMessage = `Image idea: "${idea}"${paramsStr}\n\nGenerate 3 prompt variations.`;
  
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${userKey}`, "Content-Type": "application/json", "HTTP-Referer": window.location.href, "X-Title": "PromptSoul" },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }], temperature: 0.85, max_tokens: 800 }),
    });
    
    if (!res.ok) { const err = await res.json(); throw new Error(err?.error?.message || `HTTP ${res.status}`); }
    
    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content || "";
    const variations = parseVariations(rawText);
    
    if (variations.length === 0) throw new Error("Não foi possível processar a resposta do modelo.");
    
    generatedTexts = variations;
    renderResults(variations, idea);
    saveToHistory(idea, variations);
    
  } catch (err) {
    hideLoading();
    alert("Erro na API: " + err.message);
  }
}

// [FUNÇÃO ATUALIZADA] Gera as 3 variações locais com Lentes e Diretores em INGLÊS
function gerarVariacoesOffline(idea, style, light, camera, mood) {
  // Categorias base
  const modificadoresQualidade = [
    "masterpiece", "best quality", "ultra-detailed", "8k resolution", 
    "insane detail", "hyper-realistic", "sharp focus", "award-winning photography",
    "flawless detail", "highres", "masterfully crafted"
  ];
  const modificadoresRender = [
    "unreal engine 5 render", "octane render", "ray tracing", 
    "global illumination", "volumetric lighting", "ambient occlusion",
    "subsurface scattering", "physically based rendering", "cinematic lighting"
  ];
  const modificadoresAtmosfera = [
    "epic composition", "vibrant colors", "cinematic atmosphere", 
    "breathtaking scenery", "stunning visuals", "dramatic lighting",
    "ethereal mood", "dynamic angle", "perfect composition"
  ];

  // [NOVO] Lentes Técnicas (Camera Lenses)
  const modificadoresLentes = [
    "35mm lens", "50mm lens", "85mm lens", 
    "24mm wide angle lens", "16mm ultra wide lens", "135mm telephoto lens"
  ];

  // [NOVO] Estilos de Diretores Cinematográficos (Directors)
  const modificadoresDiretores = [
    "in the style of Christopher Nolan", "in the style of Quentin Tarantino", 
    "in the style of Wes Anderson", "in the style of Denis Villeneuve", 
    "in the style of Ridley Scott", "in the style of Steven Spielberg", 
    "in the style of Stanley Kubrick"
  ];

  let variacoes = [];

  for (let i = 0; i < 3; i++) {
    // Sorteia aleatoriamente palavras base
    const qual = modificadoresQualidade.sort(() => 0.5 - Math.random()).slice(0, 2);
    const ren = modificadoresRender.sort(() => 0.5 - Math.random()).slice(0, 2);
    const atm = modificadoresAtmosfera.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    // [NOVO] Sorteia 1 Lente e 1 Diretor específicos para esta variação
    const lente = modificadoresLentes[Math.floor(Math.random() * modificadoresLentes.length)];
    const diretor = modificadoresDiretores[Math.floor(Math.random() * modificadoresDiretores.length)];
    
    // Junta tudo (removendo os vazios com .filter)
    let modificadores = [style, light, camera, mood, lente, diretor, ...qual, ...ren, ...atm].filter(Boolean);
    
    // Embaralha para ficar orgânico
    modificadores = modificadores.sort(() => Math.random() - 0.5);
    
    // Insere a ideia do usuário no meio da estrutura do prompt
    const indiceDoMeio = Math.floor(modificadores.length / 2);
    modificadores.splice(indiceDoMeio, 0, idea);
    
    // Constrói o texto final
    let promptFinalTexto = modificadores.join(", ") + ".";
    promptFinalTexto = promptFinalTexto.charAt(0).toUpperCase() + promptFinalTexto.slice(1);
    
    variacoes.push(promptFinalTexto);
  }

  return variacoes;
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
  renderHistory();
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

// Inicialização da Aplicação
updateUsageUI();
renderHistory();
renderFavorites();