import * as Phaser from 'phaser';
import { InkGrid } from '../systems/InkGrid';
import { Weapon } from '../systems/Weapon';
import { Team } from '../types';

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly team: Team = 'blue';
  readonly maxHp = 50;
  hp = this.maxHp;
  isAlive = true;

  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private virtualMove = new Phaser.Math.Vector2();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    private readonly inkGrid: InkGrid,
    readonly weapon: Weapon,
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(58, 58).setCollideWorldBounds(true).setDepth(4).setCircle(55, 25, 25);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  setVirtualMove(direction: Phaser.Math.Vector2): void {
    this.virtualMove.copy(direction);
  }

  updatePlayer(): void {
    if (!this.isAlive) {
      this.setVelocity(0);
      return;
    }

    const keyboardMove = new Phaser.Math.Vector2(
      Number(this.wasd.right.isDown || this.cursors.right.isDown) -
        Number(this.wasd.left.isDown || this.cursors.left.isDown),
      Number(this.wasd.down.isDown || this.cursors.down.isDown) -
        Number(this.wasd.up.isDown || this.cursors.up.isDown),
    );
    const movement = keyboardMove.lengthSq() > 0 ? keyboardMove : this.virtualMove.clone();
    if (movement.lengthSq() > 1) movement.normalize();

    const ink = this.inkGrid.getInkAt(this.x, this.y);
    const multiplier = ink === this.team ? 1.35 : ink === 'orange' ? 0.5 : 1;
    this.setVelocity(movement.x * 210 * multiplier, movement.y * 210 * multiplier);
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
