import React, { createContext, useContext, useState } from 'react';

export interface FilterOptions {
  enableLabels: boolean;
  enableActivityDate: boolean;
  enableAssignedTo: boolean;
  enableStatus: boolean;
  enableAttachments: boolean;
  enableComments: boolean;
  enableLocation: boolean;
  enableSearchText: boolean;
  enableCommentSearch: boolean;
  enablePhoneSearch: boolean;
  enableEmailSearch: boolean;
}

export interface CardFilters {
  labels: string[];
  labelSearch: string;
  activityDate: {
    from?: Date;
    to?: Date;
    type: 'created' | 'edited' | 'commented' | 'completed' | 'workflow_created' | 'any';
  };
  assignedTo: string[];
  status: 'all' | 'archived' | 'active';
  hasAttachments: boolean | null;
  hasComments: boolean | null;
  hasLocation: boolean | null;
  locationSearch: string;
  searchText: string;
  commentSearch: string;
  phoneSearch: string;
  emailSearch: string;
  applyToAllBoards: boolean;
}

interface FilterContextType {
  filters: CardFilters;
  filterOptions: FilterOptions;
  setFilters: (filters: Partial<CardFilters>) => void;
  setFilterOptions: (options: Partial<FilterOptions>) => void;
  clearFilters: () => void;
  isFilterActive: boolean;
}

const defaultFilterOptions: FilterOptions = {
  enableLabels: false,
  enableActivityDate: false,
  enableAssignedTo: false,
  enableStatus: true, // Status filter is enabled by default
  enableAttachments: false,
  enableComments: false,
  enableLocation: false,
  enableSearchText: false,
  enableCommentSearch: false,
  enablePhoneSearch: false,
  enableEmailSearch: false,
};

const defaultFilters: CardFilters = {
  labels: [],
  labelSearch: '',
  activityDate: {
    type: 'any',
  },
  assignedTo: [],
  status: 'active',
  hasAttachments: null,
  hasComments: null,
  hasLocation: null,
  locationSearch: '',
  searchText: '',
  commentSearch: '',
  phoneSearch: '',
  emailSearch: '',
  applyToAllBoards: false,
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function useCardFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useCardFilters must be used within a FilterProvider');
  }
  return context;
}

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<CardFilters>(defaultFilters);
  const [filterOptions, setFilterOptionsState] = useState<FilterOptions>(defaultFilterOptions);

  const setFilters = (newFilters: Partial<CardFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const setFilterOptions = (newOptions: Partial<FilterOptions>) => {
    setFilterOptionsState(prev => ({ ...prev, ...newOptions }));
  };

  const clearFilters = () => {
    setFiltersState(defaultFilters);
    setFilterOptionsState(defaultFilterOptions);
  };

  const isFilterActive = React.useMemo(() => {
    return (
      (filterOptions.enableLabels && (filters.labels.length > 0 || filters.labelSearch.length > 0)) ||
      (filterOptions.enableActivityDate && (!!filters.activityDate.from || !!filters.activityDate.to)) ||
      (filterOptions.enableAssignedTo && filters.assignedTo.length > 0) ||
      (filterOptions.enableStatus && filters.status !== 'active') ||
      (filterOptions.enableAttachments && filters.hasAttachments !== null) ||
      (filterOptions.enableComments && filters.hasComments !== null) ||
      (filterOptions.enableLocation && (filters.hasLocation !== null || filters.locationSearch.length > 0)) ||
      (filterOptions.enableSearchText && filters.searchText.length > 0) ||
      (filterOptions.enableCommentSearch && filters.commentSearch.length > 0) ||
      (filterOptions.enablePhoneSearch && filters.phoneSearch.length > 0) ||
      (filterOptions.enableEmailSearch && filters.emailSearch.length > 0)
    );
  }, [filters, filterOptions]);

  const value = {
    filters,
    filterOptions,
    setFilters,
    setFilterOptions,
    clearFilters,
    isFilterActive,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}