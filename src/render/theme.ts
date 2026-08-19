import { Platform } from 'react-native';

export const COLORS = {
  ink: '#07060c',
  stone: '#191825',
  stoneDeep: '#11101a',
  stoneRaised: '#272537',
  bevelLight: '#4b4665',
  bevelDark: '#0e0d16',
  parchment: '#f3e9d2',
  muted: '#8b849f',
  gold: '#f2b33d',
  goldDeep: '#8a5f11',
  blood: '#cf3d4e',
  bloodDeep: '#511620',
  xp: '#48c8ef',
  xpDeep: '#153c4c',
  shield: '#a9d9ff',
  scrim: 'rgba(7,6,12,0.88)',
  vignette: 'rgba(207,61,78,0.34)',
};

export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  web: 'ui-monospace, Menlo, Consolas, monospace',
  default: 'monospace',
});

export const BEVEL = 2;

export const CLASS_COLORS = ['#8f6bff', '#5aa9e6', '#e08a3c', '#7fe3c0'];
