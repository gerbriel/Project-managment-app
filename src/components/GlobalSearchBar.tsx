import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '@contexts/SearchContext';
import { highlightSearchTerm, getSearchIcon } from '../utils/globalSearch';
import Icon from './Icon';

export default function GlobalSearchBar() {
  const {
    query,
    setQuery,
    results,
    filters,
    setFilters,
    isSearching,
    isOpen,
    setIsOpen,
    performSearch,
    clearSearch,
  } = useSearch();

  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Auto-search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setShowFilters(false);
      inputRef.current?.blur();
    }
    
    if (e.key === 'Enter' && results.length > 0) {
      const firstResult = results[0];
      navigate(firstResult.url);
      clearSearch();
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (result: any) => {
    navigate(result.url);
    clearSearch();
    inputRef.current?.blur();
  };

  const toggleFilter = (filterKey: keyof typeof filters) => {
    setFilters({ [filterKey]: !filters[filterKey] });
  };

  const getResultIcon = (result: any) => {
    if (result.icon) return result.icon;
    return getSearchIcon(result.type);
  };

  return (
    <div className="relative flex-1 max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="more" size={16} className="text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim() && results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Search boards, cards, lists, comments, contacts..."
          className="block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          {query && (
            <button
              onClick={clearSearch}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Clear search"
            >
              <Icon name="x" size={14} />
            </button>
          )}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-r-lg transition-colors ${
              showFilters
                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="Search filters"
          >
            <Icon name="more" size={16} />
          </button>
        </div>
      </div>

      {/* Search Dropdown */}
      {(isOpen || showFilters) && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden"
        >
          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Search Options
              </h3>
              
              {/* Search All Boards Toggle */}
              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.searchAllBoards}
                    onChange={() => toggleFilter('searchAllBoards')}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Search all boards
                  </span>
                </label>
              </div>

              {/* Content Type Filters */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'includeBoards' as const, label: 'Boards' },
                  { key: 'includeLists' as const, label: 'Lists' },
                  { key: 'includeCards' as const, label: 'Cards' },
                  { key: 'includeComments' as const, label: 'Comments' },
                  { key: 'includeCustomFields' as const, label: 'Custom Fields' },
                  { key: 'includeContacts' as const, label: 'Contacts' },
                ].map(filter => (
                  <label key={filter.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters[filter.key]}
                      onChange={() => toggleFilter(filter.key)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {filter.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {isOpen && (
            <div className="max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Searching...
                  </div>
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {results.slice(0, 20).map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <Icon 
                            name={getResultIcon(result) as any} 
                            size={16} 
                            className="text-gray-400" 
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            <span
                              dangerouslySetInnerHTML={{
                                __html: highlightSearchTerm(result.title, query)
                              }}
                            />
                          </div>
                          
                          {result.subtitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {result.subtitle}
                            </div>
                          )}
                          
                          {result.description && (
                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: highlightSearchTerm(
                                    result.description.substring(0, 100) + 
                                    (result.description.length > 100 ? '...' : ''),
                                    query
                                  )
                                }}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {result.type}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {results.length > 20 && (
                    <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                      Showing first 20 of {results.length} results
                    </div>
                  )}
                </div>
              ) : query.trim() ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <div className="text-sm">No results found for "{query}"</div>
                  <div className="text-xs mt-1">Try adjusting your search or filters</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}