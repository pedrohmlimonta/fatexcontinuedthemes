# Como publicar o FateX Continued Themes e instalar via manifesto

## Visão geral

A instalação por manifesto usa **GitHub Releases**. Cada release expõe dois arquivos:

- `module.json` — o manifesto que o Foundry lê;
- `fatexcontinued-themes.zip` — o módulo (com o `module.json` na raiz do zip).

A GitHub Action `.github/workflows/release.yml` confere o módulo, ajusta a versão do `module.json` conforme a tag e
as URLs conforme o repositório, monta o zip e anexa os dois arquivos à release. Você não precisa instalar nada além
do git.

## 0. Copiar as imagens dos temas (antes do primeiro envio)

O zip do módulo que serviu de base **não tinha a pasta `assets`**, e o CSS dos temas A.E.G.I.S e Jujutsu Kaisen usa
imagens de lá. Copie os arquivos do módulo antigo instalado no seu Foundry:

```
<pasta de dados do Foundry>/Data/modules/fatex-themes/assets/   →   fatexcontinued-themes/assets/
```

Arquivos esperados (mesmos nomes, mesmas subpastas):

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

A pasta de dados padrão é `%localappdata%\FoundryVTT\Data` no Windows, `~/Library/Application Support/FoundryVTT/Data`
no macOS e `~/.local/share/FoundryVTT/Data` no Linux (o caminho exato aparece em **Configuration → User Data Path**
na tela de configuração do Foundry).

Enquanto alguma dessas imagens faltar, o CI e a publicação **falham de propósito** e listam o que falta — assim uma
versão sem imagens nunca chega aos jogadores. Se alguma imagem não existir mais, remova a referência dela em
`styles/themes.css`.

## 1. Criar o repositório no GitHub (uma vez)

1. Acesse <https://github.com/new>.
2. Nome do repositório: **`fatexcontinued-themes`**.
3. Deixe o repositório **Public** — o Foundry baixa o manifesto e o zip sem login; em repositório privado o link
   dá 404.
4. **Não** marque "Add a README", ".gitignore" nem "license" (o repositório precisa nascer vazio).
5. Clique em **Create repository**.

## 2. Subir o código (uma vez)

Descompacte o `fatexcontinued-themes-repo.zip`, copie as imagens (passo 0) e, dentro da pasta
`fatexcontinued-themes`:

```bash
git init
git add .
git commit -m "FateX Continued Themes 2.0.0 - Foundry v14"
git branch -M main
git remote add origin https://github.com/pedrohmlimonta/fatexcontinued-themes.git
git push -u origin main
```

> Se o `git push` for recusado mencionando `workflow`, o token usado não tem permissão para enviar arquivos de
> `.github/workflows`. Gere um token com o escopo **workflow** (GitHub → Settings → Developer settings → Personal
> access tokens) ou envie pelo GitHub Desktop.

Depois do push, a aba **Actions** mostra o workflow **CI**. Verde = tudo certo. Vermelho em "Conferir o módulo" =
abra o log: ele lista exatamente o que falta (normalmente imagens do passo 0).

## 3. Publicar uma versão

1. No repositório: **Releases → Draft a new release**.
2. Em **Choose a tag**, digite **`v2.0.0`** (com o "v") e clique em **Create new tag: v2.0.0 on publish**
   (target: `main`).
3. Título: `2.0.0` (as notas podem ser copiadas do `CHANGELOG.md`).
4. Clique em **Publish release** (não marque "pre-release": o link `latest` ignora pre-releases).
5. Aba **Actions** → espere o run **Release** ficar com ✅ (menos de 1 minuto).
6. Volte na release e confira em **Assets**: devem aparecer `module.json` e `fatexcontinued-themes.zip`.
7. Teste no navegador — deve baixar o JSON:
   ```
   https://github.com/pedrohmlimonta/fatexcontinued-themes/releases/latest/download/module.json
   ```

> A tag **precisa** estar no formato `vX.Y.Z`. Para as próximas: `v2.0.1`, `v2.1.0`, `v3.0.0`…

## 4. Instalar no Foundry

1. Instale antes o sistema **FateX Continued** (o módulo só aparece em mundos desse sistema).
2. Foundry (tela de configuração) → **Add-on Modules → Install Module**.
3. No campo **Manifest URL**, cole:
   ```
   https://github.com/pedrohmlimonta/fatexcontinued-themes/releases/latest/download/module.json
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
5. Publique uma nova release com a tag seguinte (passo 3).

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| CI ou Release falhou em "Conferir o módulo" listando arquivos | Faltam imagens usadas pelo CSS em `assets/` (passo 0). |
| A release foi publicada mas ficou sem os arquivos em **Assets** | O run **Release** falhou. Corrija, dê push, apague a release **e a tag** e publique de novo (reexecutar o run usa o código antigo da tag). |
| O link do manifesto dá 404 | A release ainda não terminou, foi salva como rascunho/pre-release, ficou sem os arquivos ou o repositório está privado. |
| Run **Release** falhou em "Atualizar versão" | A tag não está no formato `vX.Y.Z`. Apague a release e a tag e crie de novo. |
| Run **Release** falhou em "Anexar arquivos" (`Resource not accessible by integration`) | Em **Settings → Actions → General → Workflow permissions**, marque **Read and write permissions**. |
| O `git push` recusa um arquivo | O GitHub não aceita arquivos acima de 100 MB; diminua o GIF antes de enviar. |
| O módulo não aparece em **Gerenciar Módulos** | O mundo não usa o sistema FateX Continued. |
