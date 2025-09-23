// Lightweight UI state placeholder (no external deps)
import { useState } from 'react';

type BoardUIState = {
  filters: { query: string };
  cardModalOpen: boolean;
};

export function useBoardStore() {
  const [state, setState] = useState<BoardUIState>({ filters: { query: '' }, cardModalOpen: false });
  return {
    state,
    setQuery: (q: string) =>
      setState((s: BoardUIState) => ({ ...s, filters: { ...s.filters, query: q } })),
    openCardModal: () => setState((s: BoardUIState) => ({ ...s, cardModalOpen: true })),
    closeCardModal: () => setState((s: BoardUIState) => ({ ...s, cardModalOpen: false })),
  };
}
export default useBoardStore;
