<h1 align="center">
  <img src="./src/renderer/src/assets/logo.png" width="200" alt="Realize Virtual Camera Logo"><br>
  Realize Virtual Camera
</h1>

<p align="center">
  <strong>VRMモデルをバーチャルカメラとして配信できるデスクトップアプリ</strong><br>
  Zoom / Teams / Google Meet / OBS などで3Dアバターを使用可能
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33-blue?logo=electron" alt="electron">
  <img src="https://img.shields.io/badge/React-18-61dafb?logo=react" alt="react">
  <img src="https://img.shields.io/badge/Three.js-r170-black?logo=threedotjs" alt="threejs">
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript" alt="typescript">
</p>

<p align="center">
  <strong>「カメラ不要。トラッキングなし。だから軽い」</strong>
</p>

<p align="center">
  🚫 Webカメラ不要 → 姿勢推定なしで超軽量<br>
  🚫 OBS二重起動不要 → 単体で仮想カメラ出力<br>
  ✨ 勝手に可愛く動く → リップシンク＆自動表情でノータッチ
</p>

---

## ✨ 特徴

- **🎭 VRMモデル対応** - VRM形式の3Dアバターをドラッグ&ドロップで読み込み
- **🎥 仮想カメラ出力** - Realize Virtual Camera経由でZoom/Teams/Meetに直接配信
- **🎤 リアルタイムリップシンク** - マイク入力に同期した口パク
- **😊 自動表情切り替え** - ランダムで表情が自然に変化（通常・笑顔・リラックス等）
- **💃 VRMAアニメーション** - 外部アニメーションファイル(.vrma)に対応
- **🖼️ 背景カスタマイズ** - 画像・動画・グリーンバック対応
- **📷 カメラプリセット** - バストアップ・全身・顔アップ + カスタム位置記憶
- **🎨 色調補正** - 明るさ・コントラスト・彩度を調整
- **🌐 多言語対応** - 日本語・英語・中国語・韓国語
- **🎬 FPS表示** - リアルタイムフレームレート監視
- **💾 設定の永続化** - 起動時に前回の状態を自動復元

---

## 🚀 クイックスタート

### Windows版 インストーラー（推奨）

1. **インストーラーをダウンロード**
   - `realize-cam-1.0.0-setup.exe` をダウンロードして実行
   - インストーラーが自動的に仮想カメラを登録します

2. **アプリを起動**
   - スタートメニューから「Realize Virtual Camera」を起動

3. **Zoom/Teams/Meetで使用**
   - カメラ設定で「**Realize Virtual Camera**」を選択

### Windows版 ZIP（ポータブル）

1. **ZIPをダウンロード**
   - `realize-cam-1.0.0-win.zip` をダウンロードして展開

2. **仮想カメラを登録**（管理者権限が必要・初回のみ）
   - `resources/scripts/register-vcam.bat` を右クリック →「管理者として実行」

3. **アプリを起動**
   - `RealizeCam.exe` を実行

4. **アンインストール時**
   - `resources/scripts/unregister-vcam.bat` を右クリック →「管理者として実行」で仮想カメラを解除

---

### 開発者向け（ソースからビルド）

#### 必要環境

- Node.js 18+
- Windows 10/11（仮想カメラはWindows専用）

#### インストール

```bash
# 依存関係のインストール
npm install
```

#### 開発

```bash
npm run dev
```

#### ビルド

```bash
# Windows（SETUP.EXE + ZIP両方）
npm run build:win
```

---

## 🎮 使い方

### 1. VRMモデルの読み込み
起動後、VRMファイルをウィンドウにドラッグ&ドロップ

### 2. カメラ位置の調整
- **プリセット**: バストアップ / 全身 / 顔アップ から選択
- **マウス操作**: 左ドラッグで回転、中ドラッグで移動、スクロールでズーム
- **記憶**: 調整した位置を「記憶」ボタンで保存

### 3. リップシンクの設定
- マイクを選択してONにするとリアルタイムで口が動く

### 4. 仮想カメラ配信
1. 「仮想カメラ起動」をクリック
2. Zoom等で「Realize Virtual Camera」を選択

---

## 🎨 UIテーマ

ウィンドウ右上のボタンで4種類のテーマを切り替え可能:

| テーマ | 説明 |
|--------|------|
| 🥃 **Dark Rum** | 落ち着いたダークブラウン（デフォルト） |
| 🍶 **White Liquor** | クリーンなライトモード |
| 🍷 **Wine Red** | エレガントなワインレッド |
| 🥃 **Sherry Cask** | 温かみのあるシェリー樽カラー |

---

## 📁 プロジェクト構成

```
realize-cam/
├── src/
│   ├── main/           # Electronメインプロセス
│   ├── preload/        # プリロードスクリプト
│   └── renderer/       # Reactフロントエンド
│       └── src/
│           ├── components/
│           │   ├── VRMViewer.tsx  # Three.js + VRM描画
│           │   ├── Controls.tsx   # 操作パネル
│           │   └── DropZone.tsx   # ファイルドロップ
│           ├── i18n/              # 多言語翻訳
│           └── App.tsx            # メインアプリ
├── scripts/
│   ├── register-vcam.bat          # 仮想カメラ登録（ZIP版用）
│   └── unregister-vcam.bat        # 仮想カメラ解除（ZIP版用）
└── resources/                      # アプリアイコン等
```

---

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Electron + Vite |
| UI | React 18 + TypeScript |
| 3D描画 | Three.js + @react-three/fiber |
| VRM処理 | @pixiv/three-vrm |
| 仮想カメラ | vcam-napi (DirectShow, Windows専用) |
| スタイリング | Vanilla CSS (Glassmorphism) |

---

## ❓ トラブルシューティング

### 仮想カメラが表示されない

1. 管理者権限でDLLを登録してください：
   ```powershell
   regsvr32 "C:\Program Files\realize-cam\resources\vcam-service.dll"
   ```

2. PCを再起動してください

### 画面が真っ暗

- VRMファイルをドラッグ＆ドロップしてください

### Zoomで色がおかしい

- 出力解像度を「720p」または「1080p」に設定してください

---

## 📄 ライセンス

MIT License

---

<p align="center">
  Made with ❤️ for VTubers and Virtual Avatars
</p>
