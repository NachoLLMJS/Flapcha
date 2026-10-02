import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createDescription } from '../src/lib/randomizer.js';
import { nftReadiness } from '../src/lib/nft.js';

const mainSource = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const terminalStop = /[.]$/;

test('generated descriptions and NFT readiness messages have no terminal full stop', () => {
  const description = createDescription({ name: 'Pikachu', nature: 'Jolly', types: ['Electric'], shiny: false });
  const nftReason = nftReadiness({ minterUrl: '', collectionAddress: '' }).reason;

  assert.doesNotMatch(description.trim(), terminalStop);
  assert.doesNotMatch(nftReason.trim(), terminalStop);
});

test('homepage user-facing copy has no known terminal full stops', () => {
  const retired = [
    'ROLL A CREATURE.',
    'LAUNCH ITS TOKEN.',
    'paired NFT claim.',
    'after the draw.',
    'simulation succeeds.',
    'commercial token or NFT use.',
  ];

  for (const text of retired) assert.equal(mainSource.includes(text), false, `terminal stop remains in: ${text}`);
});
