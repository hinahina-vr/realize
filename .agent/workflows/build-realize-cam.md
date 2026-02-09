---
description: realize-cam の再配布パッケージ（ZIP + SETUP.EXE）をビルドする手順
---

# realize-cam ビルド手順

## 前提条件

- Node.js 18+ がインストール済み
- Visual Studio 2022（C++ デスクトップ開発ワークロード）がインストール済み
- CMake がインストール済み（Visual Studio に同梱のものでOK）

## 手順

### 1. リポジトリをクローン（初回のみ）

```powershell
cd c:\Users\wdddi\workspace
git clone https://github.com/hinahina-vr/realize.git
git clone https://github.com/hinahina-vr/vcam.git
```

### 2. ブランチを切り替え

```powershell
cd c:\Users\wdddi\workspace\realize
git checkout feature/native-vcam-windows
git pull origin feature/native-vcam-windows
```

### 3. vcam プロジェクトをビルド

// turbo
```powershell
cd c:\Users\wdddi\workspace\vcam
mkdir build -ErrorAction SilentlyContinue
cd build
cmake ..
cmake --build . --config Release
```

> **注意**: もし `vcam-service.dll` がロックされているエラーが出たら、以下を実行してからリトライ：
> ```powershell
> regsvr32 /u /s "c:\Users\wdddi\workspace\vcam\build\service\Release\vcam-service.dll"
> Rename-Item "c:\Users\wdddi\workspace\vcam\build\service\Release\vcam-service.dll" "vcam-service.dll.old" -Force
> ```

### 4. realize の依存関係をインストール

// turbo
```powershell
cd c:\Users\wdddi\workspace\realize
npm install
```

### 5. realize のパッケージをビルド

```powershell
cd c:\Users\wdddi\workspace\realize
npm run build:win
```

### 6. 成果物の確認

ビルドが完了すると `dist/` フォルダに以下が生成されます：

- `Realize Virtual Camera-1.0.0-win.zip` — ZIP版（ポータブル）
- `realize-cam-1.0.0-setup.exe` — SETUP.EXE版（インストーラー）

### 7. 仮想カメラの再登録（ビルド後）

```powershell
regsvr32 /i /s "c:\Users\wdddi\workspace\vcam\build\service\Release\vcam-service.dll"
```
