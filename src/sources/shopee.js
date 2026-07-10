import { createHash } from 'node:crypto';
import { normalizeOffer } from '../offer.js';

/**
 * Shopee Affiliate Open API (GraphQL).
 *
 * Autenticação por assinatura: SHA256(appId + timestamp + payload + secret),
 * enviada no header Authorization. Docs: painel de afiliados Shopee > Open API.
 */
export class ShopeeSource {
  /** @param {{appId: string, appSecret: string, endpoint: string}} cfg */
  constructor(cfg) {
    if (!cfg.appId || !cfg.appSecret) {
      throw new Error(
        'Shopee: defina SHOPEE_APP_ID e SHOPEE_APP_SECRET no .env ' +
          '(conta aprovada no programa de afiliados, menu Open API).',
      );
    }
    this.cfg = cfg;
  }

  async #graphql(query, variables = {}) {
    const payload = JSON.stringify({ query, variables });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash('sha256')
      .update(this.cfg.appId + timestamp + payload + this.cfg.appSecret)
      .digest('hex');

    const res = await fetch(this.cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SHA256 Credential=${this.cfg.appId}, Timestamp=${timestamp}, Signature=${signature}`,
      },
      body: payload,
    });
    if (!res.ok) {
      throw new Error(`Shopee API: HTTP ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    if (body.errors?.length) {
      throw new Error(`Shopee API: ${JSON.stringify(body.errors)}`);
    }
    return body.data;
  }

  /**
   * Busca ofertas de produto já ordenadas por maior comissão no lado da API
   * (sortType 5). O ranking local refina com vendas/desconto/avaliação.
   *
   * @param {{keyword?: string, limit?: number}} opts
   * @returns {Promise<import('../offer.js').Offer[]>}
   */
  async fetchOffers({ keyword = '', limit = 50 } = {}) {
    const query = `
      query ProductOffers($keyword: String, $limit: Int, $page: Int, $sortType: Int) {
        productOfferV2(keyword: $keyword, limit: $limit, page: $page, sortType: $sortType) {
          nodes {
            itemId
            productName
            priceMin
            priceMax
            commissionRate
            sales
            ratingStar
            priceDiscountRate
            imageUrl
            shopName
            offerLink
            productLink
          }
        }
      }
    `;
    const data = await this.#graphql(query, {
      keyword: keyword || null,
      limit,
      page: 1,
      sortType: 5, // maior taxa de comissão primeiro
    });

    const nodes = data?.productOfferV2?.nodes ?? [];
    return nodes.map((n) =>
      normalizeOffer({
        source: 'shopee',
        itemId: String(n.itemId),
        title: n.productName,
        price: Number(n.priceMin),
        originalPrice: null,
        commissionRate: Number(n.commissionRate),
        sales: Number(n.sales),
        rating: Number(n.ratingStar),
        discountRate: Number(n.priceDiscountRate) / 100,
        // offerLink já é o link de afiliado rastreável da conta.
        link: n.offerLink || n.productLink,
        isAffiliateLink: Boolean(n.offerLink),
        imageUrl: n.imageUrl,
        shopName: n.shopName,
      }),
    );
  }

  /**
   * Encurta um link com sub-IDs para atribuição por grupo/campanha.
   * Útil quando se parte de um productLink em vez do offerLink pronto.
   *
   * @param {string} originUrl
   * @param {string[]} subIds até 5 sub-IDs
   * @returns {Promise<string>}
   */
  async generateShortLink(originUrl, subIds = []) {
    const mutation = `
      mutation ShortLink($input: ShortLinkInput!) {
        generateShortLink(input: $input) { shortLink }
      }
    `;
    const data = await this.#graphql(mutation, {
      input: { originUrl, subIds },
    });
    return data.generateShortLink.shortLink;
  }
}
