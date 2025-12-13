import React, { useState, useEffect } from 'react';
import './Calendar.css';
import EventForm from './EventForm';
import {
  createEvent,
  getAllEvents,
  updateEvent,
  deleteEvent,
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

  const [numericUserId, setNumericUserId] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    if (userId) {
      setNumericUserId(parseInt(userId, 10));
      setShowUserIdWarning(false);
    } else {
      setShowUserIdWarning(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      const storedId = localStorage.getItem('userId');
      if (storedId) {
        setNumericUserId(parseInt(storedId, 10));
        setShowUserIdWarning(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (userId || numericUserId) {
      fetchEvents();
    }
  }, [userId, numericUserId, currentDate, currentView]);

  const fetchEvents = async () => {
    try {
      const idToUse = userId || numericUserId;
      if (!idToUse) return;

      let startDate, endDate;

      if (currentView === 'day') {
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      else if (currentView === 'week') {
        startDate = new Date(currentDate);
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      }

      else if (currentView === 'month') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      startDate.setDate(startDate.getDate() - 7);
      endDate.setDate(endDate.getDate() + 7);

      const response = await getAllEvents(idToUse, startDate, endDate);
      const eventsData = [...response.ownedEvents, ...response.sharedEvents];

      const expandedEvents = processRecurringEvents(eventsData, startDate, endDate);
      setEvents(expandedEvents);

    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const processRecurringEvents = (events, startRange, endRange) => {
    let expandedEvents = [];

    events.forEach(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      // Include original event if it lies within range
      if (eventStart <= endRange && eventEnd >= startRange) {
        expandedEvents.push({ ...event });
      }

      // Process recurring events
      if (event.recurrenceType && event.recurrenceType !== 'none') {
        const recurrenceEnd = event.recurrenceEnd ? new Date(event.recurrenceEnd) : null;
        let currentDate = new Date(eventStart);

        const expansionEndDate =
          recurrenceEnd && recurrenceEnd < endRange ? recurrenceEnd : endRange;

        while (currentDate <= expansionEndDate) {
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

          if (nextDate > expansionEndDate) break;

          const duration = eventEnd.getTime() - eventStart.getTime();
          const newEventStart = new Date(nextDate);
          const newEventEnd = new Date(nextDate.getTime() + duration);

          if (newEventStart <= endRange && newEventEnd >= startRange) {
            expandedEvents.push({
              ...event,
              id: `${event.id}-recurrence-${nextDate.getTime()}`,
              startTime: newEventStart.toISOString(),
              endTime: newEventEnd.toISOString(),
              isRecurrenceInstance: true,
              originalEventId: event.id
            });
          }

          currentDate = nextDate;
        }
      }
    });

    return expandedEvents;
  };

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

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const getMonthName = (month) => {
    const monthNames = [
      'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
      'Júl', 'August', 'September', 'Október', 'November', 'December'
    ];
    return monthNames[month];
  };

  const getDayName = (day) => {
    const dayNames = [
      'Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'
    ];
    return dayNames[day];
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

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
      const eventId = event.originalEventId || event.id;

      if (!event.isRecurrenceInstance) {
        const idToUse = userId ? parseInt(userId, 10) : numericUserId;
        await deleteEvent(eventId, idToUse);
      }

      fetchEvents();
      setShowEventMenu(false);
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  const handleShareEvent = (event) => {
    setSelectedEvent(event);
    setShowEventForm(true);
    setShowEventMenu(false);
  };

  const handleFormSubmit = async (eventData) => {
    try {
      const idToUse = userId ? parseInt(userId, 10) : numericUserId;
      if (!idToUse) {
        alert("Pred vytvorením udalosti sa musíte prihlásiť.");
        return;
      }

      if (eventData.id) {
        await updateEvent(eventData.id, eventData, idToUse);
      } else {
        await createEvent(eventData, idToUse);
      }

      fetchEvents();
      setShowEventForm(false);
    } catch (error) {
      console.error("Failed to save event:", error);
      alert(`Chyba pri ukladaní udalosti: ${error.message}`);
    }
  };

  const handleFormCancel = () => {
    setShowEventForm(false);
    setViewOnly(false);
  };

  const handleDayClick = (year, month, day) => {
    const selectedDate = new Date(year, month, day);
    setSelectedDate(selectedDate);
    setCurrentDate(selectedDate);

    if (currentView === "month") {
      setCurrentView("day");
    } else {
      handleAddEvent();
    }
  };

  const getEventColor = (event) => {
    if (event.color) return event.color;
    return getPriorityColor(event.priority || "MEDIUM");
  };

  const isEventOwner = (event) => {
    const userIdToCheck = userId ? parseInt(userId, 10) : numericUserId;
    return event.user && event.user.id === userIdToCheck;
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    setSelectedEventForMenu(event);

    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });

    setShowEventMenu(true);
  };

  useEffect(() => {
    const handleClickOutside = () => setShowEventMenu(false);
    if (showEventMenu) document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, [showEventMenu]);

  const getEventsForDay = (year, month, day) => {
    const filteredEvents = getFilteredEvents(events);
    const dayDate = new Date(year, month, day);

    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      return (
        (eventStart >= dayStart && eventStart <= dayEnd) ||
        (eventEnd >= dayStart && eventEnd <= dayEnd) ||
        (eventStart <= dayStart && eventEnd >= dayEnd)
      );
    });
  };

  // --------------------- MONTH VIEW ---------------------
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    let dayGrid = [];

    // Weekday headers — fixed UTF8 encoding
    const weekDays = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

    const headerRow = weekDays.map((day, index) => (
      <div key={`header-${index}`} className="calendar-day-header">
        {day}
      </div>
    ));
    dayGrid.push(
      <div key="header-row" className="calendar-row">
        {headerRow}
      </div>
    );

    // Empty cells before first day
    let daysArray = [];
    const emptyCells = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < emptyCells; i++) {
      daysArray.push(
        <div key={`empty-${i}`} className="calendar-day empty"></div>
      );
    }

    const today = new Date();

    // Real month days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      const dayEvents = getEventsForDay(year, month, day);

      daysArray.push(
        <div
          key={`day-${day}`}
          className={`calendar-day ${isToday ? "today" : ""}`}
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

      if (daysArray.length % 7 === 0 || day === daysInMonth) {
        dayGrid.push(
          <div key={`row-${day}`} className="calendar-row">
            {daysArray}
          </div>
        );
        daysArray = [];
      }
    }

    return <div className="month-view">{dayGrid}</div>;
  };

  // ---------- WEEK VIEW ----------
  const renderWeekView = () => {
    const currentDay = new Date(currentDate);
    const day = currentDay.getDay();

    // Compute Monday of the current week
    const monday = new Date(currentDate);
    monday.setDate(currentDay.getDate() - (day === 0 ? 6 : day - 1));

    const today = new Date();
    const now = new Date();

    const days = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const year = date.getFullYear();
      const month = date.getMonth();
      const dayNum = date.getDate();

      const isToday =
        dayNum === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      const dayEvents = getEventsForDay(year, month, dayNum);

      days.push(
        <div
          key={`week-day-${i}`}
          className={`week-day ${isToday ? "today" : ""}`}
          onClick={() => handleDayClick(year, month, dayNum)}
        >
          <div className="day-header">
            <div>{getDayName(date.getDay()).substring(0, 3)}</div>
            <div className="date-number">{date.getDate()}.{month + 1}.</div>
          </div>

          <div className="day-content">
            {[...Array(24)].map((_, hour) => {
              const isCurrentHour = isToday && hour === now.getHours();

              return (
                <div
                  key={hour}
                  className={`hour-row ${isCurrentHour ? "current-hour" : ""}`}
                >
                  <div className="hour-label">{hour}:00</div>

                  <div className="hour-cell">
                    {dayEvents
                      .filter(event => new Date(event.startTime).getHours() === hour)
                      .map(event => {
                        const eventColor = getEventColor(event);
                        const isOwner = isEventOwner(event);
                        const ownerClass = isOwner ? "event-owner" : "event-shared";
                        const priorityClass = `event-priority-${event.priority || "MEDIUM"}`;

                        return (
                          <div
                            key={event.id}
                            className={`week-event ${ownerClass} ${priorityClass}`}
                            onClick={(e) => handleEventClick(e, event)}
                            style={{ backgroundColor: eventColor }}
                          >
                            <div className="event-time">
                              {event.isAllDay
                                ? "Celý deň"
                                : `${new Date(event.startTime).getHours()}:${String(
                                    new Date(event.startTime).getMinutes()
                                  ).padStart(2, "0")}`}
                            </div>
                            <div className="event-title">{event.title}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return <div className="week-view">{days}</div>;
  };

  // ---------- DAY VIEW ----------
  const getEventsForHour = (date, hour) => {
    const filteredEvents = getFilteredEvents(events);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      const hourStart = new Date(year, month, day, hour, 0, 0);
      const hourEnd = new Date(year, month, day, hour, 59, 59);

      return (
        (eventStart >= hourStart && eventStart <= hourEnd) ||
        (eventEnd >= hourStart && eventEnd <= hourEnd) ||
        (eventStart <= hourStart && eventEnd >= hourEnd)
      );
    });
  };

  const renderDayView = () => {
    const hours = [];

    for (let hour = 0; hour < 24; hour++) {
      const hourEvents = getEventsForHour(currentDate, hour);
      const isCurrentHour = hour === new Date().getHours() &&
                            currentDate.toDateString() === new Date().toDateString();

      hours.push(
        <div
          key={`hour-${hour}`}
          className={`day-hour ${isCurrentHour ? "current-hour-day" : ""}`}
        >
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
              const ownerClass = isOwner ? "event-owner" : "event-shared";
              const priorityClass = `event-priority-${event.priority || "MEDIUM"}`;

              return (
                <div
                  key={event.id}
                  className={`day-event ${ownerClass} ${priorityClass}`}
                  onClick={(e) => handleEventClick(e, event)}
                  style={{ backgroundColor: eventColor }}
                >
                  <div className="event-title">
                    {event.isAllDay ? "(Celý deň) " : ""}
                    {event.title}
                  </div>

                  {!event.isAllDay && (
                    <div className="event-time">
                      {new Date(event.startTime).getHours()}:
                      {String(new Date(event.startTime).getMinutes()).padStart(2, "0")} –
                      {new Date(event.endTime).getHours()}:
                      {String(new Date(event.endTime).getMinutes()).padStart(2, "0")}
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
          <h3>
            {getDayName(currentDate.getDay())}, {currentDate.getDate()}.{" "}
            {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
          </h3>
        </div>

        <div className="day-hours">{hours}</div>
      </div>
    );
  };

  const getPermissionLabel = (event) => {
    if (isEventOwner(event)) return "Vlastník";

    const permission = event.userPermissions?.[numericUserId] || "VIEW";
    switch (permission) {
      case "EDIT": return "Úpravy";
      case "ADMIN": return "Administrátor";
      default: return "Len na čítanie";
    }
  };

  const getEventPermissionClass = (event) => {
    if (isEventOwner(event)) return "event-owner";

    const userIdStr = numericUserId?.toString() || (userId ? userId.toString() : null);
    const permission = event.userPermissions?.[userIdStr] || "VIEW";
    return permission === "EDIT" || permission === "ADMIN"
      ? "can-edit"
      : "view-only";
  };

  const renderEventDot = (event) => {
    const eventColor = getEventColor(event);
    const permissionClass = getEventPermissionClass(event);
    const priorityClass = `event-priority-${event.priority || "MEDIUM"}`;

    return (
      <div
        key={event.id}
        className={`event-dot ${permissionClass} ${priorityClass}`}
        title={`${event.title} (${getPermissionLabel(event)})`}
        onClick={(e) => handleEventClick(e, event)}
        style={{ backgroundColor: eventColor }}
      >
        {event.title}
      </div>
    );
  };

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

  const today = new Date();

  return (
    <div className="calendar-container">
      {showUserIdWarning && (
        <div className="user-id-warning">
          <strong>Upozornenie:</strong> Nie je k dispozícii ID používateľa. Pre správne fungovanie kalendára sa prihláste.
          <button
            onClick={() => setShowUserIdWarning(false)}
            className="close-warning-btn"
          >
            ×
          </button>
        </div>
      )}

      <div className="calendar-header">
        <div className="view-selector">
          <button
            className={currentView === "day" ? "active" : ""}
            onClick={() => setCurrentView("day")}
          >
            Deň
          </button>
          <button
            className={currentView === "week" ? "active" : ""}
            onClick={() => setCurrentView("week")}
          >
            Týždeň
          </button>
          <button
            className={currentView === "month" ? "active" : ""}
            onClick={() => setCurrentView("month")}
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
            <button onClick={handleAddEvent} className="add-event-btn">
              + Udalosť
            </button>
          </div>
        </div>
      </div>

      {renderCalendarLegend()}
      {renderFilterControls()}

      <div className="calendar-body">
        {currentView === "month" && renderMonthView()}
        {currentView === "week" && renderWeekView()}
        {currentView === "day" && renderDayView()}
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
            viewOnly={viewOnly}
          />
        </>
      )}

      {/* Event context menu */}
      {showEventMenu && selectedEventForMenu && (
        <div
          className="event-menu"
          style={{
            position: "absolute",
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(isEventOwner(selectedEventForMenu) ||
            (selectedEventForMenu.userPermissions?.[numericUserId] === "EDIT" ||
             selectedEventForMenu.userPermissions?.[numericUserId] === "ADMIN")) && (
            <button onClick={() => handleEditEvent(selectedEventForMenu)}>
              Upraviť
            </button>
          )}

          {isEventOwner(selectedEventForMenu) && (
            <button onClick={() => handleShareEvent(selectedEventForMenu)}>
              Zdieľať
            </button>
          )}

          {(isEventOwner(selectedEventForMenu) ||
            selectedEventForMenu.userPermissions?.[numericUserId] === "ADMIN") && (
            <button onClick={() => handleDeleteEvent(selectedEventForMenu)}>
              Vymazať
            </button>
          )}

          {!isEventOwner(selectedEventForMenu) && (
            <button onClick={() => handleViewEventDetails(selectedEventForMenu)}>
              Zobraziť detaily
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Calendar;
