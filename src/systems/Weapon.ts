import * as Phaser from 'phaser';
import { Bullet } from '../entities/Bullet';
import { TerrainVisibility } from './TerrainVisibility';
import { Team } from '../types';

export class Weapon {
  private nextShotAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly team: Team,
    private readonly texture: string,
    private readonly bullets: Phaser.Physics.Arcade.Group,
    private readonly onImpact: (bullet: Bullet) => void,
    private readonly terrain: TerrainVisibility,
    private readonly cooldown = 260,
  ) {}

  getMaxRange(x: number, y: number, angle: number): number {
    const baseRange = 100;
    const sampleX = x + Math.cos(angle) * baseRange;
    const sampleY = y + Math.sin(angle) * baseRange;
    const elevationDrop =
      this.terrain.getElevationAt(x, y) -
      this.terrain.getElevationAt(sampleX, sampleY);

    return Phaser.Math.Clamp(baseRange + Math.max(0, elevationDrop) * 0.55, 100, 200);
  }

  fire(x: number, y: number, angle: number, requestedRange = 100): boolean {
    const now = this.scene.time.now;
    if (now < this.nextShotAt) return false;

    this.nextShotAt = now + this.cooldown;
    const speed = 1800;
    const muzzleDistance = 24;
    const range = Phaser.Math.Clamp(
      requestedRange,
      50,
      this.getMaxRange(x, y, angle),
    );
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const velocity = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(speed);
    const targetX = x + directionX * range;
    const targetY = y + directionY * range;
    const bullet = new Bullet(
      this.scene,
      x + directionX * muzzleDistance,
      y + directionY * muzzleDistance,
      this.texture,
      this.team,
      velocity,
      targetX,
      targetY,
      this.onImpact,
    );
    this.bullets.add(bullet);
    return true;
  }
}
