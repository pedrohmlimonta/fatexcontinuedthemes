# Changelog

## 2.0.0

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
