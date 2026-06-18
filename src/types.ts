export type Team = 'blue' | 'orange';
export type InkState = 'none' | Team;

export const TEAM_COLORS: Record<Team, number> = {
  blue: 0x268cff,
  orange: 0xff7a1a,
};

export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1200;
export const GRID_SIZE = 16;
