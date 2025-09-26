import React, { useState, useEffect } from 'react';
import CalendarViewToggle from '../components/Calendar/CalendarViewToggle';
import CalendarView from '../components/Calendar/CalendarView';
import { CalendarViewMode, CalendarCard } from '../types/calendar';
import { supabase } from '../lib/supabase';

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [cards, setCards] = useState<CalendarCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('id, title, date_start, date_end, list_id, board_id')
        .not('date_start', 'is', null);

      if (error) throw error;
      setCards(data || []);
    } catch (err) {
      console.error('Error loading cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (card: CalendarCard) => {
    // Navigate to card detail or open modal
    console.log('Card clicked:', card);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <CalendarViewToggle
            currentMode={viewMode}
            onModeChange={setViewMode}
          />
        </div>
      </div>

      <CalendarView
        mode={viewMode}
        cards={cards}
        selectedDate={selectedDate}
        onDateClick={setSelectedDate}
        onCardClick={handleCardClick}
      />
    </div>
  );
}
