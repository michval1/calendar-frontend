// EventForm.js
import React, { useState, useEffect } from 'react';
import './EventForm.css';
import { getPriorityColor } from './EventService';
import { getAllUsers, searchUsers, findOrCreateUserByEmail } from './UserService';
import ReminderSelector from './ReminderSelector';

const EventForm = ({
  onSubmit,
  onCancel,
  event = null,
  selectedDate = new Date(),
  currentUserId,
  viewOnly = false
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // New fields for priority and sharing
  const [priority, setPriority] = useState('MEDIUM');
  const [color, setColor] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [sharedWithUsers, setSharedWithUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);

  // New field for adding participants by email
  const [participantEmail, setParticipantEmail] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Permissions handling
  const [sharedUserPermissions, setSharedUserPermissions] = useState({});

  // Reminder minutes (e.g., [15, 30, 60] for 15min, 30min, 1hour before event)
  const [reminderMinutes, setReminderMinutes] = useState([15, 60]); // Default reminders

  // Check if user has edit permissions
  const hasEditPermission = () => {
    if (viewOnly) return false;
    if (!event) return true; // New event

    // Owner has all permissions
    if (event.user && event.user.id === currentUserId) return true;

    // Check shared permissions
    const permission = event.userPermissions?.[currentUserId] || "VIEW";
    return permission === "EDIT" || permission === "ADMIN";
  };

  // Check if user can modify sharing settings (only owner or ADMIN)
  const canModifySharing = () => {
    if (viewOnly) return false;
    if (!event) return true; // New event

    // Owner can always modify sharing
    if (event.user && event.user.id === currentUserId) return true;

    // Only ADMIN shared users can modify sharing (EDIT users cannot)
    const permission = event.userPermissions?.[currentUserId] || "VIEW";
    return permission === "ADMIN";
  };

  const canEdit = hasEditPermission();
  const canShare = canModifySharing();

  // Fetch all users for sharing
  useEffect(() => {
    if (isShared) {
      fetchUsers();
    }
  }, [isShared]);

  // Search users when search term changes
  useEffect(() => {
    if (searchTerm.trim() !== '' && isShared) {
      searchForUsers(searchTerm);
    }
  }, [searchTerm]);

  // Fetch users for sharing
  const fetchUsers = async () => {
    try {
      const users = await getAllUsers();
      // Filter out the current user
      setAvailableUsers(users.filter(user => user.id !== currentUserId));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // Search users
  const searchForUsers = async (term) => {
    try {
      const users = await searchUsers(term);
      // Filter out the current user
      setAvailableUsers(users.filter(user => user.id !== currentUserId));
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  // Add user to shared list
  const addSharedUser = (user) => {
    if (!sharedWithUsers.find(u => u.id === user.id)) {
      setSharedWithUsers([...sharedWithUsers, user]);
      // Set default permission to "VIEW"
      setSharedUserPermissions({
        ...sharedUserPermissions,
        [user.id]: "VIEW"
      });
    }
  };

  // Remove user from shared list
  const removeSharedUser = (userId) => {
    setSharedWithUsers(sharedWithUsers.filter(user => user.id !== userId));
    // Remove permission
    const updatedPermissions = { ...sharedUserPermissions };
    delete updatedPermissions[userId];
    setSharedUserPermissions(updatedPermissions);
  };

  // Change user permission
  const changeUserPermission = (userId, permission) => {
    setSharedUserPermissions({
      ...sharedUserPermissions,
      [userId]: permission
    });
  };

  // Add participant by email
  const addParticipantByEmail = async () => {
    setAddingParticipant(true);
    setEmailError('');

    try {
      // Basic email validation
      if (!participantEmail || !participantEmail.includes('@') || !participantEmail.includes('.')) {
        setEmailError('Zadajte platný email');
        setAddingParticipant(false);
        return;
      }

      // Check if user already added
      if (sharedWithUsers.find(user => user.email === participantEmail)) {
        setEmailError('Použivateľ už je pridaný');
        setAddingParticipant(false);
        return;
      }

      // Find or create the user
      const user = await findOrCreateUserByEmail(participantEmail);

      if (user) {
        addSharedUser(user);
        setParticipantEmail('');
      }
    } catch (error) {
      setEmailError(`Chyba: ${error.message}`);
      console.error('Failed to add participant:', error);
    } finally {
      setAddingParticipant(false);
    }
  };

  useEffect(() => {
    if (event) {
      // Edit mode - fill form with event data
      setTitle(event.title || '');
      setDescription(event.description || '');
      setLocation(event.location || '');

      const startDateTime = new Date(event.startTime);
      setStartDate(formatDate(startDateTime));
      setStartTime(formatTime(startDateTime));

      const endDateTime = new Date(event.endTime);
      setEndDate(formatDate(endDateTime));
      setEndTime(formatTime(endDateTime));

      setIsAllDay(event.isAllDay || false);
      setRecurrenceType(event.recurrenceType || 'none');

      if (event.recurrenceEnd) {
        setRecurrenceEndDate(formatDate(new Date(event.recurrenceEnd)));
      }

      // Set priority, color and sharing fields
      setPriority(event.priority || 'MEDIUM');
      setColor(event.color || getPriorityColor(event.priority || 'MEDIUM'));
      setIsShared(event.isShared || false);
      setSharedWithUsers(event.sharedWith || []);

      // Load permissions if available
      if (event.userPermissions) {
        setSharedUserPermissions(event.userPermissions);
      } else {
        // Initialize permissions from scratch
        const initialPermissions = {};
        (event.sharedWith || []).forEach(user => {
          initialPermissions[user.id] = "VIEW";
        });
        setSharedUserPermissions(initialPermissions);
      }

      // Load reminder minutes if available
      if (event.reminderMinutes && Array.isArray(event.reminderMinutes)) {
        setReminderMinutes(event.reminderMinutes);
      } else {
        setReminderMinutes([15, 60]); // Default reminders
      }
    } else {
      // Create mode - initialize with selected date
      const defaultDate = formatDate(selectedDate);
      setStartDate(defaultDate);
      setEndDate(defaultDate);

      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const roundedMinutes = Math.ceil(minutes / 15) * 15;

      const startDateTime = new Date(selectedDate);
      startDateTime.setMinutes(roundedMinutes);

      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);

      setStartTime(formatTime(startDateTime));
      setEndTime(formatTime(endDateTime));

      // Set default values for new fields
      setPriority('MEDIUM');
      setColor(getPriorityColor('MEDIUM'));
      setIsShared(false);
      setSharedWithUsers([]);
      setSharedUserPermissions({});
      setReminderMinutes([15, 60]);
    }
  }, [event, selectedDate]);

  useEffect(() => {
    if (!color || color === getPriorityColor('HIGH') || color === getPriorityColor('MEDIUM') || color === getPriorityColor('LOW')) {
      setColor(getPriorityColor(priority));
    }
  }, [priority]);

  const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!canEdit) {
      onCancel();
      return;
    }

    const startDateTime = combineDateTime(startDate, startTime);
    const endDateTime = combineDateTime(endDate, endTime);

    let recurrenceEndDateTime = null;
    if (recurrenceType !== 'none' && recurrenceEndDate) {
      recurrenceEndDateTime = combineDateTime(recurrenceEndDate, '23:59');
    }

    const eventData = {
      id: event ? event.id : null,
      title,
      description,
      location,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      isAllDay,
      recurrenceType,
      recurrenceEnd: recurrenceEndDateTime ? recurrenceEndDateTime.toISOString() : null,
      priority,
      color,
      isShared,
      sharedWith: isShared ? sharedWithUsers : [],
      userPermissions: isShared ? sharedUserPermissions : {},
      reminderMinutes: reminderMinutes
    };

    onSubmit(eventData);
  };

  const combineDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-');
    const [hours, minutes] = timeStr.split(':');
    return new Date(year, month - 1, day, hours, minutes);
  };

  // Update form header
  const getFormTitle = () => {
    if (!canEdit && event) return 'Detaily udalosti';
    if (event) return 'Upraviť udalosť';
    return 'Nová udalosť';
  };

  const renderFormButtons = () => {
    if (!canEdit) {
      return (
        <div className="form-buttons">
          <button type="button" onClick={onCancel} className="cancel-btn">Zavrieť</button>
        </div>
      );
    }

    return (
      <div className="form-buttons">
        <button type="button" onClick={onCancel} className="event-cancel-btn">Zrušiť</button>
        <button type="submit" className="event-submit-btn">Uložiť</button>
      </div>
    );
  };

  return (
    <div className="event-form-container">
      <div className="event-form-header">
        <h2>{getFormTitle()}</h2>
        <button className="close-btn" onClick={onCancel}>&times;</button>
      </div>

      <form onSubmit={handleSubmit} className="event-form">
        <div className="form-group">
          <label>Názov:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={!canEdit}
            className={!canEdit ? "read-only-field" : ""}
          />
        </div>

        <div className="form-group">
          <label>Popis:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            className={!canEdit ? "read-only-field" : ""}
          />
        </div>

        <div className="form-group">
          <label>Miesto:</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={!canEdit}
            className={!canEdit ? "read-only-field" : ""}
          />
        </div>

        <div className="form-check">
          <input
            type="checkbox"
            id="allDay"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
            disabled={!canEdit}
          />
          <label htmlFor="allDay">Celý deň</label>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Dátum začiatku:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              disabled={!canEdit}
              className={!canEdit ? "read-only-field" : ""}
            />
          </div>

          {!isAllDay && (
            <div className="form-group">
              <label>Čas začiatku:</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                disabled={!canEdit}
                className={!canEdit ? "read-only-field" : ""}
              />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Dátum konca:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              disabled={!canEdit}
              className={!canEdit ? "read-only-field" : ""}
            />
          </div>

          {!isAllDay && (
            <div className="form-group">
              <label>Čas konca:</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                disabled={!canEdit}
                className={!canEdit ? "read-only-field" : ""}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Opakovanie:</label>
          <select
            value={recurrenceType}
            onChange={(e) => setRecurrenceType(e.target.value)}
            disabled={!canEdit}
            className={!canEdit ? "read-only-field" : ""}
          >
            <option value="none">Žiadne</option>
            <option value="daily">Denne</option>
            <option value="weekly">Týždenne</option>
            <option value="monthly">Mesačne</option>
            <option value="yearly">Ročne</option>
          </select>
        </div>

        {recurrenceType !== 'none' && (
          <div className="form-group">
            <label>Koniec opakovania:</label>
            <input
              type="date"
              value={recurrenceEndDate}
              onChange={(e) => setRecurrenceEndDate(e.target.value)}
              disabled={!canEdit}
              className={!canEdit ? "read-only-field" : ""}
            />
          </div>
        )}

        {/* Priority fields */}
        <div className="form-group">
          <label>Priorita:</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={!canEdit}
            className={!canEdit ? "read-only-field" : ""}
          >
            <option value="HIGH">Vysoká</option>
            <option value="MEDIUM">Stredná</option>
            <option value="LOW">Nízka</option>
          </select>
        </div>

        <div className="form-group">
          <label>Farba:</label>
          <div className="color-picker">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={!canEdit}
            />
            <span className="color-preview" style={{ backgroundColor: color }}></span>
          </div>
        </div>

        {/* Reminder Selector - set notification times before event */}
        <ReminderSelector
          selectedReminders={reminderMinutes}
          onChange={setReminderMinutes}
          disabled={!canEdit}
        />

        {/* Sharing options - only visible if user has edit rights */}
        {canShare && (
          <div className="form-check">
            <input
              type="checkbox"
              id="shared"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              disabled={!canEdit}
            />
            <label htmlFor="shared">Zdielať s inými použivateľmi</label>
          </div>
        )}

        {/* Sharing section - editable version */}
        {canShare && isShared && (
          <div className="sharing-section">
            {/* Email input for participants */}
            <div className="form-group">
              <label>Pozvať účastníka e-mailom:</label>
              <div className="email-input-container">
                <input
                  type="email"
                  placeholder="email@domena.com"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                  className={emailError ? 'error' : ''}
                />
                <button
                  type="button"
                  className="add-email-btn"
                  onClick={addParticipantByEmail}
                  disabled={addingParticipant || !participantEmail}
                >
                  {addingParticipant ? 'Pridávam...' : 'Pridať'}
                </button>
              </div>
              {emailError && <div className="email-error">{emailError}</div>}
            </div>

            <div className="form-group">
              <label>Zdieľať s používateľmi:</label>
              <div className="shared-users-list">
                {sharedWithUsers.length === 0 ? (
                  <p className="no-users">Žiadni použivatelia</p>
                ) : (
                  <ul>
                    {sharedWithUsers.map(user => (
                      <li key={user.id} className="shared-user-item">
                        <span>{user.username} ({user.email})</span>
                        <select
                          value={sharedUserPermissions[user.id] || "VIEW"}
                          onChange={(e) => changeUserPermission(user.id, e.target.value)}
                          className="permission-select"
                        >
                          <option value="VIEW">Zobrazenie</option>
                          <option value="EDIT">Úpravy</option>
                          <option value="ADMIN">Administrátor</option>
                        </select>
                        <button
                          type="button"
                          className="remove-user-btn"
                          onClick={() => removeSharedUser(user.id)}
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="button"
                className="search-users-btn"
                onClick={() => setShowUserSearch(!showUserSearch)}
              >
                {showUserSearch ? 'Skryť vyhľadávanie' : 'Hľadať používateľov'}
              </button>

              {showUserSearch && (
                <div className="user-search">
                  <input
                    type="text"
                    placeholder="Vyhľadať používateľov..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  <div className="search-results">
                    {availableUsers.length === 0 ? (
                      <p className="no-results">Žiadni používatelia</p>
                    ) : (
                      <ul>
                        {availableUsers
                          .filter(user => !sharedWithUsers.find(u => u.id === user.id))
                          .map(user => (
                            <li
                              key={user.id}
                              className="user-result"
                              onClick={() => addSharedUser(user)}
                            >
                              {user.username} ({user.email})
                            </li>
                          ))
                        }
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sharing section - read-only version */}
        {(!canShare && event && event.isShared) && (
          <div className="sharing-section read-only">
            <h3>Zdieľané s používateľmi:</h3>
            <div className="shared-users-list">
              {event.sharedWith?.length > 0 ? (
                <ul>
                  {event.sharedWith.map(user => (
                    <li key={user.id} className="shared-user-item view-only">
                      <span>{user.username} ({user.email})</span>
                      <span className="permission-badge">
                        {event.userPermissions?.[user.id] || "VIEW"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-users">Žiadni používatelia</p>
              )}
            </div>
          </div>
        )}

        {renderFormButtons()}
      </form>
    </div>
  );
};

export default EventForm;