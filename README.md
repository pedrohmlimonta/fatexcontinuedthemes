# FateX Continued Themes — Fichas Visuais e Iniciativa por Perícia

Módulo para Foundry VTT, feito para o sistema **[FateX Continued](https://github.com/pedrohmlimonta/fatexcontinued)**,
que junta duas coisas:

- **Temas visuais** — escolha diferentes layouts para as fichas sem alterar nada da mecânica;
- **Iniciativa por perícia** — a iniciativa é rolada com uma perícia configurável: `4dF + perícia + bônus`.

É a continuação dos antigos `fatex-themes` e `fatex-initiative-skill`, reunidos num só módulo e atualizados para o
Foundry VTT v14 e para o sistema `fatexcontinued`.

## Requisitos

- Foundry VTT **v14** (verificado na versão 14.368)
- Sistema **FateX Continued 2.0.0** ou superior

## Instalação

No Foundry (tela de configuração) → **Add-on Modules → Install Module** → campo **Manifest URL**:

```
https://github.com/pedrohmlimonta/fatexcontinued-themes/releases/latest/download/module.json
```

Depois, dentro do mundo: **Configurações → Gerenciar Módulos** → ative o **FateX Continued Themes**.

As configurações do módulo ficam nas configurações do jogo (**Configure Settings**), na seção
**FateX Continued Themes**.

## Temas visuais

Cada ficha recebe uma classe CSS (`.theme-X`) conforme o tema escolhido, e o CSS do tema sobrescreve cores,
fontes, fundos etc. **A mecânica do FateX permanece 100% intacta** — perícias, aspectos, estresse, consequências,
façanhas e tudo mais continuam funcionando normalmente. Só muda a aparência.

- **Tema global do mundo** — vale para todas as fichas sem tema próprio (configuração **Tema global do mundo**).
- **Tema individual da ficha** — clique no botão **Tema** no cabeçalho da ficha e escolha um tema (ou volte para o
  global). Por padrão só o GM vê esse botão; a configuração **"Permitir que jogadores troquem o tema das próprias
  fichas"** libera o botão para os donos das fichas.
- **Menu ☰ no cabeçalho** — junta os botões do cabeçalho da ficha (Modo de Edição, Configuração da Ficha etc.) em
  um menu suspenso; o botão de fechar continua visível. É uma configuração de cada usuário (ligada por padrão). O
  botão ☰ só aparece para o GM — para os jogadores, os botões recolhidos ficam ocultos.

### Temas inclusos

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

### Criando seu próprio tema

Você só edita 2 arquivos:

**1. `scripts/init.js`** — adicione uma entrada no array `AVAILABLE_THEMES`:

```js
const AVAILABLE_THEMES = [
  { id: "default",   label: "Padrão FateX" },
  { id: "bluelock",  label: "Blue Lock" },
  // ...
  { id: "meu_tema",  label: "Meu Tema Custom" }   // <-- nova linha
];
```

**2. `styles/themes.css`** — adicione um bloco no final do arquivo (o jeito mais fácil é copiar o bloco de um tema
existente, renomear a classe e trocar as variáveis):

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

**Dica — descobrindo classes CSS:** abra a ficha no Foundry, aperte **F12**, vá na aba **Elements/Inspetor** e veja
as classes dos elementos para saber o que sobrescrever. Algumas das mais usadas pelos temas: `.fatex-header`,
`.fatex-header__logo`, `.fatex-desk__content--actor-sheet`, `.fatex-tabs-navigation__item`, `.fatex-section`,
`.fatex-headline__text`, `.fatex-text-input` e `.fatex-checkbox`.

## Iniciativa por perícia

A iniciativa de cada combatente é rolada como:

```
4dF + rank_da_perícia + bônus_da_ficha
```

- **`rank_da_perícia`** — o valor da perícia configurada na ficha (ex.: Velocidade +3);
- **`bônus_da_ficha`** — valor numérico opcional por ficha (positivo ou negativo).

Qual perícia vale, em ordem:

1. **Perícia individual** da ficha, se ela tiver uma escolhida;
2. **Perícia global** do mundo, caso a ficha não tenha uma própria;
3. **Fórmula padrão do Foundry**, se nenhuma das duas estiver configurada (o FateX Continued não define uma
   fórmula própria de iniciativa).

### Como usar

1. Na configuração **"Perícia global de iniciativa"**, digite o nome da perícia padrão (ex.: `Velocidade`).
2. A partir daí, toda ficha que entrar em combate rola a iniciativa com essa perícia.
3. Em fichas específicas, clique no botão **Iniciativa** no cabeçalho para escolher:
   - uma perícia diferente para aquela ficha;
   - um bônus numérico fixo (ex.: +2 por equipamento, −1 por surpresa).

Por padrão só o GM vê o botão; a configuração **"Permitir que jogadores configurem iniciativa nas próprias fichas"**
libera o botão para os donos das fichas. Uma fórmula explícita (de uma macro, por exemplo) é sempre respeitada.

Como a interceptação é feita no core do Foundry (`Combatant#getInitiativeRoll`), funciona com o tracker nativo e com
trackers de outros módulos que usem a rolagem de iniciativa padrão do Foundry.

### Problemas comuns

- **Aviso "perícia não encontrada"** — o nome configurado não bate com nenhuma perícia daquela ficha. Maiúsculas,
  minúsculas e espaços nas pontas não importam, mas o resto do nome precisa ser igual. A rolagem acontece mesmo
  assim, com rank 0.
- **A iniciativa saiu só `4dF` (ou só com o bônus)** — a perícia configurada não existe naquela ficha. Adicione a
  perícia ou escolha, no botão **Iniciativa**, uma perícia que a ficha tenha.
- **Não aparece o botão "Iniciativa" na ficha** — por padrão, só o GM vê. Ative a configuração que libera para os
  jogadores.

## Vindo dos módulos antigos (`fatex-themes` e `fatex-initiative-skill`)

1. Migre o mundo para o sistema FateX Continued (veja o README do sistema).
2. Instale este módulo pelo manifesto e ative-o no mundo.
3. Entre no mundo como GM. Na primeira vez, o módulo copia sozinho, sem apagar nada dos módulos antigos:
   - os temas individuais e a perícia/bônus de iniciativa de cada ficha (inclusive de tokens não vinculados);
   - as configurações de mundo: tema global, perícia global de iniciativa e as permissões dos jogadores.

   A opção **Menu ☰** é salva no navegador de cada usuário e é copiada quando cada um entra pela primeira vez.
4. Macros que usavam `game.modules.get("fatex-themes").api` ou `game.modules.get("fatex-initiative-skill").api`
   passam a usar `game.modules.get("fatexcontinued-themes").api` — as funções têm os mesmos nomes.
5. Se nenhum outro mundo usar o FateX original, os módulos antigos podem ser desinstalados.

## API para macros

```js
const api = game.modules.get("fatexcontinued-themes").api;
const actor = game.actors.getName("Yoichi Isagi");

// ---- Temas ----
console.log(api.listThemes());               // temas disponíveis
await api.setIndividualTheme(actor, "bluelock");
await api.setIndividualTheme(actor, null);   // volta para o tema global
console.log(api.getIndividualTheme(actor));  // tema próprio da ficha ou null
console.log(api.getEffectiveTheme(actor));   // tema que está sendo exibido
console.log(api.getGlobalTheme());
await api.setGlobalTheme("aegis");           // apenas GM

// ---- Iniciativa ----
await api.setIndividualSkill(actor, "Drible"); // null volta para a perícia global
await api.setBonus(actor, 2);                  // 0 remove o bônus
await api.setGlobalSkill("Velocidade");        // apenas GM
console.log(api.getEffectiveSkill(actor));     // { skillName: "Drible", bonus: 2, isOverride: true }
console.log(api.listActorSkills(actor));       // perícias da ficha, com o rank
```

## Publicação

O passo a passo para subir no GitHub e publicar versões instaláveis pelo manifesto está em
[`PUBLICACAO.md`](PUBLICACAO.md).

## Licença

MIT — use, modifique e compartilhe à vontade. As imagens e marcas dos temas (Blue Lock, Jujutsu Kaisen etc.)
pertencem aos seus respectivos donos.
