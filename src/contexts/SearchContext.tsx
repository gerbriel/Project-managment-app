import React, { createContext, useContext, useState, useCallback } from 'react';

export interface SearchResult {
  id: string;
  type: 'board' | 'list' | 'card' | 'comment' | 'custom_field' | 'contact';
  title: string;
  subtitle?: string;
  description?: string;
  boardId?: string;
  listId?: string;
  cardId?: string;
  url: string;
  matchedField?: string;
  matchedText?: string;
  icon?: string;
}

export interface SearchFilters {
  searchAllBoards: boolean;
  includeBoards: boolean;
  includeLists: boolean;
  includeCards: boolean;
  includeComments: boolean;
  includeCustomFields: boolean;
  includeContacts: boolean;
}

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  setResults: (results: SearchResult[]) => void;
  filters: SearchFilters;
  setFilters: (filters: Partial<SearchFilters>) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  performSearch: (searchQuery: string) => Promise<void>;
  clearSearch: () => void;
}

const defaultFilters: SearchFilters = {
  searchAllBoards: true,
  includeBoards: true,
  includeLists: true,
  includeCards: true,
  includeComments: true,
  includeCustomFields: true,
  includeContacts: true,
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFiltersState] = useState<SearchFilters>(defaultFilters);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const setFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Import the search function dynamically to avoid circular dependencies
      const { performGlobalSearch } = await import('../utils/globalSearch');
      const searchResults = await performGlobalSearch(searchQuery, filters);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [filters]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }, []);

  const value = {
    query,
    setQuery,
    results,
    setResults,
    filters,
    setFilters,
    isSearching,
    setIsSearching,
    isOpen,
    setIsOpen,
    performSearch,
    clearSearch,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}