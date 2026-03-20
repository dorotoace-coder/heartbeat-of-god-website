import { NextResponse } from 'next/server';
import { getAutonomousPulse } from '@/lib/pulse';
import { supabase } from '@/lib/supabase';

export async function GET() {
  let pulse = getAutonomousPulse();

  try {
    // Attempt to fetch from Supabase if configured
    const { data, error } = await supabase
      .from('pulse')
      .select('*, sermon_of_the_day:sermons(*), active_event:events(*)')
      .eq('id', 1)
      .single();

    if (data && !error) {
       // Merge with Supabase data if available
       pulse = {
         ...pulse,
         isLive: data.is_live,
         activeEvent: data.active_event?.name || pulse.activeEvent,
         nextEventName: data.active_event?.name || pulse.nextEventName,
         nextEventDate: data.active_event?.event_date || pulse.nextEventDate,
         sermonOfTheDay: data.sermon_of_the_day ? {
           title: data.sermon_of_the_day.title,
           preacher: data.sermon_of_the_day.preacher,
           imageUrl: data.sermon_of_the_day.thumbnail_url
         } : pulse.sermonOfTheDay
       };
    }
  } catch (err) {
    console.error('Supabase pulse fetch failed, using fallback:', err);
  }
  
  return NextResponse.json(pulse, {
    headers: {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
    },
  });
}
