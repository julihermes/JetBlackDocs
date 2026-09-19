// Shared shapes produced by the pipeline and consumed by the frontend.
// Kept dependency-free (no zod) — parsers validate shape via assertParse with line numbers instead.

export interface EvolutionEntry {
  section: string; // "Unova" | "Post-Game"
  from: string;
  to: string;
  condition: string;
}

export interface LegendaryEntry {
  dexNumber: number;
  name: string;
  level: number;
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

export interface PokemonEntry {
  dexNumber: number;
  name: string;
  abilities: string[];
  abilityNotes: string[];
  stats: StatBlock;
  vanillaStats?: StatBlock;
  statChangeNote?: string;
  hasMultipleFormes: boolean;
  formesRaw?: string;
  notes: string[]; // freeform TM/egg-move/misc additions
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
