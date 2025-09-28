import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';

export type NotificationType = 'task_reminder' | 'task_assigned' | 'task_due_soon' | 'task_overdue';

export type TaskNotification = {
  id?: ID;
  user_id: ID;
  task_id: ID;
  card_id: ID;
  type: NotificationType;
  title: string;
  message: string;
  due_date?: string;
  reminder_date?: string;
  read: boolean;
  created_at?: string;
};

/**
 * Check for tasks that need reminders and create notifications
 */
export async function processTaskReminders(): Promise<void> {
  const supabase = getSupabase();
  const now = new Date();
  
  try {
    // Find tasks with reminders that should trigger now
    // Note: This assumes the enhanced database schema is in place
    const { data: tasks, error } = await supabase
      .from('checklist_items')
      .select(`
        id,
        text,
        assigned_to,
        due_date,
        reminder_date,
        checklist_id,
        checklists!inner(
          card_id,
          title,
          cards!inner(
            title,
            workspace_id
          )
        )
      `)
      .not('assigned_to', 'is', null)
      .not('reminder_date', 'is', null)
      .lte('reminder_date', now.toISOString())
      .eq('done', false);

    if (error) {
      console.log('Reminder check failed (expected if schema not updated):', error);
      return;
    }

    if (!tasks || tasks.length === 0) {
      return;
    }

    // Create notifications for each task
    const notifications: Omit<TaskNotification, 'id'>[] = [];
    
    for (const task of tasks as any[]) {
      const cardTitle = task.checklists?.cards?.title || 'Unknown Card';
      const workflowTitle = task.checklists?.title || 'Workflow';
      
      notifications.push({
        user_id: task.assigned_to,
        task_id: task.id,
        card_id: task.checklists?.card_id,
        type: 'task_reminder',
        title: `Task Reminder: ${task.text}`,
        message: `Your task "${task.text}" in "${workflowTitle}" (${cardTitle}) is due ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'soon'}.`,
        due_date: task.due_date,
        reminder_date: task.reminder_date,
        read: false,
      });
    }

    // Insert notifications (this would need a notifications table)
    if (notifications.length > 0) {
      // For now, just log the notifications that would be sent
      console.log('Task reminders to send:', notifications);
      
      // TODO: When notifications table exists, insert them:
      // const { error: insertError } = await supabase
      //   .from('notifications')
      //   .insert(notifications);
      
      // Clear the reminder_date so we don't send duplicate reminders
      const taskIds = tasks.map(t => t.id);
      await supabase
        .from('checklist_items')
        .update({ reminder_date: null })
        .in('id', taskIds);
    }

  } catch (error) {
    console.error('Error processing task reminders:', error);
  }
}

/**
 * Send notification when a task is assigned to a member
 */
export async function notifyTaskAssignment(taskId: ID, assignedUserId: ID, taskText: string, cardTitle: string): Promise<void> {
  console.log(`Task Assignment Notification:
    - Task: "${taskText}"
    - Card: "${cardTitle}" 
    - Assigned to: ${assignedUserId}
    - Message: You have been assigned a new task in "${cardTitle}"`);
  
  // TODO: When notifications system is ready, create actual notification
  // This could integrate with email, push notifications, or in-app notifications
}

/**
 * Check for overdue tasks and send notifications
 */
export async function processOverdueTasks(): Promise<void> {
  const supabase = getSupabase();
  const now = new Date();
  
  try {
    const { data: tasks, error } = await supabase
      .from('checklist_items')
      .select(`
        id,
        text,
        assigned_to,
        due_date,
        checklist_id,
        checklists!inner(
          card_id,
          title,
          cards!inner(
            title
          )
        )
      `)
      .not('assigned_to', 'is', null)
      .not('due_date', 'is', null)
      .lt('due_date', now.toISOString())
      .eq('done', false);

    if (error) {
      console.log('Overdue check failed (expected if schema not updated):', error);
      return;
    }

    if (tasks && tasks.length > 0) {
      console.log('Overdue tasks found:', tasks.length);
      // TODO: Send overdue notifications
    }

  } catch (error) {
    console.error('Error processing overdue tasks:', error);
  }
}

/**
 * Mock email/push notification sender
 */
export async function sendNotification(notification: TaskNotification): Promise<boolean> {
  // This would integrate with your preferred notification service:
  // - Email (SendGrid, AWS SES, etc.)
  // - Push notifications (Firebase, OneSignal, etc.)  
  // - In-app notifications
  // - Slack/Teams integration
  
  console.log(`📧 Sending notification to user ${notification.user_id}:
    Title: ${notification.title}
    Message: ${notification.message}`);
  
  return true;
}