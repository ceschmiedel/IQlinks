import { parseArgs } from 'node:util';
import { config } from './config.js';
import { rankOffers } from './score.js';
import { SentStore } from './store.js';
import { formatOfferMessage } from './format.js';
import { createDispatcher } from './dispatch/index.js';
import { ShopeeSource } from './sources/shopee.js';
import { MercadoLivreSource } from './sources/mercadolivre.js';
import { MockSource } from './sources/mock.js';

function createSource(name) {
  switch (name) {
    case 'shopee':
      return new ShopeeSource(config.shopee);
    case 'mercadolivre':
    case 'meli':
      return new MercadoLivreSource(config.meli);
    case 'mock':
      return new MockSource();
    default:
      throw new Error(
        `Fonte desconhecida: "${name}" (use "shopee", "mercadolivre" ou "mock").`,
      );
  }
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      source: { type: 'string', default: 'shopee' },
      keyword: { type: 'string', default: '' },
      top: { type: 'string', default: '5' },
      limit: { type: 'string', default: '50' },
      dispatch: { type: 'string', default: config.dispatch },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });

  if (args.help) {
    console.log(`Uso: node src/index.js [opções]

  --source     shopee | mercadolivre | mock   (padrão: shopee)
  --keyword    termo de busca opcional
  --limit      quantas ofertas coletar da fonte (padrão: 50)
  --top        quantas enviar após o ranking (padrão: 5)
  --dispatch   console | telegram             (padrão: ${config.dispatch})
  --dry-run    ranqueia e mostra, sem enviar nem marcar como enviada

Exemplo sem credenciais: npm run demo`);
    return;
  }

  const top = Number(args.top);
  const source = createSource(args.source);
  const store = new SentStore(config.dbPath);

  try {
    console.log(`Coletando ofertas de "${args.source}"...`);
    const offers = await source.fetchOffers({
      keyword: args.keyword,
      limit: Number(args.limit),
    });
    console.log(`${offers.length} ofertas coletadas.`);

    const ranked = rankOffers(offers, config.score.weights);
    const fresh = ranked.filter(
      (o) => !store.wasSentRecently(o, config.dedupeDays),
    );
    const skipped = ranked.length - fresh.length;
    if (skipped > 0) {
      console.log(
        `${skipped} oferta(s) ignoradas (enviadas nos últimos ${config.dedupeDays} dias).`,
      );
    }

    const selected = fresh.slice(0, top);
    if (selected.length === 0) {
      console.log('Nenhuma oferta nova para enviar.');
      return;
    }

    console.log('\nTop ofertas por potencial de venda:');
    for (const o of selected) {
      console.log(
        `  ${o.score.toFixed(3)}  [${o.source}] ${o.title.slice(0, 60)}`,
      );
    }

    if (args['dry-run']) {
      console.log('\n--dry-run: nada foi enviado.');
      return;
    }

    const dispatcher = createDispatcher(args.dispatch, config);
    await dispatcher.send(selected.map(formatOfferMessage));
    for (const o of selected) store.markSent(o);
  } finally {
    store.close();
  }
}

main().catch((err) => {
  console.error(`Erro: ${err.message}`);
  process.exitCode = 1;
});
