/**
 * Ranking de potencial de venda.
 *
 * score = w1·comissão_estimada + w2·log(1+vendas) + w3·desconto + w4·avaliação
 *
 * Cada componente é normalizado para 0..1 dentro do lote (min-max) antes de
 * aplicar os pesos — comissão em reais, vendas em unidades e avaliação em
 * estrelas vivem em escalas incomparáveis, e sem normalizar um componente
 * dominaria os demais.
 */

const components = {
  commission: (o) => o.price * o.commissionRate,
  sales: (o) => Math.log1p(o.sales),
  discount: (o) => o.discountRate,
  rating: (o) => o.rating,
};

/**
 * Calcula o score de cada oferta e devolve o lote ordenado do maior para o
 * menor potencial. Não muta o array de entrada.
 *
 * @param {import('./offer.js').Offer[]} offers
 * @param {{commission:number, sales:number, discount:number, rating:number}} weights
 */
export function rankOffers(offers, weights) {
  if (offers.length === 0) return [];

  const raw = offers.map((o) =>
    Object.fromEntries(
      Object.entries(components).map(([k, fn]) => [k, fn(o)]),
    ),
  );

  const scales = {};
  for (const k of Object.keys(components)) {
    const values = raw.map((r) => r[k]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    scales[k] = { min, span: max - min };
  }

  const normalize = (k, v) => {
    const { min, span } = scales[k];
    // Lote inteiro com o mesmo valor: componente não discrimina ninguém.
    return span > 0 ? (v - min) / span : 0;
  };

  return offers
    .map((offer, i) => {
      let score = 0;
      for (const k of Object.keys(components)) {
        score += (weights[k] ?? 0) * normalize(k, raw[i][k]);
      }
      return { ...offer, score };
    })
    .sort((a, b) => b.score - a.score);
}
