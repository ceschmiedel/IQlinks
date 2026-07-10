import { normalizeOffer } from '../offer.js';

/**
 * Mercado Livre — API pública de busca.
 *
 * Limitação conhecida: o ML não expõe API aberta de afiliados para gerar
 * links programaticamente (o Developer Portal é indicado para quem já gera
 * 500+ cliques/dia). Esta fonte devolve o permalink comum com
 * isAffiliateLink=false; a conversão para link de afiliado fica como passo
 * manual no painel, ou via ferramenta própria de quem tem acesso ao portal.
 */
export class MercadoLivreSource {
  /** @param {{site: string, accessToken?: string}} cfg */
  constructor(cfg) {
    this.cfg = cfg;
  }

  /**
   * @param {{keyword?: string, limit?: number}} opts
   * @returns {Promise<import('../offer.js').Offer[]>}
   */
  async fetchOffers({ keyword = 'ofertas', limit = 50 } = {}) {
    const url = new URL(
      `https://api.mercadolibre.com/sites/${this.cfg.site}/search`,
    );
    url.searchParams.set('q', keyword || 'ofertas');
    url.searchParams.set('limit', String(Math.min(limit, 50)));

    const headers = {};
    if (this.cfg.accessToken) {
      headers.Authorization = `Bearer ${this.cfg.accessToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Mercado Livre API: HTTP ${res.status} ${await res.text()}`);
    }
    const body = await res.json();

    return (body.results ?? []).map((r) =>
      normalizeOffer({
        source: 'mercadolivre',
        itemId: String(r.id),
        title: r.title,
        price: Number(r.price),
        originalPrice: Number(r.original_price) || null,
        // Comissão varia por categoria (até ~16%); sem API de afiliados não
        // há taxa real por item. Deixe 0 e o ranking usa os demais sinais.
        commissionRate: 0,
        sales: Number(r.sold_quantity) || 0,
        rating: 0,
        link: r.permalink,
        isAffiliateLink: false,
        imageUrl: r.thumbnail,
        shopName: r.seller?.nickname ?? '',
      }),
    );
  }
}
