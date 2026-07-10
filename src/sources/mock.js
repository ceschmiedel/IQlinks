import { normalizeOffer } from '../offer.js';

/**
 * Fonte de demonstração: permite rodar o pipeline completo (ranking, dedupe,
 * formatação, disparo) sem credenciais de nenhum marketplace.
 */
export class MockSource {
  async fetchOffers() {
    return SAMPLE.map(normalizeOffer);
  }
}

const SAMPLE = [
  {
    source: 'mock',
    itemId: 'fone-tws-01',
    title: 'Fone de Ouvido Bluetooth TWS com Cancelamento de Ruído',
    price: 89.9,
    originalPrice: 179.9,
    commissionRate: 0.15,
    sales: 12500,
    rating: 4.8,
    link: 'https://s.shopee.com.br/exemplo-fone',
    isAffiliateLink: true,
    shopName: 'TechSound Oficial',
  },
  {
    source: 'mock',
    itemId: 'airfryer-02',
    title: 'Air Fryer 4L Digital 1500W Antiaderente',
    price: 249.0,
    originalPrice: 399.0,
    commissionRate: 0.08,
    sales: 8900,
    rating: 4.9,
    link: 'https://s.shopee.com.br/exemplo-airfryer',
    isAffiliateLink: true,
    shopName: 'CasaPrática',
  },
  {
    source: 'mock',
    itemId: 'smartwatch-03',
    title: 'Smartwatch com Monitor Cardíaco e GPS',
    price: 199.9,
    originalPrice: 249.9,
    commissionRate: 0.18,
    sales: 3200,
    rating: 4.5,
    link: 'https://s.shopee.com.br/exemplo-watch',
    isAffiliateLink: true,
    shopName: 'WearBR',
  },
  {
    source: 'mock',
    itemId: 'capinha-04',
    title: 'Capinha de Silicone para Celular Diversas Cores',
    price: 12.9,
    originalPrice: null,
    commissionRate: 0.2,
    sales: 45000,
    rating: 4.3,
    link: 'https://s.shopee.com.br/exemplo-capinha',
    isAffiliateLink: true,
    shopName: 'AcessóriosJá',
  },
  {
    source: 'mock',
    itemId: 'notebook-05',
    title: 'Notebook 15" 8GB RAM 256GB SSD',
    price: 2399.0,
    originalPrice: 2899.0,
    commissionRate: 0.02,
    sales: 640,
    rating: 4.6,
    link: 'https://produto.mercadolivre.com.br/exemplo-notebook',
    isAffiliateLink: false,
    shopName: 'InfoStore',
  },
];
