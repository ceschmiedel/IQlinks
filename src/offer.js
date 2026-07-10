/**
 * Formato normalizado de oferta, comum a todas as fontes.
 *
 * @typedef {object} Offer
 * @property {string} source        "shopee" | "mercadolivre" | "mock"
 * @property {string} itemId        id único dentro da fonte
 * @property {string} title
 * @property {number} price         preço atual em BRL
 * @property {number|null} originalPrice  preço sem desconto, se conhecido
 * @property {number} commissionRate     fração (0.12 = 12%); 0 se desconhecida
 * @property {number} sales         unidades vendidas (histórico da fonte)
 * @property {number} rating        0..5; 0 se desconhecida
 * @property {number} discountRate  fração 0..1; derivada de originalPrice se ausente
 * @property {string} link          link de afiliado quando a fonte gera; senão o permalink
 * @property {boolean} isAffiliateLink  true se `link` já rastreia comissão
 * @property {string} [imageUrl]
 * @property {string} [shopName]
 * @property {number} [score]       preenchido pelo ranking
 */

/** Completa campos deriváveis e aplica defaults seguros. */
export function normalizeOffer(offer) {
  const price = Number(offer.price) || 0;
  const originalPrice = Number(offer.originalPrice) || null;
  let discountRate = Number(offer.discountRate) || 0;
  if (!discountRate && originalPrice && originalPrice > price) {
    discountRate = (originalPrice - price) / originalPrice;
  }
  return {
    imageUrl: '',
    shopName: '',
    ...offer,
    price,
    originalPrice,
    discountRate,
    commissionRate: Number(offer.commissionRate) || 0,
    sales: Number(offer.sales) || 0,
    rating: Number(offer.rating) || 0,
    isAffiliateLink: Boolean(offer.isAffiliateLink),
  };
}
