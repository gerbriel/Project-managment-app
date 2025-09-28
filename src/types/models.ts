export type ID = string;

export type Workspace = { id: ID; name: string };

export type Board = {
  id: ID; workspace_id: ID; name: string; background_url?: string;
};

export type List = {
  id: ID; board_id: ID; name: string; position: number;
};

export type Label = { id: ID; workspace_id: ID; name: string; color: string };

export type CustomFieldDef = {
  id: ID; workspace_id: ID; name: string;
  type: 'text'|'email'|'phone'|'number'|'checkbox'|'select'|'date';
  options?: string[];
};

export type Card = {
  id: ID; workspace_id: ID; board_id: ID; list_id: ID;
  title: string;
  description?: unknown; // rich text JSON
  date_start?: string; date_end?: string;
  labels: ID[]; members: ID[];
  location?: { address?: string; lat?: number; lon?: number; place_id?: string };
  position: number;
  created_by: ID; created_at: string; updated_at: string;
};

export type Workflow = { id: ID; card_id: ID; title: string; position: number };
export type Task = { 
  id: ID; 
  workflow_id: ID; 
  text: string; 
  done: boolean; 
  position: number;
  due_date?: string;
  assigned_to?: ID;
  reminder_date?: string;
  created_at?: string;
  updated_at?: string;
};

// Legacy type aliases for backward compatibility during migration
export type Checklist = Workflow;
export type ChecklistItem = Task;

export type Attachment = {
  id: ID; card_id: ID; name: string; url: string; mime: string; size: number;
  created_at: string; added_by: ID;
};

export type Comment = { id: ID; card_id: ID; author_id: ID; body: string; created_at: string };

export type Activity = {
  id: ID; card_id: ID;
  type:
    | 'comment' | 'label.add' | 'label.remove'
    | 'date.set' | 'date.clear'
    | 'member.add' | 'member.remove'
    | 'attachment.add' | 'checkitem.toggle'
    | 'move.list' | 'move.board' | 'update.title';
  meta: Record<string, unknown>;
  actor_id: ID; created_at: string;
};
