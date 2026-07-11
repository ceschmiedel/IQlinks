import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { rankOffers } from './score.js';
import { SentStore } from './store.js';
import { formatOfferMessage } from './format.js';
import { createDispatcher } from './dispatch/index.js';
import { createSource } from './sources/index.js';
import { ShopeeSource } from './sources/shopee.js';
import { loadPersistedSettings, saveSettings, settingsStatus } from './settings-store.js';

loadPersistedSettings();

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const store = new SentStore(config.dbPath);

function json(res, status, data) {
  res
    .writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    .end(JSON.stringify(data));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    const err = new Error('Corpo da requisição não é JSON válido.');
    err.statusCode = 400;
    throw err;
  }
}

/**
 * GET /api/offers?source&keyword&limit
 * Coleta, ranqueia e devolve as ofertas com a mensagem já formatada e a
 * flag de dedupe — a UI decide o que compartilhar.
 */
async function handleOffers(url, res) {
  const name = url.searchParams.get('source') || 'mock';
  const source = createSource(name);
  const offers = await source.fetchOffers({
    keyword: url.searchParams.get('keyword') || '',
    limit: Number(url.searchParams.get('limit')) || 50,
  });
  const ranked = rankOffers(offers, config.score.weights);
  json(res, 200, {
    offers: ranked.map((o) => ({
      ...o,
      message: formatOfferMessage(o),
      sentRecently: store.wasSentRecently(o, config.dedupeDays),
    })),
    dedupeDays: config.dedupeDays,
  });
}

/**
 * POST /api/shortlink {source, originUrl, subIds}
 * Shopee gera shortlink real; a fonte mock devolve um link fictício para a
 * demo funcionar sem credenciais.
 */
async function handleShortlink(req, res) {
  const { source, originUrl, subIds = [] } = await readJsonBody(req);
  if (!originUrl) {
    return json(res, 400, { error: 'originUrl é obrigatório.' });
  }
  if (source === 'mock') {
    const token = Math.random().toString(36).slice(2, 9);
    return json(res, 200, { shortLink: `https://s.shopee.com.br/demo-${token}` });
  }
  const shopee = new ShopeeSource(config.shopee);
  const cleanSubIds = subIds.filter(Boolean).slice(0, 5);
  json(res, 200, { shortLink: await shopee.generateShortLink(originUrl, cleanSubIds) });
}

/**
 * POST /api/share/telegram {offers}
 * Reenvia pela Bot API oficial e marca no dedupe. A mensagem é regenerada
 * no servidor a partir da oferta (respeitando shortlink atualizado no link).
 */
async function handleShareTelegram(req, res) {
  const { offers = [] } = await readJsonBody(req);
  if (offers.length === 0) {
    return json(res, 400, { error: 'Nenhuma oferta selecionada.' });
  }
  const dispatcher = createDispatcher('telegram', config);
  await dispatcher.send(offers.map(formatOfferMessage));
  for (const o of offers) store.markSent(o);
  json(res, 200, { sent: offers.length });
}

/**
 * POST /api/mark-sent {offers}
 * Usado pelo fluxo semiautomático (copiar / abrir WhatsApp) para alimentar
 * o dedupe mesmo sem envio pelo servidor.
 */
async function handleMarkSent(req, res) {
  const { offers = [] } = await readJsonBody(req);
  for (const o of offers) store.markSent(o);
  json(res, 200, { marked: offers.length });
}

/**
 * GET /api/settings
 * Status das credenciais para a UI — nunca devolve os segredos, só se
 * estão preenchidos (e o App ID / Chat ID, que não são sensíveis).
 */
async function handleGetSettings(res) {
  json(res, 200, settingsStatus());
}

/**
 * POST /api/settings {shopeeAppId, shopeeAppSecret, meliAccessToken, telegramBotToken, telegramChatId}
 * Aplica em memória e persiste em data/settings.json. Campos de senha
 * enviados em branco preservam o valor já salvo (ver applySettings).
 */
async function handlePostSettings(req, res) {
  const body = await readJsonBody(req);
  saveSettings(body);
  json(res, 200, settingsStatus());
}

async function handleStatic(url, res) {
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = normalize(join(PUBLIC_DIR, path));
  if (!file.startsWith(PUBLIC_DIR + sep)) {
    return json(res, 404, { error: 'Não encontrado.' });
  }
  try {
    const data = await readFile(file);
    res
      .writeHead(200, {
        'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
      })
      .end(data);
  } catch {
    json(res, 404, { error: 'Não encontrado.' });
  }
}

export const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/api/offers') {
      return await handleOffers(url, res);
    }
    if (req.method === 'POST' && url.pathname === '/api/shortlink') {
      return await handleShortlink(req, res);
    }
    if (req.method === 'POST' && url.pathname === '/api/share/telegram') {
      return await handleShareTelegram(req, res);
    }
    if (req.method === 'POST' && url.pathname === '/api/mark-sent') {
      return await handleMarkSent(req, res);
    }
    if (req.method === 'GET' && url.pathname === '/api/settings') {
      return await handleGetSettings(res);
    }
    if (req.method === 'POST' && url.pathname === '/api/settings') {
      return await handlePostSettings(req, res);
    }
    if (req.method === 'GET') {
      return await handleStatic(url, res);
    }
    json(res, 404, { error: 'Não encontrado.' });
  } catch (err) {
    json(res, err.statusCode ?? 500, { error: err.message });
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`IQlinks web rodando em http://localhost:${port}`);
});
