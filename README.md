# Splash Tomb

Vite + TypeScript + Phaser 3で作った、スマホブラウザ対応のトップダウン2Dインク対戦プロトタイプです。

## 操作

- PC移動: `WASD` または矢印キー
- PC照準・射撃: 画面右側をマウスで押し続ける
- スマホ移動: 画面左側をタッチして仮想スティック操作
- スマホ照準・射撃: 画面右側をタッチし、狙う方向へドラッグ

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

現在のキャラクターと弾は `GameScene.createTextures()` で生成した仮テクスチャです。画像アセットへ置き換える場合は、同じテクスチャキーを `preload()` でロードすれば、ゲームロジック側を大きく変更せず差し替えられます。
