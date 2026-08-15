export const HERO_IMAGES: Record<string, number> = {
  wizard: require('@/assets/sprites/HERO/wizard.png'),
  knight: require('@/assets/sprites/HERO/knight.png'),
  dwarf: require('@/assets/sprites/HERO/dwarf.png'),
  priest: require('@/assets/sprites/HERO/priest.png'),
};

export const WEAPON_IMAGES: Record<string, number> = {
  wand: require('@/assets/sprites/Equipment/wand.png'),
  sword: require('@/assets/sprites/Equipment/sword.png'),
  axe: require('@/assets/sprites/Equipment/axe.png'),
};

export const MONSTER_IMAGES: number[][] = [
  [
    require('@/assets/sprites/M_Slime/tile_0000.png'),
    require('@/assets/sprites/M_Slime/tile_0001.png'),
    require('@/assets/sprites/M_Slime/tile_0002.png'),
    require('@/assets/sprites/M_Slime/tile_0003.png'),
  ],
  [
    require('@/assets/sprites/M_Fly/tile_0004.png'),
    require('@/assets/sprites/M_Fly/tile_0005.png'),
    require('@/assets/sprites/M_Fly/tile_0006.png'),
    require('@/assets/sprites/M_Fly/tile_0007.png'),
  ],
  [
    require('@/assets/sprites/M_Bunny/tile_0008.png'),
    require('@/assets/sprites/M_Bunny/tile_0009.png'),
    require('@/assets/sprites/M_Bunny/tile_0010.png'),
    require('@/assets/sprites/M_Bunny/tile_0011.png'),
  ],
  [
    require('@/assets/sprites/M_Monster/tile_0012.png'),
    require('@/assets/sprites/M_Monster/tile_0013.png'),
    require('@/assets/sprites/M_Monster/tile_0014.png'),
    require('@/assets/sprites/M_Monster/tile_0015.png'),
  ],
];

export const TILE_IMAGES = {
  tile_0042: require('@/assets/sprites/T_Dungeon/tile_0042.png'),
  tile_0048: require('@/assets/sprites/T_Dungeon/tile_0048.png'),
  tile_0049: require('@/assets/sprites/T_Dungeon/tile_0049.png'),
};

export const FIREBALL_IMAGE: number = require('@/assets/sprites/Projectile/fireball_strip.png');
export const ORB_IMAGE: number = require('@/assets/sprites/Projectile/orb.png');
