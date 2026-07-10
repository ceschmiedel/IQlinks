# IQlinks

Protótipo que **coleta ofertas de marketplaces, ranqueia por potencial de
venda e formata/envia os links de afiliado** para grupos. Zero dependências
npm — só Node.js 22.5+ (fetch, crypto e SQLite embutidos).

## Rodando agora (sem credenciais)

```bash
npm run web    # interface web em http://localhost:3000
npm run demo   # mesma coisa via CLI
```

Na interface web, use a fonte **Demo** para rodar o fluxo completo sem
credenciais: buscar → ranquear → selecionar → gerar shortlink → compartilhar.
O CLI roda o mesmo pipeline e imprime as mensagens no terminal.

```bash
npm test          # testes do ranking, dedupe e formatação
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

### GitHub Pages (modo estático)

O push na branch principal aciona `.github/workflows/pages.yml`, que monta
o site e o publica na branch `gh-pages` — em repositório público o GitHub
habilita o Pages automaticamente para essa branch. O site fica em
`https://<usuario>.github.io/IQlinks/`.

Como o Pages não roda o servidor Node, a página detecta a ausência do
backend e entra em **modo estático**, importando os mesmos módulos ES de
`src/` direto no navegador:

- **Demo** e **Mercado Livre** funcionam (a busca do ML é chamada do
  navegador; depende do CORS da API pública);
- **dedupe** vai para `localStorage` em vez de SQLite;
- **Telegram** pede token e chat ID do bot na primeira vez e salva só no
  navegador — ciente de que o token fica exposto a quem usar aquele
  navegador; para uso sério, prefira o modo servidor;
- **Copiar / WhatsApp** funcionam integralmente (são client-side por design);
- **Shopee e shortlinks reais ficam indisponíveis**: exigem o App Secret,
  que não pode ser embutido em página pública. Para testes reais com a
  Shopee, rode `npm run web` localmente ou hospede o servidor Node em um
  host com backend (Render, Railway, Fly.io, VPS).

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
