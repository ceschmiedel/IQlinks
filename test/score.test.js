import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankOffers } from '../src/score.js';
import { normalizeOffer } from '../src/offer.js';
import { SentStore } from '../src/store.js';
import { formatOfferMessage } from '../src/format.js';

const weights = { commission: 0.4, sales: 0.3, discount: 0.2, rating: 0.1 };

const offer = (overrides) =>
  normalizeOffer({
    source: 'mock',
    itemId: 'x',
    title: 'Produto',
    price: 100,
    commissionRate: 0.1,
    sales: 100,
    rating: 4,
    link: 'https://example.com',
    isAffiliateLink: true,
    ...overrides,
  });

test('rankOffers ordena do maior para o menor score', () => {
  const strong = offer({
    itemId: 'forte',
    commissionRate: 0.2,
    sales: 10000,
    originalPrice: 200,
    rating: 5,
  });
  const weak = offer({ itemId: 'fraco', commissionRate: 0.01, sales: 5, rating: 3 });
  const ranked = rankOffers([weak, strong], weights);

  assert.equal(ranked[0].itemId, 'forte');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('rankOffers não muta a entrada e devolve lote vazio para entrada vazia', () => {
  const input = [offer({ itemId: 'a' })];
  rankOffers(input, weights);
  assert.equal(input[0].score, undefined);
  assert.deepEqual(rankOffers([], weights), []);
});

test('componente constante no lote não distorce o ranking', () => {
  // Mesma comissão e avaliação para todos: só vendas e desconto decidem.
  const a = offer({ itemId: 'a', sales: 10 });
  const b = offer({ itemId: 'b', sales: 9000 });
  const ranked = rankOffers([a, b], weights);
  assert.equal(ranked[0].itemId, 'b');
});

test('normalizeOffer deriva desconto do preço original', () => {
  const o = normalizeOffer({
    source: 'mock',
    itemId: 'd',
    title: 'x',
    price: 50,
    originalPrice: 100,
    link: 'https://example.com',
  });
  assert.equal(o.discountRate, 0.5);
});

test('SentStore deduplica dentro da janela', () => {
  const store = new SentStore(':memory:');
  const o = offer({ itemId: 'dedupe-1', score: 0.9 });

  assert.equal(store.wasSentRecently(o, 7), false);
  store.markSent(o);
  assert.equal(store.wasSentRecently(o, 7), true);
  // Reenvio (upsert) não pode lançar erro.
  store.markSent(o);
  store.close();
});

test('formatOfferMessage sinaliza link sem afiliação', () => {
  const msg = formatOfferMessage(offer({ isAffiliateLink: false }));
  assert.match(msg, /gere o link de afiliado/);

  const ok = formatOfferMessage(offer({ isAffiliateLink: true }));
  assert.doesNotMatch(ok, /gere o link de afiliado/);
});
