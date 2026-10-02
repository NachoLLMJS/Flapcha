import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDraw,
  createDescription,
  normalizeSpecies,
  NATURES,
} from '../src/lib/randomizer.js';

test('normalizeSpecies creates launch-ready token identity from API data', () => {
  const species = normalizeSpecies({
    id: 25,
    name: 'pikachu',
    sprites: {
      other: {
        'official-artwork': {
          front_default: 'https://img/pikachu.png',
          front_shiny: 'https://img/pikachu-shiny.png',
        },
      },
    },
    types: [{ type: { name: 'electric' } }],
  });

  assert.equal(species.name, 'Pikachu');
  assert.equal(species.symbol, 'PIKA');
  assert.equal(species.normalImage, 'https://img/pikachu.png');
  assert.equal(species.shinyImage, 'https://img/pikachu-shiny.png');
  assert.deepEqual(species.types, ['Electric']);
});

test('createDraw uses injected entropy and selects shiny deterministically', () => {
  const species = normalizeSpecies({
    id: 1,
    name: 'bulbasaur',
    sprites: { other: { 'official-artwork': { front_default: 'normal.png', front_shiny: 'shiny.png' } } },
    types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }],
  });

  const draw = createDraw(species, { random: () => 0, shinyRate: 0.01 });

  assert.equal(draw.shiny, true);
  assert.equal(draw.image, 'shiny.png');
  assert.ok(NATURES.includes(draw.nature));
  assert.match(draw.description, /Shiny Bulbasaur/);
});

test('createDescription is species-specific and contains nature and types', () => {
  const text = createDescription({
    name: 'Charizard',
    nature: 'Bold',
    types: ['Fire', 'Flying'],
    shiny: false,
  });

  assert.match(text, /Charizard/);
  assert.match(text, /Bold/);
  assert.match(text, /Fire\/Flying/);
});
