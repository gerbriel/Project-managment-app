import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCardsWithDates, updateCardDates } from '@api/cards';
import { getBoards } from '@api/boards';
import { CardRow } from '../types/dto';
import ViewSwitcher from '../components/ViewSwitcher';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CARD_COLORS = [
  'bg-red-100 border-red-200',
  'bg-blue-100 border-blue-200',
  'bg-green-100 border-green-200',
  'bg-yellow-100 border-yellow-200',
  'bg-purple-100 border-purple-200',
  'bg-pink-100 border-pink-200',
  'bg-indigo-100 border-indigo-200',
];

type CalendarCard = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  boardName: string;
  boardId: string;
};

type MonthData = {
  monthStart: Date;
  weeks: Date[][];
};

type CalendarView = 'day' | 'week' | 'month' | 'year' | null;

export default function CalendarView() {
  const { boardId, workspaceId } = useParams();
  const isGlobalView = Boolean(workspaceId && !boardId);
  const queryClient = useQueryClient();
  
  const [visibleBoards, setVisibleBoards] = React.useState<Set<string>>(new Set());
  const [draggedCard, setDraggedCard] = React.useState<CalendarCard | null>(null);
    const [currentView, setCurrentView] = useState<CalendarView>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch boards for global view
  const boardsQuery = useQuery({
    queryKey: ['boards'],
    queryFn: () => getBoards(workspaceId || '2a8f10d6-4368-43db-ab1d-ab783ec6e935'),
    enabled: isGlobalView,
  });

  // Fetch cards with dates
  const cardsQuery = useQuery({
    queryKey: ['cardsWithDates', isGlobalView ? workspaceId : boardId],
    queryFn: () => {
      if (isGlobalView && workspaceId) {
        return getCardsWithDates(workspaceId);
      }
      // For single board, we'll need to implement getCardsByBoard with dates
      return getCardsWithDates(workspaceId || '2a8f10d6-4368-43db-ab1d-ab783ec6e935');
    },
    select: (data: CardRow[]) => {
      console.log('🔍 Calendar Debug - Raw data:', data?.length || 0, 'cards');
      console.log('🔍 Calendar Debug - isGlobalView:', isGlobalView, 'boardId:', boardId);
      
      const filtered = data
        .filter(card => {
          const include = !isGlobalView && boardId ? card.board_id === boardId : true;
          console.log(`🔍 Board filter - Card ${card.id} (board: ${card.board_id}):`, include);
          return include;
        })
        .filter(card => {
          const hasdates = card.date_start && card.date_end;
          console.log(`🔍 Date filter - Card ${card.id}:`, hasdates);
          return hasdates;
        })
        .map(card => ({
          id: card.id,
          title: card.title,
          startDate: new Date(card.date_start!),
          endDate: new Date(card.date_end!),
          boardName: (card as any).boards?.name || 'Unknown Board',
          boardId: card.board_id,
        }));
        
      console.log('🔍 Calendar Debug - Final result:', filtered.length, 'cards');
      return filtered;
    }
  });

  const currentBoard = boardsQuery.data?.find(board => board.id === boardId);
  const calendarCards = cardsQuery.data || [];

  // Initialize visible boards - use a stable dependency
  const boardNamesKey = React.useMemo(() => {
    return calendarCards.map(card => card.boardName).sort().join(',');
  }, [calendarCards]);

  React.useEffect(() => {
    if (calendarCards.length > 0) {
      const boardNames = calendarCards.map(card => card.boardName);
      const uniqueBoardNames = [...new Set(boardNames)];
      
      // Only update if the board names actually changed
      setVisibleBoards(prev => {
        const prevArray = Array.from(prev).sort();
        const newArray = uniqueBoardNames.sort();
        
        if (prevArray.length !== newArray.length || 
            !prevArray.every((name, index) => name === newArray[index])) {
          return new Set(uniqueBoardNames);
        }
        return prev;
      });
    }
  }, [boardNamesKey, calendarCards.length]);

  // Generate scrollable calendar based on current view and currentDate
  const scrollableCalendar = React.useMemo(() => {
    const months: MonthData[] = [];
    
    switch (currentView) {
      case 'day': {
        // Show just 1 day
        const dayDate = new Date(currentDate);
        const weeks: Date[][] = [[dayDate]];
        months.push({ 
          monthStart: new Date(dayDate.getFullYear(), dayDate.getMonth(), 1), 
          weeks 
        });
        break;
      }
      case 'week': {
        // Show just 1 week (7 days) - start from Monday of current week
        const dayOfWeek = currentDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so -6 to get to Monday
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() + mondayOffset);
        
        const weekDays: Date[] = [];
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + i);
          weekDays.push(day);
        }
        
        months.push({ 
          monthStart: new Date(weekStart.getFullYear(), weekStart.getMonth(), 1), 
          weeks: [weekDays] 
        });
        break;
      }
      case 'month': {
        // Show just 1 month
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        const weeks: Date[][] = [];
        let currentWeek: Date[] = [];
        
        // Start from the Sunday of the week containing the first day
        const firstSunday = new Date(monthStart);
        firstSunday.setDate(monthStart.getDate() - monthStart.getDay());
        
        let currentDay = new Date(firstSunday);
        
        while (currentDay <= monthEnd || currentWeek.length > 0) {
          if (currentWeek.length === 7) {
            weeks.push([...currentWeek]);
            currentWeek = [];
          }
          
          currentWeek.push(new Date(currentDay));
          currentDay.setDate(currentDay.getDate() + 1);
          
          // Stop if we've filled the month and completed the week
          if (currentDay > monthEnd && currentWeek.length === 7) {
            weeks.push([...currentWeek]);
            break;
          }
        }
        
        months.push({ monthStart, weeks });
        break;
      }
      case 'year':
      default: {
        // Show all 365 days of the current year
        for (let month = 0; month < 12; month++) {
          const monthStart = new Date(currentDate.getFullYear(), month, 1);
          const monthEnd = new Date(currentDate.getFullYear(), month + 1, 0);
          
          const weeks: Date[][] = [];
          let currentWeek: Date[] = [];
          
          // Start from the Sunday of the week containing the first day
          const firstSunday = new Date(monthStart);
          firstSunday.setDate(monthStart.getDate() - monthStart.getDay());
          
          let currentDay = new Date(firstSunday);
          
          while (currentDay <= monthEnd || currentWeek.length > 0) {
            if (currentWeek.length === 7) {
              weeks.push([...currentWeek]);
              currentWeek = [];
            }
            
            currentWeek.push(new Date(currentDay));
            currentDay.setDate(currentDay.getDate() + 1);
            
            // Stop if we've filled the month and completed the week
            if (currentDay > monthEnd && currentWeek.length === 7) {
              weeks.push([...currentWeek]);
              break;
            }
          }
          
          months.push({ monthStart, weeks });
        }
        break;
      }
    }
    
    return months;
  }, [currentView, currentDate]);

  // Navigation functions for cycling through time periods
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (currentView) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (currentView) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    // Use setTimeout to ensure the DOM updates before scrolling
    setTimeout(() => {
      const todayElement = document.getElementById('today-marker');
      if (todayElement) {
        todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Format current period display
  const getCurrentPeriodDisplay = () => {
    switch (currentView) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'week': {
        const dayOfWeek = currentDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() + mondayOffset);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'month':
        return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      case 'year':
        return currentDate.getFullYear().toString();
      default:
        return '';
    }
  };

  const getSpanningCardsForWeek = (weekDays: Date[]) => {
    return calendarCards.filter(card => {
      if (!visibleBoards.has(card.boardName)) return false;
      
      const weekStart = weekDays[0];
      const weekEnd = weekDays[6];
      
      return card.startDate <= weekEnd && card.endDate >= weekStart;
    });
  };

  const toggleBoardVisibility = (boardName: string) => {
    setVisibleBoards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(boardName)) {
        newSet.delete(boardName);
      } else {
        newSet.add(boardName);
      }
      return newSet;
    });
  };

  const handleDragStart = (card: CalendarCard) => {
    setDraggedCard(card);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedCard) return;

    try {
      const daysDiff = Math.ceil((targetDate.getTime() - draggedCard.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const newEndDate = new Date(draggedCard.endDate);
      newEndDate.setDate(newEndDate.getDate() + daysDiff);

      await updateCardDates(draggedCard.id, targetDate.toISOString(), newEndDate.toISOString());
      queryClient.invalidateQueries({ queryKey: ['cardsWithDates'] });
    } catch (e) {
      console.error('Failed to update card dates:', e);
    }
    
    setDraggedCard(null);
  };

  if (cardsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  if (cardsQuery.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-500">Error loading calendar data</div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col overflow-hidden bg-bg text-fg ${(boardId || isGlobalView) ? 'pb-20' : ''}`}>
      {/* Header - Mobile Optimized */}
      <div className="border-b border-border p-2 md:p-4 bg-surface flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-lg md:text-2xl font-semibold">
                {isGlobalView ? 'Master Calendar' : `${currentBoard?.name || 'Board'} Calendar`}
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={navigatePrevious}
                  className="p-1 hover:bg-surface-2 rounded text-fg-muted hover:text-fg"
                  title="Previous"
                >
                  ←
                </button>
                <span className="text-sm md:text-base font-medium text-fg-muted">
                  {getCurrentPeriodDisplay()}
                </span>
                <button
                  onClick={navigateNext}
                  className="p-1 hover:bg-surface-2 rounded text-fg-muted hover:text-fg"
                  title="Next"
                >
                  →
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={goToToday}
                className="px-2 md:px-3 py-1 text-xs md:text-sm bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
              >
                <span className="hidden sm:inline">Go to Today</span>
                <span className="sm:hidden">Today</span>
              </button>
              
              {/* View Selector Buttons */}
              <div className="flex items-center gap-1 ml-2 md:ml-4">
                {(['day', 'week', 'month', 'year'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setCurrentView(currentView === view ? null : view)}
                    className={`px-2 py-1 text-xs md:text-sm rounded capitalize transition-colors ${
                      currentView === view
                        ? 'bg-accent text-white'
                        : 'bg-surface-2 hover:bg-surface-3 text-fg-muted hover:text-fg'
                    }`}
                    title={`${currentView === view ? 'Return to default view' : `Switch to ${view} view`}`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {isGlobalView && (
            <div className="text-xs md:text-sm text-fg-muted">
              Showing cards from {Array.from(new Set(calendarCards.map(c => c.boardName))).length} boards
            </div>
          )}
        </div>
      </div>

      {/* Days of week header - Mobile Optimized */}
      {currentView !== 'day' && (
        <div className="grid grid-cols-7 border-b border-border bg-surface flex-shrink-0">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="p-1 md:p-2 text-center text-xs md:text-sm font-medium text-fg-muted border-r border-border last:border-r-0">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 1)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable calendar - Mobile Optimized */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {scrollableCalendar.map((month) => {
          const today = new Date();
          
          return (
            <div key={`${month.monthStart.getFullYear()}-${month.monthStart.getMonth()}`} className="border-b-2 border-border">
              {/* Month header - show for month, year, and default views */}
              {(currentView === 'month' || currentView === 'year' || currentView === null) && (
                <div className="bg-surface-2 p-2 md:p-3 sticky top-0 z-10 border-b border-border">
                  <h2 className="text-base md:text-lg font-semibold">
                    {MONTHS[month.monthStart.getMonth()]} {month.monthStart.getFullYear()}
                  </h2>
                </div>
              )}
              
              {month.weeks.map((weekDays, weekIndex) => {
                const spanningCards = getSpanningCardsForWeek(weekDays);
                const hasToday = weekDays.some(day => day.toDateString() === today.toDateString());
                
                return (
                  <div 
                    key={weekIndex} 
                    className="relative"
                    id={hasToday ? 'today-marker' : undefined}
                  >
                    {/* Week days */}
                    <div className={`${
                      currentView === 'day' ? 'grid grid-cols-1' : 'grid grid-cols-7'
                    } ${
                      currentView === 'day' ? 'min-h-[200px] md:min-h-[300px]' :
                      currentView === 'week' ? 'min-h-[150px] md:min-h-[200px]' :
                      currentView === 'year' ? 'min-h-[60px] md:min-h-[80px]' :
                      'min-h-[100px] md:min-h-[140px]' // default month view
                    }`}>
                      {weekDays.map((day) => {
                        const isCurrentMonth = day.getMonth() === month.monthStart.getMonth();
                        const isToday = day.toDateString() === today.toDateString();
                        
                        return (
                          <div
                            key={day.toISOString()}
                            className={`border-r border-b border-border last:border-r-0 ${
                              currentView === 'day' ? 'p-2 md:p-4' :
                              currentView === 'week' ? 'p-1 md:p-3' :
                              currentView === 'year' ? 'p-0.5 md:p-1' :
                              'p-1 md:p-2' // default month view
                            } ${!isCurrentMonth ? 'bg-bg-inset/30 text-fg-muted' : 'bg-bg'} ${isToday ? 'bg-accent/5 font-bold' : ''}`}
                            onDrop={(e) => handleDrop(e, day)}
                            onDragOver={handleDragOver}
                          >
                            <div className={`mb-1 ${
                              currentView === 'day' ? 'text-base md:text-lg' :
                              currentView === 'week' ? 'text-sm md:text-base' :
                              currentView === 'year' ? 'text-[10px] md:text-xs' :
                              'text-xs md:text-sm' // default month view
                            }`}>
                              {currentView === 'day' 
                                ? `${DAYS_OF_WEEK[day.getDay()]} ${day.getDate()}` 
                                : day.getDate()
                              }
                            </div>
                            
                            {/* Cards for this day */}
                            {spanningCards
                              .filter(card => day >= card.startDate && day <= card.endDate)
                              .slice(0, currentView === 'year' ? 1 : currentView === 'week' ? 3 : undefined) // Limit cards shown based on view
                              .map((card, idx) => (
                                <div
                                  key={`${card.id}-${day.toISOString()}`}
                                  className={`mb-1 rounded border ${CARD_COLORS[idx % CARD_COLORS.length]} cursor-move ${
                                    currentView === 'day' ? 'text-sm md:text-base p-2' :
                                    currentView === 'week' ? 'text-xs md:text-sm p-1' :
                                    currentView === 'year' ? 'text-[8px] md:text-[10px] p-0.5' :
                                    'text-[10px] md:text-xs p-1' // default month view
                                  }`}
                                  draggable
                                  onDragStart={() => handleDragStart(card)}
                                  title={`${card.title} (${card.boardName})`}
                                >
                                  <div className="truncate">
                                    {currentView === 'year' ? '•' : card.title}
                                  </div>
                                </div>
                              ))
                            }
                            {/* Show overflow indicator for year view */}
                            {currentView === 'year' && spanningCards.filter(card => day >= card.startDate && day <= card.endDate).length > 1 && (
                              <div className="text-[8px] text-fg-muted">
                                +{spanningCards.filter(card => day >= card.startDate && day <= card.endDate).length - 1}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Board Legend - Mobile Optimized */}
      {isGlobalView && boardsQuery.data && (
        <div className="border-t border-border p-2 md:p-4 bg-surface flex-shrink-0">
          <div className="text-xs md:text-sm font-medium mb-2">Boards</div>
          <div className="flex flex-wrap gap-2">
            {boardsQuery.data
              .filter(board => calendarCards.some(card => card.boardId === board.id))
              .map((board, index) => {
                const cardCount = calendarCards.filter(card => card.boardId === board.id).length;
                return (
                  <div key={board.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleBoards.has(board.name)}
                      onChange={() => toggleBoardVisibility(board.name)}
                      className="w-3 h-3 text-accent bg-bg border-border rounded focus:ring-accent focus:ring-1"
                    />
                    <span className="text-xs md:text-sm">{board.name} ({cardCount})</span>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}

      {/* ViewSwitcher for both individual board views and master calendar */}
      {boardId && <ViewSwitcher boardId={boardId} />}
      {isGlobalView && boardsQuery.data && boardsQuery.data.length > 0 && (
        <ViewSwitcher boardId={boardsQuery.data[0].id} />
      )}
    </div>
  );
}
