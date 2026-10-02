import crypto from 'node:crypto';

const normalizeWallet = (wallet) => {
  const value = String(wallet || '').toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(value)) throw new Error('Invalid wallet address');
  return value;
};

export class DrawStore {
  constructor({ ttlMs = 15 * 60_000, now = Date.now } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.records = new Map();
  }

  get(wallet) {
    const key = normalizeWallet(wallet);
    const record = this.records.get(key);
    if (!record) return null;
    if (record.status === 'locked' && record.expiresAt <= this.now()) {
      this.records.delete(key);
      return null;
    }
    return record;
  }

  lock(wallet, draw) {
    const key = normalizeWallet(wallet);
    const existing = this.get(key);
    if (existing?.status === 'locked') throw new Error('Wallet already has an active draw');
    const createdAt = this.now();
    const record = {
      ...draw,
      id: crypto.randomUUID(),
      wallet: key,
      status: 'locked',
      createdAt,
      expiresAt: createdAt + this.ttlMs,
    };
    this.records.set(key, record);
    return record;
  }

  markLaunched(wallet, drawId, token) {
    const key = normalizeWallet(wallet);
    const record = this.get(key);
    if (!record || record.id !== drawId) throw new Error('Active draw not found');
    this.records.set(key, { ...record, status: 'launched', token, launchedAt: this.now() });
    return this.records.get(key);
  }
}
