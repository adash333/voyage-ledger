---
name: save-prompt
description: ユーザーのプロンプト原文と作業結果の要約を docs/prompt/YYMMDD-NN-題名.md に記録し、すべての変更を git add・commit して main に push する。作業の区切りごと（基本的に毎回のタスク完了時）に自動で実行する。
---

# /save-prompt — プロンプト記録と main への push

## 目的
このセッションでユーザーが送ったプロンプトを「そのまま」保存し、その結果をまとめた記録を
`docs/prompt/` に残したうえで、それまでのすべての変更を main ブランチに push する。

## 手順

### 1. ファイル名を決める
- 日付は Asia/Tokyo の `YYMMDD`（例: `TZ=Asia/Tokyo date +%y%m%d`）。
- 連番は同日ファイルの続き番号（`01`, `02`, …）。
- 題名は日本語の短い名詞句（例: `自由経営モード決算書チェック`）。
- 形式: `docs/prompt/YYMMDD-NN-題名.md`

### 2. 同日の既存ファイルを確認する
- `ls docs/prompt/YYMMDD-*.md` で同日のファイルを探す。
- 同じ作業の続き・一連の流れ（同じ機能、同じ不具合、同じセッションの追加依頼）であれば
  **新しいファイルを作らず既存ファイルに節を追記する**。
- 別の話題であれば連番を進めて新しいファイルを作る。

### 3. 記録の書式（既存ファイルに合わせる）
```markdown
# 題名

## 日付
YYYY-MM-DD（Asia/Tokyo）

## ユーザーのプロンプト原文
```text
（ユーザーのメッセージをそのまま。添付画像は「（画像: 内容の一言説明）」と記す）
```

## 結果
- 変更したファイルと内容、調査でわかったこと（箇条書き）

## 検証
- 実行したテスト・コマンドとその結果

## 保存と公開
- コミット、push 先、GitHub Actions のリンクなど
```
- 同日ファイルに追記する場合は `## 追加依頼 N：題名` の見出しの下に
  「プロンプト原文」「結果」「検証」を同じ書式で続ける。
- 環境情報・ツール出力・システム通知はプロンプト原文に含めない。

### 4. すべての変更を main に push する
```bash
git add -A
git commit -m "<変更内容を表す日本語または英語の1行> + docs/prompt 記録"
git fetch origin main
git merge origin/main        # 競合があれば解決してから続行
git push origin HEAD:main    # 現在のブランチの内容を main へ
git push -u origin "$(git branch --show-current)"   # 作業ブランチも同期（main 上なら不要）
```
- commit には変更内容に加えて docs/prompt の記録が含まれることを一言入れる。
- push 後、`git log origin/main -1` でリモートの先頭が自分のコミットであることを確認する。
- GitHub Actions（`.github/workflows/deploy.yml`）が main への push で動くので、
  最終回答にリンク https://github.com/adash333/voyage-ledger/actions/workflows/deploy.yml を添える。

## 自動実行
CLAUDE.md の指示により、各タスクの完了時（最終回答の前）にこのスキルを自動で実行する。
ユーザーが明示的に「記録しない」「push しない」と言った場合のみ省略する。
