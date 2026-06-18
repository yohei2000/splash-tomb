import * as Phaser from 'phaser';
import { MAP_HEIGHT, MAP_WIDTH } from '../types';

const enum VisibilityState {
  Hidden = 0,
  Visible = 1,
}

type Hill = {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  height: number;
};

export class TerrainVisibility {
  readonly elevation = new Uint8Array(MAP_WIDTH * MAP_HEIGHT);
  readonly visibility = new Uint8Array(MAP_WIDTH * MAP_HEIGHT);

  private readonly visibilityTexture: Phaser.Textures.CanvasTexture;
  private readonly visibilityImageData: ImageData;
  private readonly visiblePixels: number[] = [];
  private updateElapsed = Number.POSITIVE_INFINITY;

  constructor(private readonly scene: Phaser.Scene) {
    this.generateElevation();

    this.createCanvasTexture('terrain-height', false);
    this.visibilityTexture = this.createCanvasTexture('terrain-visibility', true);
    this.visibilityImageData = this.visibilityTexture
      .getContext()
      .getImageData(0, 0, MAP_WIDTH, MAP_HEIGHT);

    scene.add.image(0, 0, 'terrain-height').setOrigin(0).setDepth(-10);
    scene.add.image(0, 0, 'terrain-visibility').setOrigin(0).setDepth(90);
  }

  update(
    delta: number,
    viewerX: number,
    viewerY: number,
    facingAngle: number,
  ): void {
    this.updateElapsed += delta;
    if (this.updateElapsed < 120) return;
    this.updateElapsed = 0;

    this.clearPreviousVisibility();
    this.castVisiblePixels(viewerX, viewerY, facingAngle);
    this.visibilityTexture.getContext().putImageData(this.visibilityImageData, 0, 0);
    this.visibilityTexture.refresh();
  }

  getElevationAt(worldX: number, worldY: number): number {
    const x = Phaser.Math.Clamp(Math.round(worldX), 0, MAP_WIDTH - 1);
    const y = Phaser.Math.Clamp(Math.round(worldY), 0, MAP_HEIGHT - 1);
    return this.elevation[y * MAP_WIDTH + x];
  }

  private generateElevation(): void {
    const hills: Hill[] = [
      { x: 500, y: 600, radiusX: 120, radiusY: 280, height: 225 },
      { x: 970, y: 300, radiusX: 220, radiusY: 180, height: 175 },
      { x: 1080, y: 900, radiusX: 260, radiusY: 210, height: 195 },
      { x: 1380, y: 560, radiusX: 170, radiusY: 260, height: 150 },
      { x: 420, y: 980, radiusX: 180, radiusY: 150, height: 115 },
    ];

    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        let height = 12 + Math.sin(x * 0.012) * 3 + Math.cos(y * 0.015) * 3;

        for (const hill of hills) {
          const dx = (x - hill.x) / hill.radiusX;
          const dy = (y - hill.y) / hill.radiusY;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq >= 1) continue;
          const falloff = 1 - distanceSq;
          height += hill.height * falloff * falloff;
        }

        this.elevation[y * MAP_WIDTH + x] = Phaser.Math.Clamp(
          Math.round(height),
          0,
          255,
        );
      }
    }
  }

  private createCanvasTexture(
    key: string,
    visibilityTexture: boolean,
  ): Phaser.Textures.CanvasTexture {
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    const texture = this.scene.textures.createCanvas(key, MAP_WIDTH, MAP_HEIGHT);
    if (!texture) throw new Error(`Unable to create texture: ${key}`);

    const context = texture.getContext();
    const imageData = context.createImageData(MAP_WIDTH, MAP_HEIGHT);
    const pixels = imageData.data;

    for (let index = 0; index < this.elevation.length; index += 1) {
      const pixelOffset = index * 4;
      if (visibilityTexture) {
        pixels[pixelOffset] = 0;
        pixels[pixelOffset + 1] = 0;
        pixels[pixelOffset + 2] = 0;
        pixels[pixelOffset + 3] = 255;
        continue;
      }

      const height = this.elevation[index];
      const band = Math.floor(height / 24) % 2;
      pixels[pixelOffset] = 42 + Math.round(height * 0.28) + band * 5;
      pixels[pixelOffset + 1] = 55 + Math.round(height * 0.42) + band * 4;
      pixels[pixelOffset + 2] = 68 + Math.round(height * 0.24);
      pixels[pixelOffset + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
    texture.refresh();
    return texture;
  }

  private clearPreviousVisibility(): void {
    const pixels = this.visibilityImageData.data;
    for (const index of this.visiblePixels) {
      this.visibility[index] = VisibilityState.Hidden;
      pixels[index * 4 + 3] = 255;
    }
    this.visiblePixels.length = 0;
  }

  private castVisiblePixels(
    viewerX: number,
    viewerY: number,
    facingAngle: number,
  ): void {
    const originX = Phaser.Math.Clamp(Math.round(viewerX), 0, MAP_WIDTH - 1);
    const originY = Phaser.Math.Clamp(Math.round(viewerY), 0, MAP_HEIGHT - 1);
    const eyeHeight = this.getElevationAt(originX, originY) + 28;
    const halfFov = Phaser.Math.DegToRad(45);
    const rayCount = 720;
    const maxDistance = 1150;
    const stepSize = 2;

    this.revealDisc(originX, originY, 18);

    for (let ray = 0; ray <= rayCount; ray += 1) {
      const angle = facingAngle - halfFov + (ray / rayCount) * halfFov * 2;
      const directionX = Math.cos(angle);
      const directionY = Math.sin(angle);
      let maxSlope = Number.NEGATIVE_INFINITY;

      for (let distance = stepSize; distance <= maxDistance; distance += stepSize) {
        const x = Math.round(originX + directionX * distance);
        const y = Math.round(originY + directionY * distance);
        if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) break;

        const index = y * MAP_WIDTH + x;
        const slope = (this.elevation[index] - eyeHeight) / distance;
        if (slope + 0.012 < maxSlope) continue;

        maxSlope = Math.max(maxSlope, slope);
        this.revealPixel(x, y);
        this.revealPixel(x + 1, y);
        this.revealPixel(x, y + 1);
        this.revealPixel(x + 1, y + 1);
      }
    }
  }

  private revealDisc(centerX: number, centerY: number, radius: number): void {
    const radiusSq = radius * radius;
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= radiusSq) this.revealPixel(x, y);
      }
    }
  }

  private revealPixel(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return;
    const index = y * MAP_WIDTH + x;
    if (this.visibility[index] === VisibilityState.Visible) return;

    this.visibility[index] = VisibilityState.Visible;
    this.visiblePixels.push(index);
    this.visibilityImageData.data[index * 4 + 3] = 0;
  }
}
