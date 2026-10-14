# 大航海商人アカデミー / Voyage Ledger

小学生が1500年ごろのヴェネツィアを舞台に、商人として複式簿記を学ぶ無料のブラウザゲームです。

## 遊び方
商会設立 → 香辛料の仕入れ → 販売の3ステップを進めると、仕訳帳と決算書が自動で更新されます。進捗はブラウザの localStorage に保存され、JSONで書き出し・読み込みできます。

## ローカル実行
依存ライブラリは不要です。リポジトリのルートで `python -m http.server 8000` を実行し、`http://localhost:8000` を開いてください。

## GitHub Pages
Settings → Pages → Build and deployment で **Deploy from a branch**、ブランチ **main**、フォルダー **/(root)** を指定してください。URLは https://adash333.github.io/voyage-ledger/ となる予定です。

## 教育上の注意
舞台・人物・金貨の取引額は創作です。複式簿記は大航海時代より前のイタリアで発達しました。MVPは商品勘定を資産として扱い、販売時に売上原価へ振り替える簡略化した継続記録法を採用します。

## プライバシー
アカウント登録・広告・アクセス解析・外部APIなし。セーブは端末内に保存します。

## ライセンス
MIT（LICENSE参照）。

## SPEC駆動開発とテスト
仕様は `specs/`、画面非依存の会計ロジックは `accounting.mjs`、自動テストは `tests/accounting.test.mjs` に配置しています。

```bash
node --test tests/*.test.mjs
node --check src.js
```

GitHub Actionsの `Test` ワークフローはmainへのpushとPull Requestで自動実行されます。公開を厳密にテスト合格後に限定するには、Pagesのデプロイをテストジョブに依存させる追加設定が必要です。現状のPages（mainブランチ直接公開）はテスト失敗でも公開される場合があります。


## CI/CD（v0.3）
`npm run check` で構文・会計単体テスト、`npm run test:e2e` でPlaywrightのスマートフォン相当のChromium操作テストを実行します。`.github/workflows/deploy.yml` は両方が成功した場合のみGitHub Pagesへデプロイする構成です。

**重要：GitHub Settings → Pages → Build and deployment → Source を `GitHub Actions` に切り替えてください。** これを行わないと、既存の `Deploy from a branch` がテスト失敗時にも公開する可能性があります。GitHub Actionsの実行結果と公開動作は別途確認が必要です。

ローカルのE2E実行には `npm install` と `npx playwright install chromium` が必要です。
