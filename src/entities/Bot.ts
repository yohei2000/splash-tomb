import * as Phaser from 'phaser';
import { InkGrid } from '../systems/InkGrid';
import { Weapon } from '../systems/Weapon';
import { Team } from '../types';
import { Player } from './Player';

export class Bot extends Phaser.Physics.Arcade.Sprite {
  readonly maxHp = 50;
  hp = this.maxHp;
  isAlive = true;

  private strafeDirection = Phaser.Math.RND.sign();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    readonly team: Team,
    private readonly inkGrid: InkGrid,
    readonly weapon: Weapon,
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(60, 60).setCollideWorldBounds(true).setDepth(4).setCircle(55, 25, 25);
  }

  updateBot(target?: Player | Bot): void {
    if (!this.isAlive || !target?.isAlive) {
      this.setVelocity(0);
      return;
    }

    const toTarget = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
    const distance = toTarget.length();
    const direction = distance > 0 ? toTarget.normalize() : toTarget;
    const ink = this.inkGrid.getInkAt(this.x, this.y);
    const multiplier = ink === this.team ? 1.35 : ink === 'none' ? 1 : 0.5;

    if (distance > 420) {
      this.setVelocity(direction.x * 155 * multiplier, direction.y * 155 * multiplier);
    } else {
      const desired = distance < 260 ? -0.55 : 0.15;
      const strafe = new Phaser.Math.Vector2(-direction.y, direction.x).scale(this.strafeDirection);
      const move = direction.clone().scale(desired).add(strafe.scale(0.75)).normalize();
      this.setVelocity(move.x * 145 * multiplier, move.y * 145 * multiplier);
      this.weapon.fire(this.x, this.y, Math.atan2(target.y - this.y, target.x - this.x));
    }

    if (Phaser.Math.Between(0, 500) === 0) this.strafeDirection *= -1;
  }

  takeDamage(amount: number): boolean {
    if (!this.isAlive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.active && this.clearTint());

    if (this.hp === 0) {
      this.isAlive = false;
      this.setVisible(false).disableBody();
      return true;
    }
    return false;
  }

  respawn(x: number, y: number): void {
    this.hp = this.maxHp;
    this.isAlive = true;
    this.enableBody(true, x, y, true, true);
  }
}
