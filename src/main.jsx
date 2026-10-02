import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { bsc } from 'viem/chains';
import { buildFlapLaunchParams, FLAP_PORTAL, flapPortalAbi } from './lib/venues.js';
import './styles.css';

const api = async (path, options) => {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed: ${response.status}`);
  return body;
};
const short = (value) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : '';
const withoutTerminalStop = (value) => String(value || '').replace(/[.]\s*$/, '');
const pokemonAsset = (name) => `/assets/pokemon/${name}.png`;
const SHOWCASE_POKEMON = { speciesId: 6, name: 'Charizard', symbol: 'FLAME', nature: 'Brave', shiny: false, image: pokemonAsset('charizard'), normalImage: pokemonAsset('charizard'), shinyImage: pokemonAsset('charizard-shiny'), types: ['Fire', 'Flying'], description: 'Charizard is a powerful and noble Pokémon, known for its unwavering spirit and burning desire to become stronger. It represents ambition, freedom, and the courage to take on any challenge.' };
const SHOWCASE_LAUNCHES = [
  { name: 'Charizard', symbol: 'CHAR', image: pokemonAsset('charizard'), type: 'Fire', market: '$142K', holders: '1,240' },
  { name: 'Squirtle', symbol: 'SQUI', image: pokemonAsset('squirtle'), type: 'Water', market: '$86K', holders: '892' },
  { name: 'Bulbasaur', symbol: 'BULB', image: pokemonAsset('bulbasaur'), type: 'Grass', market: '$210K', holders: '2,341' },
  { name: 'Gengar', symbol: 'GENG', image: pokemonAsset('gengar'), type: 'Ghost', market: '$98K', holders: '760' },
  { name: 'Lapras', symbol: 'LAPR', image: pokemonAsset('lapras'), type: 'Ice', market: '$175K', holders: '1,892' },
  { name: 'Jolteon', symbol: 'JOLT', image: pokemonAsset('jolteon'), type: 'Electric', market: '$420K', holders: '3,102' },
];
function Pokeball({ small = false }) { return <span className={small ? 'pokeball pokeball-small' : 'pokeball'} aria-hidden="true"><i /></span>; }

function App() {
  const [config, setConfig] = useState(null);
  const [account, setAccount] = useState('');
  const [draw, setDraw] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState(null);
  const [view, setView] = useState(() => window.location.hash.replace('#', '') || 'launch');
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [loaderReady, setLoaderReady] = useState(false);
  useEffect(() => { api('/api/config').then(setConfig).catch((error) => setNotice(error.message)); }, []);
  useEffect(() => { const timer = window.setTimeout(() => setLoaderReady(true), 1500); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    const syncView = () => setView(window.location.hash.replace('#', '') || 'launch');
    window.addEventListener('hashchange', syncView);
    return () => window.removeEventListener('hashchange', syncView);
  }, []);
  const venueReady = config?.flap?.ready;

  const connect = async () => {
    setNotice('');
    if (!window.ethereum) return setNotice('No injected wallet detected. Install a BNB-compatible wallet first');
    try { const walletClient = createWalletClient({ chain: bsc, transport: custom(window.ethereum) }); const [nextAccount] = await walletClient.requestAddresses(); setAccount(nextAccount); const existing = await api(`/api/draw/${nextAccount}`); setDraw(existing.draw); }
    catch (error) { setNotice(error.shortMessage || error.message); }
  };
  const roll = async () => {
    setPhase('drawing'); setNotice('Locking a random launch companion…'); setResult(null);
    try { const body = await api('/api/draw', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet: account }) }); setDraw(body.draw); setNotice(body.reused ? 'Your existing draw is still locked' : 'Draw locked. Launch it to unlock the next roll'); }
    catch (error) { setNotice(error.message); } finally { setPhase('idle'); }
  };
  const launchFlap = async () => {
    if (!window.ethereum || !account || !draw) return;
    setPhase('launching'); setNotice('Uploading immutable launch metadata to Flap…');
    try {
      const { meta } = await api('/api/flap/meta', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet: account, drawId: draw.id }) });
      const walletClient = createWalletClient({ chain: bsc, transport: custom(window.ethereum) }); const [active] = await walletClient.getAddresses();
      if (!active || active.toLowerCase() !== account.toLowerCase()) throw new Error('Active wallet changed. Reconnect before launching');
      await walletClient.switchChain({ id: 56 });
      const publicClient = createPublicClient({ chain: bsc, transport: http('https://bsc-dataseed.binance.org', { batch: false }) });
      const existingCode = await publicClient.getCode({ address: draw.predictedToken }); if (existingCode) throw new Error('The predicted token address is already occupied. Draw a new salt');
      const params = buildFlapLaunchParams({ account, name: draw.name, symbol: draw.symbol, meta, salt: draw.salt }); setNotice('Running a no-spend simulation against the live Flap Portal…');
      const simulation = await publicClient.simulateContract({ account, address: FLAP_PORTAL, abi: flapPortalAbi, functionName: 'newTokenV6', args: [params], value: 0n }); setNotice('Simulation passed. Confirm the launch in your wallet');
      const hash = await walletClient.writeContract(simulation.request); setNotice(`Transaction sent: ${short(hash)}. Waiting for confirmation…`); await publicClient.waitForTransactionReceipt({ hash });
      const confirmed = await api('/api/launch/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet: account, drawId: draw.id, venue: 'flap', transactionHash: hash, meta }) });
      setResult(confirmed); setDraw((current) => ({ ...current, status: 'launched', token: confirmed.launch.token })); setNotice('Token verified on BNB Chain. The next draw is now unlocked');
    } catch (error) { setNotice(error.shortMessage || error.message); } finally { setPhase('idle'); }
  };
  const launch = () => {
    if (!venueReady) return setNotice('Flap launch adapter is not ready. No wallet request was sent');
    return launchFlap();
  };
  const displayPokemon = draw || SHOWCASE_POKEMON;
  const tokenName = draw ? `${draw.shiny ? 'Shiny ' : ''}${draw.name}` : SHOWCASE_POKEMON.name;
  const launchedToken = result?.launch?.token || draw?.token || '';
  const hasVerifiedLaunch = Boolean(launchedToken);

  const canRoll = !draw || draw?.status === 'launched';
  const activeAction = !account ? connect : canRoll ? roll : launch;
  const activeDisabled = phase === 'drawing' || phase === 'launching';
  const actionLabel = !account
    ? 'CONNECT WALLET TO LAUNCH'
    : phase === 'drawing'
      ? 'REVEALING…'
      : draw?.status === 'launched'
        ? 'ROLL NEXT POKÉMON'
        : !draw
          ? 'LAUNCH & REVEAL'
          : phase === 'launching'
            ? 'LAUNCHING…'
            : 'LAUNCH TOKEN';
  const launchpadRows = [...SHOWCASE_LAUNCHES].sort((a, b) => Number(b.market.replace(/[^0-9]/g, '')) - Number(a.market.replace(/[^0-9]/g, '')));


  return <main className="vending-app" id="top">
    {loaderVisible && <section className={`emerald-loader ${loaderReady ? 'is-ready' : ''}`} aria-label="Flapcha introduction">
      <video autoPlay muted loop playsInline preload="auto" aria-hidden="true"><source src="/assets/loader/pokemon-emerald-bicycle.webm" type="video/webm" /></video>
      <div className="loader-vignette" />
      {loaderReady && <div className="loader-entry"><h1>FLAP<span>CHA</span></h1><p>Reveal a companion · Launch its token · Keep the creator NFT</p><button type="button" onClick={() => setLoaderVisible(false)}><span>LAUNCH</span></button></div>}
      <small className="loader-credit">Emerald bicycle scene by christt105 · Pokémon graphics © Nintendo / Game Freak</small>
    </section>}
    <header className="vending-header">
      <a className="vending-brand" href="#top" aria-label="Flapcha home"><Pokeball /><span><strong>FLAP<span>CHA</span></strong><small>MINT CREATURES. LAUNCH TOKENS. BUILD TOGETHER.</small></span></a>
      <nav aria-label="Main navigation"><a className={view === 'launch' ? 'active' : ''} href="#launch">Launch</a><a className={view === 'profile' ? 'active' : ''} href="#profile">My Profile</a><a className={view === 'launchpad' ? 'active' : ''} href="#launchpad">Launchpad</a><a className={view === 'about' ? 'active' : ''} href="#about">About</a></nav>
      <label className="search-box"><i aria-hidden="true" /><input aria-label="Search" placeholder="Search creatures, tokens, or wallets" /><kbd>⌘ K</kbd></label>
      <button className="wallet-pill" onClick={connect}><span className="wallet-status" />{account ? short(account) : 'Connect Wallet'}</button>
    </header>

    {view === 'launch' && <section className="vending-workspace" id="launch">
      <section className="launch-dossier soft-card">
        <span className="new-launch-badge">LAUNCH SETUP</span>
        <div className="dossier-heading"><div><h1>Random Creature Launch</h1><label>Current companion <b>{draw?.name || 'Not revealed'}</b></label></div><span className="element-pill">BNB CHAIN</span></div>
        <p>Connect your wallet, reveal one random Pokémon companion, then launch its paired community token through Flap.</p>
        <div className="token-stats"><div><small>Total Supply</small><strong>1,000,000,000</strong></div><div><small>Network</small><strong>BNB Chain</strong></div><div><small>Launch Venue</small><strong>Flap</strong></div></div>
        <div className="curve-heading"><b>How Your Launch Works</b><a href="#about">Protocol details →</a></div>
        <div className="launch-flow"><div><span>1</span><section><b>Connect Wallet</b><p>Use a BNB-compatible injected wallet. Nothing is requested automatically.</p></section></div><div><span>2</span><section><b>Reveal Companion</b><p>One random species, nature and rarity profile is locked to your wallet.</p></section></div><div><span>3</span><section><b>Launch Paired Token</b><p>The transaction is simulated first, then submitted only after wallet confirmation.</p></section></div><div><span>4</span><section><b>Receive Creator NFT</b><p>Your collectible remains linked to the verified token launch.</p></section></div></div>
      </section>

      <section className="capsule-machine" aria-label="Random Pokémon capsule machine">
        <img className="machine-art" src="/assets/capsule-vending-machine.png" alt="Colorful capsule vending machine" />
        <div className={`machine-creature ${draw ? 'revealed' : ''}`}><img src={displayPokemon.image} alt={draw ? tokenName : 'Mystery Pokémon'} /></div>
        <button className="machine-launch" onClick={activeAction} disabled={activeDisabled}>{actionLabel}</button>
        <p>{draw?.status === 'launched' ? 'Launch complete — roll your next Pokémon' : 'Connect wallet and start a random creature launch'}</p>
      </section>

      <aside className="mint-summary" id="market">
        <section className="auto-mint soft-card"><span>◈</span><div><h2>Reveal Rules</h2><p>One active companion per wallet. A new reveal unlocks only after the current launch is completed.</p></div></section>
        <section className="wallet-summary soft-card"><div className="wallet-row"><b>{account ? short(account) : 'Wallet not connected'}</b><span className={account ? 'connected' : ''}>● {account ? 'Ready' : 'Connect first'}</span></div><div className="wallet-metrics"><div><strong>{draw ? 'Locked' : 'Open'}</strong><small>Reveal Status</small></div><div><strong>Flap</strong><small>Launch Venue</small></div><div><strong>{venueReady ? 'Live' : 'Locked'}</strong><small>Adapter Status</small></div></div></section>
        <section className="example-mint soft-card"><h3>{draw ? 'Your NFT Passport' : 'Example NFT Passport'}</h3><div className="mint-card"><div className="nft-artwork"><img src={displayPokemon.image} alt={tokenName} /><span>{displayPokemon.shiny ? '✦ SHINY EDITION' : 'CREATOR NFT'}</span></div><div className="nft-passport"><div><h2>{draw ? tokenName : 'Random Companion'} <small>#{String(displayPokemon.speciesId).padStart(4, '0')}</small></h2><div className="mint-tags"><b>{displayPokemon.shiny ? 'SHINY' : 'CREATOR NFT'}</b><span>● {displayPokemon.types.join(' / ')}</span></div></div><p>{displayPokemon.description || SHOWCASE_POKEMON.description}</p><div className="nft-facts"><div><small>Nature</small><strong>{displayPokemon.nature || 'Random'}</strong></div><div><small>Rarity</small><strong>{displayPokemon.shiny ? 'Shiny' : 'Standard'}</strong></div><div><small>Owner</small><strong>{account ? short(account) : 'Connect wallet'}</strong></div><div><small>Paired Token</small><strong>{draw?.symbol ? `$${draw.symbol}` : 'Pending reveal'}</strong></div></div><div className="nft-progress"><div className={draw ? 'done' : ''}><i>1</i><span><b>Reveal</b><small>{draw ? 'Companion locked' : 'Waiting for wallet'}</small></span></div><div className={hasVerifiedLaunch ? 'done' : ''}><i>2</i><span><b>Launch</b><small>{hasVerifiedLaunch ? 'Token verified' : 'Token not launched'}</small></span></div><div className={hasVerifiedLaunch ? 'done' : ''}><i>3</i><span><b>Collect</b><small>{hasVerifiedLaunch ? 'NFT available' : 'Unlocks after launch'}</small></span></div></div></div></div></section>
      </aside>

      <section className="vending-recent soft-card" id="recent"><div className="recent-title"><div><span>LIVE MARKET</span><h2>Recent Launches</h2><p>Latest creature-backed tokens from the Flapcha community</p></div><a href="#launchpad">Explore Launchpad <b>→</b></a></div><div className="vending-cards">{SHOWCASE_LAUNCHES.map((item, index) => <article key={item.name} className={index === 5 ? 'shiny' : ''}><div className="creature-tile"><img src={item.image} alt={item.name} />{index === 5 && <b>✦ SHINY</b>}</div><div className="card-name"><div><strong>{item.name}</strong><small>${item.symbol}</small></div><button aria-label={`Open ${item.name} menu`}>•••</button></div><div className="recent-token-meta"><span className={`creature-type type-${item.type.toLowerCase()}`}>● {item.type}</span><small>#{String(index + 1).padStart(3, '0')}</small></div><div className="card-stats"><div><small>Market Cap</small><strong>{item.market}</strong></div><div><small>Holders</small><strong>{item.holders}</strong></div></div><p><i /> Launched {index * 11 + 12} min ago</p></article>)}</div></section>
    </section>}

    {view === 'profile' && <section className="app-page profile-page" id="profile">
      <div className="page-heading"><div><span>TRAINER ACCOUNT</span><h1>My Profile</h1><p>Your connected wallet, revealed companions, creator NFTs and verified token launches</p></div><button onClick={connect}>{account ? short(account) : 'Connect Wallet'}</button></div>
      <div className="profile-overview soft-card"><div><small>Wallet</small><strong>{account ? short(account) : 'Not connected'}</strong></div><div><small>Active Companion</small><strong>{draw?.name || 'None'}</strong></div><div><small>Verified Launches</small><strong>{hasVerifiedLaunch ? '1' : '0'}</strong></div><div><small>Creator NFTs</small><strong>{draw ? '1' : '0'}</strong></div></div>
      <div className="profile-grid">
        <section className="profile-section soft-card"><div className="section-heading"><h2>My Creature NFTs</h2><span>{draw ? '1 item' : 'Empty'}</span></div>{draw ? <article className="profile-nft"><img src={displayPokemon.image} alt={tokenName} /><div><h3>{tokenName}</h3><b>#{String(displayPokemon.speciesId).padStart(4, '0')}</b><p>{displayPokemon.nature} · {displayPokemon.types.join(' / ')}</p><span>{draw.status === 'launched' ? 'Launch complete' : 'Reserved for active launch'}</span></div></article> : <div className="profile-empty"><Pokeball /><h3>No creature NFT yet</h3><p>Connect your wallet and complete a reveal to populate your profile</p><a href="#launch">Go to Launch</a></div>}</section>
        <section className="profile-section soft-card"><div className="section-heading"><h2>My Launched Tokens</h2><span>{hasVerifiedLaunch ? '1 verified' : 'Empty'}</span></div>{hasVerifiedLaunch ? <article className="profile-token"><img src={displayPokemon.image} alt={tokenName} /><div><h3>{draw.name}</h3><p>${draw.symbol}</p><small>{short(launchedToken)}</small></div><a href={`https://flap.sh/bnb/${launchedToken}?lang=en`} target="_blank" rel="noreferrer">View Token ↗</a></article> : <div className="profile-empty"><span className="empty-token">$</span><h3>No verified token launches</h3><p>Tokens appear here only after the on-chain receipt is confirmed</p><a href="#launch">Launch a Token</a></div>}</section>
      </div>
    </section>}

    {view === 'launchpad' && <section className="app-page launchpad-page" id="launchpad">
      <div className="page-heading"><div><span>COMMUNITY DIRECTORY</span><h1>Launchpad</h1><p>Tokens ordered from highest displayed market cap to lowest</p></div><a href="#launch">Launch Your Token</a></div>
      <div className="launchpad-disclosure">Preview market data is shown until a live market-cap indexer is connected. Verified personal launches remain available in My Profile</div>
      <div className="launchpad-table soft-card"><div className="launchpad-head"><span>#</span><span>Token</span><span>Ticker</span><span>Type</span><span>Market Cap</span><span>Holders</span></div>{launchpadRows.map((item, index) => <article className="launchpad-token" key={item.symbol}><b>{index + 1}</b><div><img src={item.image} alt={item.name} /><h3>{item.name}</h3></div><strong>${item.symbol}</strong><span className={`creature-type type-${item.type.toLowerCase()}`}>{item.type}</span><em>{item.market}</em><small>{item.holders}</small></article>)}</div>
    </section>}

    {view === 'about' && <section className="app-page about-page" id="about"><div className="page-heading"><div><span>HOW IT WORKS</span><h1>About Flapcha</h1><p>A wallet-first launch flow pairing one random Pokémon companion with one community token and one creator NFT</p></div><a href="#launch">Open Launch Machine</a></div><div className="about-grid"><article className="soft-card"><b>1</b><h2>Reveal</h2><p>A random species, nature and rarity profile is locked to your wallet</p></article><article className="soft-card"><b>2</b><h2>Launch</h2><p>The selected venue transaction is simulated before wallet confirmation</p></article><article className="soft-card"><b>3</b><h2>Collect</h2><p>The creator NFT and verified token remain visible inside My Profile</p></article></div></section>}
    {notice && <div className="notice" role="status">{withoutTerminalStop(notice)}</div>}
  </main>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
