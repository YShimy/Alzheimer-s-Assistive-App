import { describe, it, expect } from 'vitest';

describe('Reminder action validation', () => {
  it('should accept valid "done" action', async () => {
    const { reminderActionSchema } = await import('../modules/reminders/validation/reminderActions.schemas.js');
    const result = reminderActionSchema.safeParse({
      action: 'done',
      source: 'notification',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('done');
    }
  });

  it('should accept valid "snooze" action', async () => {
    const { reminderActionSchema } = await import('../modules/reminders/validation/reminderActions.schemas.js');
    const result = reminderActionSchema.safeParse({
      action: 'snooze',
      source: 'home',
      actionValue: { snoozeDurationMinutes: 10 },
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid "skip" action', async () => {
    const { reminderActionSchema } = await import('../modules/reminders/validation/reminderActions.schemas.js');
    const result = reminderActionSchema.safeParse({
      action: 'skip',
      source: 'reminder_list',
      reasonCode: 'not_needed',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid action', async () => {
    const { reminderActionSchema } = await import('../modules/reminders/validation/reminderActions.schemas.js');
    const result = reminderActionSchema.safeParse({
      action: 'dismissed',
      source: 'home',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty action', async () => {
    const { reminderActionSchema } = await import('../modules/reminders/validation/reminderActions.schemas.js');
    const result = reminderActionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid source', async () => {
    const { reminderActionSchema } = await import('../modules/reminders/validation/reminderActions.schemas.js');
    const result = reminderActionSchema.safeParse({
      action: 'done',
      source: 'invalid_source',
    });
    expect(result.success).toBe(false);
  });

  it('should default source to "home"', async () => {
    const { reminderActionSchema } = await import('../modules/reminders/validation/reminderActions.schemas.js');
    const result = reminderActionSchema.safeParse({
      action: 'done',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('home');
    }
  });
});

describe('Reminder create validation', () => {
  it('should accept valid reminder', async () => {
    const { createReminderSchema } = await import('../modules/reminders/validation/reminders.schemas.js');
    const result = createReminderSchema.safeParse({
      title: 'Take morning medication',
      category: 'medication',
      scheduledTime: '08:00',
      startDate: '2026-03-14',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid scheduledTime format', async () => {
    const { createReminderSchema } = await import('../modules/reminders/validation/reminders.schemas.js');
    const result = createReminderSchema.safeParse({
      title: 'Test',
      scheduledTime: '8am',
      startDate: '2026-03-14',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty title', async () => {
    const { createReminderSchema } = await import('../modules/reminders/validation/reminders.schemas.js');
    const result = createReminderSchema.safeParse({
      title: '',
      scheduledTime: '08:00',
      startDate: '2026-03-14',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid category', async () => {
    const { createReminderSchema } = await import('../modules/reminders/validation/reminders.schemas.js');
    const result = createReminderSchema.safeParse({
      title: 'Test',
      category: 'invalid',
      scheduledTime: '08:00',
      startDate: '2026-03-14',
    });
    expect(result.success).toBe(false);
  });
});
