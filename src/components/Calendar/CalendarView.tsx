import React, { useMemo } from 'react';
import { CalendarViewMode, CalendarCard } from '../../types/calendar';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, format, isSameDay, isWithinInterval, parseISO
} from 'date-fns';

interface CalendarViewProps {
  mode: CalendarViewMode;
  cards: CalendarCard[];
  selectedDate: Date;
  onDateClick?: (date: Date) => void;
  onCardClick?: (card: CalendarCard) => void;
}

export default function CalendarView({ 
  mode, 
  cards, 
  selectedDate, 
  onDateClick, 
  onCardClick 
}: CalendarViewProps) {
  const { dateRange, gridCols, cellHeight } = useMemo(() => {
    const today = selectedDate || new Date();
    
    switch (mode) {
      case 'day':
        return {
          dateRange: [today],
          gridCols: 'grid-cols-1',
          cellHeight: 'min-h-[600px]'
        };
      case 'week':
        return {
          dateRange: eachDayOfInterval({
            start: startOfWeek(today),
            end: endOfWeek(today)
          }),
          gridCols: 'grid-cols-7',
          cellHeight: 'min-h-[200px]'
        };
      case 'month':
        return {
          dateRange: eachDayOfInterval({
            start: startOfWeek(startOfMonth(today)),
            end: endOfWeek(endOfMonth(today))
          }),
          gridCols: 'grid-cols-7',
          cellHeight: 'min-h-[120px]'
        };
      case 'year':
        return {
          dateRange: eachDayOfInterval({
            start: startOfYear(today),
            end: endOfYear(today)
          }),
          gridCols: 'grid-cols-[repeat(auto-fit,minmax(20px,1fr))]',
          cellHeight: 'min-h-[20px]'
        };
      default:
        // Full calendar view - show current month with context
        return {
          dateRange: eachDayOfInterval({
            start: startOfWeek(startOfMonth(today)),
            end: endOfWeek(endOfMonth(today))
          }),
          gridCols: 'grid-cols-7',
          cellHeight: 'min-h-[100px]'
        };
    }
  }, [mode, selectedDate]);

  const getCardsForDate = (date: Date) => {
    return cards.filter(card => {
      if (!card.date_start) return false;
      
      const cardStart = parseISO(card.date_start);
      const cardEnd = card.date_end ? parseISO(card.date_end) : cardStart;
      
      return isWithinInterval(date, { start: cardStart, end: cardEnd });
    });
  };

  const formatDateHeader = (date: Date) => {
    switch (mode) {
      case 'day':
        return format(date, 'EEEE, MMMM d, yyyy');
      case 'week':
        return format(date, 'EEE d');
      case 'month':
        return format(date, 'd');
      case 'year':
        return format(date, 'MMM d');
      default:
        return format(date, 'd');
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className={`grid ${gridCols} gap-1 p-4`}>
        {dateRange.map((date, index) => {
          const dayCards = getCardsForDate(date);
          const isToday = isSameDay(date, new Date());
          
          return (
            <div
              key={index}
              className={`
                ${cellHeight} border border-gray-200 dark:border-gray-700 
                rounded-lg p-2 cursor-pointer transition-colors
                hover:bg-gray-50 dark:hover:bg-gray-800
                ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''}
              `}
              onClick={() => onDateClick?.(date)}
            >
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {formatDateHeader(date)}
              </div>
              
              <div className="space-y-1">
                {dayCards.slice(0, mode === 'year' ? 1 : 10).map((card, cardIndex) => (
                  <div
                    key={card.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(card);
                    }}
                    className={`
                      text-xs p-1 rounded cursor-pointer truncate
                      bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200
                      hover:bg-blue-200 dark:hover:bg-blue-700
                      ${mode === 'year' ? 'h-2 w-2 rounded-full' : ''}
                    `}
                    title={card.title}
                  >
                    {mode !== 'year' && card.title}
                  </div>
                ))}
                {dayCards.length > 10 && mode !== 'year' && (
                  <div className="text-xs text-gray-500">
                    +{dayCards.length - 10} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
