/**
 * Disparo via Telegram Bot API (oficial, sem risco de banimento).
 * Adicione o bot ao grupo/canal e use o chat_id (grupos são negativos,
 * ex.: -1001234567890).
 */
export class TelegramDispatcher {
  /** @param {{botToken: string, chatId: string}} cfg */
  constructor(cfg) {
    if (!cfg.botToken || !cfg.chatId) {
      throw new Error(
        'Telegram: defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no .env.',
      );
    }
    this.cfg = cfg;
  }

  /** @param {string[]} messages */
  async send(messages) {
    for (const text of messages) {
      const res = await fetch(
        `https://api.telegram.org/bot${this.cfg.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.cfg.chatId,
            text,
            // Markdown legado do Telegram entende *negrito* como o WhatsApp,
            // então a mesma mensagem serve para os dois.
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
          }),
        },
      );
      const body = await res.json();
      if (!body.ok) {
        throw new Error(`Telegram API: ${body.description ?? res.status}`);
      }
      // Bot API limita ~20 msg/min por grupo; a pausa evita 429.
      await new Promise((r) => setTimeout(r, 3100));
    }
    console.log(`${messages.length} mensagem(ns) enviadas ao Telegram.`);
  }
}
