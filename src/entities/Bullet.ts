import * as Phaser from 'phaser';
import { Team } from '../types';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  readonly team: Team;
  readonly damage = 50;
  readonly paintRadius = 72;

  private remainingLife: number;
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
    private readonly targetX: number,
    private readonly targetY: number,
    private readonly onImpact: (bullet: Bullet) => void,
  ) {
    super(scene, x, y, texture);
    this.team = team;
    this.previousX = x;
    this.previousY = y;
    this.remainingLife =
      (Phaser.Math.Distance.Between(x, y, targetX, targetY) / velocity.length()) * 1000 + 100;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5).setScale(1.45);
    this.setCircle(7);
    this.setVelocity(velocity.x, velocity.y);
  }

  updateBullet(delta: number): void {
    if (!this.active) return;

    this.remainingLife -= delta;
    const travelLine = new Phaser.Geom.Line(this.previousX, this.previousY, this.x, this.y);
    const targetHitArea = new Phaser.Geom.Circle(this.targetX, this.targetY, 12);
    const outsideMap = this.x < 0 || this.y < 0 || this.x > 1600 || this.y > 1200;
    if (
      this.remainingLife <= 0 ||
      Phaser.Geom.Intersects.LineToCircle(travelLine, targetHitArea) ||
      outsideMap
    ) {
      this.setPosition(this.targetX, this.targetY);
      this.impact();
      return;
    }

    this.previousX = this.x;
    this.previousY = this.y;
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
