import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Dedupe de ofertas já enviadas, em SQLite (builtin do Node 22.5+).
 * Troca por Postgres depois sem afetar o resto: a interface é só
 * wasSentRecently / markSent.
 */
export class SentStore {
  constructor(dbPath) {
    if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sent_offers (
        source   TEXT NOT NULL,
        item_id  TEXT NOT NULL,
        title    TEXT,
        price    REAL,
        score    REAL,
        sent_at  TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (source, item_id)
      )
    `);
  }

  /** @returns {boolean} true se a oferta foi enviada nos últimos `days` dias */
  wasSentRecently(offer, days) {
    const row = this.db
      .prepare(
        `SELECT 1 FROM sent_offers
         WHERE source = ? AND item_id = ?
           AND sent_at >= datetime('now', ?)`,
      )
      .get(offer.source, offer.itemId, `-${days} days`);
    return row !== undefined;
  }

  markSent(offer) {
    this.db
      .prepare(
        `INSERT INTO sent_offers (source, item_id, title, price, score, sent_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT (source, item_id) DO UPDATE SET
           price = excluded.price,
           score = excluded.score,
           sent_at = excluded.sent_at`,
      )
      .run(offer.source, offer.itemId, offer.title, offer.price, offer.score ?? 0);
  }

  close() {
    this.db.close();
  }
}
