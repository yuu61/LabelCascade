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

※ 既存のプロジェクトに連携する場合は、プロジェクトルートに `.clasp.json` を作成し、以下のように記載してください（複数プロジェクトへの同時プッシュにも対応しています）：

```json
{
  "scriptId": "<PRIMARY_SCRIPT_ID>",
  "scriptIds": [
    "<SCRIPT_ID_1>",
    "<SCRIPT_ID_2>"
  ],
  "rootDir": "./dist"
}
```
※ `scriptIds` を指定すると、`pnpm run push` 時に一覧にあるすべてのプロジェクトへ一括でプッシュされます。


### 5. 定期実行トリガーの設定

コードを GAS にアップロード後、自動同期トリガーを設定します。

1. `pnpm run push` でコードをアップロードします。
2. `pnpm run open` でブラウザの GAS エディタを開きます。
3. エディタ上部の実行関数一覧から **`setupTrigger`** を選択して「実行」をクリックします（初回のみ Google アカウントのアクセス権限承認ダイアログが表示されます）。
4. これで 10分ごとに `syncParentLabels` が自動実行されるトリガーが登録されます。

※ トリガーを解除したい場合は、同様に **`deleteTrigger`** を選択して実行してください。
※ 実行間隔を変更したい場合は、`src/main.ts` 内の `TRIGGER_INTERVAL_MINUTES` を変更して再プッシュし、再度 `setupTrigger` を実行してください。

---

## 主なコマンド

| コマンド | 説明 |
| --- | --- |
| `pnpm run check` | TypeScript 型チェック + Biome リンターをまとめて実行 |
| `pnpm run typecheck` | TypeScript の型チェックを実行 (`tsc --noEmit`) |
| `pnpm run build` | TypeScript をトランスパイルし `dist/` に成果物を生成 |
| `pnpm run lint` | Biome によるリントチェックを実行 (`biome check . --write`) |
| `pnpm run format` | Biome によるコード整形を実行 (`biome format --write .`) |
| `pnpm run push` | TypeScript をビルドし、GAS プロジェクトにアップロード |
| `pnpm run push:watch` | ファイル変更を監視して自動で GAS にアップロード |
| `pnpm run deploy` | ビルド、プッシュ、新しいバージョンのデプロイを一括実行 |
| `pnpm run pull` | GAS プロジェクトからコードをダウンロード |
| `pnpm run open` | ブラウザで GAS プロジェクトのエディタを開く |
