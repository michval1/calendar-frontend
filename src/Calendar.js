import React, { useState, useEffect } from 'react';
import './Calendar.css';
import EventForm from './EventForm';
import {
  createEvent,
  getAllUserEvents,
  updateEvent,
  deleteEvent,
  getAllEventsInRange,
  shareEvent,
  removeSharedUser,
  getPriorityColor
} from './EventService';

const Calendar = ({ userId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');
  const [events, setEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventMenu, setShowEventMenu] = useState(false);
  const [selectedEventForMenu, setSelectedEventForMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showUserIdWarning, setShowUserIdWarning] = useState(false);

  // Store the numeric userId
  const [numericUserId, setNumericUserId] = useState(null);

  const [viewOnly, setViewOnly] = useState(false);

  // Convert userId to numeric when it changes
  useEffect(() => {
    if (userId) {
      setNumericUserId(parseInt(userId, 10));
      setShowUserIdWarning(false);
    } else {
      setShowUserIdWarning(true);
    }
  }, [userId]);

  // Log userId for debugging
  useEffect(() => {
    console.log('User ID from props:', userId);
    console.log('Numeric User ID:', numericUserId);

    // For debugging - check localStorage directly
    console.log('localStorage userId:', localStorage.getItem('userId'));

    // Force a refresh of userId from localStorage
    if (!userId) {
      const localStorageUserId = localStorage.getItem('userId');
      if (localStorageUserId) {
        console.log('Found userId in localStorage:', localStorageUserId);
        setNumericUserId(parseInt(localStorageUserId, 10));
        setShowUserIdWarning(false);
      }
    }
  }, [userId]);

  // Filter states
  const [showOwnEvents, setShowOwnEvents] = useState(true);
  const [showSharedEvents, setShowSharedEvents] = useState(true);
  const [showHighPriority, setShowHighPriority] = useState(true);
  const [showMediumPriority, setShowMediumPriority] = useState(true);
  const [showLowPriority, setShowLowPriority] = useState(true);

  // Fetch events when calendar view or date changes
  useEffect(() => {
    if (userId || numericUserId) {
      fetchEvents();
    }
  }, [userId, numericUserId, currentDate, currentView]);

  const fetchEvents = async () => {
    try {
      const idToUse = userId || numericUserId;
      if (!idToUse) {
        console.error('Cannot fetch events - no userId available');
        return;
      }

      // Get range of dates to fetch based on current view
      let startDate, endDate;

      if (currentView === 'day') {
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
      }
      else if (currentView === 'week') {
        // Get start of week (Monday)
        startDate = new Date(currentDate);
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);

        // End of week (Sunday)
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      }
      else if (currentView === 'month') {
        // Start of month
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);

        // End of month
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      // Add some buffer days to make sure we have events that might span into view
      startDate.setDate(startDate.getDate() - 7);
      endDate.setDate(endDate.getDate() + 7);

      // Get all events (own and shared)
      const eventsData = await getAllUserEvents(idToUse);
      // Here you would ideally use getAllEventsInRange(userId, startDate, endDate)

      // Process recurring events
      const expandedEvents = processRecurringEvents(eventsData, startDate, endDate);
      setEvents(expandedEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  // Function to process recurring events
  const processRecurringEvents = (events, startRange, endRange) => {
    let expandedEvents = [];

    events.forEach(event => {
      // Add the original event if it's within range
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      if (eventStart <= endRange && eventEnd >= startRange) {
        expandedEvents.push({ ...event });
      }

      // Process recurring events
      if (event.recurrenceType && event.recurrenceType !== 'none') {
        const recurrenceEnd = event.recurrenceEnd ? new Date(event.recurrenceEnd) : null;
        let currentDate = new Date(eventStart);

        // Set end limit for recurring event expansion
        const expansionEndDate = recurrenceEnd && recurrenceEnd < endRange
          ? recurrenceEnd
          : endRange;

        while (currentDate <= expansionEndDate) {
          // Create next occurrence based on recurrence type
          let nextDate = new Date(currentDate);

          switch (event.recurrenceType) {
            case 'daily':
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'yearly':
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
            default:
              break;
          }

          // If next date is beyond our limits, break out
          if (nextDate > expansionEndDate) break;

          // Calculate duration of event
          const duration = eventEnd.getTime() - eventStart.getTime();

          // Create a new instance of the recurring event
          const newEventStart = new Date(nextDate);
          const newEventEnd = new Date(nextDate.getTime() + duration);

          if (newEventStart <= endRange && newEventEnd >= startRange) {
            // Create a new occurrence event
            expandedEvents.push({
              ...event,
              id: `${event.id}-recurrence-${nextDate.getTime()}`,
              startTime: newEventStart.toISOString(),
              endTime: newEventEnd.toISOString(),
              isRecurrenceInstance: true,
              originalEventId: event.id
            });
          }

          // Move to next occurrence
          currentDate = nextDate;
        }
      }
    });

    return expandedEvents;
  };

  // Helper function to filter events based on ownership and priority
  const getFilteredEvents = (events) => {
    return events.filter(event => {
      const userIdToCheck = userId ? parseInt(userId, 10) : numericUserId;
      const isOwner = event.user && event.user.id === userIdToCheck;
      const isShared = !isOwner;
      const priority = event.priority || 'MEDIUM';

      if ((!showOwnEvents && isOwner) || (!showSharedEvents && isShared)) {
        return false;
      }

      if (
        (priority === 'HIGH' && !showHighPriority) ||
        (priority === 'MEDIUM' && !showMediumPriority) ||
        (priority === 'LOW' && !showLowPriority)
      ) {
        return false;
      }

      return true;
    });
  };

  // Helper functions for dates
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const getMonthName = (month) => {
    const monthNames = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
      'Júl', 'August', 'September', 'Október', 'November', 'December'];
    return monthNames[month];
  };

  const getDayName = (day) => {
    const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
    return dayNames[day];
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Event handling functions
  const handleAddEvent = () => {
    if (!userId && !numericUserId) {
      alert("Pred vytvorením udalosti sa musíte prihlásiť.");
      return;
    }

    setSelectedEvent(null);
    setSelectedDate(new Date(currentDate));
    setShowEventForm(true);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setShowEventForm(true);
    setShowEventMenu(false);
  };

  const handleDeleteEvent = async (event) => {
    try {
      // For recurring instances, just delete the original
      const eventId = event.originalEventId || event.id;

      // Only delete from database if it's not a recurrence instance
      if (!event.isRecurrenceInstance) {
        await deleteEvent(eventId);
      }

      // Refresh events
      fetchEvents();
      setShowEventMenu(false);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // Function to share an event
  const handleShareEvent = (event) => {
    setSelectedEvent(event);
    setShowEventForm(true);
    setShowEventMenu(false);
  };

  const handleFormSubmit = async (eventData) => {
    try {
      // Make sure we have a userId before proceeding
      const idToUse = userId ? parseInt(userId, 10) : numericUserId;
      if (!idToUse) {
        alert("Pred vytvorením udalosti sa musíte prihlásiť.");
        return;
      }

      if (eventData.id) {
        // Update existing event
        await updateEvent(eventData.id, eventData);
      } else {
        // Create new event - make sure userId is passed as a number
        await createEvent(eventData, idToUse);
      }

      // Refresh events and close form
      fetchEvents();
      setShowEventForm(false);
    } catch (error) {
      console.error('Failed to save event:', error);
      alert(`Chyba pri ukladaní udalosti: ${error.message}`);
    }
  };

  const handleFormCancel = () => {
    setShowEventForm(false);
    setViewOnly(false); // Reset viewOnly state
  };

  const handleDayClick = (year, month, day) => {
    const selectedDate = new Date(year, month, day);
    setSelectedDate(selectedDate);
    setCurrentDate(selectedDate);

    if (currentView === 'month') {
      setCurrentView('day');
    } else {
      handleAddEvent();
    }
  };

  // Get event display color based on priority and ownership
  const getEventColor = (event) => {
    // Check if event has a custom color
    if (event.color) {
      return event.color;
    }

    // Default colors based on priority
    return getPriorityColor(event.priority || 'MEDIUM');
  };

  // Check if current user is the owner of the event
  const isEventOwner = (event) => {
    const userIdToCheck = userId ? parseInt(userId, 10) : numericUserId;
    return event.user && event.user.id === userIdToCheck;
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    setSelectedEventForMenu(event);

    // Position menu near click
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    });

    setShowEventMenu(true);
  };

  // Close event menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowEventMenu(false);
    };

    if (showEventMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showEventMenu]);

  // Filter events for a specific day
  const getEventsForDay = (year, month, day) => {
    const filteredEvents = getFilteredEvents(events);

    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const dayDate = new Date(year, month, day);

      // Set time to start of day and end of day for comparison
      const dayStart = new Date(dayDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayDate);
      dayEnd.setHours(23, 59, 59, 999);

      return (
        (eventStart >= dayStart && eventStart <= dayEnd) || // Event starts today
        (eventEnd >= dayStart && eventEnd <= dayEnd) || // Event ends today
        (eventStart <= dayStart && eventEnd >= dayEnd) // Event spans across today
      );
    });
  };

  // Filter events for a specific hour
  const getEventsForHour = (date, hour) => {
    const filteredEvents = getFilteredEvents(events);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      // Start and end of the hour
      const hourStart = new Date(year, month, day, hour, 0, 0);
      const hourEnd = new Date(year, month, day, hour, 59, 59);

      return (
        // Event starts during this hour
        (eventStart >= hourStart && eventStart <= hourEnd) ||
        // Event ends during this hour
        (eventEnd >= hourStart && eventEnd <= hourEnd) ||
        // Event spans across this hour
        (eventStart <= hourStart && eventEnd >= hourEnd)
      );
    });
  };

  // Month view rendering
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Create grid
    let dayGrid = [];

    // Add weekday headers
    const weekDays = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
    const headerRow = weekDays.map((day, index) => (
      <div key={`header-${index}`} className="calendar-day-header">{day}</div>
    ));
    dayGrid.push(<div key="header-row" className="calendar-row">{headerRow}</div>);

    // Empty cells before first day of month
    let daysArray = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
      daysArray.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of month
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      // Get events for this day
      const dayEvents = getEventsForDay(year, month, day);

      daysArray.push(
        <div
          key={`day-${day}`}
          className={`calendar-day ${isToday ? 'today' : ''}`}
          onClick={() => handleDayClick(year, month, day)}
        >
          <span className="day-number">{day}</span>

          <div className="day-events">
            {dayEvents.slice(0, 3).map(event => renderEventDot(event))}
            {dayEvents.length > 3 && (
              <div className="more-events">+{dayEvents.length - 3} viac</div>
            )}
          </div>
        </div>
      );

      // New row after each week
      if ((daysArray.length) % 7 === 0 || day === daysInMonth) {
        dayGrid.push(<div key={`row-${day}`} className="calendar-row">{daysArray}</div>);
        daysArray = [];
      }
    }

    return (
      <div className="month-view">
        {dayGrid}
      </div>
    );
  };

  // Add function to handle view-only event details
  const handleViewEventDetails = (event) => {
    setSelectedEvent(event);
    setShowEventForm(true);
    setViewOnly(true); // Add this state variable
    setShowEventMenu(false);
  };

  const getEventPermissionClass = (event) => {
    if (isEventOwner(event)) return 'event-owner';

    const userId = numericUserId?.toString() || (userId ? userId.toString() : null);
    const permission = event.userPermissions?.[userId] || 'VIEW';
    return permission === 'EDIT' || permission === 'ADMIN' ? 'can-edit' : 'view-only';
  };

  // Update event rendering to include permission class
  const renderEventDot = (event) => {
    const eventColor = getEventColor(event);
    const permissionClass = getEventPermissionClass(event);
    const priorityClass = `event-priority-${event.priority || 'MEDIUM'}`;

    return (
      <div
        key={event.id}
        className={`event-dot ${permissionClass} ${priorityClass}`}
        onClick={(e) => handleEventClick(e, event)}
        title={`${event.title} (${getPermissionLabel(event)})`}
        style={{ backgroundColor: eventColor }}
      >
        {event.title}
      </div>
    );
  };

  // Helper function to get permission label
  const getPermissionLabel = (event) => {
    if (isEventOwner(event)) return 'Vlastník';

    const permission = event.userPermissions?.[numericUserId] || 'VIEW';
    switch (permission) {
      case 'EDIT': return 'Úpravy';
      case 'ADMIN': return 'Administrátor';
      default: return 'Len na čítanie';
    }
  };
  // Week view rendering
  const renderWeekView = () => {
    const currentDay = new Date(currentDate);
    const day = currentDay.getDay();

    // Get Monday of current week
    const monday = new Date(currentDate);
    monday.setDate(currentDay.getDate() - (day === 0 ? 6 : day - 1));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const year = date.getFullYear();
      const month = date.getMonth();
      const dayNum = date.getDate();

      const isToday = dayNum === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      // Get events for this day
      const dayEvents = getEventsForDay(year, month, dayNum);

      days.push(
        <div
          key={`week-day-${i}`}
          className={`week-day ${isToday ? 'today' : ''}`}
          onClick={() => handleDayClick(year, month, dayNum)}
        >
          <div className="day-header">
            <div>{getDayName(date.getDay()).substring(0, 3)}</div>
            <div className="date-number">{date.getDate()}.{date.getMonth() + 1}.</div>
          </div>
          <div className="day-content">
            {dayEvents.map(event => {
              const eventColor = getEventColor(event);
              const isOwner = isEventOwner(event);
              const ownerClass = isOwner ? 'event-owner' : 'event-shared';
              const priorityClass = `event-priority-${event.priority || 'MEDIUM'}`;

              return (
                <div
                  key={event.id}
                  className={`week-event ${ownerClass} ${priorityClass}`}
                  onClick={(e) => handleEventClick(e, event)}
                  style={{ backgroundColor: eventColor }}
                >
                  <div className="event-time">
                    {event.isAllDay ? 'Celý deň' :
                      `${new Date(event.startTime).getHours()}:${String(new Date(event.startTime).getMinutes()).padStart(2, '0')}`}
                  </div>
                  <div className="event-title">{event.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="week-view">
        {days}
      </div>
    );
  };

  // Day view rendering
  const renderDayView = () => {
    const hours = [];

    for (let hour = 0; hour < 24; hour++) {
      // Get events for this hour
      const hourEvents = getEventsForHour(currentDate, hour);

      hours.push(
        <div key={`hour-${hour}`} className="day-hour">
          <div className="hour-label">{hour}:00</div>
          <div
            className="hour-content"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setHours(hour, 0, 0, 0);
              setSelectedDate(newDate);
              handleAddEvent();
            }}
          >
            {hourEvents.map(event => {
              const eventColor = getEventColor(event);
              const isOwner = isEventOwner(event);
              const ownerClass = isOwner ? 'event-owner' : 'event-shared';
              const priorityClass = `event-priority-${event.priority || 'MEDIUM'}`;

              return (
                <div
                  key={event.id}
                  className={`day-event ${ownerClass} ${priorityClass}`}
                  onClick={(e) => handleEventClick(e, event)}
                  style={{ backgroundColor: eventColor }}
                >
                  <div className="event-title">
                    {event.isAllDay ? '(Celý deň) ' : ''}
                    {event.title}
                  </div>
                  {!event.isAllDay && (
                    <div className="event-time">
                      {new Date(event.startTime).getHours()}:
                      {String(new Date(event.startTime).getMinutes()).padStart(2, '0')} -
                      {new Date(event.endTime).getHours()}:
                      {String(new Date(event.endTime).getMinutes()).padStart(2, '0')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="day-view">
        <div className="day-header">
          <h3>{getDayName(currentDate.getDay())}, {currentDate.getDate()}. {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}</h3>
        </div>
        <div className="day-hours">
          {hours}
        </div>
      </div>
    );
  };

  // Render legend for event colors
  const renderCalendarLegend = () => {
    return (
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color legend-owned"></div>
          <span>Vlastné udalosti</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-shared"></div>
          <span>Zdieľané udalosti</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-priority-HIGH"></div>
          <span>Vysoká priorita</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-priority-MEDIUM"></div>
          <span>Stredná priorita</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-priority-LOW"></div>
          <span>Nízka priorita</span>
        </div>
      </div>
    );
  };

  // Render filter controls
  const renderFilterControls = () => {
    return (
      <div className="calendar-filters">
        <div className="filter-group">
          <input
            type="checkbox"
            id="own-events"
            className="filter-checkbox"
            checked={showOwnEvents}
            onChange={(e) => setShowOwnEvents(e.target.checked)}
          />
          <label htmlFor="own-events">Vlastné udalosti</label>
        </div>

        <div className="filter-group">
          <input
            type="checkbox"
            id="shared-events"
            className="filter-checkbox"
            checked={showSharedEvents}
            onChange={(e) => setShowSharedEvents(e.target.checked)}
          />
          <label htmlFor="shared-events">Zdieľané udalosti</label>
        </div>

        <div className="filter-group">
          <input
            type="checkbox"
            id="high-priority"
            className="filter-checkbox"
            checked={showHighPriority}
            onChange={(e) => setShowHighPriority(e.target.checked)}
          />
          <label htmlFor="high-priority">Vysoká priorita</label>
        </div>

        <div className="filter-group">
          <input
            type="checkbox"
            id="medium-priority"
            className="filter-checkbox"
            checked={showMediumPriority}
            onChange={(e) => setShowMediumPriority(e.target.checked)}
          />
          <label htmlFor="medium-priority">Stredná priorita</label>
        </div>

        <div className="filter-group">
          <input
            type="checkbox"
            id="low-priority"
            className="filter-checkbox"
            checked={showLowPriority}
            onChange={(e) => setShowLowPriority(e.target.checked)}
          />
          <label htmlFor="low-priority">Nízka priorita</label>
        </div>
      </div>
    );
  };

  // Today's date
  const today = new Date();

  return (
    <div className="calendar-container">
      {showUserIdWarning && (
        <div className="user-id-warning">
          <strong>Upozornenie:</strong> Nie je k dispozícii ID používateľa. Pre správne fungovanie kalendára sa prihláste.
          <button onClick={() => setShowUserIdWarning(false)} className="close-warning-btn">×</button>
        </div>
      )}

      <div className="calendar-header">
        <div className="view-selector">
          <button
            className={currentView === 'day' ? 'active' : ''}
            onClick={() => setCurrentView('day')}
          >
            Deň
          </button>
          <button
            className={currentView === 'week' ? 'active' : ''}
            onClick={() => setCurrentView('week')}
          >
            Týždeň
          </button>
          <button
            className={currentView === 'month' ? 'active' : ''}
            onClick={() => setCurrentView('month')}
          >
            Mesiac
          </button>
        </div>
        <div className="calendar-group">
          <div className="calendar-title">
            <h2>{getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}</h2>
          </div>
          <div className="calendar-nav">
            <div className="nav-group">
              <button onClick={goToPreviousMonth}>&lt;</button>
              <button onClick={goToToday}>Dnes</button>
              <button onClick={goToNextMonth}>&gt;</button>
            </div>
            <button onClick={handleAddEvent} className="add-event-btn">+ Udalosť</button>
          </div>
        </div>
        
      </div>

      {/* Add legend for event colors */}
      {renderCalendarLegend()}

      {/* Add filter controls */}
      {renderFilterControls()}

      <div className="calendar-body">
        {currentView === 'month' && renderMonthView()}
        {currentView === 'week' && renderWeekView()}
        {currentView === 'day' && renderDayView()}
      </div>

      {/* Event form modal */}
      {showEventForm && (
        <>
          <div className="modal-backdrop"></div>
          <EventForm
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            event={selectedEvent}
            selectedDate={selectedDate}
            currentUserId={numericUserId || (userId ? parseInt(userId, 10) : null)}
            viewOnly={viewOnly} // Add this prop
          />
        </>
      )}

      {/* Event context menu */}
      {showEventMenu && (
        <div
          className="event-menu"
          style={{
            position: 'absolute',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`
          }}
          onClick={e => e.stopPropagation()}
        >
          {(isEventOwner(selectedEventForMenu) ||
            (selectedEventForMenu.userPermissions?.[numericUserId] === 'EDIT' ||
              selectedEventForMenu.userPermissions?.[numericUserId] === 'ADMIN')) && (
              <button onClick={() => handleEditEvent(selectedEventForMenu)}>Upraviť</button>
            )}
          {isEventOwner(selectedEventForMenu) && (
            <button onClick={() => handleShareEvent(selectedEventForMenu)}>Zdieľať</button>
          )}
          {(isEventOwner(selectedEventForMenu) ||
            selectedEventForMenu.userPermissions?.[numericUserId] === 'ADMIN') && (
              <button onClick={() => handleDeleteEvent(selectedEventForMenu)}>Vymazať</button>
            )}
          {!isEventOwner(selectedEventForMenu) && (
            <button onClick={() => handleViewEventDetails(selectedEventForMenu)}>Zobraziť detaily</button>
          )}
        </div>
      )}
    </div>
  );
};

export default Calendar;