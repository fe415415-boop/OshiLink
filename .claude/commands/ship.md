変更内容を git commit して origin/main に push する。

1. `git status` と `git diff --stat` と `git log --oneline -5` を並行実行して変更を確認する
2. 変更ファイルをステージング（`supabase/reset/` などの不要ディレクトリは除外する）
3. 変更内容を分析して日本語でコミットメッセージを作成し commit する
4. `git push origin main` で push する
5. push 完了を報告する
