# Changelog

## 0.0.5

- **"Pagar custo" ligado à ficha que rolou:** o ponto de destino gasto no diálogo agora sai do personagem que fez a
  rolagem (inclusive de tokens não vinculados), e o diálogo mostra o nome dele e os pontos atuais. Antes o módulo
  dava preferência ao personagem atribuído ao usuário — se ele fosse outro (ou não tivesse pontos), o diálogo
  mostrava "Atual: 0" e não deixava pagar com a ficha que rolou.
- **"Pagar custo" legível:** o texto do diálogo agora é branco sobre um fundo escuro. Antes ele ficava escuro sobre o
  fundo escuro das janelas do Foundry v14 e quase não dava para ler as opções (gastar ponto de destino, usar
  invocação grátis, sem custo). Continua legível também para quem usa o tema claro do Foundry.

## 0.0.4

- **FateX Extras incorporado ao módulo.** Os recursos do módulo `fatex-extras` 1.1.0, de **shrade**, agora fazem
  parte do FateX Continued Themes, atualizados para o Foundry v14 e o FateX Continued: Gerenciador de Aspectos,
  aspectos no mapa, "Pagar custo" antes do +2 e do "rolar de novo", +1/−1 do GM nas cartas de rolagem, invocações
  grátis nos aspectos e consequências da ficha, consequências no chat, botão de nova sessão, modo escuro e o dado de
  ponto de destino do Dice So Nice. Textos em português, inglês e russo.
- Diferenças em relação ao FateX Extras original:
  - Os diálogos ("Pagar custo", "Nova sessão", etiquetas e confirmações do Gerenciador) usam o `DialogV2` do
    Foundry, e o botão do Gerenciador usa o formato de controles de cena do v14.
  - Soltar um aspecto no mapa cria a nota na cena que está aberta, no ponto exato onde foi solto (antes ia sempre
    para a cena ativa e saía fora do lugar com o mapa arrastado ou com zoom).
  - As notas dos aspectos acompanham o Gerenciador em todas as cenas, não só na cena ativa.
  - Depois de pagar o custo, quem aplica o +2 ou rola de novo é o próprio sistema, do jeito normal — inclusive o
    pedido ao GM quando o jogador não é o dono da carta.
  - Os +1/−1 funcionam em cada rolagem da carta (antes, só na primeira) e somam certo também no modo de rolagem
    1d6−1d6; o texto deles no histórico é guardado pela hora de cada ajuste.
  - O modo escuro não mexe nas fichas com tema próprio nem nas cartas delas no chat.
  - A mensagem de apoio ao autor (Ko-fi) aparece só para o GM, e não para todos no chat.
  - O estilo do diálogo "Pagar custo" não altera mais o cabeçalho das fichas.
  - As consequências enviadas ao chat usam a mesma carta dos aspectos do sistema.
  - O módulo não usa canal (socket) próprio: o original tentava usar um, mas ele nunca chegou a funcionar e
    permitiria que um jogador alterasse qualquer documento do mundo.
- **Migração automática do `fatex-extras`**, sem apagar nada, na primeira entrada do GM: configurações dos aspectos
  no mapa, o diário "Aspectos globais do FateX" (aspectos de cena, categorias, etiquetas e invocações), as
  invocações grátis das fichas (inclusive de tokens não vinculados), os aspectos já colocados nos mapas e o histórico
  dos +1/−1. O **Modo escuro** é copiado quando cada usuário entra pela primeira vez. A escolha do dado no Dice So
  Nice é mantida.

## 0.0.3

- **Chat com o tema da ficha:** o que a ficha manda para o chat (aspectos, façanhas, extras e rolagens de perícia)
  aparece com o visual do tema daquela ficha — fundo, cores, bordas, fonte, faixa do título e brilho — e acompanha
  quando o tema da ficha (ou o tema global) muda. Mensagens comuns e fichas com o tema "Padrão FateX" não mudam.
  Funciona com qualquer tema, inclusive os novos, porque usa as variáveis do próprio tema.

## 0.0.2

Primeira versão como **FateX Continued Themes** (`fatexcontinued-themes`), que reúne os antigos `fatex-themes` 1.2.0
e `fatex-initiative-skill` 1.0.0 num só módulo.

- Novo ID do módulo (`fatexcontinued-themes`), agora para o sistema **FateX Continued** (`fatexcontinued`) no
  Foundry VTT v14 (verificado na 14.368).
- **Iniciativa por perícia** incorporada ao módulo: mesma fórmula (`4dF + perícia + bônus`), mesma ordem (perícia da
  ficha → perícia global → fórmula padrão), mesmo botão no cabeçalho da ficha. A rolagem continua sendo criada
  pelo próprio Foundry, só com a fórmula trocada.
- Os diálogos de escolha de tema e de configuração da iniciativa usam o `DialogV2` do Foundry (o `Dialog` antigo
  está obsoleto).
- Clicar fora do menu ☰ volta a fechá-lo em todas as fichas abertas (antes, fechar uma ficha fazia as outras
  pararem de fechar o menu ao clicar fora).
- Uma única API para macros: `game.modules.get("fatexcontinued-themes").api`, com as funções de temas e de
  iniciativa com os mesmos nomes de antes.
- Migração automática dos módulos antigos, sem apagar nada: temas individuais e perícia/bônus de iniciativa das
  fichas (inclusive de tokens não vinculados), configurações de mundo (tema global, perícia global de iniciativa e
  permissões dos jogadores) na primeira entrada do GM, e a opção do menu ☰ na primeira entrada de cada usuário.
- Publicação pelo GitHub Releases: instalação pelo manifesto
  `https://github.com/pedrohmlimonta/fatexcontinuedthemes/releases/latest/download/module.json`, com conferência
  automática do manifesto, dos scripts, dos idiomas e das imagens usadas pelo CSS.

## Versões anteriores

- `fatex-themes` 1.2.0 e anteriores — temas visuais para o sistema FateX original (Foundry VTT v12/v13).
- `fatex-initiative-skill` 1.0.0 — iniciativa por perícia para o sistema FateX original (Foundry VTT v12/v13).
