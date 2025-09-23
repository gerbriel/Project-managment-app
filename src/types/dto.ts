// DTOs and API shapes (expand later). Keeping minimal to compile.
export type Paginated<T> = { data: T[]; nextCursor?: string | null };

export type ListRow = {
	id: string;
	board_id: string;
	name: string;
	position: number;
};

export type CardRow = {
	id: string;
	workspace_id: string;
	board_id: string;
	list_id: string;
	title: string;
	description: unknown | null;
	date_start: string | null;
	date_end: string | null;
	position: number;
	created_by: string;
	created_at: string;
	updated_at: string;
	// Optional location
	location_lat?: number | null;
	location_lng?: number | null;
	location_address?: string | null;
  // Optional nested relation for previews
	card_field_values?: Array<{
		field_id: string;
		value: any;
		// Supabase embed may return an array; tolerate both
		custom_field_defs?: { name: string } | { name: string }[];
	}>;
  // Optional nested labels via card_labels -> labels
  card_labels?: Array<{
    label_id: string;
    labels?: { id: string; name: string; color: string } | { id: string; name: string; color: string }[];
  }>;
  // Optional nested attachments for counting
	attachments?: Array<{ id: string; name?: string; mime?: string; url?: string; size?: number; created_at?: string }>;
  // Optional nested comments for counting
	comments?: Array<{ id: string; author_id?: string; body?: string; created_at?: string }>;
  // Optional nested checklists for progress
  checklists?: Array<{
		id: string;
		title?: string;
		position?: number;
		checklist_items?: Array<{ id: string; text?: string; done: boolean; position?: number }>;
  }>;
  // Optional activity entries
  activity?: Array<{ id: string; type: string; meta?: any; actor_id: string; created_at: string }>;
};
