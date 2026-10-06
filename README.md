# LabelCascade

Gmail の階層化された子ラベルが付与されたスレッドを自動検出し、親ラベルを同期・付与する Google Apps Script (GAS) プロジェクトです。

## セットアップ手順

### 1. 依存関係のインストール

```console
pnpm install
```

### 2. Google Apps Script API の有効化

clasp を使用する前に、Google Apps Script API を有効化する必要があります。

1. [Google Apps Script ユーザー設定](https://script.google.com/home/usersettings) にアクセスします。
2. 「Google Apps Script API」を **オン** に切り替えます。

### 3. clasp へのログイン

```console
pnpm run login
```

ブラウザが起動するので、使用する Google アカウントでログインを許可します。

### 4. GAS プロジェクトの作成

```console
pnpm run create
```

※ 既存のプロジェクトに連携する場合は、プロジェクトルートに `.clasp.json` を作成し、以下のように記載してください：

```json
{
  "scriptId": "<YOUR_SCRIPT_ID>",
  "rootDir": "./src"
}
```

---

## 主なコマンド

| コマンド | 説明 |
| --- | --- |
| `pnpm run check` | TypeScript 型チェック + Biome リンターをまとめて実行 |
| `pnpm run typecheck` | TypeScript の型チェックを実行 (`tsc --noEmit`) |
| `pnpm run lint` | Biome によるリントチェックを実行 (`biome check . --write`) |
| `pnpm run format` | Biome によるコード整形を実行 (`biome format --write .`) |
| `pnpm run push` | `src/` のコードを GAS プロジェクトにアップロード |
| `pnpm run push:watch` | ファイル変更を監視して自動で GAS にアップロード |
| `pnpm run pull` | GAS プロジェクトからコードをダウンロード |
| `pnpm run open` | ブラウザで GAS プロジェクトのエディタを開く |
