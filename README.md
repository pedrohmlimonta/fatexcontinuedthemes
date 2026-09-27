# FateX Continued Themes — Fichas Visuais Customizadas

Módulo para Foundry VTT que permite escolher **diferentes layouts visuais** para as fichas do sistema
**[FateX Continued](https://github.com/pedrohmlimonta/fatexcontinued)** sem alterar nada da mecânica.

É a continuação do antigo `fatex-themes`, atualizada para o Foundry VTT v14 e para o sistema `fatexcontinued`.

## Requisitos

- Foundry VTT **v14** (verificado na versão 14.368)
- Sistema **FateX Continued 2.0.0** ou superior

## Instalação

No Foundry (tela de configuração) → **Add-on Modules → Install Module** → campo **Manifest URL**:

```
https://github.com/pedrohmlimonta/fatexcontinued-themes/releases/latest/download/module.json
```

Depois, dentro do mundo: **Configurações → Gerenciar Módulos** → ative o **FateX Continued Themes**.

## Como funciona

Cada ficha recebe uma classe CSS (`.theme-X`) conforme o tema escolhido, e o CSS do tema sobrescreve cores,
fontes, fundos etc. **A mecânica do FateX permanece 100% intacta** — perícias, aspectos, estresse, consequências,
façanhas e tudo mais continuam funcionando normalmente. Só muda a aparência.

- **Tema global do mundo** — vale para todas as fichas sem tema próprio. Troque nas configurações do jogo
  (**Configure Settings**), na seção **FateX Continued Themes** → **Tema global do mundo**.
- **Tema individual da ficha** — clique no botão **Tema** no cabeçalho da ficha e escolha um tema (ou volte para o
  global). Por padrão só o GM vê esse botão; a configuração **"Permitir que jogadores troquem o tema das próprias
  fichas"** libera o botão para os donos das fichas.
- **Menu ☰ no cabeçalho** — junta os botões do cabeçalho da ficha (Modo de Edição, Configuração da Ficha etc.) em
  um menu suspenso; o botão de fechar continua visível. É uma configuração de cada usuário (ligada por padrão). O
  botão ☰ só aparece para o GM — para os jogadores, os botões recolhidos ficam ocultos.

## Temas inclusos

| Tema | Imagens usadas |
| --- | --- |
| Padrão FateX | nenhuma (visual original do sistema) |
| Blue Lock | imagens externas (Wikimedia e Pinterest — precisam de internet) |
| A.E.G.I.S | `assets/logos/logocomtextocrimson.png`, `assets/backgrounds/logopreta.png` |
| Jujutsu Kaisen: Gojo | `assets/logos/jujutsulogo.png`, `assets/backgrounds/gojogif.gif` |
| Jujutsu Kaisen: Sukuna | `assets/logos/jujutsulogo.png`, `assets/backgrounds/sukuna.gif` |
| Jujutsu Kaisen: Kael | `assets/logos/jujutsulogo.png`, `assets/backgrounds/kael.gif` |
| Jujutsu Kaisen: Vitor | `assets/logos/jujutsulogo.png`, `assets/backgrounds/shyriu.gif` |
| Jujutsu Kaisen: Bruno | `assets/logos/jujutsulogo.png`, `assets/backgrounds/bruno.gif` |
| Jujutsu Kaisen: Abel | `assets/logos/jujutsulogo.png`, `assets/backgrounds/abel.gif` |
| Jujutsu Kaisen: Everin | `assets/logos/jujutsulogo.png`, `assets/backgrounds/everinbg.gif` |

As imagens ficam na pasta `assets/` do repositório e vão dentro do zip da release. A publicação confere se todas
as imagens usadas pelo CSS existem e falha, listando as que faltam, caso alguma não esteja no repositório.

## Vindo do `fatex-themes`

1. Migre o mundo para o sistema FateX Continued (veja o README do sistema).
2. Instale este módulo pelo manifesto e ative-o no mundo.
3. Entre no mundo como GM. Na primeira vez, o módulo copia sozinho:
   - os temas individuais das fichas (inclusive de tokens não vinculados);
   - as configurações de mundo **Tema global** e **Permitir que jogadores troquem o tema**.

   A opção **Menu ☰** é salva no navegador de cada usuário e é copiada quando cada um entra pela primeira vez.
   Nada do módulo antigo é apagado.
4. Se nenhum outro mundo usar o FateX original, o `fatex-themes` pode ser desinstalado.

## Criando seu próprio tema

Você só edita 2 arquivos:

### 1. `scripts/init.js`

Adicione uma entrada no array `AVAILABLE_THEMES`:

```js
const AVAILABLE_THEMES = [
  { id: "default",   label: "Padrão FateX" },
  { id: "bluelock",  label: "Blue Lock" },
  // ...
  { id: "meu_tema",  label: "Meu Tema Custom" }   // <-- nova linha
];
```

### 2. `styles/themes.css`

Adicione um bloco no final do arquivo (o jeito mais fácil é copiar o bloco de um tema existente, renomear a classe
e trocar as variáveis):

```css
.theme-meu_tema {
  --bg-primary: #seu_fundo;
  --bg-secondary: #fundo_das_secoes;
  --accent: #destaque;
  --text-primary: #sua_cor_texto;
  --border: #borda;
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

.theme-meu_tema .fatex-header__logo {
  background-image: url("../assets/logos/meu_logo.png") !important;
}
```

Imagens próprias vão em `assets/` (por exemplo `assets/backgrounds/` e `assets/logos/`) e são referenciadas no CSS
com `url("../assets/...")`. Recarregue o Foundry (F5) e o tema já aparece no seletor.

### Dica: descobrindo classes CSS

Abra a ficha no Foundry, aperte **F12**, vá na aba **Elements/Inspetor** e veja as classes dos elementos para saber
o que sobrescrever. Algumas das mais usadas pelos temas: `.fatex-header`, `.fatex-header__logo`,
`.fatex-desk__content--actor-sheet`, `.fatex-tabs-navigation__item`, `.fatex-section`, `.fatex-headline__text`,
`.fatex-text-input` e `.fatex-checkbox`.

## API para macros

```js
const api = game.modules.get("fatexcontinued-themes").api;
const actor = game.actors.getName("Yoichi Isagi");

// Lista os temas disponíveis
console.log(api.listThemes());

// Define o tema individual da ficha (null volta para o tema global)
await api.setIndividualTheme(actor, "bluelock");
await api.setIndividualTheme(actor, null);

// Lê os temas
console.log(api.getIndividualTheme(actor)); // tema próprio da ficha ou null
console.log(api.getEffectiveTheme(actor));  // tema que está sendo exibido
console.log(api.getGlobalTheme());

// Troca o tema global do mundo (apenas GM)
await api.setGlobalTheme("aegis");
```

## Publicação

O passo a passo para subir no GitHub e publicar versões instaláveis pelo manifesto está em
[`PUBLICACAO.md`](PUBLICACAO.md).

## Licença

MIT — use, modifique e compartilhe à vontade. As imagens e marcas dos temas (Blue Lock, Jujutsu Kaisen etc.)
pertencem aos seus respectivos donos.
