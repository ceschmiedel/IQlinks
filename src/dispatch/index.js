import { ConsoleDispatcher } from './console.js';
import { TelegramDispatcher } from './telegram.js';

/**
 * Fábrica da camada de disparo. Toda implementação expõe apenas
 * `send(messages: string[])`, então trocar o destino (ou plugar outro no
 * futuro) não toca no restante do pipeline.
 *
 * WhatsApp de propósito não tem implementação automática aqui: a Cloud API
 * oficial não envia para grupos e bibliotecas não oficiais (Baileys etc.)
 * violam os ToS e derrubam o número. Use `console` e cole no grupo, ou
 * migre o público para Telegram.
 */
export function createDispatcher(name, config) {
  switch (name) {
    case 'console':
      return new ConsoleDispatcher();
    case 'telegram':
      return new TelegramDispatcher(config.telegram);
    default:
      throw new Error(
        `Dispatcher desconhecido: "${name}" (use "console" ou "telegram").`,
      );
  }
}
