import { config } from '../config.js';
import { ShopeeSource } from './shopee.js';
import { MercadoLivreSource } from './mercadolivre.js';
import { MockSource } from './mock.js';

/** Fábrica das fontes de ofertas, compartilhada pelo CLI e pelo servidor web. */
export function createSource(name) {
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
