# Como publicar o FateX Continued Themes e instalar via manifesto

## Visão geral

A instalação por manifesto usa **GitHub Releases**. Cada release expõe dois arquivos:

- `module.json` — o manifesto que o Foundry lê;
- `fatexcontinued-themes.zip` — o módulo (com o `module.json` na raiz do zip).

A GitHub Action `.github/workflows/release.yml` confere o módulo, ajusta a versão do `module.json` conforme a tag e
as URLs conforme o repositório, monta o zip e anexa os dois arquivos à release. Você não precisa instalar nada além
do git.

O repositório se chama `fatexcontinuedthemes`; o ID do módulo continua `fatexcontinued-themes` (é o nome da pasta
em `Data/modules` e o que as macros usam). Os dois não precisam ser iguais.

## 0. Colocar as imagens dos temas no repositório

O zip do módulo que serviu de base **não tinha a pasta `assets`**, e o CSS dos temas A.E.G.I.S e Jujutsu Kaisen usa
imagens de lá. Enquanto alguma delas faltar, o CI e a publicação **falham de propósito** ("Process completed with
exit code 1") e listam o que falta — assim uma versão sem imagens nunca chega aos jogadores.

Arquivos esperados (mesmos nomes, **em minúsculas**, mesmas subpastas):

```
assets/logos/jujutsulogo.png
assets/logos/logocomtextocrimson.png
assets/backgrounds/abel.gif
assets/backgrounds/bruno.gif
assets/backgrounds/everinbg.gif
assets/backgrounds/gojogif.gif
assets/backgrounds/kael.gif
assets/backgrounds/logopreta.png
assets/backgrounds/shyriu.gif
assets/backgrounds/sukuna.gif
```

Eles estão no módulo antigo instalado no seu Foundry, em `<pasta de dados>/Data/modules/fatex-themes/assets/`. A
pasta de dados padrão é `%localappdata%\FoundryVTT\Data` no Windows, `~/Library/Application Support/FoundryVTT/Data`
no macOS e `~/.local/share/FoundryVTT/Data` no Linux (o caminho exato aparece em **Configuration → User Data Path**
na tela de configuração do Foundry). Se o Foundry roda num servidor, cada imagem também abre no navegador em
`<endereço do Foundry>/modules/fatex-themes/assets/backgrounds/gojogif.gif` (e assim por diante) e pode ser salva
de lá.

**Pelo site do GitHub:** no repositório, entre em `assets` → `backgrounds` → **Add file → Upload files**, arraste as
8 imagens dessa pasta e clique em **Commit changes**. Repita em `assets` → `logos` com as 2 imagens de lá. Pelo site,
cada arquivo pode ter no máximo 25 MB; acima disso, envie pelo git ou pelo GitHub Desktop (limite de 100 MB).

**Pelo git:** copie as imagens para `assets/` na sua pasta do repositório e faça
`git add . && git commit -m "Imagens dos temas" && git push`.

Se alguma imagem não existir mais, remova a referência dela em `styles/themes.css`.

## 1. Criar o repositório no GitHub (uma vez)

1. Acesse <https://github.com/new>.
2. Nome do repositório: **`fatexcontinuedthemes`**.
3. Deixe o repositório **Public** — o Foundry baixa o manifesto e o zip sem login; em repositório privado o link
   dá 404.
4. **Não** marque "Add a README", ".gitignore" nem "license" (o repositório precisa nascer vazio).
5. Clique em **Create repository**.

## 2. Subir o código (uma vez)

Descompacte o `fatexcontinuedthemes-repo.zip`, copie as imagens (passo 0) e, dentro da pasta
`fatexcontinuedthemes`:

```bash
git init
git add .
git commit -m "FateX Continued Themes 2.0.0 - Foundry v14"
git branch -M main
git remote add origin https://github.com/pedrohmlimonta/fatexcontinuedthemes.git
git push -u origin main
```

> Se o `git push` for recusado mencionando `workflow`, o token usado não tem permissão para enviar arquivos de
> `.github/workflows`. Gere um token com o escopo **workflow** (GitHub → Settings → Developer settings → Personal
> access tokens) ou envie pelo GitHub Desktop.

Depois do push, a aba **Actions** mostra o workflow **CI**. Verde = tudo certo. Vermelho = abra o run: o motivo
aparece em **Annotations** (normalmente as imagens do passo 0).

## 3. Publicar uma versão

1. Confira se o último run do **CI** na aba **Actions** está verde.
2. No repositório: **Releases → Draft a new release**.
3. Em **Choose a tag**, digite a versão (ex.: **`2.0.0`** ou **`v2.0.0`**) e clique em **Create new tag … on
   publish** (target: `main`).
4. Título: a versão (as notas podem ser copiadas do `CHANGELOG.md`).
5. Clique em **Publish release** (não marque "pre-release": o link `latest` ignora pre-releases).
6. Aba **Actions** → espere o run **Release** ficar com ✅ (menos de 1 minuto).
7. Volte na release e confira em **Assets**: devem aparecer `module.json` e `fatexcontinued-themes.zip`.
8. Teste no navegador — deve baixar o JSON:
   ```
   https://github.com/pedrohmlimonta/fatexcontinuedthemes/releases/latest/download/module.json
   ```

> A tag precisa ser uma versão `X.Y.Z` (com ou sem "v" na frente), sempre maior que a anterior — é assim que o
> Foundry percebe que há atualização.

## 4. Instalar no Foundry

1. Instale antes o sistema **FateX Continued** (o módulo só aparece em mundos desse sistema).
2. Foundry (tela de configuração) → **Add-on Modules → Install Module**.
3. No campo **Manifest URL**, cole:
   ```
   https://github.com/pedrohmlimonta/fatexcontinuedthemes/releases/latest/download/module.json
   ```
4. **Install**. Dentro do mundo, ative o módulo em **Gerenciar Módulos**.

Quando você publicar uma versão nova, o Foundry mostra a atualização em **Add-on Modules → Update**.

## 5. Próximas atualizações

1. Edite os scripts em `scripts/` (temas em `init.js`, iniciativa em `initiative.js`), os estilos em `styles/`, os
   idiomas em `lang/` ou as imagens em `assets/`.
2. Para testar localmente, copie a pasta para `Data/modules/fatexcontinued-themes` do seu Foundry e recarregue
   com F5.
3. Atualize o `CHANGELOG.md` (e, se quiser, o `"version"` do `module.json` — a Action sobrescreve com a tag).
4. `git add . && git commit -m "..." && git push`.
5. Publique uma nova release com a versão seguinte (passo 3).

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| CI ou Release com "Process completed with exit code 1" | Abra o run na aba **Actions**: a lista do que falta aparece em **Annotations**. Quase sempre são as imagens do passo 0. |
| A release foi publicada mas ficou sem os arquivos em **Assets** | O run **Release** falhou. Corrija e dê push, apague a release **e a tag** (em **Releases** e em **Tags**) e publique de novo — reexecutar o run antigo não adianta, porque ele usa o código da tag. |
| O link do manifesto dá 404 | A release ainda não terminou, foi salva como rascunho/pre-release, ficou sem os arquivos ou o repositório está privado. |
| Run **Release** falhou em "Atualizar versão e URLs" | A tag não é uma versão `X.Y.Z`. Apague a release e a tag e crie de novo. |
| Run **Release** falhou em "Anexar arquivos" (`Resource not accessible by integration`) | Em **Settings → Actions → General → Workflow permissions**, marque **Read and write permissions**. |
| O GitHub recusa um arquivo | Pelo site, o limite é 25 MB por arquivo; pelo git/GitHub Desktop, 100 MB. Diminua o GIF se passar disso. |
| O módulo não aparece em **Gerenciar Módulos** | O mundo não usa o sistema FateX Continued. |
