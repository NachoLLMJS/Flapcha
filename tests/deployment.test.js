import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server/index.js', import.meta.url), 'utf8');

test('Vercel runs the Express API as a serverless handler without opening a listener', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.match(server, /export default app/);
  assert.match(server, /if \(!process\.env\.VERCEL\)/);
  assert.ok(config.builds.some((build) => build.src === 'server/index.js' && build.use === '@vercel/node'));
  assert.ok(config.routes.some((route) => route.src === '/api/(.*)' && route.dest === '/server/index.js'));
  assert.ok(config.routes.some((route) => route.dest === '/index.html'));
});
