export type CalendarViewMode = 'day' | 'week' | 'month' | 'year' | null;

export interface CalendarViewState {
  mode: CalendarViewMode;
  selectedDate?: Date;
}

export interface CalendarCard {
  id: string;
  title: string;
  date_start?: string;
  date_end?: string;
  list_id: string;
  board_id: string;
}
