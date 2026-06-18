import * as Phaser from 'phaser';
import { GRID_SIZE, InkState, MAP_HEIGHT, MAP_WIDTH, TEAM_COLORS, Team } from '../types';

export class InkGrid {
  readonly minimapTextureKey = 'ink-minimap';
  readonly columns = Math.ceil(MAP_WIDTH / GRID_SIZE);
  readonly rows = Math.ceil(MAP_HEIGHT / GRID_SIZE);

  private readonly cells: InkState[];
  private readonly layer: Phaser.GameObjects.RenderTexture;
  private readonly stamp: Phaser.GameObjects.Graphics;
  private readonly minimapTexture: Phaser.Textures.CanvasTexture;
  private readonly minimapImageData: ImageData;

  constructor(scene: Phaser.Scene) {
    this.cells = new Array(this.columns * this.rows).fill('none');
    this.layer = scene.add.renderTexture(0, 0, MAP_WIDTH, MAP_HEIGHT).setOrigin(0).setDepth(-5);
    this.stamp = scene.make.graphics({ x: 0, y: 0 });

    if (scene.textures.exists(this.minimapTextureKey)) {
      scene.textures.remove(this.minimapTextureKey);
    }
    const texture = scene.textures.createCanvas(
      this.minimapTextureKey,
      this.columns,
      this.rows,
    );
    if (!texture) throw new Error('Unable to create ink minimap texture');
    this.minimapTexture = texture;
    const context = texture.getContext();
    this.minimapImageData = context.createImageData(this.columns, this.rows);
    for (let index = 0; index < this.cells.length; index += 1) {
      const offset = index * 4;
      this.minimapImageData.data[offset] = 24;
      this.minimapImageData.data[offset + 1] = 31;
      this.minimapImageData.data[offset + 2] = 43;
      this.minimapImageData.data[offset + 3] = 238;
    }
    context.putImageData(this.minimapImageData, 0, 0);
    texture.refresh();
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
          const index = row * this.columns + col;
          this.cells[index] = team;
          this.setMinimapPixel(index, team);
          this.stamp.fillRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
      }
    }

    this.layer.draw(this.stamp);
    this.minimapTexture
      .getContext()
      .putImageData(this.minimapImageData, 0, 0);
    this.minimapTexture.refresh();
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

  private setMinimapPixel(index: number, team: Team): void {
    const offset = index * 4;
    if (team === 'blue') {
      this.minimapImageData.data[offset] = 38;
      this.minimapImageData.data[offset + 1] = 140;
      this.minimapImageData.data[offset + 2] = 255;
    } else {
      this.minimapImageData.data[offset] = 255;
      this.minimapImageData.data[offset + 1] = 122;
      this.minimapImageData.data[offset + 2] = 26;
    }
    this.minimapImageData.data[offset + 3] = 255;
  }
}
