# IQlinks

Protótipo que **coleta ofertas de marketplaces, ranqueia por potencial de
venda e formata/envia os links de afiliado** para grupos. Zero dependências
npm — só Node.js 22.5+ (fetch, crypto e SQLite embutidos).

## Como rodar no seu computador (passo a passo)

Guia para quem nunca rodou um projeto assim. Só é preciso instalar **uma**
coisa (o Node.js) — o projeto não tem nenhuma outra dependência.

### 1. Instale o Node.js

1. Acesse <https://nodejs.org>.
2. Baixe a versão **LTS** (o botão verde em destaque). Precisa ser a
   **22.5 ou mais nova**.
3. Instale normalmente (avançar → avançar → concluir no Windows; arrastar
   para Aplicativos no macOS).
4. Confira se deu certo: abra o terminal e digite `node --version` e
   aperte Enter. Deve aparecer algo como `v22.x.x`.
   - **Windows:** menu Iniciar → digite `PowerShell` → Enter.
   - **macOS:** Cmd + Espaço → digite `Terminal` → Enter.

### 2. Baixe o projeto

- **Sem instalar nada (mais fácil):** na página do projeto no GitHub,
  clique no botão verde **Code → Download ZIP**. Extraia o ZIP em uma
  pasta fácil de achar (ex.: Área de Trabalho). A pasta extraída deve
  conter `package.json`, `src`, `public` etc.
- **Ou, se já usa git:**
  ```bash
  git clone https://github.com/ceschmiedel/IQlinks.git
  ```

### 3. Abra o terminal dentro da pasta do projeto

- **Windows:** abra a pasta do projeto no Explorador de Arquivos, clique
  na **barra de endereço** (onde aparece o caminho), digite `powershell`
  e aperte Enter — o terminal abre já dentro da pasta.
- **macOS:** abra o Terminal, digite `cd ` (com um espaço depois),
  **arraste a pasta do projeto** para a janela do Terminal e aperte Enter.

Para conferir que está na pasta certa, digite `ls` (macOS/Linux) ou `dir`
(Windows): a lista deve mostrar `package.json`, `src` e `public`.

### 4. Inicie a aplicação

```bash
npm run web
```

Vai aparecer a mensagem:

```
IQlinks web rodando em http://localhost:3000
```

Deixe essa janela do terminal aberta — é ela que mantém a aplicação no ar.

### 5. Use no navegador

Abra <http://localhost:3000> no seu navegador. Para testar sem configurar
nada, deixe a fonte em **Demo (sem credenciais)** e clique em **Buscar
ofertas**: dá para selecionar os cards, gerar shortlink, copiar as
mensagens e compartilhar no WhatsApp/Telegram com dados de exemplo.

### 6. Para parar e rodar de novo

- **Parar:** clique na janela do terminal e aperte `Ctrl + C`.
- **Rodar de novo:** repita os passos 3 e 4. A instalação (passos 1 e 2)
  só é necessária na primeira vez.

### 7. (Opcional) Configurar credenciais reais

Para usar a Shopee de verdade ou enviar ao Telegram, crie o arquivo de
configuração copiando o modelo:

```bash
copy .env.example .env    # Windows (PowerShell)
cp .env.example .env      # macOS / Linux
```

Abra o arquivo `.env` no Bloco de Notas (ou TextEdit) e preencha o que
tiver — as seções [Fontes](#fontes) e [Disparo](#disparo--por-que-não-há-whatsapp-automático)
abaixo explicam onde conseguir cada credencial. Depois pare e inicie a
aplicação de novo (passo 6) para ela ler o arquivo.

### Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `'node' não é reconhecido...` / `command not found` | O Node não foi instalado, ou o terminal foi aberto antes da instalação. Feche o terminal, abra de novo e repita. Se persistir, reinstale o Node. |
| `node --version` mostra versão menor que 22.5 | Baixe a LTS atual em <https://nodejs.org> e instale por cima. |
| Erro com `EADDRINUSE` ao iniciar | Outra coisa já usa a porta 3000. Inicie em outra porta — macOS/Linux: `PORT=3001 npm run web`; Windows (PowerShell): `$env:PORT=3001; npm run web` — e abra `http://localhost:3001`. |
| A fonte Mercado Livre dá erro | Sem internet ou a API pública do ML está indisponível no momento. Teste com a fonte **Demo** para confirmar que a aplicação em si está OK. |

### Atalhos para quem já usa terminal

```bash
npm run web    # interface web em http://localhost:3000
npm run demo   # mesmo pipeline via CLI, com dados de exemplo
npm test       # testes do ranking, dedupe e formatação
node src/index.js --help
```

## Como funciona

```
fontes (Shopee / Mercado Livre / mock)
   → ranking por score de potencial de venda
   → dedupe em SQLite (não repete oferta por N dias)
   → formatação da mensagem
   → disparo (console = semiautomático | telegram = Bot API oficial)
```

O mesmo pipeline é acessível de duas formas: **CLI** (`src/index.js`, para
cron) e **interface web** (`src/server.js` + `public/`, para uso manual).

### Interface web

`npm run web` sobe o servidor em `http://localhost:3000` (mude com `PORT`).
O usuário busca ofertas por fonte/palavra-chave, vê os cards ordenados por
potencial de venda (com comissão, desconto, vendas e avaliação), seleciona
as que quer divulgar e:

- **📋 Copiar** — copia as mensagens formatadas para colar no grupo;
- **🟢 WhatsApp** — abre o WhatsApp via `wa.me` com a mensagem pronta, e o
  usuário só escolhe o grupo (semiautomático, zero risco de ban);
- **✈️ Telegram** — envia direto ao grupo pela Bot API oficial.

Cards da Shopee têm o botão **Gerar shortlink** (com o Sub-ID da toolbar
para atribuição por grupo/campanha). No Mercado Livre o botão fica
desabilitado — sem API aberta de afiliados — e a mensagem sai marcada com
"link comum". Tudo que foi copiado/enviado alimenta o dedupe e aparece como
"já enviado" nas próximas buscas.

### Hospedagem estática (opcional)

A mesma página também funciona hospedada como site estático, sem o
servidor Node: ela detecta a ausência do backend e entra em **modo
estático**, rodando tudo no navegador — Demo e Mercado Livre funcionam,
o dedupe vai para `localStorage`, Copiar/WhatsApp seguem integrais e o
Telegram pede token/chat ID do bot (salvos só naquele navegador). Shopee
e shortlinks reais ficam indisponíveis nesse modo, porque exigem o App
Secret do lado do servidor. Para publicar, basta servir `public/index.html`
junto com os módulos browser-safe de `src/` em qualquer host estático.

API JSON usada pela página (útil para integrar outra UI):

| Rota | Função |
|---|---|
| `GET /api/offers?source&keyword&limit` | coleta + ranking, mensagens prontas e flag de dedupe |
| `POST /api/shortlink` | `{source, originUrl, subIds}` → shortlink Shopee |
| `POST /api/share/telegram` | `{offers}` → envia via Bot API e marca no dedupe |
| `POST /api/mark-sent` | `{offers}` → alimenta o dedupe no fluxo semiautomático |

### Score de potencial de venda

```
score = w1·comissão_estimada + w2·log(1+vendas) + w3·desconto + w4·avaliação
```

Cada componente é normalizado (min-max) dentro do lote antes dos pesos, que
são configuráveis no `.env` (`SCORE_W_*`). Comissão estimada =
`preço × commission_rate`.

## Fontes

| Fonte | Dados | Link de afiliado |
|---|---|---|
| **Shopee** | API oficial de afiliados (GraphQL): comissão real, vendas, avaliação, desconto | ✅ `offerLink` pronto + `generateShortLink` com sub-IDs |
| **Mercado Livre** | API pública de busca: preço, vendas, desconto | ❌ sem API aberta de afiliados — a mensagem sai marcada para gerar o link manualmente no painel |

**Shopee:** solicite acesso à Open API no painel de afiliados (aprovação
~5–15 dias) e preencha `SHOPEE_APP_ID` / `SHOPEE_APP_SECRET` no `.env`.
A autenticação é por assinatura `SHA256(appId + timestamp + payload + secret)`
— já implementada em `src/sources/shopee.js`.

**Mercado Livre:** o Developer Portal de afiliados é indicado para quem já
gera 500+ cliques/dia. Automação de browser para gerar links é frágil e não
está incluída de propósito.

## Disparo — por que não há WhatsApp automático

A **Cloud API oficial da Meta não envia mensagens para grupos** (só 1:1), e
bibliotecas não oficiais (Baileys, whatsapp-web.js, Evolution API em modo
Baileys) violam os Termos de Serviço — a Meta bane o número sem aviso, e os
bloqueios se intensificaram em 2026. Por isso a camada de disparo oferece:

- **`console` (padrão)** — semiautomático: imprime a mensagem formatada
  pronta para colar no grupo de WhatsApp. Zero risco.
- **`telegram`** — Bot API oficial, posta em grupos/canais sem risco de ban.
  Configure `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`.

A camada é isolada atrás de `send(messages)` (`src/dispatch/index.js`):
para plugar outro destino, basta implementar essa interface — sem tocar em
coleta, ranking ou dedupe. Se ainda assim optar por um cliente não oficial
de WhatsApp, use um número descartável e trate o banimento como custo
esperado.

## Uso

```bash
cp .env.example .env   # preencha as credenciais que tiver

# Shopee: top 5 por potencial, mensagem no console
node --no-warnings src/index.js --source shopee --top 5

# Shopee com busca e envio ao Telegram
node --no-warnings src/index.js --source shopee --keyword "fone bluetooth" --dispatch telegram

# Mercado Livre (links sem afiliação, marcados na mensagem)
node --no-warnings src/index.js --source mercadolivre --keyword airfryer

# Só ver o ranking, sem enviar nem marcar como enviado
node --no-warnings src/index.js --source mock --dry-run
```

Para rodar recorrente, agende no cron:

```cron
0 9,13,19 * * *  cd /caminho/iqlinks && node --no-warnings src/index.js --source shopee --top 5 --dispatch telegram
```

## Estrutura

```
public/
  index.html            # interface web (vanilla JS, sem build)
src/
  index.js              # CLI / orquestração do pipeline
  server.js             # servidor HTTP + API JSON da interface web
  config.js             # .env → config tipada
  offer.js              # formato normalizado de oferta
  score.js              # ranking de potencial de venda
  store.js              # dedupe em SQLite (node:sqlite)
  format.js             # mensagem formatada (WhatsApp/Telegram)
  sources/
    index.js            # fábrica das fontes (CLI e web)
    shopee.js           # Shopee Affiliate Open API (GraphQL + assinatura)
    mercadolivre.js     # API pública de busca do ML
    mock.js             # dados de exemplo para o demo
  dispatch/
    index.js            # fábrica — interface send(messages)
    console.js          # semiautomático (colar no WhatsApp)
    telegram.js         # Telegram Bot API oficial
test/
  score.test.js
```

## Próximos passos naturais

- Filtros de faixa de preço/categoria antes do ranking
- Sub-IDs por grupo no `generateShortLink` para medir conversão por canal
- Trocar SQLite por Postgres quando houver mais de um worker
- Fonte Amazon (PA-API) e AliExpress (Portals API) na mesma interface
