import express from 'express';
import { createPublicClient, decodeEventLog, http } from 'viem';
import { bsc } from 'viem/chains';
import { DrawStore } from './draw-store.js';
import { mineVanitySalt } from './flap-salt.js';
import { createDraw, normalizeSpecies } from '../src/lib/randomizer.js';
import { buildNftClaim, nftReadiness } from '../src/lib/nft.js';
import { FLAP_PORTAL, flapPortalAbi } from '../src/lib/venues.js';

const PORT = Number(process.env.PORT || 8787);
const TAX_TOKEN_V3_IMPLEMENTATION = '0x024f18294970B5c76c0691b87f138A0317156422';
const RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
const NFT_MINTER_URL = process.env.NFT_MINTER_URL || '';
const NFT_COLLECTION_ADDRESS = process.env.NFT_COLLECTION_ADDRESS || '';
const NFT_MINTER_TOKEN = process.env.NFT_MINTER_TOKEN || '';
const SHINY_RATE = Number(process.env.SHINY_RATE || 0.01);
const drawStore = new DrawStore();
const publicClient = createPublicClient({ chain: bsc, transport: http(RPC_URL, { batch: false }) });
let speciesCatalogPromise;

const app = express();
app.use(express.json({ limit: '1mb' }));

const fail = (res, error, status = 400) => res.status(status).json({ error: error instanceof Error ? error.message : String(error) });

async function getSpeciesCatalog() {
  if (!speciesCatalogPromise) {
    speciesCatalogPromise = fetch('https://pokeapi.co/api/v2/pokemon-species?limit=2000')
      .then((response) => {
        if (!response.ok) throw new Error(`PokéAPI catalog failed: ${response.status}`);
        return response.json();
      })
      .then((body) => body.results.map((item) => Number(item.url.match(/\/(\d+)\/$/)?.[1])).filter(Boolean));
  }
  return speciesCatalogPromise;
}

async function fetchRandomSpecies() {
  const catalog = await getSpeciesCatalog();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const id = catalog[Math.floor(Math.random() * catalog.length)];
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!response.ok) continue;
    try {
      return normalizeSpecies(await response.json());
    } catch {
      // Retry species/forms without official artwork.
    }
  }
  throw new Error('Could not load a launch-ready species');
}

async function uploadFlapMetadata(draw, creator) {
  const imageResponse = await fetch(draw.image);
  if (!imageResponse.ok) throw new Error(`Artwork download failed: ${imageResponse.status}`);
  const imageBlob = await imageResponse.blob();
  const operations = {
    query: 'mutation Create($file: Upload!, $meta: MetadataInput!) { create(file: $file, meta: $meta) }',
    variables: {
      file: null,
      meta: { description: draw.description, twitter: null, telegram: null, website: null, creator },
    },
  };
  const form = new FormData();
  form.set('operations', JSON.stringify(operations));
  form.set('map', JSON.stringify({ 0: ['variables.file'] }));
  form.set('0', imageBlob, `${draw.name.toLowerCase().replaceAll(' ', '-')}.png`);
  const response = await fetch('https://funcs.flap.sh/api/upload', { method: 'POST', body: form });
  if (!response.ok) throw new Error(`Flap metadata upload failed: ${response.status}`);
  const body = await response.json();
  const cid = body?.data?.create;
  if (!cid || typeof cid !== 'string') throw new Error('Flap metadata upload returned no CID');
  return cid;
}

app.get('/api/config', async (_req, res) => {
  try {
    const chainId = await publicClient.getChainId();
    const portalCode = await publicClient.getCode({ address: FLAP_PORTAL });
    res.json({
      chainId,
      flap: { ready: chainId === 56 && Boolean(portalCode), portal: FLAP_PORTAL },
      nft: nftReadiness({ minterUrl: NFT_MINTER_URL, collectionAddress: NFT_COLLECTION_ADDRESS }),
      shinyRate: SHINY_RATE,
      legal: 'Unofficial prototype. Pokémon names and artwork require permission for commercial token/NFT use',
    });
  } catch (error) {
    fail(res, error, 503);
  }
});

app.get('/api/draw/:wallet', (req, res) => {
  try {
    res.json({ draw: drawStore.get(req.params.wallet) });
  } catch (error) {
    fail(res, error);
  }
});

app.post('/api/draw', async (req, res) => {
  try {
    const { wallet } = req.body;
    const existing = drawStore.get(wallet);
    if (existing?.status === 'locked') return res.json({ draw: existing, reused: true });
    const species = await fetchRandomSpecies();
    const draw = createDraw(species, { shinyRate: SHINY_RATE });
    const vanity = mineVanitySalt({
      deployer: FLAP_PORTAL,
      implementation: TAX_TOKEN_V3_IMPLEMENTATION,
      suffix: '7777',
      maxAttempts: 1_000_000,
    });
    const locked = drawStore.lock(wallet, { ...draw, salt: vanity.salt, predictedToken: vanity.address });
    res.status(201).json({ draw: locked, reused: false });
  } catch (error) {
    fail(res, error, /active draw/i.test(error.message) ? 409 : 503);
  }
});

app.post('/api/flap/meta', async (req, res) => {
  try {
    const { wallet, drawId } = req.body;
    const draw = drawStore.get(wallet);
    if (!draw || draw.id !== drawId || draw.status !== 'locked') throw new Error('Active draw not found');
    const meta = await uploadFlapMetadata(draw, wallet.toLowerCase());
    res.json({ meta });
  } catch (error) {
    fail(res, error);
  }
});

app.post('/api/launch/confirm', async (req, res) => {
  try {
    const { wallet, drawId, venue, transactionHash, meta } = req.body;
    if (venue !== 'flap') throw new Error('Only the verified Flap confirmation adapter is enabled');
    const draw = drawStore.get(wallet);
    if (!draw || draw.id !== drawId || draw.status !== 'locked') throw new Error('Active draw not found');
    const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
    if (receipt.status !== 'success') throw new Error('Launch transaction reverted');
    let created;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== FLAP_PORTAL.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: flapPortalAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === 'TokenCreated') created = decoded.args;
      } catch {
        // Ignore unrelated Portal logs.
      }
    }
    if (!created) throw new Error('Canonical Flap TokenCreated event not found');
    if (created.creator.toLowerCase() !== wallet.toLowerCase()) throw new Error('Launch creator mismatch');
    if (created.name !== draw.name || created.symbol !== draw.symbol || created.meta !== meta) throw new Error('Launch metadata mismatch');
    if (created.token.toLowerCase() !== draw.predictedToken.toLowerCase()) throw new Error('Predicted token mismatch');
    const tokenCode = await publicClient.getCode({ address: created.token });
    if (!tokenCode) throw new Error('Launched token has no bytecode');
    const launchedDraw = drawStore.markLaunched(wallet, drawId, created.token);
    const launch = { creator: wallet, token: created.token, venue, transactionHash };
    const claim = buildNftClaim({ launch, draw: launchedDraw });
    let nft = { status: 'pending_configuration', claim };
    if (NFT_MINTER_URL && NFT_COLLECTION_ADDRESS) {
      const mintResponse = await fetch(NFT_MINTER_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(NFT_MINTER_TOKEN ? { authorization: `Bearer ${NFT_MINTER_TOKEN}` } : {}),
        },
        body: JSON.stringify({ collection: NFT_COLLECTION_ADDRESS, ...claim }),
      });
      if (!mintResponse.ok) throw new Error(`NFT minter failed: ${mintResponse.status}`);
      nft = { status: 'submitted', result: await mintResponse.json(), claim };
    }
    res.json({ launch, nft });
  } catch (error) {
    fail(res, error);
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Flapcha API ready at http://localhost:${PORT}`);
  });
}

export default app;
