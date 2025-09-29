import React, { useState } from 'react';
import { useCardFilters } from '@contexts/FilterContext';
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '@app/supabaseClient';
import Icon from './Icon';

interface CardFilterPanelProps {
  boardId?: string;
}

export default function CardFilterPanel({ boardId }: CardFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const { filters, filterOptions, setFilters, setFilterOptions, clearFilters, isFilterActive } = useCardFilters();

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
    enabled: !!boardId && isOpen,
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
    enabled: !!boardInfo?.workspace_id && isOpen && filterOptions.enableLabels,
  });

  // Fetch available assignees (workspace members)
  const { data: assignees = [] } = useQuery({
    queryKey: ['workspace-members', boardInfo?.workspace_id],
    queryFn: async () => {
      if (!boardInfo?.workspace_id) return [];
      const supabase = getSupabase();
      
      // Try the RPC function first, fall back to direct table query
      try {
        const { data, error } = await supabase.rpc('list_workspace_members', { 
          p_ws_id: boardInfo.workspace_id 
        });
        
        if (!error && data) {
          return data;
        }
      } catch (e) {
        console.log('RPC function not available, using direct query');
      }
      
      // Fallback to direct table query
      const { data } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', boardInfo.workspace_id);
      return data || [];
    },
    enabled: !!boardInfo?.workspace_id && isOpen && filterOptions.enableAssignedTo,
  });

  const handleLabelToggle = (labelId: string) => {
    const newLabels = filters.labels.includes(labelId)
      ? filters.labels.filter(id => id !== labelId)
      : [...filters.labels, labelId];
    setFilters({ labels: newLabels });
  };

  const handleAssigneeToggle = (assigneeId: string) => {
    const newAssignees = filters.assignedTo.includes(assigneeId)
      ? filters.assignedTo.filter(id => id !== assigneeId)
      : [...filters.assignedTo, assigneeId];
    setFilters({ assignedTo: newAssignees });
  };

  const handleActivityDateChange = (
    field: 'from' | 'to',
    value: string
  ) => {
    const date = value ? new Date(value) : undefined;
    setFilters({
      activityDate: {
        ...filters.activityDate,
        [field]: date,
      },
    });
  };

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  if (!isOpen) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            isFilterActive
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300'
          }`}
          title="Filter cards"
        >
          <Icon name="more" size={16} />
          <span>Filter</span>
          {isFilterActive && (
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          isFilterActive
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300'
        }`}
      >
        <Icon name="more" size={16} />
        <span>Filter</span>
        {isFilterActive && (
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        )}
      </button>

      <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white">Filter Cards</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilterOptions(!showFilterOptions)}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-400 transition-colors"
            >
              {showFilterOptions ? 'Hide Options' : 'Show Options'}
            </button>
            {isFilterActive && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Filter Options - Toggle which filters are active */}
        {showFilterOptions && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Filter Options</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.enableSearchText}
                  onChange={(e) => setFilterOptions({ enableSearchText: e.target.checked })}
                  className="rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">Search Text</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.enableLabels}
                  onChange={(e) => setFilterOptions({ enableLabels: e.target.checked })}
                  className="rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">Labels</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.enableActivityDate}
                  onChange={(e) => setFilterOptions({ enableActivityDate: e.target.checked })}
                  className="rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">Activity On</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.enableCommentSearch}
                  onChange={(e) => setFilterOptions({ enableCommentSearch: e.target.checked })}
                  className="rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">Comments</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.enablePhoneSearch}
                  onChange={(e) => setFilterOptions({ enablePhoneSearch: e.target.checked })}
                  className="rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">Phone Numbers</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.enableEmailSearch}
                  onChange={(e) => setFilterOptions({ enableEmailSearch: e.target.checked })}
                  className="rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">Email Addresses</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOptions.enableLocation}
                  onChange={(e) => setFilterOptions({ enableLocation: e.target.checked })}
                  className="rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">Has Location</span>
              </label>
            </div>
          </div>
        )}

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Search Text */}
          {filterOptions.enableSearchText && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Text
              </label>
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => setFilters({ searchText: e.target.value })}
                placeholder="Search in card titles and descriptions..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Comment Search */}
          {filterOptions.enableCommentSearch && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Comments
              </label>
              <input
                type="text"
                value={filters.commentSearch}
                onChange={(e) => setFilters({ commentSearch: e.target.value })}
                placeholder="Search within card comments..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Phone Search */}
          {filterOptions.enablePhoneSearch && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Phone Numbers
              </label>
              <input
                type="text"
                value={filters.phoneSearch}
                onChange={(e) => setFilters({ phoneSearch: e.target.value })}
                placeholder="Search for phone numbers..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Email Search */}
          {filterOptions.enableEmailSearch && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Email Addresses
              </label>
              <input
                type="text"
                value={filters.emailSearch}
                onChange={(e) => setFilters({ emailSearch: e.target.value })}
                placeholder="Search for email addresses..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Location Filter */}
          {filterOptions.enableLocation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location Filter
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={filters.locationSearch}
                  onChange={(e) => setFilters({ locationSearch: e.target.value })}
                  placeholder="Search by address or location..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.hasLocation === true}
                    onChange={(e) => setFilters({ hasLocation: e.target.checked ? true : null })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Only cards with location data
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Apply to All Boards Toggle */}
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
            <input
              type="checkbox"
              id="applyToAllBoards"
              checked={filters.applyToAllBoards}
              onChange={(e) => setFilters({ applyToAllBoards: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="applyToAllBoards" className="text-sm text-yellow-800 dark:text-yellow-200">
              Apply filters to all boards
            </label>
          </div>

          {/* Labels */}
          {filterOptions.enableLabels && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Labels
              </label>
              <div className="space-y-2">
                {/* Label Search */}
                <input
                  type="text"
                  value={filters.labelSearch}
                  onChange={(e) => setFilters({ labelSearch: e.target.value })}
                  placeholder="Search label names..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                
                {/* Label Checkboxes */}
                {labels.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {labels
                      .filter((label: any) => 
                        !filters.labelSearch || 
                        label.name.toLowerCase().includes(filters.labelSearch.toLowerCase())
                      )
                      .map((label: any) => (
                        <label key={label.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.labels.includes(label.id)}
                            onChange={() => handleLabelToggle(label.id)}
                            className="rounded"
                          />
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: label.color }}
                          ></div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {label.name}
                          </span>
                        </label>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          {filterOptions.enableStatus && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="active">Active Cards</option>
                <option value="archived">Archived Cards</option>
                <option value="all">All Cards</option>
              </select>
            </div>
          )}

          {/* Activity Date */}
          {filterOptions.enableActivityDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Date
              </label>
              <div className="space-y-2">
                {/* Activity Type Selector */}
                <select
                  value={filters.activityDate.type}
                  onChange={(e) => setFilters({ 
                    activityDate: { 
                      ...filters.activityDate, 
                      type: e.target.value as any 
                    } 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="any">Any Activity</option>
                  <option value="created">Created</option>
                  <option value="edited">Edited</option>
                  <option value="commented">Commented</option>
                  <option value="completed">Task Completed</option>
                  <option value="workflow_created">Workflow Created</option>
                </select>
                
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={formatDateForInput(filters.activityDate.from)}
                    onChange={(e) => handleActivityDateChange('from', e.target.value)}
                    placeholder="From"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="date"
                    value={formatDateForInput(filters.activityDate.to)}
                    onChange={(e) => handleActivityDateChange('to', e.target.value)}
                    placeholder="To"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Assignees */}
          {filterOptions.enableAssignedTo && assignees.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned To
              </label>
              <div className="space-y-2">
                {assignees.map((assignee: any) => (
                  <label key={assignee.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.assignedTo.includes(assignee.id)}
                      onChange={() => handleAssigneeToggle(assignee.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {assignee.name || assignee.email}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Additional Filters */}
          {(filterOptions.enableAttachments || filterOptions.enableComments) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Filters
              </label>
              <div className="space-y-2">
                {filterOptions.enableAttachments && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasAttachments === true}
                      onChange={(e) => setFilters({ hasAttachments: e.target.checked ? true : null })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Has attachments
                    </span>
                  </label>
                )}
                {filterOptions.enableComments && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasComments === true}
                      onChange={(e) => setFilters({ hasComments: e.target.checked ? true : null })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Has comments
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
}