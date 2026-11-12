# Claude in Chrome で Toddle スキルを手軽に実行する方法

## 日付
2026-11-12（Asia/Tokyo）

## ユーザーのプロンプト原文
```text
claude in chrome が　以下のスキルを実行するためには、どのようにしたらよいですか？毎回全部入力するのが面倒です　---
name: toddle-to-obsidian
description: >
  ToddleアプリのMessagingまたはPortfolioページの内容を読み取り、日本語訳・月別要約付きのMarkdownファイルとしてObsidian Vaultに保存するスキル。
  （以下、toddle-to-obsidian スキルの SKILL.md 全文を貼り付け。
   Vault パス C:\doc\ObsidianGitVault\MalvarnCollegeTokyo\、
   ワークフローA: Messaging / ワークフローB: Portfolio、
   Markdown 構成、メディア表記ルール、翻訳・要約ガイドライン、よくある問題と対処）
```

## 結果
- リポジトリのコード変更はなし（質問への回答のみ）。
- 回答の要点:
  - スキルは claude.ai の「設定 → 機能（Capabilities）→ Skills」に登録済み（このセッションでも
    `toddle-to-obsidian` が有効なスキルとして見えている）。登録済みなら「Toddle保存して」の
    一言で起動でき、本文を毎回貼る必要はない。
  - ただしこのスキルは `C:\doc\...` への書き込みや `mcp__workspace__bash` を使う前提なので、
    Chrome 拡張のサイドパネル単体ではローカルファイルを保存できない。
    Claude デスクトップアプリ（Cowork）から Claude in Chrome をつないで実行するのが本来の使い方。
  - Chrome のサイドパネルで使いたい場合は、Claude in Chrome の「ショートカット」
    （`/` で呼び出す保存済みプロンプト、スケジュール実行も可）に短い指示を登録する方法を案内。

## 検証
- コード変更なしのためテストは未実行。
- Claude in Chrome のショートカット機能は公式ヘルプ記事
  （support.claude.com/en/articles/12012173）で確認。

## 保存と公開
- この記録をコミットし main に push。
