export const NATURES = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
  'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
  'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
];

const PERSONALITY = {
  Hardy: 'meets every challenge head-on',
  Lonely: 'prefers a small, fiercely loyal circle',
  Brave: 'charges toward danger before doubt can catch up',
  Adamant: 'never lets go once a goal is chosen',
  Naughty: 'turns every launch into playful chaos',
  Bold: 'protects its community without hesitation',
  Docile: 'moves with the rhythm of its holders',
  Relaxed: 'stays composed when the chart gets noisy',
  Impish: 'wins attention with clever tricks',
  Lax: 'keeps its cool and refuses to be rushed',
  Timid: 'observes carefully before making a move',
  Hasty: 'acts in a flash and leaves sparks behind',
  Serious: 'treats every mission as important',
  Jolly: 'pulls the whole community into its momentum',
  Naive: 'believes every new block can hold an adventure',
  Modest: 'lets results speak louder than hype',
  Mild: 'brings a calm presence to every encounter',
  Quiet: 'stores its power until the exact right moment',
  Bashful: 'hides surprising strength behind a gentle face',
  Rash: 'leaps first and turns the landing into a story',
  Calm: 'keeps a steady pulse through sudden swings',
  Gentle: 'builds trust through patience and loyalty',
  Sassy: 'knows it is rare and makes sure everyone else does too',
  Careful: 'studies every path before committing',
  Quirky: 'follows rules only when they stay interesting',
};

const capitalize = (value = '') => value ? `${value[0].toUpperCase()}${value.slice(1)}` : '';

export function tokenSymbol(name) {
  const letters = name.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return letters.slice(0, 4);
}

export function normalizeSpecies(raw) {
  const artwork = raw?.sprites?.other?.['official-artwork'] || {};
  const name = capitalize(String(raw?.name || '').replaceAll('-', ' '));
  if (!raw?.id || !name || !artwork.front_default) {
    throw new Error('Species data is incomplete');
  }
  return {
    id: Number(raw.id),
    name,
    symbol: tokenSymbol(name),
    normalImage: artwork.front_default,
    shinyImage: artwork.front_shiny || artwork.front_default,
    types: (raw.types || []).map((entry) => capitalize(entry.type.name)),
  };
}

export function createDescription({ name, nature, types, shiny }) {
  const variant = shiny ? `Shiny ${name}` : name;
  const typeLine = types.length ? types.join('/') : 'Unknown';
  const behavior = PERSONALITY[nature] || 'writes its own path on-chain';
  return `${variant} is a ${nature} ${typeLine} launch companion that ${behavior}. This token and its paired collectible mark one unique launch`;
}

export function createDraw(species, { random = Math.random, shinyRate = 0.01 } = {}) {
  const shiny = random() < shinyRate;
  const nature = NATURES[Math.min(NATURES.length - 1, Math.floor(random() * NATURES.length))];
  const image = shiny ? species.shinyImage : species.normalImage;
  return {
    speciesId: species.id,
    name: species.name,
    symbol: species.symbol,
    nature,
    shiny,
    image,
    normalImage: species.normalImage,
    shinyImage: species.shinyImage,
    types: species.types,
    description: createDescription({ name: species.name, nature, types: species.types, shiny }),
  };
}
