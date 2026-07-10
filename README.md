# IQlinks

Protótipo que **coleta ofertas de marketplaces, ranqueia por potencial de
venda e formata/envia os links de afiliado** para grupos. Zero dependências
npm — só Node.js 22.5+ (fetch, crypto e SQLite embutidos).

## Rodando agora (sem credenciais)

```bash
npm run demo
```

Roda o pipeline completo com dados de exemplo: ranking → dedupe → mensagem
formatada pronta para colar no grupo.

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
src/
  index.js              # CLI / orquestração do pipeline
  config.js             # .env → config tipada
  offer.js              # formato normalizado de oferta
  score.js              # ranking de potencial de venda
  store.js              # dedupe em SQLite (node:sqlite)
  format.js             # mensagem formatada (WhatsApp/Telegram)
  sources/
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
