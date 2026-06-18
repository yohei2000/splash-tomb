# Splash Tomb

Vite + TypeScript + Phaser 3で作った、スマホブラウザ対応のトップダウン2Dインク対戦プロトタイプです。

現在の対戦人数は青10体（プレイヤー1体＋AI 9体）対オレンジAI 10体です。

## 操作

- PC移動: `WASD` または矢印キー
- PC照準・射撃: 画面右側をマウスで押し続ける
- スマホ移動: 画面左側をタッチして仮想スティック操作
- スマホ照準・射撃: 画面右側をタッチまたはドラッグ。青い照準マーカーの位置へ着弾し、プレイヤーからの距離に応じて射程が約50〜100pxの間で変化
- 視界: マップ全ピクセルに高度と可視状態を保持。プレイヤーが向いている90度へ視線判定を行い、山や尾根の裏側はブラックアウト
- ミニマップ: 右下に全体の青・オレンジの塗り状況とプレイヤー位置をリアルタイム表示

## 起動

Node.js 22以上を推奨します。

```powershell
npm.cmd install
npm.cmd run dev
```

表示されたローカルURLをブラウザで開きます。同一LANのスマートフォンから確認する場合は、次のように起動します。

```powershell
npm.cmd run dev -- --host
```

## ビルド

```powershell
npm.cmd run build
npm.cmd run preview
```

成果物は `dist/` に生成されます。

## GitHub Pagesへデプロイ

1. このフォルダをGitHubリポジトリへpushします。
2. GitHubのリポジトリ画面で `Settings > Pages` を開きます。
3. `Build and deployment > Source` を `GitHub Actions` に設定します。
4. `main` ブランチへpushすると `.github/workflows/deploy.yml` がビルドとデプロイを実行します。

`vite.config.ts` の `base` は相対パス `./` のため、リポジトリ名を固定せずGitHub Pagesのプロジェクトサイトで動作します。

## 実装構成

- `src/scenes/GameScene.ts`: 試合進行、入力、カメラ、HUD、衝突
- `src/entities/Player.ts`: プレイヤー移動、HP、リスポーン
- `src/entities/Bot.ts`: 接近・射撃AI、HP、リスポーン
- `src/entities/Bullet.ts`: 弾の移動、寿命、着弾
- `src/systems/InkGrid.ts`: 16pxグリッドの `none / blue / orange` 管理と塗り
- `src/systems/Weapon.ts`: 射撃クールダウンと弾生成
- `src/systems/TerrainVisibility.ts`: ピクセル単位の高度マップ、地形描画、90度視野、山による遮蔽

キャラクターはAI生成した海洋生物モチーフの画像を使用しています。

- `public/assets/player-squid.png`: 青チームのイカ
- `public/assets/enemy-crab.png`: オレンジチームのカニ

弾は `GameScene.createTextures()` で生成しています。キャラクター画像は同じテクスチャキーを保ったまま差し替えできます。
