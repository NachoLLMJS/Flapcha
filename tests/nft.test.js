import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNftClaim, nftReadiness } from '../src/lib/nft.js';

const launch = {
  creator: '0x1111111111111111111111111111111111111111',
  token: '0x2222222222222222222222222222222222228888',
  venue: 'flap',
  transactionHash: `0x${'ab'.repeat(32)}`,
};

test('NFT claim binds the collectible to the real launched token', () => {
  const claim = buildNftClaim({
    launch,
    draw: {
      id: 'draw-1',
      speciesId: 25,
      name: 'Pikachu',
      nature: 'Jolly',
      shiny: true,
      image: 'https://img/shiny.png',
      types: ['Electric'],
      description: 'A shiny launch companion.',
    },
  });

  assert.equal(claim.recipient, launch.creator);
  assert.equal(claim.attributes.find((item) => item.trait_type === 'Token Contract').value, launch.token);
  assert.equal(claim.attributes.find((item) => item.trait_type === 'Variant').value, 'Shiny');
});

test('NFT minting stays disabled without an existing collection minter', () => {
  const readiness = nftReadiness({ minterUrl: '', collectionAddress: '' });
  assert.equal(readiness.ready, false);
  assert.match(readiness.reason, /collection minter/i);
});
