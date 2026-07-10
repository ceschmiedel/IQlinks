/**
 * Disparo semiautomático: imprime as mensagens formatadas para revisar e
 * colar no grupo de WhatsApp. Zero risco de banimento — a API oficial da
 * Meta não posta em grupos, e clientes não oficiais violam os Termos de
 * Serviço do WhatsApp.
 */
export class ConsoleDispatcher {
  /** @param {string[]} messages */
  async send(messages) {
    for (const [i, msg] of messages.entries()) {
      console.log(`\n───── mensagem ${i + 1}/${messages.length} ─────\n`);
      console.log(msg);
    }
    console.log('\n──────────────────────────────');
    console.log(`${messages.length} mensagem(ns) prontas para colar no grupo.`);
  }
}
