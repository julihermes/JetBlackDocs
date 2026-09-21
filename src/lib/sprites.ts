/**
 * JetBlack keeps the vanilla Gen 5 sprites (it doesn't reskin Pokémon), so a
 * public sprite CDN keyed by National Dex number is accurate and means the
 * site doesn't need to bundle ~650 image files itself.
 */
export function spriteUrl(dexNumber: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNumber}.png`;
}

/** Item sprite from the same CDN as the Pokémon sprites, keyed by PokeAPI slug ("life-orb"). */
export function itemSpriteUrl(slug: string): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
}
