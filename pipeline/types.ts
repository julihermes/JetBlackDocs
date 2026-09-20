// Shared shapes produced by the pipeline and consumed by the frontend.
// Kept dependency-free (no zod) — parsers validate shape via assertParse with line numbers instead.

export interface EvolutionEntry {
  section: string; // "Unova" | "Post-Game"
  from: string;
  to: string;
  condition: string;
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

export interface LegendaryEntry {
  dexNumber: number;
  name: string;
  level: number | null; // null for Phione/Manaphy — obtained as an egg, not caught at a fixed level
  section: "main" | "post-game";
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

export interface GroundItemEntry {
  item: string;
  location: string;
  note?: string;
}

export interface GiftItemEntry {
  item: string;
  location: string;
  note?: string;
}

export interface HiddenItemEntry {
  item: string;
  location: string;
  note?: string;
}

export interface MartStock {
  location: string;
  items: string[];
}

export interface ItemsData {
  ground: GroundItemEntry[];
  gifts: GiftItemEntry[];
  hidden: HiddenItemEntry[];
  hiddenItemsReplacedBy: string;
  martStock: MartStock[];
  priceChanges: string[];
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

export interface PokemonEntry extends VanillaSpeciesInfo {
  dexNumber: number;
  name: string;
  obtainable: boolean; // best-effort: false means no documented wild/gift/legendary/breeding path — see pipeline/obtainability.ts
  types: string[]; // unchanged by the hack — from static reference data, see pipeline/vanilla-data.ts
  abilities: string[];
  abilityNotes: string[];
  stats: StatBlock;
  vanillaStats?: StatBlock;
  statChangeNote?: string;
  hasMultipleFormes: boolean;
  formesRaw?: string;
  tmCompatibility: string[]; // "TM33 Reflect" style entries pulled out of notes
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
  condition?: string; // e.g. "If Snivy was Chosen"
  subArea?: string; // e.g. "NORTHERN SIDE/PLAYGROUND", "B1F" — a label within a larger location
  pokemon: TrainerPokemon[];
  rewardNote?: string; // e.g. "(2 x Potion)"
}

export interface TrainerLocation {
  location: string;
  battles: TrainerBattle[];
}

export interface BuildManifest {
  generatedAt: string;
  counts: Record<string, number>;
}
