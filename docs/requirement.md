# OshiLink 仕様書

## 1. プロジェクト概要

**推しリンク（OshiLink）** は、推しキャラ・推し芸人などの人物関係を相関図として作成・シェアできる Web サービス。

- **フレームワーク**: Next.js (App Router) + TypeScript
- **スタイリング**: Tailwind CSS v4
- **グラフ描画**: Cytoscape.js + cytoscape-fcose
- **バックエンド**: Supabase (PostgreSQL + RLS + Storage)
- **状態管理**: Zustand
- **認証**: Supabase Auth（メール/パスワード + X OAuth）

---

## 2. ルート構造

### `/` — トップページ
- ログイン済みユーザーの「作成したリンク」グリッドを表示（検索時は非表示）
- 「人気テンプレート」グリッドを表示（`usage_count + favorites_count` 降順、上位 48 件）
- 検索フォーム：クエリパラメータ `q` で `title ILIKE %q%` 検索
- テンプレートカードにはお気に入りボタン表示（ログイン済みのみ機能）
- 全画面サイズで横スクロール1行表示（`w-44` 固定幅カード、`max-w-6xl` コンテナ）

### `/profile` — マイページ
- ログイン必須（未ログインで `/` にリダイレクト）
- セクション 1：**作成したリンク** — DiagramCard グリッド（削除ボタン付き）
- セクション 2：**作成したテンプレート** — TemplateCard グリッド
- セクション 3：**お気に入りテンプレート** — TemplateCard グリッド
- 全画面サイズで横スクロール1行表示（`w-44` 固定幅カード、`max-w-6xl` コンテナ）

### `/template/[id]` — テンプレート詳細
- タイトル・使用回数・お気に入り数を表示（`使用回数 N · お気に入り数 N`）
- お気に入りボタン（★/☆、ログイン必須）
- 「このテンプレートで開始」→ `/editor/[id]`
- 「このテンプレートをコピーして編集」→ `/template/[id]/fork`
- テンプレート作成者 or 管理者のみ「このテンプレートを編集」→ `/template/[id]/edit`
- 登場人物一覧（50音順）
- 「← 前の画面に戻る」ボタン（`router.back()`）

### `/template/new` — テンプレート新規作成
- `TemplateForm` コンポーネント（新規作成モード）
- 保存後 → `/editor/[templateId]`

### `/template/[id]/fork` — テンプレートコピー作成
- `TemplateForm` コンポーネント（fork モード）
- タイトルに「（コピー）」を付与して初期表示
- `forked_from` に元 template_id を設定して保存
- 保存後 → `/editor/[新templateId]`

### `/template/[id]/edit` — テンプレート編集
- テンプレート作成者 or 管理者のみアクセス可（それ以外は `/template/[id]` にリダイレクト）
- `TemplateForm` コンポーネント（編集モード）
- 編集後 → `/template/[id]`

### `/editor/[templateId]` — 新規相関図エディタ
- 指定テンプレートから新規相関図を開始（保存済みデータなし）
- `EditorInitializer` で store 初期化

### `/diagram/[id]` — 保存済み相関図エディタ
- **オーナー**：保存済み相関図を復元して編集（`DiagramLoader` で store 初期化）
- **非オーナー × 公開**：自動コピーリダイレクト
  - ログイン済み → サーバーサイドで DB コピー（diagrams + diagram_nodes + diagram_edges）→ `/diagram/{newId}` にリダイレクト
  - 未ログイン → `AutoCopyRedirect` コンポーネントで `sessionStorage('oshilink_copy_draft')` に保存 → `/editor/{templateId}` にリダイレクト
- **非オーナー × 非公開**：`/not-public` にリダイレクト

### `/not-public` — 非公開相関図メッセージ
- 「現在は非公開の相関図です。」を表示
- `/diagram/[id]` からのリダイレクト専用ページ
- 注: `/diagram/private` は動的ルート `/diagram/[id]` と衝突して 404 になるため、`/diagram/` 配下には置かない

### `/auth/callback` — OAuth コールバック
- Supabase OAuth リダイレクト処理

---

## 3. エディタ仕様

### 3-1. レイアウト（DiagramEditor）
- 上部：グラフキャンバス
  - 左上：Undo / Redo ボタン
  - 右上フローティング：**DesignPanel**
  - 左下：「↓ 保存 / ダウンロード」ボタン（ノードが1件以上のとき有効）
  - 右下：「自動整列」トグルボタン
  - 右下（自動整列の左隣・保存済み相関図のみ）：「公開中 / 非公開」トグルボタン
- 下部フッター（高さ 96px）：**CharacterPicker**（ドラッグによる慣性スクロール対応）
- 画面離脱時に未保存ノードがあれば確認ダイアログ（`beforeunload` + `history.pushState` パッチ）

### 3-2. グラフキャンバス（CytoscapeGraph）

#### ノード
- サイズ: 80×80px、楕円形
- テーマ色のノード背景・枠・テキスト
- 人物画像がある場合は `background-image` で全面表示
- 選択中ノードの右上に「✕」ボタンを HTML オーバーレイで表示 → クリックでノード削除

#### エッジ
- タグラベル（背景色付き）
- 方向: `right`（→）/ `left`（←）/ `both`（↔）/ `none`（—）
- 右クリックで削除

#### ボックス（グループ図形）
- 矩形、HTML オーバーレイで背景色・テキスト表示
- 右クリックで削除

#### インタラクション
| 操作 | 動作 |
|------|------|
| ノードクリック | 接続元選択（ハイライト表示） |
| 接続元選択後に別ノードクリック | ConnectionModal 表示 → エッジ追加 |
| 接続元選択後に同ノードクリック | 接続キャンセル |
| エッジクリック | ConnectionModal（編集モード）表示 |
| 背景クリック | 接続キャンセル |
| ノードドラッグ | 座標を store に保存 |
| ESC キー | ドローモードキャンセル |
| ボックス右クリック | ボックス削除 |
| エッジ右クリック | エッジ削除 |

#### タッチ対応
- ドローモード有効中のタッチドラッグでボックス作成（長押し不要）

#### 自動レイアウト
- **新規ノード追加時**：fcose レイアウトを実行（フォールバック: cose）
- **エッジ追加時**：同上
- **保存済みデータ復元時**：レイアウト実行なし、`fit` のみ
- ボックスはレイアウト中ロック（移動しない）
- レイアウト後に座標を store に保存

### 3-3. DesignPanel（右上フローティングパネル）

#### ボタン構成（横一列、外側コンテナの枠線なし）
| ボタン | 機能 |
|--------|------|
| **囲む** | ドローモード ON/OFF（ドロー中は紫ハイライト） |
| **デザイン** | クリックでデザインテーマ選択を展開/収納 |
| **フォント** | クリックでフォント選択を展開/収納 |

- デザイン展開時：6種テーマのノード色プレビュー円を横並び表示（テーマ色背景・影付きパネル）
- フォント展開時：4種フォントの「あ」ボタンを横並び表示（テーマ色背景・影付きパネル）
- デザインとフォントは同時展開不可（片方を開くともう片方は閉じる）
- ボタン行自体はコンテナ枠線なし・背景なし（各ボタンが個別に `bg-white/5 border-white/10` を持つ）

### 3-4. CharacterPicker（フッター）
- 未追加の人物：左側に表示（50音順）
- 追加済みの人物：右側に表示（グレーアウト＋チェックマーク）
- クリックで新規ノードを追加（追加済みは無効）
- PC：左クリックドラッグで横スクロール（ドラッグ後は慣性スクロール、ドラッグ中はクリック判定を抑制）
- スマホ：ネイティブスワイプでスクロール
- 人物名は最大2行まで見切れずに表示（`line-clamp-2`、フッター高さ 96px で収容）

### 3-5. ConnectionModal
- タグ：テキスト自由入力
- タグ提案（クリックで入力）：親友 / 相棒 / ライバル / てぇてぇ / 師弟 / 尊敬 / 不仲 / 仲間 / ビジネス / ハート / 敵
- 方向選択：→ / ← / ↔ / —
- 同一ノードペア間の同一方向エッジは追加不可（最大4本）

### 3-6. BoxModal
- テキスト入力（左上揃え）
- 背景色プリセット（6色 × 3系統）＋カスタムカラーピッカー
- 「削除」「キャンセル」「適用」

### 3-7. SaveDownloadModal
- タイトル入力
- プレビュー画像（リアルタイム生成 / 手動再生成）
- 「プロフィールに保存」（ログイン必須）
  - `diagrams` + `diagram_nodes` + `diagram_edges` を一括 INSERT
  - `increment_usage_count` RPC 呼び出し
  - サムネイル（base64）を `diagrams.thumbnail` に保存
- 「画像をダウンロード」（PNG 形式）

---

## 4. テンプレートカード仕様

### 表示構成
```
[人物サムネイル 3列×2行（最大5件 + +N）]
[タイトル（truncate）]
[👤人物数  ▶使用回数  ★お気に入り数]
[最終更新日]                [お気に入りボタン]
```

- サムネイルエリア：`aspect-video`（DiagramCard と統一）
- 人物アイコン：40×40px 丸形、画像あれば `object-cover`、なければ名前の先頭2文字
- 上限5件、超過分は `+N` として6枠目に表示
- `updated_at`（なければ `created_at`）を日本語形式で表示

---

## 5. テンプレート管理仕様

### TemplateForm（新規作成 / fork / 編集モード共通）
- **タイトル**：必須（未入力でも保存ボタン押下は可能。バリデーションエラー表示）
- **人物追加**：
  - 「＋ 追加」ボタン → 先頭に空行追加
  - 「一括追加」ボタン → テキストエリアで改行区切り入力（同名はスキップ）→ 先頭に追加
- **人物削除**：
  - 「×」ボタン押下時に `count_character_usages` RPC を呼び出し
  - 1 件以上の相関図で使用中の場合、`window.alert` でエラー表示し削除をブロック
  - 未使用または draft（今回追加したばかり）の人物は即削除
- **人物画像**：画像ボタンクリック → ファイル選択 → プレビュー表示
- **保存ボタン**：「保存して開始」（タイトル入力欄と人物一覧の間に配置）

### テンプレート削除
- 作成者 or 管理者のみ「このテンプレートを削除」リンクを表示
- 「削除しますか？」確認 → 「削除する」ボタン
- `safe_delete_template` RPC 実行
  - 使用中の diagram がある場合：user_id=NULL / image_url=NULL のコピーテンプレートを作成し、diagram および diagram_nodes を移行してから削除
  - 使用中の diagram がない場合：直接削除

---

## 6. 状態管理（Zustand）

### diagramStore

```typescript
interface EditorNode {
  id: string          // ローカル ID
  characterId: string // template_characters.id
  label: string
  imageUrl: string | null
  x: number
  y: number
}

interface EditorEdge {
  id: string
  sourceId: string    // EditorNode.id
  targetId: string    // EditorNode.id
  tag: string
  direction: 'right' | 'left' | 'both' | 'none'
}

interface EditorBox {
  id: string
  x: number; y: number; width: number; height: number
  color: string       // 背景色（16進数）
  text: string
}

// アクション
loadTemplate(templateId, templateTitle, characters)
loadDiagram(templateId, templateTitle, characters, nodes, edges, boxes, template, fontStyle, title)
setTitle(title)
addNode(character)             // 重複防止（同一 characterId は追加不可）
removeNode(id)                 // 関連エッジも削除
updateNodePosition(id, x, y)
setConnectingFrom(id | null)
addEdge(sourceId, targetId, tag, direction)  // 同一ペア・同一方向は追加不可
updateEdge(id, tag, direction)
removeEdge(id)
addBox(x, y, width, height, color)
updateBox(id, updates)
removeBox(id)
setDrawMode(boolean)
setTemplate(template)
setFontStyle(fontStyle)
reset()
syncFromDb(nodes, edges)
```

### authStore

```typescript
{ user: User | null, loading: boolean }
```

---

## 7. テーマシステム

### デザインテーマ（6種類）

| キー | 名称 | 背景 | ノード枠 | 系統 |
|------|------|------|---------|------|
| stylish | スタイリッシュ | #0f0f1a | #7c3aed（紫） | ダーク |
| pink | ピンク | #fff0f5 | #ec4899（ピンク） | ライト |
| simple | シンプル | #ffffff | #374151（グレー） | ライト |
| night | ナイト | #edf2ff | #3b82f6（ブルー） | ライト |
| sunset | サンセット | #fff7ed | #f97316（オレンジ） | ライト |
| mint | ミント | #ecfdf5 | #10b981（緑） | ライト |

### フォント（4種類）

| キー | フォント名 | 雰囲気 |
|------|-----------|--------|
| cool | Noto Sans JP | クール |
| pop | Zen Maru Gothic | ポップ |
| emo | Klee One | エモ |
| elegant | Shippori Mincho | 高級感 |

### タグ色（11種類）

親友→青、相棒→紫、ライバル→赤、てぇてぇ→ピンク、師弟→橙、尊敬→緑、不仲→グレー、仲間→ティール、ビジネス→シアン、ハート→ローズ、敵→深紅

---

## 8. データベーススキーマ

```sql
-- テンプレート
templates (id, title, user_id[nullable], forked_from[nullable], usage_count, favorites_count, created_at, updated_at)

-- テンプレートの人物
template_characters (id, template_id, name, image_url[nullable], sort_order)

-- 相関図
diagrams (id, user_id, template_id, title, design_template, font_style, is_public[boolean, default false], thumbnail[base64], created_at)

-- 相関図のノード
diagram_nodes (id, diagram_id, character_id → ON DELETE CASCADE, pos_x, pos_y)

-- 相関図のエッジ
diagram_edges (id, diagram_id, source_node_id → ON DELETE CASCADE, target_node_id → ON DELETE CASCADE, tag, direction)

-- お気に入り
template_favorites (user_id, template_id, created_at)  PRIMARY KEY(user_id, template_id)

-- 管理者
admins (user_id)
```

### RLS ポリシー概要

| テーブル | SELECT | INSERT/UPDATE/DELETE |
|---------|--------|----------------------|
| templates | 全員 | 作成者 or 管理者 |
| template_characters | 全員 | テンプレート作成者 or 管理者 |
| diagrams | 本人 or `is_public=true` | 本人のみ |
| diagram_nodes | 本人 or `is_public=true` の相関図 | 本人のみ |
| diagram_edges | 本人 or `is_public=true` の相関図 | 本人のみ |
| template_favorites | 本人のみ | 本人のみ |
| admins | 全員 | — |

### RPC 関数

| 関数名 | 説明 |
|--------|------|
| `increment_usage_count(template_id)` | 使用カウント +1 |
| `increment_favorites_count(template_id)` | お気に入りカウント +1 |
| `decrement_favorites_count(template_id)` | お気に入りカウント -1（最小 0） |
| `count_character_usages(character_ids[])` | 指定キャラクターを使用する diagram_nodes 件数を返す（RLS bypass） |
| `is_admin()` | ログインユーザーが管理者か判定 |
| `safe_delete_template(template_id)` | テンプレートを安全削除（使用中 diagram はコピーテンプレートに移行） |

### ストレージ

- Bucket: `character-images`
- パス: `{template_id}/{character_id}.{ext}`

---

## 9. 管理者機能

- `admins` テーブルに `user_id` を INSERT することで管理者に昇格
- 管理者が行えること：
  - 全テンプレートの編集
  - 全テンプレートの削除

---

## 10. マイグレーションファイル（要 Supabase SQL Editor 実行）

実行順序：

1. `supabase/schema.sql` — メインスキーマ（テーブル・RLS・基本 RPC）
2. `supabase/migrations/add_favorites.sql` — お気に入り機能（schema.sql に統合済みの場合はスキップ）
3. `supabase/migrations/admin_role.sql` — 管理者ロール（`admins` テーブル・`is_admin()` 関数・RLS 更新）
4. `supabase/migrations/safe_delete_template.sql` — テンプレート安全削除 RPC（`is_admin()` 依存）
5. `supabase/migrations/count_character_usages.sql` — キャラクター使用カウント RPC
6. `supabase/migrations/public_diagram_read.sql` — 公開相関図の nodes/edges を非オーナーも読み取り可能にする RLS 更新
7. `supabase/migrations/public_diagram_select.sql` — 公開相関図の diagrams 本体を非オーナーも読み取り可能にする RLS 更新

---

## 11. UI テキスト一覧

### ヘッダー
- タイトル：「推しリンク」
- 検索プレースホルダー：「テンプレートを検索...」
- ボタン：「＋ テンプレート作成」「ログイン」「マイページ」「ログアウト」
- ログイン済みドロップダウン：メールアドレス表示 / 「マイページ」/ 「ログアウト」

### トップページ
- 「作成したリンク」「人気テンプレート」
- 「`「{q}」の検索結果`」「テンプレートが見つかりませんでした」「まだテンプレートがありません」

### テンプレート詳細
- 「使用回数 N · お気に入り数 N」
- 「このテンプレートで開始」「このテンプレートをコピーして編集」「このテンプレートを編集」「登場人物」「← 前の画面に戻る」

### エディタ
- 「↓ 保存 / ダウンロード」
- DesignPanel：「囲む」「デザイン」「フォント」
- ヒント：「下のバーからアイコンをタップして追加！」「接続先のノードをクリック（背景クリックでキャンセル）」「ドラッグで図形を作成（ESCでキャンセル）」
- 離脱確認：「未保存の編集があります。ページを離れますか？」

### TemplateForm
- 見出し：「新規テンプレート作成」「テンプレートをコピーして編集」「テンプレートを編集」
- ラベル：「テンプレートタイトル *」「人物一覧」
- ボタン：「一括追加」「＋ 追加」「追加」「キャンセル」「保存して開始」「保存中...」
- 一括追加説明：「1行に1人物名を入力（既存の同名はスキップ）」
- 削除：「このテンプレートを削除」「削除しますか？」「使用中の相関図は画像なしコピーに移し替えられます」「削除する」「キャンセル」
- エラー（window.alert）：「リンクで使用されている人物のため削除できません。テンプレートから削除したい場合はテンプレートをコピーして編集してください。」

### マイページ
- 「作成したリンク」「保存された相関図はありません」
- 「作成したテンプレート」「作成したテンプレートはありません」
- 「お気に入りテンプレート」「お気に入りのテンプレートはありません」「テンプレートを作成する」

### SaveDownloadModal
- 「プロフィールに保存」「画像をダウンロード」「生成中...」「保存しました」
- 「プレビューが表示されない場合は再生成」

---

## 12. 認証フロー

1. **X OAuth**：ボタンクリック → Supabase OAuth（provider: twitter）→ `/auth/callback` → リダイレクト
   - X Developer Portal：`Request email address from users` を有効化が必要
2. **メール/パスワード新規登録**：フォーム入力 → 確認メール送信 → リンククリック → `/auth/callback`
3. **メール/パスワードログイン**：フォーム入力 → 即座にログイン
4. セッションは `localStorage` に自動保存（Supabase 標準）
5. `AuthProvider` で初期化、`authStore` で保持

### ログイン・ログアウト後のページ更新

- **ログイン成功時**：`AuthModal` の `onSuccess` で `router.refresh()` を呼び出し、サーバーコンポーネントを再フェッチ → トップページの「作成したリンク」が即座に表示される
- **ログアウト時**：`handleLogout` で `signOut()` 後に `router.refresh()` を呼び出し → 「作成したリンク」が即座に非表示になる
- 実装場所：`Header.tsx`
