import * as Phaser from 'phaser';
import { GRID_SIZE, InkState, MAP_HEIGHT, MAP_WIDTH, TEAM_COLORS, Team } from '../types';

export class InkGrid {
  readonly columns = Math.ceil(MAP_WIDTH / GRID_SIZE);
  readonly rows = Math.ceil(MAP_HEIGHT / GRID_SIZE);

  private readonly cells: InkState[];
  private readonly layer: Phaser.GameObjects.RenderTexture;
  private readonly stamp: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.cells = new Array(this.columns * this.rows).fill('none');
    this.layer = scene.add.renderTexture(0, 0, MAP_WIDTH, MAP_HEIGHT).setOrigin(0).setDepth(-5);
    this.stamp = scene.make.graphics({ x: 0, y: 0 });
  }

  getInkAt(worldX: number, worldY: number): InkState {
    const col = Phaser.Math.Clamp(Math.floor(worldX / GRID_SIZE), 0, this.columns - 1);
    const row = Phaser.Math.Clamp(Math.floor(worldY / GRID_SIZE), 0, this.rows - 1);
    return this.cells[row * this.columns + col];
  }

  paintCircle(worldX: number, worldY: number, radius: number, team: Team): void {
    const minCol = Phaser.Math.Clamp(Math.floor((worldX - radius) / GRID_SIZE), 0, this.columns - 1);
    const maxCol = Phaser.Math.Clamp(Math.floor((worldX + radius) / GRID_SIZE), 0, this.columns - 1);
    const minRow = Phaser.Math.Clamp(Math.floor((worldY - radius) / GRID_SIZE), 0, this.rows - 1);
    const maxRow = Phaser.Math.Clamp(Math.floor((worldY + radius) / GRID_SIZE), 0, this.rows - 1);
    const radiusSq = radius * radius;

    this.stamp.clear();
    this.stamp.fillStyle(TEAM_COLORS[team], 0.72);

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const centerX = col * GRID_SIZE + GRID_SIZE / 2;
        const centerY = row * GRID_SIZE + GRID_SIZE / 2;
        const dx = centerX - worldX;
        const dy = centerY - worldY;

        if (dx * dx + dy * dy <= radiusSq) {
          this.cells[row * this.columns + col] = team;
          this.stamp.fillRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
      }
    }

    this.layer.draw(this.stamp);
  }

  getCoverage(): Record<Team, number> {
    let blue = 0;
    let orange = 0;

    for (const cell of this.cells) {
      if (cell === 'blue') blue += 1;
      if (cell === 'orange') orange += 1;
    }

    return { blue, orange };
  }

  destroy(): void {
    this.layer.destroy();
    this.stamp.destroy();
  }
}
