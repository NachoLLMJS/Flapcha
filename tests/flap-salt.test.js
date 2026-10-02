import test from 'node:test';
import assert from 'node:assert/strict';
import { mineVanitySalt, predictCloneAddress } from '../server/flap-salt.js';

const deployer = '0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0';
const implementation = '0x8b4329947e34b6d56d71a3385cac122bade7d78d';

test('predictCloneAddress is deterministic for implementation, deployer and salt', () => {
  const salt = `0x${'01'.repeat(32)}`;
  assert.equal(
    predictCloneAddress({ deployer, implementation, salt }),
    predictCloneAddress({ deployer, implementation, salt }),
  );
});

test('mineVanitySalt returns an address with the requested suffix', () => {
  const result = mineVanitySalt({ deployer, implementation, suffix: '0', maxAttempts: 200 });
  assert.match(result.address.toLowerCase(), /0$/);
  assert.match(result.salt, /^0x[a-f0-9]{64}$/);
});
