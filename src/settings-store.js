import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config, applySettings } from './config.js';

const SETTINGS_PATH = join(dirname(config.dbPath), 'settings.json');

/** Lê data/settings.json (se existir) e aplica sobre a config carregada do .env. */
export function loadPersistedSettings() {
  if (!existsSync(SETTINGS_PATH)) return;
  try {
    applySettings(JSON.parse(readFileSync(SETTINGS_PATH, 'utf8')));
  } catch {
    // Arquivo corrompido: ignora e segue só com o .env.
  }
}

/** Aplica as novas credenciais em memória e persiste em disco para o próximo start. */
export function saveSettings(partial) {
  applySettings(partial);
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  writeFileSync(
    SETTINGS_PATH,
    JSON.stringify(
      {
        shopeeAppId: config.shopee.appId,
        shopeeAppSecret: config.shopee.appSecret,
        meliAccessToken: config.meli.accessToken,
        telegramBotToken: config.telegram.botToken,
        telegramChatId: config.telegram.chatId,
      },
      null,
      2,
    ),
  );
}

/** Status para a UI: nunca expõe os segredos de volta ao navegador. */
export function settingsStatus() {
  return {
    shopeeAppId: config.shopee.appId,
    shopeeAppSecretSet: Boolean(config.shopee.appSecret),
    meliAccessTokenSet: Boolean(config.meli.accessToken),
    telegramChatId: config.telegram.chatId,
    telegramBotTokenSet: Boolean(config.telegram.botToken),
  };
}
