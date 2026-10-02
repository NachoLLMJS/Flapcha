# Flapcha

A standalone BNB Chain launch interface that assigns a random Pokémon, nature, normal/shiny artwork, ticker and description to each token launch.

## Current integration status

- Flap: direct `Portal.newTokenV6` integration on BNB Chain. Uses Tax Token V3, a native-BNB pair, 1% buy tax, 1% sell tax, 365-day tax duration and market allocation to the launcher. No custom launch or Vault contract.
- NFT: a complete collectible claim payload is generated after a receipt-authenticated launch. Automatic minting requires an existing collection/minter through `NFT_MINTER_URL` and `NFT_COLLECTION_ADDRESS`; this project does not deploy a custom NFT contract.
- Random draw: one active draw per wallet, with a 15-minute lock. A completed launch unlocks the next draw.
- Artwork/data: fetched from PokéAPI at draw time.

## Local development

```text
npm install
npm test
npm run dev
```

Frontend: `http://localhost:5173/`
API: `http://localhost:8787/`

Copy `.env.example` to an external/local `.env` only when configuring the optional NFT minter. Never place a private wallet key in this project or in browser environment variables.

## Safety boundaries

- The browser does not touch an injected wallet until the user presses Connect.
- Flap launch is simulated against the live canonical Portal before a wallet transaction is requested.
- Confirmed launches are authenticated from the canonical `TokenCreated` event and checked against the predicted token address.
- NFT minting remains disabled when its adapter is missing.
- Pokémon names and artwork are third-party intellectual property. This is an unofficial prototype; commercial token/NFT use requires appropriate permission or replacement with original licensed creatures.
