import * as Phaser from 'phaser';
import { Team } from '../types';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  readonly team: Team;
  readonly damage = 24;
  readonly paintRadius = 64;

  private remainingLife = 1000;
  private hasImpacted = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    team: Team,
    velocity: Phaser.Math.Vector2,
    private readonly onImpact: (bullet: Bullet) => void,
  ) {
    super(scene, x, y, texture);
    this.team = team;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5).setScale(1.45);
    this.setCircle(7);
    this.setVelocity(velocity.x, velocity.y);
  }

  updateBullet(delta: number): void {
    if (!this.active) return;

    this.remainingLife -= delta;
    const outsideMap = this.x < 0 || this.y < 0 || this.x > 1600 || this.y > 1200;
    if (this.remainingLife <= 0 || outsideMap) {
      this.impact();
    }
  }

  impact(): void {
    if (this.hasImpacted || !this.active) return;
    this.hasImpacted = true;
    this.onImpact(this);
    this.destroy();
  }
}
