# ✦ PromptSoul

**Gerador de prompts para imagens com IA.** Descreva sua visão — receba 3 prompts profissionais, prontos para usar no Midjourney, DALL-E, Stable Diffusion e muito mais.

> 🔗 **[Acessar Demo →](vou inserir o link aqui)**

---

![PromptSoul Preview](./preview.png)

---

## Funcionalidades

- **Geração com IA** — refina sua ideia em 3 variações ricas e detalhadas
- **Parâmetros de estilo** — escolha estilo artístico, iluminação, lente e atmosfera
- **Surprise Me** — ideia aleatória + parâmetros instantâneos para inspiração criativa
- **Modo Demo** — 5 gerações gratuitas por dia, sem cadastro
- **Modo Avançado** — use sua própria key do OpenRouter para uso ilimitado
- **Histórico** — últimas 30 gerações salvas no seu navegador
- **Favoritos** — salve os prompts que você mais gostou
- **Copiar com um clique** — pronto para colar onde quiser
- **UI dark editorial** — minimalista, rápida e sem distrações

---

## Demo vs Avançado

| Funcionalidade | Modo Demo | Modo Avançado |
|---|---|---|
| API key necessária | Não | Sim (a sua própria) |
| Limite diário | 5 gerações | Ilimitado |
| Reset do limite | Todo dia à meia-noite | — |
| Configuração | Nenhuma | Cole a key no app |

---

## Como usar

### Opção A — Usar o demo online

Acesse **[vou inserir o link aqui)** e comece a gerar. Nenhuma conta necessária.

### Opção B — Rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/promptsoul.git
cd promptsoul

# 2. Abra no navegador
open index.html
# ou simplesmente arraste o index.html para o navegador
```

Sem etapa de build. Sem dependências. HTML/CSS/JS puro.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| API de IA | [OpenRouter](https://openrouter.ai) |
| Modelo padrão | Mistral 7B Instruct (gratuito) |
| Armazenamento | localStorage (navegador) |
| Deploy | Vercel |

---


## Como funciona

1. O usuário descreve uma ideia de imagem e escolhe parâmetros de estilo opcionais
2. O PromptSoul envia a ideia + parâmetros para o OpenRouter com um system prompt cuidadosamente elaborado
3. O modelo retorna 3 variações distintas de prompt (enquadramentos, composições e estilos diferentes)
4. Os resultados são exibidos, salvos no histórico e prontos para copiar

**O limite de uso** é gerenciado inteiramente no navegador via `localStorage`. O contador reseta diariamente com base na data local do usuário. Nenhum backend ou banco de dados necessário.

---

## Licença

MIT — faça o que quiser com o código.

---

<p align="center"> PedroVitor-Dev </p>
