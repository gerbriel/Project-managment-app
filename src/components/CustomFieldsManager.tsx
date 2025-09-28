import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';
import Icon from './Icon';
import {
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getCustomFields,
  setCustomFieldValue,
  type CustomFieldDef
} from '../api/customFields';

type FieldValue = { field_id: string; value: any };

type Props = {
  workspaceId?: ID;
  cardId: ID;
  values?: FieldValue[] | null;
};

type FieldEditMode = {
  fieldId: ID;
  name: string;
  type: CustomFieldDef['type'];
};

export default function CustomFieldsManager({ workspaceId, cardId, values }: Props) {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editMode, setEditMode] = React.useState<FieldEditMode | null>(null);
  const [newFieldName, setNewFieldName] = React.useState('');
  const [newFieldType, setNewFieldType] = React.useState<CustomFieldDef['type']>('text');
  const qc = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: ['custom-field-defs', workspaceId],
    enabled: !!workspaceId,
    queryFn: () => getCustomFields(workspaceId!),
  });

  const createFieldMutation = useMutation({
    mutationFn: (data: { name: string; type: CustomFieldDef['type'] }) =>
      createCustomField(workspaceId!, data.name, data.type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-field-defs', workspaceId] });
      setShowAddForm(false);
      setNewFieldName('');
      setNewFieldType('text');
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: (data: { fieldId: ID; name: string; type: CustomFieldDef['type'] }) =>
      updateCustomField(data.fieldId, { name: data.name, type: data.type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-field-defs', workspaceId] });
      qc.invalidateQueries({ queryKey: ['card', cardId] });
      setEditMode(null);
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: deleteCustomField,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-field-defs', workspaceId] });
      qc.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });

  const updateValueMutation = useMutation({
    mutationFn: ({ fieldId, newValue }: { fieldId: ID; newValue: any }) =>
      setCustomFieldValue(cardId, fieldId, newValue),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });

  const handleAddField = () => {
    if (newFieldName.trim()) {
      createFieldMutation.mutate({ name: newFieldName.trim(), type: newFieldType });
    }
  };

  const handleUpdateField = () => {
    if (editMode && editMode.name.trim()) {
      updateFieldMutation.mutate({
        fieldId: editMode.fieldId,
        name: editMode.name.trim(),
        type: editMode.type,
      });
    }
  };

  const handleDeleteField = (fieldId: ID) => {
    if (confirm('Are you sure you want to delete this custom field? This will remove it from all cards.')) {
      deleteFieldMutation.mutate(fieldId);
    }
  };

  if (!workspaceId) return <div className="text-sm text-fg-muted">No workspace</div>;
  if (fieldsQuery.isLoading) return <div className="text-sm text-fg-muted">Loading custom fields…</div>;
  if (fieldsQuery.error) return <div className="text-sm text-red-500">Failed to load custom fields</div>;

  const fields = fieldsQuery.data || [];
  const valMap = new Map<string, any>();
  
  (values || []).forEach((v: any) => {
    try {
      const parsed = typeof v.value === 'string' ? JSON.parse(v.value) : v.value;
      valMap.set(v.field_id, parsed?.value ?? parsed ?? '');
    } catch {
      valMap.set(v.field_id, v.value ?? '');
    }
  });

  const renderFieldInput = (field: CustomFieldDef, currentValue: any) => {
    const handleValueChange = (newValue: any) => {
      updateValueMutation.mutate({ fieldId: field.id, newValue: { value: newValue } });
    };

    switch (field.type) {
      case 'number':
        return (
          <input
            className="flex-1 rounded border border-app bg-surface-2 px-2 py-1"
            type="number"
            value={currentValue || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Number(e.target.value);
              handleValueChange(val);
            }}
          />
        );
      default:
        return (
          <input
            className="flex-1 rounded border border-app bg-surface-2 px-2 py-1"
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={currentValue || ''}
            onChange={(e) => handleValueChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-fg">Custom Fields</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="p-1 hover:bg-surface-2 rounded transition-colors"
          title="Add custom field"
        >
          <Icon name="plus" size={16} />
        </button>
      </div>

      {/* Add Field Form */}
      {showAddForm && (
        <div className="bg-surface-2 p-3 rounded border space-y-2">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border border-app bg-surface px-2 py-1 text-sm"
              placeholder="Field name"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
            />
            <select
              className="rounded border border-app bg-surface px-2 py-1 text-sm"
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as CustomFieldDef['type'])}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddField}
              disabled={!newFieldName.trim() || createFieldMutation.isPending}
              className="px-3 py-1 bg-primary text-primary-fg rounded text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewFieldName('');
                setNewFieldType('text');
              }}
              className="px-3 py-1 text-fg-muted hover:text-fg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Field List */}
      {fields.length === 0 ? (
        <div className="text-sm text-fg-muted">No custom fields</div>
      ) : (
        <div className="space-y-2">
          {fields.map((field) => {
            const isEditing = editMode?.fieldId === field.id;
            const currentValue = valMap.get(field.id) ?? '';

            return (
              <div key={field.id} className="space-y-1">
                {isEditing ? (
                  <div className="bg-surface-2 p-2 rounded border space-y-2">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded border border-app bg-surface px-2 py-1 text-sm"
                        value={editMode.name}
                        onChange={(e) => setEditMode({ ...editMode, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateField()}
                      />
                      <select
                        className="rounded border border-app bg-surface px-2 py-1 text-sm"
                        value={editMode.type}
                        onChange={(e) => setEditMode({ ...editMode, type: e.target.value as CustomFieldDef['type'] })}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateField}
                        disabled={!editMode.name.trim() || updateFieldMutation.isPending}
                        className="px-3 py-1 bg-primary text-primary-fg rounded text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditMode(null)}
                        className="px-3 py-1 text-fg-muted hover:text-fg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-32 text-fg-muted flex items-center gap-1">
                      <span>{field.name}</span>
                      <span className="text-xs opacity-60">({field.type})</span>
                    </div>
                    {renderFieldInput(field, currentValue)}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditMode({ fieldId: field.id, name: field.name, type: field.type })}
                        className="p-1 hover:bg-surface-2 rounded transition-colors"
                        title="Edit field"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1 hover:bg-surface-2 rounded transition-colors text-red-500"
                        title="Delete field"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}