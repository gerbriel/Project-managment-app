# Task Reminder & Notification System

## Overview
The task management system now includes a comprehensive reminder and notification system for workflow tasks. Members can be assigned tasks with due dates and will receive reminders at predefined intervals.

## Features

### ✅ Preset Reminder Intervals
Instead of manual datetime selection, users can choose from optimized reminder intervals:

- **1 month before** - For long-term planning
- **1 week before** - For advance preparation  
- **3 days before** - For immediate preparation
- **1 day before** - Final day reminder
- **8 hours before** - Same-day reminder
- **4 hours before** - Urgent reminder
- **1 hour before** - Last-chance reminder
- **15 minutes before** - Critical final warning

### ✅ Smart Reminder Logic
- Reminders are automatically calculated based on the due date
- No reminder can be set without a due date
- Visual indicators show reminder status in compact format (1mo, 1w, 3d, etc.)
- Tooltips provide full reminder descriptions

### ✅ Assignment Notifications
- Members receive notifications when assigned to new tasks
- Notifications include task details, card context, and due date information

### ✅ Visual Indicators
- 🔔 Bell icon shows tasks with reminders
- Compact badges show reminder intervals
- Color-coded status for different reminder types
- Overdue tasks highlighted in red

## Implementation

### Core Components

#### `WorkflowGroup.tsx`
- Enhanced task interface with expandable options
- Reminder dropdown with preset intervals
- Visual reminder indicators
- Assignment management

#### `notifications.ts` 
- Core notification processing logic
- Task assignment notifications
- Reminder calculation and processing
- Overdue task detection

#### `reminderService.ts`
- Background service for processing reminders
- Periodic checking for due reminders
- Scalable architecture for production use

## Database Schema Requirements

The system requires additional columns in the `checklist_items` table:

```sql
ALTER TABLE checklist_items 
ADD COLUMN due_date timestamptz,
ADD COLUMN assigned_to uuid,
ADD COLUMN reminder_date timestamptz,
ADD COLUMN created_at timestamptz DEFAULT now(),
ADD COLUMN updated_at timestamptz DEFAULT now();
```

## Usage

### Setting Task Reminders

1. **Set Due Date**: First, assign a due date to the task
2. **Choose Reminder**: Select from preset intervals in the dropdown
3. **Visual Confirmation**: See the reminder badge appear on the task

### Task Assignment

1. **Expand Task**: Click the + button to open task options
2. **Select Assignee**: Choose from workspace members dropdown
3. **Automatic Notification**: Assigned member receives notification

### Notification Processing

The reminder system works through:

1. **Calculation**: Reminder dates automatically calculated from due dates
2. **Background Processing**: Service checks for due reminders periodically
3. **Notification Delivery**: Sends notifications to assigned members
4. **Cleanup**: Prevents duplicate reminders

## Production Deployment

### Background Service
For production use, implement the reminder service as:
- **Cron Job**: Run `runReminderService()` every 15 minutes
- **Serverless Function**: AWS Lambda, Vercel Functions, etc.
- **Queue Worker**: Redis/Bull queue for scalable processing

### Notification Channels
The system supports multiple notification methods:
- **Email**: SendGrid, AWS SES, Postmark
- **Push Notifications**: Firebase, OneSignal
- **In-App**: Real-time notifications via WebSocket
- **Integrations**: Slack, Microsoft Teams, Discord

### Example Production Setup

```typescript
// Cron job (every 15 minutes)
// 0,15,30,45 * * * * /usr/local/bin/node reminder-service.js

import { runReminderService } from './src/services/reminderService';

setInterval(async () => {
  await runReminderService();
}, 15 * 60 * 1000); // 15 minutes
```

## Testing

Use the included test script to verify reminder system status:

```bash
node scripts/test-reminders.cjs
```

This will show:
- Current reminder intervals available
- Any existing tasks with reminders
- Database schema status
- System readiness

## Benefits

### For Users
- **Intuitive Interface**: Simple preset intervals instead of complex datetime pickers
- **Visual Clarity**: Clear indicators for task status and reminders
- **Proactive Notifications**: Never miss important deadlines
- **Flexible Timing**: Multiple reminder options for different task types

### For Teams
- **Improved Accountability**: Clear assignment and due date tracking
- **Reduced Missed Deadlines**: Automated reminder system
- **Better Communication**: Automatic notifications for task assignments
- **Enhanced Productivity**: Less manual reminder management

### For Administrators
- **Scalable Architecture**: Ready for production deployment
- **Monitoring Capable**: Built-in logging and error handling
- **Configurable**: Easy to adjust intervals and notification methods
- **Maintainable**: Clean separation of concerns and modular design

## Future Enhancements

- **Custom Intervals**: User-defined reminder times
- **Recurring Tasks**: Automatic task recreation
- **Escalation**: Notify managers for overdue tasks  
- **Analytics**: Task completion and reminder effectiveness metrics
- **Mobile App**: Push notifications to mobile devices
- **Integration APIs**: Connect with external calendar and task systems