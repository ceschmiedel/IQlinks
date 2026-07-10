const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * Monta a mensagem de oferta pronta para grupo (WhatsApp/Telegram usam a
 * mesma sintaxe de *negrito* e ~riscado~).
 *
 * @param {import('./offer.js').Offer} offer
 */
export function formatOfferMessage(offer) {
  const lines = ['🔥 *OFERTA IMPERDÍVEL* 🔥', '', `*${offer.title}*`, ''];

  if (offer.originalPrice && offer.originalPrice > offer.price) {
    const pct = Math.round(offer.discountRate * 100);
    lines.push(`~${brl.format(offer.originalPrice)}~`);
    lines.push(`💰 *${brl.format(offer.price)}* (${pct}% OFF)`);
  } else {
    lines.push(`💰 *${brl.format(offer.price)}*`);
  }

  if (offer.rating > 0) {
    lines.push(`⭐ ${offer.rating.toFixed(1)} | 🛒 ${formatSales(offer.sales)} vendidos`);
  } else if (offer.sales > 0) {
    lines.push(`🛒 ${formatSales(offer.sales)} vendidos`);
  }

  lines.push('', `👉 ${offer.link}`);

  if (!offer.isAffiliateLink) {
    lines.push('', '⚠️ link comum — gere o link de afiliado antes de postar');
  }

  return lines.join('\n');
}

function formatSales(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)} mil`;
  return String(n);
}
