import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('homepage follows the capsule-vending reference architecture', () => {
  for (const marker of ['vending-app', 'vending-header', 'vending-workspace', 'launch-dossier', 'capsule-machine', 'mint-summary', 'vending-recent']) {
    assert.match(source, new RegExp(marker), `missing ${marker}`);
  }
});

test('capsule machine asset and mystery reveal remain central', () => {
  assert.match(source, /capsule-vending-machine\.png/);
  assert.match(source, /machine-creature/);
  assert.match(source, /Mystery Pokémon/);
  assert.match(source, /machine-launch/);
  assert.match(source, /activeAction/);
});

test('real dapp controls remain wired into the reference-led surface', () => {
  assert.match(source, /onClick=\{connect\}/);
  assert.match(source, /onClick=\{activeAction\}/);
  assert.match(source, /Flap launch adapter is not ready/);
  assert.doesNotMatch(source, /setVenue/);
  assert.doesNotMatch(source, /Four\.meme/);
  assert.doesNotMatch(source, /ADAPTER LOCKED/);
  assert.match(source, /'LAUNCH TOKEN'/);
  assert.match(source, /venueReady/);
});

test('a verified launch exposes a dedicated next Pokémon roll action', () => {
  assert.match(source, /ROLL NEXT POKÉMON/);
  assert.match(source, /draw\?\.status === 'launched'/);
});

test('six recent creature cards populate the bottom strip', () => {
  for (const name of ['Charizard', 'Squirtle', 'Bulbasaur', 'Gengar', 'Lapras', 'Jolteon']) {
    assert.match(source, new RegExp(name), `missing ${name}`);
  }
  assert.match(styles, /grid-template-columns:repeat\(6,1fr\)/);
});

test('desktop matches the wide reference hierarchy and one-viewport layout', () => {
  assert.match(styles, /height:100dvh/);
  assert.match(styles, /grid-template-columns:29\.5% 37% 33\.5%/);
  assert.match(styles, /grid-template-rows:minmax\(0,1fr\) 226px/);
});

test('mobile stacks the machine before the operational cards', () => {
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /\.vending-workspace\{display:flex;flex-direction:column/);
  assert.match(styles, /\.capsule-machine\{order:-1/);
  assert.match(styles, /\.vending-cards\{height:auto;grid-template-columns:repeat\(2,1fr\)/);
});

test('header routes expose launch, profile and market-cap launchpad views', () => {
  for (const label of ['Launch', 'My Profile', 'Launchpad', 'About']) assert.match(source, new RegExp(`>${label}<`));
  assert.match(source, /view === 'profile'/);
  assert.match(source, /view === 'launchpad'/);
  assert.match(source, /launchpadRows/);
  assert.match(source, /My Creature NFTs/);
  assert.match(source, /My Launched Tokens/);
});

test('the themed typography is local and machine cabinet labels are removed', () => {
  assert.match(styles, /pokemon-solid\.ttf/);
  assert.match(styles, /Comic Sans MS/);
  assert.match(styles, /PokemonSolid/);
  assert.doesNotMatch(source, /SMALL<br \/>CAPSULES/);
  assert.doesNotMatch(source, /RANDOM<br \/>CREATURE/);
});

test('the Flapcha header wordmark uses white Pokémon lettering with a black outline', () => {
  assert.match(styles, /\.vending-brand strong\{[^}]*font-family:'PokemonSolid'/);
  assert.match(styles, /\.vending-brand strong\{[^}]*color:#fff/);
  assert.match(styles, /\.vending-brand strong\{[^}]*-webkit-text-stroke:[^;]*#080808/);
  assert.match(styles, /\.vending-brand strong span\{color:inherit\}/);
  assert.match(styles, /\.vending-brand small\{margin-top:12px/);
});

test('the Emerald bicycle loader reveals Flapcha and Launch after 1.5 seconds', () => {
  assert.match(source, /pokemon-emerald-bicycle\.webm/);
  assert.match(source, /setTimeout\(\(\) => setLoaderReady\(true\), 1500\)/);
  assert.match(source, /FLAP<span>CHA<\/span>/);
  assert.match(source, />LAUNCH<\/span><\/button>/);
  assert.match(styles, /\.emerald-loader/);
  assert.match(styles, /font-family:'PokemonSolid'/);
});

test('professional header and recent cards have dedicated responsive structure', () => {
  assert.match(source, /<kbd>⌘ K<\/kbd>/);
  assert.match(source, /wallet-status/);
  assert.match(source, /recent-token-meta/);
  assert.match(styles, /width:min\(100%,1920px\)/);
  assert.match(styles, /grid-template-columns:88px minmax\(0,1fr\)/);
});
