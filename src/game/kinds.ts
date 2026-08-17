import tuning from './data/tuning.json' with { type: 'json' };

export const CLASS_WIZARD = 0;
export const CLASS_KNIGHT = 1;
export const CLASS_DWARF = 2;
export const CLASS_PRIEST = 3;

export const STATUS_RUNNING = 0;
export const STATUS_LEVELUP = 1;
export const STATUS_DEAD = 2;
export const STATUS_WON = 3;

export const PROJ_FIREBALL = 0;
export const PROJ_SWORD = 1;
export const PROJ_AXE = 2;
export const PROJ_MISSILE = 3;
export const PROJ_ICICLE = 4;
export const PROJ_SHARD = 5;
export const PROJ_BOMB = 6;

export const AXE_PHASE_OUT = 0;
export const AXE_PHASE_DWELL = 1;
export const AXE_PHASE_RETURN = 2;

export const BOSS_NONE = 0;
export const BOSS_MINI = 1;
export const BOSS_FINAL = 2;

export const AB_METEOR = 1;
export const AB_ICICLE = 2;
export const AB_SNOWSTORM = 3;
export const AB_THUNDER = 4;
export const AB_NOVA = 5;
export const AB_VOLLEY = 6;
export const AB_HEAL = 7;
export const AB_TRAIL = 8;
export const AB_BOMB = 9;
export const AB_PULL = 11;
export const AB_BEAM = 12;

export const FX_EXPLOSION = 0;
export const FX_BOLT = 1;
export const FX_RING = 2;
export const FX_FROST = 3;
export const FX_STORM = 4;
export const FX_SPARK = 5;
export const FX_SLASH = 6;
export const FX_COUNT = 7;

export const ITEM_OFFER_SLOTS = 3;
export const MAX_STARS = tuning.items.maxStars;
export const AWAKENED_STARS = MAX_STARS + 1;
export const MAX_ORBITERS = 8;
export const MAX_ABILITIES = 12;
export const MAX_PIERCE_TRACKED = 16;
export const REHIT_SLOTS = 32;
