export function buildNftClaim({ launch, draw }) {
  return {
    name: `${draw.shiny ? 'Shiny ' : ''}${draw.name} Launch Companion`,
    description: draw.description,
    image: draw.image,
    recipient: launch.creator,
    external_url: `https://flap.sh/bnb/${launch.token}?lang=en`,
    attributes: [
      { trait_type: 'Species', value: draw.name },
      { trait_type: 'Species ID', value: String(draw.speciesId) },
      { trait_type: 'Nature', value: draw.nature },
      { trait_type: 'Variant', value: draw.shiny ? 'Shiny' : 'Normal' },
      { trait_type: 'Types', value: draw.types.join('/') },
      { trait_type: 'Launch Venue', value: launch.venue },
      { trait_type: 'Token Contract', value: launch.token },
      { trait_type: 'Launch Transaction', value: launch.transactionHash },
      { trait_type: 'Draw ID', value: draw.id },
    ],
  };
}

export function nftReadiness({ minterUrl, collectionAddress }) {
  if (!minterUrl || !collectionAddress) {
    return { ready: false, reason: 'An existing NFT collection minter is not configured' };
  }
  return { ready: true, reason: '' };
}
