// Shared shapes produced by the pipeline and consumed by the frontend.
// Kept dependency-free (no zod) — parsers validate shape via assertParse with line numbers instead.

export interface EvolutionEntry {
  section: string; // "Unova" | "Post-Game"
  from: string;
  to: string;
  condition: string;
  vanillaCondition?: string; // how it worked in Black, for the before/after — see attachVanillaEvolutionMethod
  fromDexNumber?: number;
  toDexNumber?: number;
}

export interface EvolutionEdge {
  species: string;
  method: string;
  changed: boolean; // true when this is a JetBlack-altered method, false when it's vanilla Black's own
}

export interface EvolutionLookupEntry {
  evolvesFrom?: EvolutionEdge;
  evolvesTo: EvolutionEdge[];
}

export type EvolutionLookup = Record<string, EvolutionLookupEntry>;

export interface LegendariesData {
  entries: LegendaryEntry[];
  asides: string[]; // document-level prose (the Obelisks explanation, the God Stone requirement)
}

export interface LegendaryEntry {
  dexNumber: number;
  name: string;
  level: number | null; // null for Phione/Manaphy — obtained as an egg, not caught at a fixed level
  section: "main" | "post-game";
  unchangedFromVanilla: boolean; // the doc's "- Unchanged from Vanilla" suffix
  location: string;
  notes: string[];
}

export interface MoveFieldChange {
  field: string; // "Power" | "Accuracy" | "PP" | "Type" | "Category" | "Damage Type" | ...
  from?: string;
  to: string;
}

export interface ChangedMove {
  name: string;
  changes: MoveFieldChange[];
  notes: string[];
}

export interface NewMove {
  name: string;
  version?: string;
  replaces: string;
  type?: string;
  damageCategory?: string;
  power?: string;
  accuracy?: string;
  pp?: string;
  effect?: string;
  learnedBy: string[];
}

export interface MoveChangesData {
  changed: ChangedMove[];
  newMoves: NewMove[];
}

export interface VanillaMoveInfo {
  type: string;
  damageClass: string; // "physical" | "special" | "status" — kept as a plain string here since it's read back from generated JSON; see src/components/DamageClassIcon.tsx for the narrowed union used in the UI
  power: number | null;
  accuracy: number | null;
  pp: number;
  flavorText: string;
  effect: string;
}

export interface MoveEntry extends VanillaMoveInfo {
  name: string;
  changed: boolean; // true when JetBlack rebalanced this move
  fieldChanges: MoveFieldChange[]; // per-field from/to diff, straight from the hack's doc — empty unless changed
  changeNotes: string[];
  isNew: boolean; // true for a JetBlack-added move with no vanilla Black counterpart
  learnedBy: string[]; // species that learn it — level-up reverse index for vanilla moves, doc-curated distribution list for new moves
}

/** Vanilla Pokémon Black item reference data (PokeAPI), keyed by its PokeAPI slug — see pipeline/vanilla-data/README.md. */
export interface VanillaItemInfo {
  name: string; // English display name ("Life Orb")
  category: string; // PokeAPI item category slug ("held-items", "evolution", ...)
  effect: string; // one-line mechanical summary
  flavorText: string; // Black/White bag description
}

/** An item as the hack's doc names it, resolved against the vanilla item list where possible. */
export interface ItemRef {
  name: string; // the doc's own spelling, corrected to the vanilla name when it resolved
  slug?: string; // PokeAPI slug — absent when the name couldn't be resolved
  category?: string;
  effect?: string;
  machine?: string; // "TM13" / "HM03" for machines
  moveType?: string; // the taught move's type, for the type-colored disc
}

export interface ItemChangeEntry {
  item: ItemRef;
  location: string;
  replaces?: ItemRef; // the vanilla item this one takes the place of
  giftFrom?: string; // the trainer whose defeat hands it over
  note?: string; // anything the doc said that isn't one of the above
}

export interface MartItem {
  item: ItemRef;
  vanilla: boolean; // the doc's "[V]" marker: stocked in vanilla Black too
}

export interface MartStock {
  location: string;
  section?: string; // e.g. "Top Section - Left Cashier"
  items: MartItem[];
}

export interface PriceChange {
  items: string[];
  price: number;
}

export interface ItemsData {
  ground: ItemChangeEntry[];
  gifts: ItemChangeEntry[];
  hidden: ItemChangeEntry[];
  hiddenItemsReplacedBy: string;
  martStock: MartStock[];
  priceChanges: PriceChange[];
  galleryNote: string; // the Castelia Gallery section is prose only, with no item list
}

export interface ChangelogEntry {
  version: string;
  notes: string[];
}

export interface EncounterRow {
  species: string;
  levelRange: string;
  chance: string;
  flags: string[]; // "special-method" (shaking grass/rippling water/dust cloud), "seasonal"
}

export interface EncounterMethod {
  method: string;
  rows: EncounterRow[];
}

export interface LocationEncounters {
  location: string;
  methods: EncounterMethod[];
}

export interface StatBlock {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface LearnsetMove {
  level: number;
  move: string;
  isNewMove: boolean; // flagged with trailing * in source, cross-references MoveChangesData.newMoves
}

export interface VanillaSpeciesInfo {
  genus: string; // e.g. "Seed Pokémon"
  heightM: number;
  weightKg: number;
  genderRate: number; // -1 genderless, else eighths female (0 = 0% female, 8 = 100% female)
  eggGroups: string[];
  catchRate: number;
  hatchSteps: number;
  flavorText: string; // Gen 5 (Black version) Pokédex entry
}

/** One machine a species can learn. See buildTmCompatibility in pipeline/vanilla-data.ts. */
export interface TmEntry {
  tm: string; // "TM83", "HM03"
  move: string;
  addedByHack?: boolean; // the species can't learn this machine in vanilla Black
}

export interface PokemonEntry extends VanillaSpeciesInfo {
  dexNumber: number;
  name: string;
  types: string[]; // unchanged by the hack — from static reference data, see pipeline/vanilla-data.ts
  abilities: string[];
  abilityNotes: string[];
  stats: StatBlock;
  vanillaStats?: StatBlock;
  statChangeNote?: string;
  hasMultipleFormes: boolean;
  formesRaw?: string;
  tmAdditions: TmEntry[]; // machines the hack grants on top of vanilla — the full list lives in tm-compatibility.generated.json
  notes: string[]; // remaining freeform egg-move/misc additions
  learnset: LearnsetMove[];
}

export interface FeatureBullet {
  text: string;
}

export interface BonusTrainer {
  name: string;
  location: string;
  reward: string;
}

export interface BerryVendor {
  location: string;
  kind: string;
}

export interface RoyalUnovaReward {
  day: string;
  item: string;
}

export interface LevelCap {
  boss: string;
  level: number;
  optional: boolean;
}

export interface FeaturesData {
  intro: string[];
  bullets: FeatureBullet[];
  bonusTrainers: BonusTrainer[];
  berryVendors: BerryVendor[];
  royalUnovaRewards: RoyalUnovaReward[];
  nuzlocke: {
    intro: string[];
    levelCaps: LevelCap[];
  };
}

export interface TrainerPokemon {
  species: string;
  level: number | null;
  heldItem?: string;
  note?: string;
}

export interface TrainerBattle {
  trainerName: string;
  condition?: string; // e.g. "If Snivy was Chosen", or a roster variant like "3/4 Badges"
  subArea?: string; // e.g. "NORTHERN SIDE/PLAYGROUND", "B1F" — a label within a larger location
  battleFormat?: string; // e.g. "Double Battle", "Rotation Battle" — absent means a plain single battle
  pokemon: TrainerPokemon[];
  rewardNote?: string; // e.g. "(2 x Potion)"
  locationNote?: string; // where to find this trainer, for post-game rematches listed under a campaign-wide header
  notes: string[]; // freeform annotations from the roster doc that aren't any of the above
}

export interface TrainerLocation {
  location: string;
  battles: TrainerBattle[];
}

export interface BuildManifest {
  generatedAt: string;
  counts: Record<string, number>;
}
