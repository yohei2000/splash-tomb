import * as Phaser from 'phaser';
import { Bot } from '../entities/Bot';
import { Bullet } from '../entities/Bullet';
import { Player } from '../entities/Player';
import { InkGrid } from '../systems/InkGrid';
import { TerrainVisibility } from '../systems/TerrainVisibility';
import { Weapon } from '../systems/Weapon';
import { MAP_HEIGHT, MAP_WIDTH, TEAM_COLORS, Team } from '../types';

const MATCH_DURATION_MS = 90_000;

export class GameScene extends Phaser.Scene {
  private inkGrid!: InkGrid;
  private player!: Player;
  private bots: Bot[] = [];
  private allyBots: Bot[] = [];
  private enemyBots: Bot[] = [];
  private bullets!: Phaser.Physics.Arcade.Group;
  private terrainVisibility!: TerrainVisibility;
  private matchEndsAt = 0;
  private matchOver = false;

  private timerText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private coverageText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private leftHint!: Phaser.GameObjects.Text;
  private rightHint!: Phaser.GameObjects.Text;
  private overlayShade!: Phaser.GameObjects.Rectangle;
  private resultText!: Phaser.GameObjects.Text;
  private restartText!: Phaser.GameObjects.Text;
  private minimapImage!: Phaser.GameObjects.Image;
  private minimapBorder!: Phaser.GameObjects.Rectangle;
  private minimapPlayerMarker!: Phaser.GameObjects.Arc;
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private aimMarker!: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private aimPointerId: number | null = null;
  private joystickOrigin = new Phaser.Math.Vector2();
  private aimWorld = new Phaser.Math.Vector2();
  private playerFacingAngle = 0;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.load.image('player-blue', 'assets/player-squid.png');
    this.load.image('bot-orange', 'assets/enemy-crab.png');
  }

  create(): void {
    this.createTextures();
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.terrainVisibility = new TerrainVisibility(this);
    this.createMapGrid();

    this.inkGrid = new InkGrid(this);
    this.bullets = this.physics.add.group({ runChildUpdate: false });

    const impact = (bullet: Bullet) => this.handleBulletImpact(bullet);
    const playerWeapon = new Weapon(
      this,
      'blue',
      'bullet-blue',
      this.bullets,
      impact,
      this.terrainVisibility,
      210,
    );
    this.player = new Player(this, 250, MAP_HEIGHT / 2, 'player-blue', this.inkGrid, playerWeapon);
    this.player.setDepth(95).setRotation(-Math.PI / 2);

    const allySpawnPoints = [
      [280, 300],
      [280, 500],
      [280, 720],
      [390, 300],
      [390, 500],
      [390, 720],
      [500, 600],
    ].map(([x, y]) => new Phaser.Math.Vector2(x, y));
    this.allyBots = allySpawnPoints.map((point) => {
      const weapon = new Weapon(
        this,
        'blue',
        'bullet-blue',
        this.bullets,
        impact,
        this.terrainVisibility,
        340,
      );
      return new Bot(this, point.x, point.y, 'player-blue', 'blue', this.inkGrid, weapon);
    });

    const enemySpawnPoints = [1240, 1400].flatMap((x) =>
      [180, 390, 600, 810, 1020].map((y) => new Phaser.Math.Vector2(x, y)),
    );
    this.enemyBots = enemySpawnPoints.map((point) => {
      const weapon = new Weapon(
        this,
        'orange',
        'bullet-orange',
        this.bullets,
        impact,
        this.terrainVisibility,
        520,
      );
      return new Bot(this, point.x, point.y, 'bot-orange', 'orange', this.inkGrid, weapon);
    });
    this.bots = [...this.allyBots, ...this.enemyBots];

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.75);
    this.setupInput();
    this.createHud();

    this.inkGrid.paintCircle(this.player.x, this.player.y, 100, 'blue');
    for (const bot of this.bots) this.inkGrid.paintCircle(bot.x, bot.y, 90, bot.team);
    this.matchEndsAt = this.time.now + MATCH_DURATION_MS;
  }

  update(_time: number, delta: number): void {
    if (this.matchOver) return;

    this.player.updatePlayer(delta);
    const blueTeam: Array<Player | Bot> = [this.player, ...this.allyBots];
    for (const bot of this.allyBots) {
      bot.updateBot(this.findNearestTarget(bot, this.enemyBots), delta);
    }
    for (const bot of this.enemyBots) {
      bot.updateBot(this.findNearestTarget(bot, blueTeam), delta);
    }
    for (const bullet of this.bullets.getChildren() as Bullet[]) {
      if (!bullet.active) continue;
      bullet.updateBullet(delta);
    }

    if (this.aimPointerId !== null && this.player.isAlive) {
      const target = this.getPlayerAimTarget();
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        target.x,
        target.y,
      );
      this.playerFacingAngle = angle;
      this.player.setRotation(angle - Math.PI / 2);
      this.aimMarker.setPosition(target.x, target.y).setVisible(true);
      this.player.weapon.fire(
        this.player.x,
        this.player.y,
        angle,
        Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y),
      );
    } else {
      this.aimMarker.setVisible(false);
    }

    this.terrainVisibility.update(
      delta,
      this.player.x,
      this.player.y,
      this.playerFacingAngle,
    );
    this.updateMinimapPosition();

    const remainingMs = Math.max(0, this.matchEndsAt - this.time.now);
    this.timerText.setText(`TIME ${Math.ceil(remainingMs / 1000)}`);
    this.hpText.setText(`HP ${this.player.hp}`);
    const coverage = this.inkGrid.getCoverage();
    this.coverageText.setText(`BLUE ${coverage.blue}  ORANGE ${coverage.orange}`);

    if (remainingMs <= 0) this.finishMatch();
  }

  private createTextures(): void {
    const makeCircle = (key: string, color: number, radius: number, outline = 0xffffff) => {
      if (this.textures.exists(key)) return;
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(color, 1).fillCircle(radius, radius, radius - 2);
      graphics.lineStyle(3, outline, 0.9).strokeCircle(radius, radius, radius - 2);
      graphics.generateTexture(key, radius * 2, radius * 2);
      graphics.destroy();
    };

    makeCircle('bullet-blue', TEAM_COLORS.blue, 7, 0xbce0ff);
    makeCircle('bullet-orange', TEAM_COLORS.orange, 7, 0xffd2ad);
  }

  private createMapGrid(): void {
    const graphics = this.add.graphics().setDepth(-9);
    graphics.lineStyle(1, 0x3a4352, 0.35);
    for (let x = 0; x <= MAP_WIDTH; x += 16) graphics.lineBetween(x, 0, x, MAP_HEIGHT);
    for (let y = 0; y <= MAP_HEIGHT; y += 16) graphics.lineBetween(0, y, MAP_WIDTH, y);
    graphics.lineStyle(8, 0x697386, 1).strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const width = this.scale.width;
      if (pointer.x < width * 0.48 && this.joystickPointerId === null) {
        this.joystickPointerId = pointer.id;
        this.joystickOrigin.set(pointer.x, pointer.y);
        this.joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
        this.joystickKnob.setPosition(pointer.x, pointer.y).setVisible(true);
        return;
      }

      if (this.aimPointerId === null) {
        this.aimPointerId = pointer.id;
        this.updateAim(pointer);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) this.updateJoystick(pointer);
      if (pointer.id === this.aimPointerId) this.updateAim(pointer);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.player.setVirtualMove(new Phaser.Math.Vector2());
        this.joystickBase.setVisible(false);
        this.joystickKnob.setVisible(false);
      }
      if (pointer.id === this.aimPointerId) {
        this.aimPointerId = null;
        this.aimMarker.setVisible(false);
      }
    });

    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.player.setVirtualMove(new Phaser.Math.Vector2());
        this.joystickBase.setVisible(false);
        this.joystickKnob.setVisible(false);
      }
      if (pointer.id === this.aimPointerId) {
        this.aimPointerId = null;
        this.aimMarker.setVisible(false);
      }
    });
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const offset = new Phaser.Math.Vector2(pointer.x - this.joystickOrigin.x, pointer.y - this.joystickOrigin.y);
    const maxRadius = 54;
    if (offset.length() > maxRadius) offset.setLength(maxRadius);
    this.joystickKnob.setPosition(this.joystickOrigin.x + offset.x, this.joystickOrigin.y + offset.y);
    this.player.setVirtualMove(offset.scale(1 / maxRadius));
  }

  private updateAim(pointer: Phaser.Input.Pointer): void {
    const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    this.aimWorld.copy(worldPoint);
  }

  private getPlayerAimTarget(): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(
      this.aimWorld.x - this.player.x,
      this.aimWorld.y - this.player.y,
    );
    if (direction.lengthSq() === 0) direction.set(1, 0);
    const angle = direction.angle();
    const maxRange = this.player.weapon.getMaxRange(
      this.player.x,
      this.player.y,
      angle,
    );
    const range = Phaser.Math.Clamp(direction.length(), 50, maxRange);
    return direction.normalize().scale(range).add(new Phaser.Math.Vector2(this.player.x, this.player.y));
  }

  private createHud(): void {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#111827',
      strokeThickness: 4,
    };
    this.timerText = this.add.text(16, 14, 'TIME 90', textStyle).setScrollFactor(0).setDepth(100);
    this.hpText = this.add.text(16, 40, 'HP 50', textStyle).setScrollFactor(0).setDepth(100);
    this.coverageText = this.add
      .text(this.scale.width / 2, 14, 'BLUE 0  ORANGE 0', { ...textStyle, fontSize: '14px' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.joystickBase = this.add
      .circle(0, 0, 54, 0xffffff, 0.12)
      .setStrokeStyle(3, 0xffffff, 0.3)
      .setScrollFactor(0)
      .setDepth(110)
      .setVisible(false);
    this.joystickKnob = this.add
      .circle(0, 0, 25, TEAM_COLORS.blue, 0.65)
      .setScrollFactor(0)
      .setDepth(111)
      .setVisible(false);
    this.aimMarker = this.add
      .circle(0, 0, 12, 0xffffff, 0.15)
      .setStrokeStyle(3, TEAM_COLORS.blue, 0.95)
      .setDepth(112)
      .setVisible(false);
    this.minimapBorder = this.add
      .rectangle(0, 0, 1, 1, 0x080b12, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.75)
      .setDepth(119);
    this.minimapImage = this.add
      .image(0, 0, this.inkGrid.minimapTextureKey)
      .setDepth(120);
    this.minimapPlayerMarker = this.add
      .circle(0, 0, 3, 0xffffff, 1)
      .setStrokeStyle(1, 0x111827, 1)
      .setDepth(121);
    this.updateMinimapPosition();

    this.leftHint = this.add
      .text(18, this.scale.height - 32, 'LEFT: MOVE', { ...textStyle, fontSize: '12px' })
      .setScrollFactor(0)
      .setDepth(100);
    this.rightHint = this.add
      .text(this.scale.width - 18, this.scale.height - 32, 'RIGHT: AIM / FIRE', {
        ...textStyle,
        fontSize: '12px',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.overlayShade = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x080b12, 0.82)
      .setOrigin(0);
    this.resultText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        ...textStyle,
        fontSize: '28px',
        align: 'center',
      })
      .setOrigin(0.5);
    this.restartText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 100, 'TAP TO RESTART', {
        ...textStyle,
        fontSize: '18px',
        backgroundColor: '#334155',
        padding: { x: 18, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive();
    this.restartText.on('pointerdown', () => this.scene.restart());
    this.overlay.add([this.overlayShade, this.resultText, this.restartText]);

    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.coverageText.setX(size.width / 2);
      this.leftHint.setY(size.height - 32);
      this.rightHint.setPosition(size.width - 18, size.height - 32);
      this.overlayShade.setSize(size.width, size.height);
      this.resultText.setPosition(size.width / 2, size.height / 2);
      this.restartText.setPosition(size.width / 2, size.height / 2 + 100);
      this.updateMinimapPosition();
    });
  }

  private updateMinimapPosition(): void {
    if (!this.minimapImage || !this.player) return;

    const camera = this.cameras.main;
    const screenWidth = Math.min(128, this.scale.width * 0.32);
    const screenHeight = screenWidth * (MAP_HEIGHT / MAP_WIDTH);
    const margin = 12;
    const bottomClearance = 48;
    const left = this.scale.width - margin - screenWidth;
    const top = this.scale.height - bottomClearance - screenHeight;
    const centerScreenX = left + screenWidth / 2;
    const centerScreenY = top + screenHeight / 2;
    const inverseZoom = 1 / camera.zoom;
    const centerWorldX = camera.worldView.x + centerScreenX * inverseZoom;
    const centerWorldY = camera.worldView.y + centerScreenY * inverseZoom;
    const worldWidth = screenWidth * inverseZoom;
    const worldHeight = screenHeight * inverseZoom;

    this.minimapImage
      .setPosition(centerWorldX, centerWorldY)
      .setDisplaySize(worldWidth, worldHeight);
    this.minimapBorder
      .setPosition(centerWorldX, centerWorldY)
      .setSize(worldWidth + 8 * inverseZoom, worldHeight + 8 * inverseZoom)
      .setStrokeStyle(2 * inverseZoom, 0xffffff, 0.75);

    const markerScreenX = left + (this.player.x / MAP_WIDTH) * screenWidth;
    const markerScreenY = top + (this.player.y / MAP_HEIGHT) * screenHeight;
    this.minimapPlayerMarker
      .setPosition(
        camera.worldView.x + markerScreenX * inverseZoom,
        camera.worldView.y + markerScreenY * inverseZoom,
      )
      .setRadius(3 * inverseZoom)
      .setStrokeStyle(1 * inverseZoom, 0x111827, 1);
  }

  private handleBulletImpact(bullet: Bullet): void {
    this.inkGrid.paintCircle(bullet.x, bullet.y, bullet.paintRadius, bullet.team);
    const targets: Array<Player | Bot> =
      bullet.team === 'blue' ? this.enemyBots : [this.player, ...this.allyBots];

    for (const target of targets) {
      if (!target.isAlive) continue;
      if (Phaser.Math.Distance.Between(bullet.x, bullet.y, target.x, target.y) > 44) continue;
      const died = target.takeDamage(bullet.damage);
      if (died) this.scheduleRespawn(target, target.team);
    }
  }

  private findNearestTarget<T extends Player | Bot>(
    source: Bot,
    candidates: T[],
  ): T | undefined {
    let nearest: T | undefined;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      if (!candidate.isAlive) continue;
      const distanceSq = Phaser.Math.Distance.Squared(source.x, source.y, candidate.x, candidate.y);
      if (distanceSq < nearestDistanceSq) {
        nearest = candidate;
        nearestDistanceSq = distanceSq;
      }
    }

    return nearest;
  }

  private scheduleRespawn(entity: Player | Bot, team: Team): void {
    this.time.delayedCall(3000, () => {
      if (this.matchOver) return;
      const x = team === 'blue' ? 220 : MAP_WIDTH - 220;
      const y = Phaser.Math.Between(180, MAP_HEIGHT - 180);
      entity.respawn(x, y);
      this.inkGrid.paintCircle(x, y, 72, team);
    });
  }

  private finishMatch(): void {
    this.matchOver = true;
    this.player.setVelocity(0);
    for (const bot of this.bots) bot.setVelocity(0);
    for (const bullet of this.bullets.getChildren() as Bullet[]) bullet.destroy();

    const coverage = this.inkGrid.getCoverage();
    const totalCells = this.inkGrid.columns * this.inkGrid.rows;
    const bluePercent = (coverage.blue / totalCells) * 100;
    const orangePercent = (coverage.orange / totalCells) * 100;
    const winner = coverage.blue === coverage.orange ? 'DRAW' : coverage.blue > coverage.orange ? 'BLUE WINS' : 'ORANGE WINS';
    this.resultText.setText(
      `${winner}\n\nBLUE ${bluePercent.toFixed(1)}%\nORANGE ${orangePercent.toFixed(1)}%`,
    );
    this.overlay.setVisible(true);
  }
}
