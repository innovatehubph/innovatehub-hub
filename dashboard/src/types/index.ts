export interface ColumnDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'json' | 'pointer' | 'select' | 'tags' | 'masked';
  editable?: boolean;
  options?: string[];
  pointerClass?: string;
  render?: (value: any, row: any) => string;
}

export interface BusinessInfo {
  id: string;
  name: string;
  slug: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SetupStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  links?: { label: string; url: string }[];
  fields?: { key: string; label: string; placeholder: string; type?: string }[];
}
