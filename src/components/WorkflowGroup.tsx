import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Workflow } from '../types/models';
import { useQuery } from '@tanstack/react-query';
import { listWorkspaceMembers, WorkspaceMember } from '../api/assignees';
import type { ID } from '../types/models';

interface WorkflowGroupProps {
  workflow: { id: string; title?: string; card_id?: string };
  tasks: Task[];
  workspaceId?: ID;
  onToggleTask: (taskId: string, checked: boolean) => void;
  onAddTask?: (workflowId: string, text: string) => void;
  onRenameTask?: (taskId: string, newText: string) => void;
  onRenameWorkflow?: (workflowId: string, newTitle: string) => void;
  onReorderTasks?: (workflowId: string, taskIds: string[]) => void;
  onDeleteTask?: (taskId: string) => void;
  onDeleteWorkflow?: (workflowId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
}

interface SortableTaskProps {
  task: Task;
  workspaceId?: ID;
  workspaceMembers?: WorkspaceMember[];
  onToggle: (checked: boolean) => void;
  onDelete?: (taskId: string) => void;
  onUpdate?: (updates: Partial<Task>) => void;
}

function SortableTask({ task, workspaceId, workspaceMembers, onToggle, onDelete, onUpdate }: SortableTaskProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text || '');
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.done;
  const assignedMember = workspaceMembers?.find(m => m.user_id === task.assigned_to);

  const handleTextSave = () => {
    if (editText.trim() && editText !== task.text) {
      onUpdate?.({ text: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleDateChange = (field: 'due_date' | 'reminder_date', value: string) => {
    onUpdate?.({ [field]: value || undefined });
  };

  const handleReminderChange = (intervalValue: string) => {
    if (!intervalValue || !task.due_date) {
      onUpdate?.({ reminder_date: undefined });
      return;
    }

    // Calculate reminder date based on due date and selected interval
    const dueDate = new Date(task.due_date);
    const reminderDate = new Date(dueDate);
    
    switch (intervalValue) {
      case '1month':
        reminderDate.setMonth(reminderDate.getMonth() - 1);
        break;
      case '1week':
        reminderDate.setDate(reminderDate.getDate() - 7);
        break;
      case '3days':
        reminderDate.setDate(reminderDate.getDate() - 3);
        break;
      case '1day':
        reminderDate.setDate(reminderDate.getDate() - 1);
        break;
      case '8hours':
        reminderDate.setHours(reminderDate.getHours() - 8);
        break;
      case '4hours':
        reminderDate.setHours(reminderDate.getHours() - 4);
        break;
      case '1hour':
        reminderDate.setHours(reminderDate.getHours() - 1);
        break;
      case '15min':
        reminderDate.setMinutes(reminderDate.getMinutes() - 15);
        break;
      default:
        onUpdate?.({ reminder_date: undefined });
        return;
    }

    onUpdate?.({ reminder_date: reminderDate.toISOString() });
  };

  const getReminderInterval = () => {
    if (!task.reminder_date || !task.due_date) return '';
    
    const reminderTime = new Date(task.reminder_date).getTime();
    const dueTime = new Date(task.due_date).getTime();
    const diffMs = dueTime - reminderTime;
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    
    // Match the closest predefined interval
    if (diffMinutes >= 43200) return '1month'; // ~30 days
    if (diffMinutes >= 10080) return '1week'; // 7 days  
    if (diffMinutes >= 4320) return '3days'; // 3 days
    if (diffMinutes >= 1440) return '1day'; // 1 day
    if (diffMinutes >= 480) return '8hours'; // 8 hours
    if (diffMinutes >= 240) return '4hours'; // 4 hours
    if (diffMinutes >= 60) return '1hour'; // 1 hour
    if (diffMinutes >= 15) return '15min'; // 15 minutes
    return '';
  };

  const formatReminderInterval = () => {
    const interval = getReminderInterval();
    const labels: Record<string, string> = {
      '1month': '1mo',
      '1week': '1w', 
      '3days': '3d',
      '1day': '1d',
      '8hours': '8h',
      '4hours': '4h', 
      '1hour': '1h',
      '15min': '15m'
    };
    return labels[interval] || 'Custom';
  };

  const getFullReminderLabel = () => {
    const interval = getReminderInterval();
    const labels: Record<string, string> = {
      '1month': '1 month before due date',
      '1week': '1 week before due date', 
      '3days': '3 days before due date',
      '1day': '1 day before due date',
      '8hours': '8 hours before due date',
      '4hours': '4 hours before due date', 
      '1hour': '1 hour before due date',
      '15min': '15 minutes before due date'
    };
    return labels[interval] || 'Custom reminder';
  };

  const handleAssigneeChange = (assignedTo: string) => {
    onUpdate?.({ assigned_to: assignedTo || undefined });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group border rounded-lg p-2 mb-2 ${isDragging ? 'bg-surface-2' : 'bg-surface hover:bg-surface-2'} ${isOverdue ? 'border-red-300' : 'border-app'}`}
      {...attributes}
    >
      {/* Main Task Row */}
      <div className="flex items-center gap-2">
        <div
          {...listeners}
          className="flex items-center justify-center w-4 h-4 cursor-grab active:cursor-grabbing text-muted hover:text-fg transition-colors"
          title="Drag to reorder"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="6" r="1" fill="currentColor"/>
            <circle cx="15" cy="6" r="1" fill="currentColor"/>
            <circle cx="9" cy="12" r="1" fill="currentColor"/>
            <circle cx="15" cy="12" r="1" fill="currentColor"/>
            <circle cx="9" cy="18" r="1" fill="currentColor"/>
            <circle cx="15" cy="18" r="1" fill="currentColor"/>
          </svg>
        </div>
        <input
          type="checkbox"
          checked={task.done || false}
          onChange={(e) => onToggle(e.target.checked)}
          className="flex-shrink-0"
        />
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleTextSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSave();
              if (e.key === 'Escape') {
                setEditText(task.text || '');
                setIsEditing(false);
              }
            }}
            className="flex-1 px-2 py-1 rounded border border-app bg-surface-2"
            autoFocus
          />
        ) : (
          <span 
            className={`flex-1 select-none cursor-pointer ${task.done ? 'line-through text-muted' : ''}`}
            onClick={() => setIsEditing(true)}
          >
            {task.text || 'Task'}
          </span>
        )}
        
        {/* Task metadata indicators */}
        <div className="flex items-center gap-1 text-xs">
          {task.due_date && (
            <span className={`px-2 py-1 rounded ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              Due: {formatDate(task.due_date)}
            </span>
          )}
          {assignedMember && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
              @{assignedMember.user_id}
            </span>
          )}
          {task.reminder_date && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded" title={`Reminder: ${getFullReminderLabel()}`}>
              🔔 {formatReminderInterval()}
            </span>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center w-6 h-6 text-muted hover:text-fg transition-colors"
          title="Task options"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform={isExpanded ? 'rotate(45 12 12)' : ''}/>
          </svg>
        </button>
        
        {onDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="flex items-center justify-center w-4 h-4 text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete task"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Expanded Task Options */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-app space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Due Date</label>
              <input
                type="date"
                value={task.due_date ? task.due_date.split('T')[0] : ''}
                onChange={(e) => handleDateChange('due_date', e.target.value)}
                className="w-full px-2 py-1 rounded border border-app bg-surface-2 text-sm"
              />
              {!task.due_date && (
                <p className="text-xs text-fg-muted mt-1">Set due date for reminders</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Reminder</label>
              <select
                value={getReminderInterval()}
                onChange={(e) => handleReminderChange(e.target.value)}
                disabled={!task.due_date}
                className="w-full px-2 py-1 rounded border border-app bg-surface-2 text-sm disabled:opacity-50"
              >
                <option value="">No reminder</option>
                <option value="1month">1 month before</option>
                <option value="1week">1 week before</option>
                <option value="3days">3 days before</option>
                <option value="1day">1 day before</option>
                <option value="8hours">8 hours before</option>
                <option value="4hours">4 hours before</option>
                <option value="1hour">1 hour before</option>
                <option value="15min">15 minutes before</option>
              </select>
              {!task.due_date && (
                <p className="text-xs text-fg-muted mt-1">Set a due date first</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Assigned To</label>
            <select
              value={task.assigned_to || ''}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="w-full px-2 py-1 rounded border border-app bg-surface-2 text-sm"
            >
              <option value="">No one assigned</option>
              {workspaceMembers && workspaceMembers.length > 0 ? (
                workspaceMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user_id}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading members...</option>
              )}
            </select>
            {(!workspaceMembers || workspaceMembers.length === 0) && (
              <p className="text-xs text-fg-muted mt-1">Workspace members will load when available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowHeader({ title, percentage, onRename, onDelete }: { 
  title: string; 
  percentage: number; 
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleSave = () => {
    if (editValue.trim() && editValue !== title && onRename) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
    setEditValue(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(title);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-app/20">
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm font-medium outline-none"
          autoFocus
        />
      ) : (
        <h4
          className={`flex-1 text-sm font-medium ${onRename ? 'cursor-pointer hover:text-accent' : ''}`}
          onClick={() => onRename && setIsEditing(true)}
          title={onRename ? 'Click to rename workflow' : undefined}
        >
          {title}
        </h4>
      )}
      <span className="text-xs text-muted">{Math.round(percentage)}%</span>
      {onDelete && (
        <button
          onClick={onDelete}
          className="flex items-center justify-center w-5 h-5 text-muted hover:text-red-500 transition-colors"
          title="Delete workflow"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

function AddTaskRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [taskText, setTaskText] = useState('');

  const handleSave = () => {
    if (taskText.trim()) {
      onAdd(taskText.trim());
      setTaskText('');
    }
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setTaskText('');
    }
  };

  if (isAdding) {
    return (
      <div className="flex items-center gap-2 p-1">
        <div className="w-4 h-4"></div>
        <input type="checkbox" disabled className="flex-shrink-0 opacity-50" />
        <input
          type="text"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="Add task..."
          className="flex-1 bg-transparent text-sm outline-none"
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="flex items-center gap-2 p-1 text-sm text-muted hover:text-fg hover:bg-surface-2 rounded transition-colors w-full"
    >
      <div className="w-4 h-4"></div>
      <span className="text-muted">+</span>
      <span>Add task...</span>
    </button>
  );
}

export default function WorkflowGroup({
  workflow,
  tasks,
  workspaceId,
  onToggleTask,
  onAddTask,
  onRenameTask,
  onRenameWorkflow,
  onReorderTasks,
  onDeleteTask,
  onDeleteWorkflow,
  onUpdateTask,
}: WorkflowGroupProps) {
  // Fetch workspace members for task assignment
  const membersQuery = useQuery({
    queryKey: ['ws-members', workspaceId],
    queryFn: () => listWorkspaceMembers(workspaceId!),
    enabled: !!workspaceId,
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const wf = workflow || { id: '', title: 'Workflow' };
  const safeTasks = tasks || [];
  const completedCount = safeTasks.filter((task: any) => task.done).length;
  const totalCount = safeTasks.length;
  const pct = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  const handleDragEnd = (event: DragEndEvent, workflowId: string) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = safeTasks.findIndex((task: any) => task.id === active.id);
      const newIndex = safeTasks.findIndex((task: any) => task.id === over?.id);
      
      const reorderedTasks = arrayMove(safeTasks, oldIndex, newIndex);
      const taskIds = reorderedTasks.map((task: any) => task.id);
      
      if (onReorderTasks) {
        onReorderTasks(workflowId, taskIds);
      }
    }
  };

  return (
    <div className="border border-app/20 rounded-lg bg-surface overflow-hidden">
      <WorkflowHeader 
        title={wf.title || 'Workflow'} 
        percentage={pct}
        onRename={onRenameWorkflow ? (newTitle: string) => onRenameWorkflow(wf.id, newTitle) : undefined}
        onDelete={onDeleteWorkflow ? () => onDeleteWorkflow(wf.id) : undefined}
      />
      <div className="h-1 bg-app/30" style={{ width: '100%' }}>
        <div className="h-1 bg-accent" style={{ width: `${pct}%` }} />
      </div>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => handleDragEnd(event, wf.id)}
      >
        <div className="p-2 space-y-1 text-sm">
          <SortableContext items={safeTasks.filter((task: any) => task.id && task.id.trim() !== '').map((task: any) => task.id)} strategy={verticalListSortingStrategy}>
            {safeTasks.filter((task: any) => task.id && task.id.trim() !== '').map((task: any) => (
              <SortableTask
                key={task.id}
                task={task}
                workspaceId={workspaceId}
                workspaceMembers={membersQuery.data}
                onToggle={(checked: boolean) => onToggleTask(task.id, checked)}
                onDelete={onDeleteTask}
                onUpdate={onUpdateTask ? (updates: Partial<Task>) => onUpdateTask(task.id, updates) : undefined}
              />
            ))}
          </SortableContext>
          
          {onAddTask && (
            <AddTaskRow onAdd={(text: string) => onAddTask(wf.id, text)} />
          )}
        </div>
      </DndContext>
    </div>
  );
}

// Legacy export for backward compatibility
export { WorkflowGroup as ChecklistGroup };