# FateX Continued Themes — Temas, Iniciativa e Extras

Módulo para Foundry VTT, feito para o sistema **[FateX Continued](https://github.com/pedrohmlimonta/fatexcontinued)**,
que junta três coisas:

- **Temas visuais** — escolha diferentes layouts para as fichas (e para o que elas mandam ao chat) sem alterar nada
  da mecânica;
- **Iniciativa por perícia** — a iniciativa é rolada com uma perícia configurável: `4dF + perícia + bônus`;
- **Extras** — os recursos do FateX Extras, de shrade: Gerenciador de Aspectos de cena, pagamento de custo no +2 e
  no "rolar de novo", +1/−1 do GM, invocações grátis nas fichas, nova sessão, modo escuro e dado de ponto de destino
  para o Dice So Nice.

É a continuação dos antigos `fatex-themes`, `fatex-initiative-skill` e `fatex-extras`, reunidos num só módulo e
atualizados para o Foundry VTT v14 e para o sistema `fatexcontinued`.

## Requisitos

- Foundry VTT **v14** (verificado na versão 14.368)
- Sistema **FateX Continued 2.0.0** ou superior

## Instalação

No Foundry (tela de configuração) → **Add-on Modules → Install Module** → campo **Manifest URL**:

```
https://github.com/pedrohmlimonta/fatexcontinuedthemes/releases/latest/download/module.json
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
- **Chat com o tema da ficha** — o que a ficha manda para o chat (aspectos, façanhas, extras e rolagens de perícia)
  aparece com o visual do tema daquela ficha: fundo, cores, bordas, fonte, faixa do título e brilho. Se o tema da
  ficha mudar, as mensagens dela no chat acompanham. Mensagens comuns do chat e fichas com o tema "Padrão FateX"
  continuam com o visual normal.

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

As imagens ficam na pasta `assets/` do repositório e vão dentro do zip da release. Se alguma imagem usada pelo CSS
não estiver no repositório, a publicação funciona do mesmo jeito, mas mostra um aviso listando as que faltam — e
esses temas aparecem sem elas até você incluí-las numa nova versão.

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
  --bg-primary: #seu_fundo;            /* fundo da ficha e da mensagem no chat */
  --bg-secondary: #fundo_das_secoes;   /* faixas de título e cabeçalho */
  --bg-input: #fundo_dos_campos;
  --accent: #destaque;                 /* texto sobre --bg-secondary */
  --text-primary: #sua_cor_texto;
  --border: #borda;                    /* bordas e destaques sobre --bg-primary */
  --text-shadow: #cor_do_brilho;       /* ou none */
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

.theme-meu_tema .fatex-header__logo {
  background-image: url("../assets/logos/meu_logo.png") !important;
}
```

Imagens próprias vão em `assets/` (por exemplo `assets/backgrounds/` e `assets/logos/`) e são referenciadas no CSS
com `url("../assets/...")`. Recarregue o Foundry (F5) e o tema já aparece no seletor.

O chat usa essas mesmas variáveis (arquivo `styles/chat.css`), então defina todas elas: com isso o tema novo já sai
com as mensagens do chat combinando, sem mexer em mais nada.

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

## Extras (antigo FateX Extras)

Recursos criados por **shrade** no [FateX Extras](https://github.com/shradee/FateX-Extras), atualizados para o
Foundry v14 e para o FateX Continued.

- **Gerenciador de Aspectos** — botão com o ícone de livro nos controles de token (barra da esquerda). Aspectos de
  cena organizados em categorias, com cor, etiquetas, invocações grátis e invocações do GM. O GM cria, edita,
  esconde dos jogadores e reorganiza tudo arrastando; os jogadores veem os aspectos visíveis e podem marcar as
  invocações.
- **Aspectos no mapa** — o GM arrasta um aspecto do Gerenciador para o mapa e ele vira uma nota (desenho) com o
  nome, as etiquetas e as invocações. A nota acompanha as mudanças feitas no Gerenciador. Fonte, opacidade, moldura
  e o que aparece na nota ficam nas configurações do módulo.
- **Pagar custo** — ao clicar em **+2** ou em **rolar de novo** numa carta de rolagem, abre um diálogo para escolher
  como pagar: gastar um ponto de destino, usar uma invocação grátis (de um aspecto de cena ou de um aspecto/consequência
  de ficha) ou seguir sem custo. O ponto de destino sai da ficha do personagem que fez a rolagem (o nome dele aparece
  no diálogo, com os pontos atuais). Depois de pago, o sistema aplica a ação normalmente.
- **+1 / −1 do GM** — botões extras nas cartas de rolagem, só para o GM, que ajustam o resultado e ficam registrados
  no histórico da rolagem.
- **Invocações grátis na ficha** — contador nos aspectos e consequências da ficha (quem é dono da ficha ajusta com
  − e +). Ele é o mesmo que aparece no "Pagar custo".
- **Consequências no chat** — as consequências ganham o botão de mandar para o chat, como os aspectos (e seguem o
  tema da ficha).
- **Nova sessão** — botão ao lado dos pontos de destino que, depois de confirmar, volta os pontos para o valor da
  recarga.
- **Modo escuro** — configuração de cada usuário que escurece janelas e fichas. Fichas com um tema próprio (e as
  cartas delas no chat) continuam com o tema.
- **Dice So Nice** — dado de ponto de destino (sistema "FateX Extras"), usado ao gastar ou recarregar pontos de destino.

Os aspectos de cena ficam guardados num diário escondido, **"Aspectos globais do FateX"**, criado quando o GM entra
no mundo (ele não aparece na lista de diários e não pode ser excluído).

## Vindo dos módulos antigos (`fatex-themes`, `fatex-initiative-skill` e `fatex-extras`)

1. Migre o mundo para o sistema FateX Continued (veja o README do sistema).
2. Instale este módulo pelo manifesto e ative-o no mundo.
3. Entre no mundo como GM. Na primeira vez, o módulo copia sozinho, sem apagar nada dos módulos antigos:
   - os temas individuais, a perícia/bônus de iniciativa e as invocações grátis de cada ficha (inclusive de tokens
     não vinculados);
   - as configurações de mundo: tema global, perícia global de iniciativa, permissões dos jogadores e as
     configurações dos aspectos no mapa;
   - o diário do FateX Extras com os aspectos de cena, categorias e etiquetas (o mesmo diário passa a ser usado),
     os aspectos já colocados nos mapas e o histórico dos +1/−1 nas cartas de rolagem.

   As opções **Menu ☰** e **Modo escuro** são salvas no navegador de cada usuário e são copiadas quando cada um entra
   pela primeira vez.
4. Macros que usavam `game.modules.get("fatex-themes").api` ou `game.modules.get("fatex-initiative-skill").api`
   passam a usar `game.modules.get("fatexcontinued-themes").api` — as funções têm os mesmos nomes. (O FateX Extras
   não tinha API.)
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

## Créditos e licença

- Temas e iniciativa por perícia: Pedro (pedrohmlimonta), licença MIT — use, modifique e compartilhe à vontade.
- Extras: adaptados do [FateX Extras](https://github.com/shradee/FateX-Extras), de **shrade**
  ([Ko-fi](https://ko-fi.com/shrade_himself)). O repositório original não publica uma licença, então essa parte
  (`scripts/extras/`, `templates/extras/`, `styles/extras*.css`, as traduções `FAx.*` e `lang/ru.json`) pertence ao
  autor original e não está coberta pela licença MIT — veja o arquivo `LICENSE`.
- Modelo 3D do dado de ponto de destino (`assets/extras/dc_die.glb`):
  [Fate point tokens, no Cults3D](https://cults3d.com/en/3d-model/game/fate-point-tokens), sob a licença do autor
  do modelo.
- As imagens e marcas dos temas (Blue Lock, Jujutsu Kaisen etc.) pertencem aos seus respectivos donos.
