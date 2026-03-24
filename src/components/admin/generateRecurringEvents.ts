/**
 * Utility functions for generating recurring event instances
 * from Supabase event records.
 */

interface SupabaseEvent {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
  is_highlighted: boolean;
  recurrence: 'one-time' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  end_date: string | null;
}

export interface RecurringEventInstance {
  id: string;
  name: string;
  instance_date: Date;
  location: string | null;
  description: string | null;
  image_url: string | null;
  is_highlighted: boolean;
  recurrence: 'one-time' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  end_date: string | null;
}

/**
 * Takes an array of events from Supabase and expands recurring events
 * into individual instances over the specified number of weeks.
 */
export function generateRecurringEvents(
  events: SupabaseEvent[],
  weeksAhead: number
): RecurringEventInstance[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + weeksAhead * 7);

  const instances: RecurringEventInstance[] = [];

  for (const event of events) {
    const startDate = new Date(event.event_date);
    const endDate = event.end_date ? new Date(event.end_date) : cutoff;
    const effectiveEnd = endDate < cutoff ? endDate : cutoff;

    if (event.recurrence === 'one-time') {
      instances.push({
        ...event,
        id: event.id,
        instance_date: startDate,
      });
      continue;
    }

    let current = new Date(startDate);

    while (current <= effectiveEnd) {
      if (current >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) {
        instances.push({
          ...event,
          id: `${event.id}_${current.toISOString()}`,
          instance_date: new Date(current),
        });
      }

      switch (event.recurrence) {
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarterly':
          current.setMonth(current.getMonth() + 3);
          break;
        case 'yearly':
          current.setFullYear(current.getFullYear() + 1);
          break;
        default:
          current = new Date(effectiveEnd.getTime() + 1);
      }
    }
  }

  instances.sort((a, b) => a.instance_date.getTime() - b.instance_date.getTime());
  return instances;
}

/**
 * Returns the next upcoming event instance from a list.
 */
export function getNextEvent(
  events: SupabaseEvent[]
): RecurringEventInstance | null {
  const instances = generateRecurringEvents(events, 12);
  const now = new Date();
  return instances.find((e) => e.instance_date > now) || null;
}

/**
 * Formats an event date for display (e.g. "Mar 24, 2026").
 */
export function formatEventDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats an event time for display (e.g. "10:00 AM").
 */
export function formatEventTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
