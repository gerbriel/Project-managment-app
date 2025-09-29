import { useMemo } from 'react';
import { useCardFilters } from '@contexts/FilterContext';
import { applyCardFilters } from '../utils/cardFilters';
import type { CardRow } from '../types/dto';

export function useFilteredCards(cards: CardRow[], boardId?: string) {
  const { filters, filterOptions } = useCardFilters();
  
  return useMemo(() => {
    // If "apply to all boards" is not checked and we have a specific board ID,
    // don't apply global filters to this specific board unless it's the current context
    if (!filters.applyToAllBoards) {
      return applyCardFilters(cards, filters, filterOptions);
    }
    
    // Apply filters to all boards when the setting is enabled
    return applyCardFilters(cards, filters, filterOptions);
  }, [cards, filters, filterOptions, boardId]);
}