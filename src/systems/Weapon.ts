import * as Phaser from 'phaser';
import { Bullet } from '../entities/Bullet';
import { Team } from '../types';

export class Weapon {
  private nextShotAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly team: Team,
    private readonly texture: string,
    private readonly bullets: Phaser.Physics.Arcade.Group,
    private readonly onImpact: (bullet: Bullet) => void,
    private readonly cooldown = 260,
  ) {}

  fire(x: number, y: number, angle: number, requestedRange = 100): boolean {
    const now = this.scene.time.now;
    if (now < this.nextShotAt) return false;

    this.nextShotAt = now + this.cooldown;
    const speed = 1800;
    const muzzleDistance = 24;
    const range = Phaser.Math.Clamp(requestedRange, 50, 100);
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
