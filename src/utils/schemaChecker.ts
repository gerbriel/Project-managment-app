/**
 * Database Schema Checker
 * Helps identify what task enhancement features are available
 */

import { getSupabase } from '../app/supabaseClient';

export type SchemaStatus = {
  hasTaskEnhancements: boolean;
  hasWorkspaceMembers: boolean;
  hasActivityTable: boolean;
  missingFeatures: string[];
  availableFeatures: string[];
};

/**
 * Check database schema status for task enhancements
 */
export async function checkSchemaStatus(): Promise<SchemaStatus> {
  const supabase = getSupabase();
  const status: SchemaStatus = {
    hasTaskEnhancements: false,
    hasWorkspaceMembers: false,
    hasActivityTable: false,
    missingFeatures: [],
    availableFeatures: []
  };

  try {
    // Check for task enhancement columns
    const { error: taskError } = await supabase
      .from('checklist_items')
      .select('due_date, assigned_to, reminder_date')
      .limit(1);
    
    if (!taskError) {
      status.hasTaskEnhancements = true;
      status.availableFeatures.push('Due dates', 'Task assignments', 'Reminders');
    } else {
      status.missingFeatures.push('Due dates', 'Task assignments', 'Reminders');
    }
  } catch (error) {
    status.missingFeatures.push('Due dates', 'Task assignments', 'Reminders');
  }

  try {
    // Check for workspace members RPC
    const { error: membersError } = await supabase.rpc('list_workspace_members', { p_ws_id: 'test' });
    
    if (!membersError || membersError.code !== '42883') { // 42883 = function does not exist
      status.hasWorkspaceMembers = true;
      status.availableFeatures.push('Member assignments');
    } else {
      status.missingFeatures.push('Member assignments');
    }
  } catch (error) {
    status.missingFeatures.push('Member assignments');
  }

  try {
    // Check for activity table
    const { error: activityError } = await supabase
      .from('activity')
      .select('id')
      .limit(1);
    
    if (!activityError) {
      status.hasActivityTable = true;
      status.availableFeatures.push('Activity tracking');
    } else {
      status.missingFeatures.push('Activity tracking');
    }
  } catch (error) {
    status.missingFeatures.push('Activity tracking');
  }

  return status;
}

/**
 * Display schema status in console for debugging
 */
export async function logSchemaStatus(): Promise<void> {
  // Disabled for production - schema checking is still available programmatically
  try {
    const status = await checkSchemaStatus();
    // Schema status available via checkSchemaStatus() function
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}