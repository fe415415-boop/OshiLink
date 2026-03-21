-- ============================================================
-- 推しリンク (OshiLink) DB スキーマ
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 共有テンプレート（全ユーザーが参照可能）
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  forked_from uuid REFERENCES templates(id) ON DELETE SET NULL,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- テンプレートの人物（画像付き）
CREATE TABLE IF NOT EXISTS template_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0
);

-- ユーザーの相関図
CREATE TABLE IF NOT EXISTS diagrams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
  title text NOT NULL DEFAULT '',
  design_template text NOT NULL DEFAULT 'stylish',
  font_style text NOT NULL DEFAULT 'cool',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 相関図のノード（人物配置）
CREATE TABLE IF NOT EXISTS diagram_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES template_characters(id) ON DELETE CASCADE,
  pos_x float NOT NULL DEFAULT 0,
  pos_y float NOT NULL DEFAULT 0
);

-- 相関図のエッジ（関係線）
CREATE TABLE IF NOT EXISTS diagram_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
  tag text NOT NULL,
  direction text NOT NULL DEFAULT 'right'
    CHECK (direction IN ('right', 'left', 'both', 'none'))
);

-- サムネイル列（後から追加する場合は下記を実行）
ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS thumbnail text;

-- お気に入り
CREATE TABLE IF NOT EXISTS template_favorites (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, template_id)
);
ALTER TABLE template_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_select" ON template_favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "favorites_insert" ON template_favorites FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "favorites_delete" ON template_favorites FOR DELETE USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_favorites_user ON template_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_template ON template_favorites(template_id);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_template_characters_template ON template_characters(template_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_user ON diagrams(user_id);
CREATE INDEX IF NOT EXISTS idx_diagram_nodes_diagram ON diagram_nodes(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_edges_diagram ON diagram_edges(diagram_id);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON templates(usage_count DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_edges ENABLE ROW LEVEL SECURITY;

-- templates: 全員READ可 / 作者のみ WRITE
CREATE POLICY "templates_select" ON templates FOR SELECT USING (true);
CREATE POLICY "templates_insert" ON templates FOR INSERT WITH CHECK (true);
CREATE POLICY "templates_update" ON templates FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "templates_delete" ON templates FOR DELETE
  USING (user_id = auth.uid());

-- template_characters: 全員READ可 / テンプレート作者のみ WRITE
CREATE POLICY "template_chars_select" ON template_characters FOR SELECT USING (true);
CREATE POLICY "template_chars_insert" ON template_characters FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM templates
    WHERE id = template_id AND (user_id = auth.uid() OR user_id IS NULL)
  )
);
CREATE POLICY "template_chars_update" ON template_characters FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM templates
    WHERE id = template_id AND user_id = auth.uid()
  )
);
CREATE POLICY "template_chars_delete" ON template_characters FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM templates
    WHERE id = template_id AND user_id = auth.uid()
  )
);

-- diagrams: 作者のみアクセス（保存はログイン必須）
CREATE POLICY "diagrams_select" ON diagrams FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "diagrams_insert" ON diagrams FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "diagrams_update" ON diagrams FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "diagrams_delete" ON diagrams FOR DELETE
  USING (user_id = auth.uid());

-- diagram_nodes: diagramの作者のみ
CREATE POLICY "diagram_nodes_select" ON diagram_nodes FOR SELECT USING (
  EXISTS (SELECT 1 FROM diagrams WHERE id = diagram_id AND user_id = auth.uid())
);
CREATE POLICY "diagram_nodes_insert" ON diagram_nodes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM diagrams WHERE id = diagram_id AND user_id = auth.uid())
);
CREATE POLICY "diagram_nodes_update" ON diagram_nodes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM diagrams WHERE id = diagram_id AND user_id = auth.uid())
);
CREATE POLICY "diagram_nodes_delete" ON diagram_nodes FOR DELETE USING (
  EXISTS (SELECT 1 FROM diagrams WHERE id = diagram_id AND user_id = auth.uid())
);

-- diagram_edges: diagramの作者のみ
CREATE POLICY "diagram_edges_select" ON diagram_edges FOR SELECT USING (
  EXISTS (SELECT 1 FROM diagrams WHERE id = diagram_id AND user_id = auth.uid())
);
CREATE POLICY "diagram_edges_insert" ON diagram_edges FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM diagrams WHERE id = diagram_id AND user_id = auth.uid())
);
CREATE POLICY "diagram_edges_update" ON diagram_edges FOR UPDATE USING (
  EXISTS (SELECT 1 FROM diagrams WHERE id = diagram_id AND user_id = auth.uid())
);
CREATE POLICY "diagram_edges_delete" ON diagram_edges FOR DELETE USING (
  EXISTS (SELECT 1 FROM diagrams WHERE id = diagram_id AND user_id = auth.uid())
);

-- ============================================================
-- usage_count インクリメント関数
-- ============================================================
CREATE OR REPLACE FUNCTION increment_usage_count(template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE templates SET usage_count = usage_count + 1 WHERE id = template_id;
END;
$$;

-- favorites_count カラム追加（未追加の場合に実行）
ALTER TABLE templates ADD COLUMN IF NOT EXISTS favorites_count integer NOT NULL DEFAULT 0;

-- お気に入り増減関数
CREATE OR REPLACE FUNCTION increment_favorites_count(template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE templates SET favorites_count = favorites_count + 1 WHERE id = template_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_favorites_count(template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE templates SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = template_id;
END;
$$;
