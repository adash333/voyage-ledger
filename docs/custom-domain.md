# 独自ドメイン（5micro.net のサブドメイン）への移行手順

現在の公開先 `https://adash333.github.io/voyage-ledger/` を、
`https://<サブドメイン>.5micro.net/` に移すための手順。
以下ではサブドメインを仮に **`voyage.5micro.net`** とする（好きな名前に置き換える）。

## 前提（コード側の確認結果）
- デプロイは `.github/workflows/deploy.yml`（GitHub Actions → Pages）。
  Actions 方式では **`CNAME` ファイルは不要**。独自ドメインは Settings で設定する。
- HTML/JS 内のリンクや読み込みはすべて相対パス（`/voyage-ledger/` 決め打ちや `/` 始まりの絶対パスなし）。
  そのため、サブドメインのルートに移ってもコードの修正なしで動く。
- 設定後、`adash333.github.io/voyage-ledger/...` は GitHub が自動で
  `voyage.5micro.net/...` へ 301 リダイレクトするので、既存のブログ記事のリンクも切れない。
- 注意: localStorage はドメインごとに別。旧 URL で遊んだセーブデータは新ドメインへは引き継がれない
  （ファイル保存機能があるモードは、旧 URL で書き出し → 新 URL で読み込みで移せる）。

## 手順

### 1. GitHub でドメインを「確認済み」にする（乗っ取り防止・推奨）
1. GitHub 右上アイコン → **Settings** → 左メニュー **Pages** → **Add a domain**
2. `5micro.net` を入力 → 表示された TXT レコード
   （`_github-pages-challenge-adash333.5micro.net` に値 `xxxxxxxx`）を控える
3. 5micro.net の DNS 管理画面で TXT レコードを追加 → GitHub に戻って **Verify**

   さくらインターネットの場合:
   - レンタルサーバ契約中: サーバコントロールパネル →「ドメイン/SSL」→ 5micro.net の「DNS設定」
   - ドメインのみの契約: ドメインコントロールパネル → 5micro.net の「ゾーン」→「編集」
   - 入力例: エントリ名 `_github-pages-challenge-adash333`（`.5micro.net` は付けない）／
     種別「テキスト(TXT)」／値は GitHub に表示された文字列を引用符なしで貼る
   - 保存後、数分〜数時間待って Verify。確認は `dig +short TXT _github-pages-challenge-adash333.5micro.net`

### 2. DNS にサブドメインの CNAME を追加
5micro.net を管理している DNS（お名前.com / ムームードメイン / Xserver / Cloudflare など）で:

| 種別 | ホスト名 | 値 |
|---|---|---|
| CNAME | `voyage` | `adash333.github.io` |

- 値にリポジトリ名（`/voyage-ledger`）は付けない。
- Cloudflare の場合は最初は **プロキシをオフ（DNS only・灰色の雲）** にする（HTTPS 証明書の発行が通りやすい）。

### 3. リポジトリに独自ドメインを設定
1. リポジトリ `adash333/voyage-ledger` → **Settings** → **Pages**
2. **Custom domain** に `voyage.5micro.net` を入力 → **Save**
3. DNS チェックが緑になるまで待つ（数分〜最大 24 時間）
4. 証明書が発行されたら **Enforce HTTPS** にチェック

### 4. 動作確認
- `https://voyage.5micro.net/` が開く
- `https://adash333.github.io/voyage-ledger/learn/` → `https://voyage.5micro.net/learn/` にリダイレクトされる

### 5. リポジトリ内の URL を更新（移行後）
- `README.md` の公開 URL
- `docs/blog/` の記事内リンク（リダイレクトで動くが、新 URL に書き換えると SEO 上よい）

## アドセンス・アマゾンアソシエイトに向けて
- **AdSense**: `github.io` は自分のドメインではないため審査に出せない。独自ドメインにするのが必須。
  AdSense の「サイト」には **ルートドメイン `5micro.net`** を登録すると、サブドメインも対象になる。
  `ads.txt` は **`https://5micro.net/ads.txt`（ルートドメイン側）** に置く必要がある。
- **Amazon アソシエイト**: サイト URL に `https://voyage.5micro.net/` を登録すればよい。
  サイト内に「Amazon のアソシエイトとして適格販売により収入を得ています」の表記が必要。
- 両方の審査で求められやすいもの（未作成）:
  - プライバシーポリシー（Cookie・広告配信・アクセス解析についての記載）
  - 運営者情報・お問い合わせ先
  - `robots.txt` / `sitemap.xml`
  - 子ども向けコンテンツ（`kids/` など）がある場合、AdSense ではパーソナライズ広告の扱いに注意
    （子ども向けとして扱う設定が必要になることがある）
- GitHub Pages は「オンラインビジネスや商取引が主目的のサイト」のホスティングを禁じている。
  教育コンテンツに広告・アフィリエイトを少し載せる程度は一般的だが、
  収益化を本格化するなら Cloudflare Pages や Netlify への移行も検討する
  （その場合も DNS の CNAME 先を変えるだけで URL はそのまま使える）。
