export type EdgeDirection = 'right' | 'left' | 'both' | 'none'

export interface Template {
  id: string
  title: string
  user_id: string | null
  forked_from: string | null
  usage_count: number
  favorites_count: number
  created_at: string
  updated_at: string
}

export interface TemplateCharacter {
  id: string
  template_id: string
  name: string
  image_url: string | null
}

export interface Diagram {
  id: string
  user_id: string | null
  template_id: string
  title: string
  design_template: string
  font_style: string
  created_at: string
}

export interface DiagramNode {
  id: string
  diagram_id: string
  character_id: string
  pos_x: number
  pos_y: number
}

export interface DiagramEdge {
  id: string
  diagram_id: string
  source_node_id: string
  target_node_id: string
  tag: string
  direction: EdgeDirection
}

// Joined types
export interface TemplateWithCharacters extends Template {
  template_characters: TemplateCharacter[]
}

export interface DiagramNodeWithCharacter extends DiagramNode {
  template_characters: TemplateCharacter
}

export interface DiagramEdgeWithNodes extends DiagramEdge {
  source: DiagramNodeWithCharacter
  target: DiagramNodeWithCharacter
}
