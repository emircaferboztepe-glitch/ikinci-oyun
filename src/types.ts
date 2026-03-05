export enum GameState {
  START,
  PLAYING,
  GAMEOVER
}

export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Obstacle extends Entity {
  type: 'spike' | 'low-wall' | 'high-wall';
}

export interface Collectible extends Entity {
  type: 'ring';
  collected: boolean;
}
