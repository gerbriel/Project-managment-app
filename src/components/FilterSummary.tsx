import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCardFilters } from '@contexts/FilterContext';
import { getFilterSummary } from '../utils/cardFilters';
import { getSupabase } from '@app/supabaseClient';

export default function FilterSummary() {
  const { boardId } = useParams();
  const { filters, filterOptions, isFilterActive, clearFilters } = useCardFilters();

  // Get current board info to fetch workspace_id
  const { data: boardInfo } = useQuery({
    queryKey: ['board-info', boardId],
    queryFn: async () => {
      if (!boardId) return null;
      const supabase = getSupabase();
      const { data } = await supabase
        .from('boards')
        .select('workspace_id')
        .eq('id', boardId)
        .single();
      return data;
    },
    enabled: !!boardId && isFilterActive && filterOptions.enableLabels,
  });

  // Fetch available labels for the workspace
  const { data: labels = [] } = useQuery({
    queryKey: ['labels', boardInfo?.workspace_id],
    queryFn: async () => {
      if (!boardInfo?.workspace_id) return [];
      const supabase = getSupabase();
      
      try {
        const { data, error } = await supabase
          .from('labels')
          .select('*')
          .eq('workspace_id', boardInfo.workspace_id);
          
        if (error) {
          console.log('Labels query error:', error);
          return [];
        }
        
        return data || [];
      } catch (e) {
        console.log('Error fetching labels:', e);
        return [];
      }
    },
    enabled: !!boardInfo?.workspace_id && isFilterActive && filterOptions.enableLabels && filters.labels.length > 0,
  });

  if (!isFilterActive) {
    return null;
  }

  // Create location summary if location filter is active
  let locationSummary = '';
  if (filterOptions.enableLocation && filters.hasLocation) {
    locationSummary = 'with location data';
  }

  const summary = getFilterSummary(filters, filterOptions, labels, locationSummary);

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-blue-800 dark:text-blue-200">
            {summary}
            {filters.applyToAllBoards && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs">
                All boards
              </span>
            )}
          </span>
        </div>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}