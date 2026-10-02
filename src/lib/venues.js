export const FLAP_PORTAL = '0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const flapPortalAbi = [{
  type: 'function',
  name: 'newTokenV6',
  stateMutability: 'payable',
  inputs: [{
    name: 'params',
    type: 'tuple',
    components: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'meta', type: 'string' },
      { name: 'dexThresh', type: 'uint8' },
      { name: 'salt', type: 'bytes32' },
      { name: 'migratorType', type: 'uint8' },
      { name: 'quoteToken', type: 'address' },
      { name: 'quoteAmt', type: 'uint256' },
      { name: 'beneficiary', type: 'address' },
      { name: 'permitData', type: 'bytes' },
      { name: 'extensionID', type: 'bytes32' },
      { name: 'extensionData', type: 'bytes' },
      { name: 'dexId', type: 'uint8' },
      { name: 'lpFeeProfile', type: 'uint8' },
      { name: 'buyTaxRate', type: 'uint16' },
      { name: 'sellTaxRate', type: 'uint16' },
      { name: 'taxDuration', type: 'uint64' },
      { name: 'antiFarmerDuration', type: 'uint64' },
      { name: 'mktBps', type: 'uint16' },
      { name: 'deflationBps', type: 'uint16' },
      { name: 'dividendBps', type: 'uint16' },
      { name: 'lpBps', type: 'uint16' },
      { name: 'minimumShareBalance', type: 'uint256' },
      { name: 'dividendToken', type: 'address' },
      { name: 'commissionReceiver', type: 'address' },
      { name: 'tokenVersion', type: 'uint8' },
    ],
  }],
  outputs: [{ name: 'token', type: 'address' }],
}, {
  type: 'event',
  name: 'TokenCreated',
  inputs: [
    { name: 'ts', type: 'uint256', indexed: false },
    { name: 'creator', type: 'address', indexed: false },
    { name: 'nonce', type: 'uint256', indexed: false },
    { name: 'token', type: 'address', indexed: false },
    { name: 'name', type: 'string', indexed: false },
    { name: 'symbol', type: 'string', indexed: false },
    { name: 'meta', type: 'string', indexed: false },
  ],
}];

export function buildFlapLaunchParams({ account, name, symbol, meta, salt, quoteAmt = 0n }) {
  return {
    name,
    symbol,
    meta,
    dexThresh: 1,
    salt,
    migratorType: 1,
    quoteToken: ZERO_ADDRESS,
    quoteAmt,
    beneficiary: account,
    permitData: '0x',
    extensionID: `0x${'00'.repeat(32)}`,
    extensionData: '0x',
    dexId: 0,
    lpFeeProfile: 0,
    buyTaxRate: 100,
    sellTaxRate: 100,
    taxDuration: 365 * 24 * 60 * 60,
    antiFarmerDuration: 60 * 60,
    mktBps: 10000,
    deflationBps: 0,
    dividendBps: 0,
    lpBps: 0,
    minimumShareBalance: 0n,
    dividendToken: ZERO_ADDRESS,
    commissionReceiver: ZERO_ADDRESS,
    tokenVersion: 6,
  };
}

export function verifyLaunchReceipt({ portal, expected, logs }) {
  const event = logs.find((log) => log.address.toLowerCase() === portal.toLowerCase() && log.eventName === 'TokenCreated');
  if (!event) throw new Error('Canonical TokenCreated event not found');
  for (const field of ['creator', 'name', 'symbol', 'meta']) {
    const actual = field === 'creator' ? event.args[field].toLowerCase() : event.args[field];
    const wanted = field === 'creator' ? expected[field].toLowerCase() : expected[field];
    if (actual !== wanted) throw new Error(`Launch receipt ${field} mismatch`);
  }
  return { token: event.args.token, event };
}
