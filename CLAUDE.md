# voyage-ledger 作業ルール

## 毎回の作業終了時に /save-prompt を実行する
各タスクの完了時（最終回答を書く前）に、必ずスキル `/save-prompt`
（`.claude/skills/save-prompt/SKILL.md`）を実行する。
- ユーザーのプロンプト原文と結果の要約を `docs/prompt/YYMMDD-NN-題名.md` に保存する。
- 同日の一連の流れは 1 つのファイルにまとめる（既存ファイルへ追記）。
- すべての変更を `git add -A` してコミットし、main に push する。
ユーザーが明示的に「記録不要」「push しない」と指示した場合だけ省略する。

## 検証
- 変更後は `npm run check`（構文検査＋単体テスト）を実行する。
- 画面に関わる変更は `npm run test:e2e`（Playwright, mobile-chromium）も実行する。
  この環境では Playwright 同梱版と Chromium のバージョンが合わないため、
  `launchOptions.executablePath: '/opt/pw-browsers/chromium'` を指定した一時設定で実行する。
