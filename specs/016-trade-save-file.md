# SPEC-TRADE-SAVE-002 自由経営モードのセーブデータ保存・読み込み

- `/trade/` と `/trade/en/` に「データをJSON形式で保存」「JSONファイルから続きを始める」の2つの操作を置く。ブラウザ内の自動保存（`voyage-trade-v1`）は従来どおり維持する。
- 保存ファイルは `{app:"voyage-ledger-trade", format:1, exportedAt, state}`。`state` は会計エンジンの保存形式そのもの（version・voyage・stop・status・events）。ファイル名は `voyage-trade-YYYYMMDD-HHMM.json`。
- 読み込みは `trade/save.mjs` の `parseSave` が担当し、ラッパー形式と `state` 単体の両方を受け付ける。読み込んだ状態は `restore` で履歴を再計算して検証し、JSON でないもの・このゲームのファイルでないもの・改ざんされた取引は拒否して既存データを変更しない。
- 置き換え前に確認ダイアログを出し、キャンセルした場合も既存データを変更しない。読み込み後は自動保存を上書きし、画面を再描画して「売買」タブに戻る。
- 結果メッセージは `#saveMessage` に日本語／英語で表示する。
- テスト: `tests/trade.test.mjs`（書き出し形式・読み込み・不正ファイルの拒否）、`tests/e2e/trade-save.spec.mjs`（保存 → やり直し → 読み込みで途中から再開、再読み込み後の維持、キャンセル・不正・改ざんファイルで状態不変、英語版の往復）。
