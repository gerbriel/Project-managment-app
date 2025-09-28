import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addCardLabel, getLabelsByWorkspace, removeCardLabel, createLabel, updateLabel, deleteLabel } from '@api/labels';
import type { ID } from '../types/models';

type Props = {
  workspaceId: ID;
  cardId: ID;
  selectedLabelIds: ID[];
};

const DEFAULT_COLORS = [
  '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0', '#0079bf',
  '#00c2e0', '#51e898', '#ff78cb', '#344563', '#b3bac5', '#000000',
  '#026aa7', '#519839', '#b04632', '#89609e', '#cd8313', '#cf513d'
];

export default function LabelPicker({ workspaceId, cardId, selectedLabelIds }: Props) {
  const [showLabelModal, setShowLabelModal] = React.useState(false);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [newLabelName, setNewLabelName] = React.useState('');
  const [selectedColor, setSelectedColor] = React.useState(DEFAULT_COLORS[0]);
  const [editingLabel, setEditingLabel] = React.useState<{id: ID; name: string; color: string} | null>(null);
  const qc = useQueryClient();
  
  const labelsQuery = useQuery({
    queryKey: ['labels', workspaceId],
    queryFn: () => getLabelsByWorkspace(workspaceId),
    enabled: !!workspaceId,
  });

  const addMu = useMutation({
    mutationFn: (labelId: ID) => addCardLabel(cardId, labelId),
    onSuccess: () => {
      // refresh card details and board cards cache
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('card') });
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('cards') });
    },
  });
  
  const removeMu = useMutation({
    mutationFn: (labelId: ID) => removeCardLabel(cardId, labelId),
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('card') });
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('cards') });
    },
  });

  const createMu = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => createLabel(workspaceId, name, color),
    onSuccess: (newLabel) => {
      qc.invalidateQueries({ queryKey: ['labels', workspaceId] });
      // Auto-add the newly created label to this card
      addMu.mutate(newLabel.id);
      // Reset form
      setNewLabelName('');
      setSelectedColor(DEFAULT_COLORS[0]);
      setShowCreateForm(false);
    },
  });

  const updateMu = useMutation({
    mutationFn: ({ id, name, color }: { id: ID; name: string; color: string }) => updateLabel(id, name, color),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labels', workspaceId] });
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('card') });
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('cards') });
      // Reset edit state
      setEditingLabel(null);
    },
  });

  const deleteMu = useMutation({
    mutationFn: (labelId: ID) => deleteLabel(labelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labels', workspaceId] });
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('card') });
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('cards') });
      // Reset edit state
      setEditingLabel(null);
    },
  });

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      createMu.mutate({ name: newLabelName.trim(), color: selectedColor });
    }
  };

  const handleEditLabel = (label: {id: ID; name: string; color: string}) => {
    setEditingLabel(label);
    setShowCreateForm(false);
  };

  const handleUpdateLabel = () => {
    if (editingLabel && editingLabel.name.trim()) {
      updateMu.mutate({ 
        id: editingLabel.id, 
        name: editingLabel.name.trim(), 
        color: editingLabel.color 
      });
    }
  };

  const handleDeleteLabel = () => {
    if (editingLabel && window.confirm(`Are you sure you want to delete "${editingLabel.name}"? This will remove it from all cards.`)) {
      deleteMu.mutate(editingLabel.id);
    }
  };

  if (labelsQuery.isLoading) return <div className="text-muted text-sm">Loading labels…</div>;
  if (labelsQuery.error) return <div className="text-red-500 text-sm">Failed to load labels</div>;
  const labels = labelsQuery.data ?? [];

  // Filter labels based on search term
  const filteredLabels = labels.filter(label => 
    label.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {/* Display selected labels */}
      <div className="flex flex-wrap gap-2">
        {labels
          .filter(l => selectedLabelIds.includes(l.id))
          .map((l) => (
            <button
              key={l.id}
              type="button"
              className="px-2 py-1 rounded text-xs font-medium text-white border border-white/20 hover:border-white/40"
              style={{ backgroundColor: l.color }}
              onClick={() => removeMu.mutate(l.id)}
              title={`Remove ${l.name}`}
            >
              {l.name}
            </button>
          ))}
        
        {/* Add label button */}
        <button
          type="button"
          className="px-2 py-1 text-xs rounded border border-border text-fg-subtle hover:text-fg hover:border-fg/30 bg-bg flex items-center gap-1"
          onClick={() => setShowLabelModal(true)}
        >
          + 
        </button>
      </div>

      {/* Label Modal */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowLabelModal(false)}>
          <div className="bg-bg border border-border rounded-lg shadow-lg w-80 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-fg">Labels</h3>
              <button 
                onClick={() => setShowLabelModal(false)}
                className="text-fg-subtle hover:text-fg w-6 h-6 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-border">
              <input
                type="text"
                placeholder="Search labels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-bg text-fg placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Labels List */}
            <div className="max-h-48 overflow-y-auto">
              <div className="p-2">
                <div className="text-xs text-fg-muted mb-2 px-2">LABELS</div>
                {filteredLabels.map((label) => {
                  const isSelected = selectedLabelIds.includes(label.id);
                  return (
                    <div key={label.id} className="flex items-center gap-2 p-2 rounded hover:bg-bg-inset">
                      <button
                        onClick={() => isSelected ? removeMu.mutate(label.id) : addMu.mutate(label.id)}
                        className={`flex-1 px-3 py-2 rounded text-xs font-medium text-white transition-all hover:scale-105 ${
                          isSelected ? 'ring-2 ring-white/40 shadow-lg' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                        {isSelected && <span className="ml-2">✓</span>}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLabel(label);
                        }}
                        className="text-fg-subtle hover:text-fg text-xs p-1 hover:bg-bg-muted rounded"
                        title={`Edit ${label.name}`}
                      >
                        ✏️
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create New Label */}
            {!showCreateForm && !editingLabel ? (
              <div className="p-3 border-t border-border">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full text-sm text-fg-subtle hover:text-fg hover:bg-bg-inset rounded p-2 text-left"
                >
                  Create a new label
                </button>
              </div>
            ) : (
              <div className="p-3 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingLabel(null);
                      setNewLabelName('');
                      setSelectedColor(DEFAULT_COLORS[0]);
                    }}
                    className="text-fg-subtle hover:text-fg"
                  >
                    ← Back
                  </button>
                  <h4 className="font-medium text-fg">
                    {editingLabel ? 'Edit label' : 'Create label'}
                  </h4>
                  <button 
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingLabel(null);
                      setNewLabelName('');
                      setSelectedColor(DEFAULT_COLORS[0]);
                    }}
                    className="text-fg-subtle hover:text-fg w-6 h-6 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>

                {/* Preview */}
                <div 
                  className="w-full px-3 py-2 rounded text-xs font-medium text-white text-center"
                  style={{ backgroundColor: editingLabel ? editingLabel.color : selectedColor }}
                >
                  {(editingLabel ? editingLabel.name : newLabelName) || 'Color: none, title: none'}
                </div>

                {/* Title input */}
                <div>
                  <label className="block text-sm text-fg-muted mb-1">Title</label>
                  <input
                    type="text"
                    value={editingLabel ? editingLabel.name : newLabelName}
                    onChange={(e) => {
                      if (editingLabel) {
                        setEditingLabel({ ...editingLabel, name: e.target.value });
                      } else {
                        setNewLabelName(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded bg-bg text-fg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Enter label name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        editingLabel ? handleUpdateLabel() : handleCreateLabel();
                      }
                      if (e.key === 'Escape') {
                        setShowCreateForm(false);
                        setEditingLabel(null);
                        setNewLabelName('');
                        setSelectedColor(DEFAULT_COLORS[0]);
                      }
                    }}
                  />
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-sm text-fg-muted mb-2">Select a color</label>
                  <div className="grid grid-cols-6 gap-1">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-6 rounded border-2 ${
                          (editingLabel ? editingLabel.color : selectedColor) === color 
                            ? 'border-white shadow-lg' 
                            : 'border-gray-400'
                        } hover:scale-110 transition-transform`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          if (editingLabel) {
                            setEditingLabel({ ...editingLabel, color });
                          } else {
                            setSelectedColor(color);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {editingLabel ? (
                    <>
                      <button
                        onClick={handleUpdateLabel}
                        disabled={!editingLabel.name.trim() || updateMu.isPending}
                        className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updateMu.isPending ? 'Updating...' : 'Update'}
                      </button>
                      <button
                        onClick={handleDeleteLabel}
                        disabled={deleteMu.isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete label"
                      >
                        {deleteMu.isPending ? '...' : 'Delete'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCreateLabel}
                      disabled={!newLabelName.trim() || createMu.isPending}
                      className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createMu.isPending ? 'Creating...' : 'Create'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
