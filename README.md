# 大航海商人アカデミー / Voyage Ledger

小学生が1500年ごろのヴェネツィアを舞台に、商人として複式簿記を学ぶ無料のブラウザゲームです。

## 遊び方
商会設立 → 香辛料の仕入れ → 販売の3ステップを進めると、仕訳帳と決算書が自動で更新されます。進捗はブラウザの localStorage に自動保存され、再読み込み後も続きから遊べます。日本語版の「最初から遊ぶ」、英語版の「Start over」で最初から始められます。

## 自由経営モード
4つの港をめぐって売買と決算を繰り返す「自由経営モード」は `/trade/`（日本語）と `/trade/en/`（英語）にあります。両方とも同じ会計エンジン `trade/accounting.mjs` とセーブデータを共有します。セーブデータは JSON ファイルに保存して、別の端末で読み込んで続きから遊べます。

株式会社版 `/trade/company/`（日本語）と `/trade/company/en/`（英語）は、借入・利息・船の減価償却・株式発行・配当・エグジットまで扱う上級モードです（仕様は `specs/017-company-mode.md`）。会計エンジンは `trade/company/accounting.mjs`、セーブデータは `company-ledger-YYYYMMDD-HHMM.json` で、自由経営モードのファイルとは互いに読み込めません。難易度「やさしい」「本気」を設立時に選べます。

`/learn/`「かいけい いちばんやさしい きょうかしょ」は小学3年生からの会計入門ページです（仕様は `specs/018-learn-basics.md`）。全漢字にふりがなを付け、5つのステップの体験・ことばカード・クイズで複式簿記の考え方を説明します。

## ローカル実行
依存ライブラリは不要です。リポジトリのルートで `python -m http.server 8000` を実行し、`http://localhost:8000` を開いてください。

## 公開
公開 URL は **https://v.5micro.net/** です（旧 URL https://adash333.github.io/voyage-ledger/ からは自動で転送されます）。
main への push で GitHub Actions（`.github/workflows/deploy.yml`）がテスト後に GitHub Pages へデプロイします。Settings → Pages の Source は **GitHub Actions**、Custom domain は `v.5micro.net` です。独自ドメインの設定手順は `docs/custom-domain.md` を参照してください。

## 教育上の注意
舞台・人物・金貨の取引額は創作です。複式簿記は大航海時代より前のイタリアで発達しました。MVPは商品勘定を資産として扱い、販売時に売上原価へ振り替える簡略化した継続記録法を採用します。

## プライバシー・運営者情報
現在はアカウント登録・広告・アクセス解析・外部APIなし。セーブは端末内に保存します。
プライバシーポリシーは `/privacy/`、運営者情報とお問い合わせ先は `/about/` にあります（全ページの下部からリンク）。広告（Google アドセンス）・Amazon アソシエイト・アクセス解析を導入するときの記載も先に入れてあります。

## ライセンス
© 2026 adash333. All rights reserved.（LICENSE 参照）
ソースコード・文章・画像の複製・改変・再配布・商用利用には許可が必要です。公開サイトで遊ぶ・読むことは自由です。
2026-11-10 より前に公開していた版は MIT ライセンスで配布していました。

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
