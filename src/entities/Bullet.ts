import * as Phaser from 'phaser';
import { Team } from '../types';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  readonly team: Team;
  readonly damage = 50;
  readonly paintRadius = 72;

  private remainingLife = 450;
  private traveledDistance = 0;
  private readonly maxDistance = 1100;
  private previousX: number;
  private previousY: number;
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
    this.previousX = x;
    this.previousY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5).setScale(1.45);
    this.setCircle(7);
    this.setVelocity(velocity.x, velocity.y);
  }

  updateBullet(delta: number): void {
    if (!this.active) return;

    this.traveledDistance += Phaser.Math.Distance.Between(
      this.previousX,
      this.previousY,
      this.x,
      this.y,
    );
    this.previousX = this.x;
    this.previousY = this.y;
    this.remainingLife -= delta;
    const outsideMap = this.x < 0 || this.y < 0 || this.x > 1600 || this.y > 1200;
    if (this.remainingLife <= 0 || this.traveledDistance >= this.maxDistance || outsideMap) {
      this.impact();
    }
  }

  getTravelLine(): Phaser.Geom.Line {
    return new Phaser.Geom.Line(this.previousX, this.previousY, this.x, this.y);
  }

  impact(): void {
    if (this.hasImpacted || !this.active) return;
    this.hasImpacted = true;
    this.onImpact(this);
    this.destroy();
  }
}
