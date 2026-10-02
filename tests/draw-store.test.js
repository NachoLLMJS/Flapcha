import test from 'node:test';
import assert from 'node:assert/strict';
import { DrawStore } from '../server/draw-store.js';

const wallet = '0x1111111111111111111111111111111111111111';

test('wallet cannot reroll while an active draw is locked', () => {
  const store = new DrawStore({ ttlMs: 60_000, now: () => 1_000 });
  store.lock(wallet, { speciesId: 25 });

  assert.throws(() => store.lock(wallet, { speciesId: 6 }), /active draw/i);
  assert.equal(store.get(wallet).speciesId, 25);
});

test('completed launch consumes a draw and unlocks the wallet', () => {
  const store = new DrawStore({ ttlMs: 60_000, now: () => 1_000 });
  const first = store.lock(wallet, { speciesId: 25 });
  store.markLaunched(wallet, first.id, '0x2222222222222222222222222222222222222222');

  const second = store.lock(wallet, { speciesId: 6 });
  assert.notEqual(second.id, first.id);
  assert.equal(store.get(wallet).speciesId, 6);
});

test('expired draw can be replaced', () => {
  let now = 1_000;
  const store = new DrawStore({ ttlMs: 10, now: () => now });
  store.lock(wallet, { speciesId: 25 });
  now = 1_011;

  assert.doesNotThrow(() => store.lock(wallet, { speciesId: 150 }));
  assert.equal(store.get(wallet).speciesId, 150);
});
