// Carrega .env (se existir) e expõe a configuração tipada da aplicação.
try {
  process.loadEnvFile();
} catch {
  // Sem .env: segue com as variáveis de ambiente do processo.
}

const num = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
};

export const config = {
  shopee: {
    appId: process.env.SHOPEE_APP_ID ?? '',
    appSecret: process.env.SHOPEE_APP_SECRET ?? '',
    endpoint:
      process.env.SHOPEE_ENDPOINT ??
      'https://open-api.affiliate.shopee.com.br/graphql',
  },
  meli: {
    site: process.env.MELI_SITE ?? 'MLB',
    accessToken: process.env.MELI_ACCESS_TOKEN ?? '',
  },
  score: {
    weights: {
      commission: num('SCORE_W_COMMISSION', 0.4),
      sales: num('SCORE_W_SALES', 0.3),
      discount: num('SCORE_W_DISCOUNT', 0.2),
      rating: num('SCORE_W_RATING', 0.1),
    },
  },
  dedupeDays: num('DEDUPE_DAYS', 7),
  dispatch: process.env.DISPATCH ?? 'console',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: process.env.TELEGRAM_CHAT_ID ?? '',
  },
  dbPath: process.env.DB_PATH ?? 'data/iqlinks.db',
};
