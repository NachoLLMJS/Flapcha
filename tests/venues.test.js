import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLAP_PORTAL,
  buildFlapLaunchParams,
  verifyLaunchReceipt,
} from '../src/lib/venues.js';

const account = '0x1111111111111111111111111111111111111111';

test('Flap direct launch uses currently enabled Tax Token V3 without a custom vault', () => {
  const params = buildFlapLaunchParams({
    account,
    name: 'Pikachu',
    symbol: 'PIKA',
    meta: 'bafy-meta',
    salt: `0x${'12'.repeat(32)}`,
  });

  assert.equal(params.quoteToken, '0x0000000000000000000000000000000000000000');
  assert.equal(params.tokenVersion, 6);
  assert.equal(params.buyTaxRate, 100);
  assert.equal(params.sellTaxRate, 100);
  assert.equal(params.taxDuration, 365 * 24 * 60 * 60);
  assert.equal(params.antiFarmerDuration, 60 * 60);
  assert.equal(params.mktBps, 10000);
  assert.equal(params.deflationBps + params.dividendBps + params.lpBps, 0);
  assert.equal(params.beneficiary, account);
});

test('Flap receipt must contain matching canonical TokenCreated event', () => {
  const result = verifyLaunchReceipt({
    portal: FLAP_PORTAL,
    expected: { creator: account, name: 'Pikachu', symbol: 'PIKA', meta: 'bafy-meta' },
    logs: [{
      address: FLAP_PORTAL,
      eventName: 'TokenCreated',
      args: {
        creator: account,
        token: '0x2222222222222222222222222222222222228888',
        name: 'Pikachu',
        symbol: 'PIKA',
        meta: 'bafy-meta',
      },
    }],
  });

  assert.equal(result.token, '0x2222222222222222222222222222222222228888');
});
