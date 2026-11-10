# Cloudflare Pages への移行手順

`https://v.5micro.net/` の配信元を GitHub Pages から Cloudflare Pages（無料）に移す手順。
URL は変わらないので、Search Console・AdSense・ブログのリンク（v.5micro.net のもの）はそのまま使える。

## しくみ（リポジトリ側は準備済み）
- `scripts/build-site.mjs` が公開用のファイルだけを `_site/` にまとめる
  （`docs/`・`specs/`・`tests/`・`scripts/`・設定ファイルなどは公開しない）。
- `.github/workflows/deploy.yml`
  - `verify`: 構文検査・単体テスト・E2E テスト
  - `deploy`: GitHub Pages へ公開（変数 `DEPLOY_GITHUB_PAGES` が `false` なら止まる）
  - `deploy-cloudflare`: Cloudflare Pages へ公開（変数 `CLOUDFLARE_PAGES_PROJECT` を設定したときだけ動く）
- テストに通ったときだけ公開される。wrangler での直接アップロードなので、Cloudflare の「月 500 ビルド」の枠も使わない。
- `404.html` があるので、存在しない URL には 404 ページが出る
  （Cloudflare Pages は 404.html がないと、どの URL にもトップページを返してしまう）。

## 手順

### 1. Cloudflare のアカウントを作る
https://dash.cloudflare.com/sign-up で無料登録（メール確認まで）。
5micro.net のネームサーバーは **さくらのまま** でよい（サブドメインだけ CNAME で向ける）。

### 2. API トークンとアカウント ID を用意する
1. Cloudflare 右上の人のアイコン → **My Profile** → **API Tokens** → **Create Token**
2. 一番下の **Custom token** の **Get started**
   - Token name: `voyage-ledger deploy`
   - Permissions: **Account** ／ **Cloudflare Pages** ／ **Edit**
   - Account Resources: Include ／ 自分のアカウント
3. **Continue to summary** → **Create Token** → 表示されたトークンをコピー（**一度しか表示されない**）
4. アカウント ID: ダッシュボードのホーム → アカウント名の横の「…」→ **Copy account ID**
   （または **Workers & Pages** の画面右側の **Account ID**）

### 3. GitHub に登録する
リポジトリ `adash333/voyage-ledger` → **Settings** → **Secrets and variables** → **Actions**
- **Secrets** タブ → **New repository secret**
  - `CLOUDFLARE_API_TOKEN` ＝ 2 でコピーしたトークン
  - `CLOUDFLARE_ACCOUNT_ID` ＝ アカウント ID
- **Variables** タブ → **New repository variable**
  - `CLOUDFLARE_PAGES_PROJECT` ＝ `voyage-ledger`（Cloudflare 上のプロジェクト名）

### 4. Cloudflare に公開してみる
リポジトリ → **Actions** → **Test and deploy Pages** → **Run workflow**（main）。
成功したら Cloudflare の **Workers & Pages** に `voyage-ledger` ができ、
`https://voyage-ledger.pages.dev/` で見られる（名前が使われていると末尾に文字が付くので、画面の URL を確認）。
この時点では v.5micro.net はまだ GitHub Pages のまま。両方に公開される。

### 5. Cloudflare に独自ドメインを登録する（DNS を変える前に必ず）
**Workers & Pages** → `voyage-ledger` → **Custom domains** → **Set up a custom domain**
→ `v.5micro.net` → **Continue** → 「CNAME を追加してください」という案内（値は `voyage-ledger.pages.dev`）が出る。

### 6. さくらで CNAME の向き先を変える
ゾーン編集（DNS設定）で、既存のエントリ `v`（CNAME）を編集:

| エントリ名 | 種別 | 値（変更前 → 変更後） |
|---|---|---|
| `v` | 別名（CNAME） | `adash333.github.io.` → `voyage-ledger.pages.dev.` |

保存したら、Cloudflare の Custom domains で `v.5micro.net` が **Active** になるまで待つ（数分〜数時間。HTTPS 証明書も自動）。
`_github-pages-challenge-adash333` と `google-site-verification` の TXT は消さない。

### 7. 確認
- `https://v.5micro.net/` が鍵マーク付きで開く
- 存在しない URL（例 `https://v.5micro.net/xyz`）で 404 ページが出る
- `https://v.5micro.net/docs/` が 404 になる（開発資料が公開されていない）

### 8. GitHub Pages を止める
1. リポジトリ → **Settings** → **Pages** → Custom domain の **Remove**
2. **Settings** → **Secrets and variables** → **Actions** → **Variables** → `DEPLOY_GITHUB_PAGES` ＝ `false`
3. 必要なら **Settings** → **Pages** → **Unpublish site**
- 止めると旧 URL `https://adash333.github.io/voyage-ledger/` の転送もなくなる。
  ブログ（risan.jpn.org）の記事内リンクを先に `https://v.5micro.net/` に書き換えておく。

### 9.（任意）リポジトリを非公開にする
**Settings** → **General** → 一番下 **Danger Zone** → **Change repository visibility** → **Private**。
- Private では GitHub Actions が無料プランで月 2,000 分まで（1 回の公開は数分）。
- Search Console・AdSense は URL が同じなので設定変更は不要。

## 元に戻すとき
さくらの CNAME `v` を `adash333.github.io.` に戻し、変数 `DEPLOY_GITHUB_PAGES` を消して（または `true`）、
Settings → Pages の Custom domain に `v.5micro.net` を入れ直す。
