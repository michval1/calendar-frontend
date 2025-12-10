import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

const AdminPanel = ({ userId }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userEvents, setUserEvents] = useState({ owned: [], shared: [] });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventReminders, setEventReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ users: 0, events: 0, reminders: 0 });

  // Tabbed view state
  const [activeTab, setActiveTab] = useState('users');
  const [allEvents, setAllEvents] = useState([]);
  const [allReminders, setAllReminders] = useState([]);

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});

  const API_URL = 'http://localhost:8080/api/v1/api';

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchAllEventsForTable();
    fetchAllRemindersForTable();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      // Filter out admin user
      const filteredUsers = data.filter(user => user.email !== 'admin@admin.admin');
      setUsers(filteredUsers);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchAllEventsForTable = async () => {
    try {
      const usersResponse = await fetch(`${API_URL}/users`);
      const usersData = await usersResponse.json();
      
      let allEvents = [];
      for (const user of usersData) {
        try {
          const eventsResponse = await fetch(`${API_URL}/events?userId=${user.id}`);
          if (eventsResponse.ok) {
            const data = await eventsResponse.json();
            allEvents = [...allEvents, ...data.ownedEvents];
          }
        } catch (err) {
          console.error(`Failed to fetch events for user ${user.id}:`, err);
        }
      }
      setAllEvents(allEvents);
    } catch (err) {
      console.error('Failed to fetch all events:', err);
    }
  };

  const fetchAllRemindersForTable = async () => {
    try {
      const response = await fetch(`${API_URL}/events/reminders/all`);
      if (response.ok) {
        const data = await response.json();
        setAllReminders(data);
      }
    } catch (err) {
      console.error('Failed to fetch all reminders:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const usersResponse = await fetch(`${API_URL}/users`);
      const usersData = await usersResponse.json();
      const filteredUsers = usersData.filter(user => user.email !== 'admin@admin.admin');
      
      let totalEvents = 0;
      for (const user of usersData) {
        try {
          const eventsResponse = await fetch(`${API_URL}/events?userId=${user.id}`);
          if (eventsResponse.ok) {
            const data = await eventsResponse.json();
            totalEvents += data.ownedEvents.length;
          }
        } catch (err) {
          console.error(`Failed to fetch events for user ${user.id}:`, err);
        }
      }
      
      const remindersResponse = await fetch(`${API_URL}/events/reminders/all`);
      const remindersData = remindersResponse.ok ? await remindersResponse.json() : [];
      
      setStats({
        users: filteredUsers.length,
        events: totalEvents,
        reminders: remindersData.length
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    setSelectedEvent(null);
    setEventReminders([]);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/events?userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch user events');
      const data = await response.json();
      setUserEvents({
        owned: data.ownedEvents || [],
        shared: data.sharedEvents || []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = async (event) => {
    setSelectedEvent(event);
    setLoading(true);
    
    try {
      const allRemindersResponse = await fetch(`${API_URL}/events/reminders/all`);
      if (!allRemindersResponse.ok) throw new Error('Failed to fetch reminders');
      const allReminders = await allRemindersResponse.json();
      
      const eventReminders = allReminders.filter(r => r.event?.id === event.id);
      setEventReminders(eventReminders);
    } catch (err) {
      setError(err.message);
      setEventReminders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item, type) => {
    setEditingItem({ ...item, type });
    setEditForm({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    try {
      let url, method, body;
      
      if (editingItem.type === 'user') {
        url = `${API_URL}/users/${editingItem.id}`;
        method = 'PUT';
        body = {
          username: editForm.username,
          email: editForm.email
        };
      } else if (editingItem.type === 'event') {
        url = `${API_URL}/events/${editingItem.id}?userId=${editingItem.user?.id || userId}`;
        method = 'PUT';
        body = {
          title: editForm.title,
          description: editForm.description,
          location: editForm.location,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          isAllDay: editForm.isAllDay,
          recurrenceType: editForm.recurrenceType,
          recurrenceEnd: editForm.recurrenceEnd,
          priority: editForm.priority,
          color: editForm.color,
          isShared: editForm.isShared
        };
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Failed to update');
      
      alert('Updated successfully');
      setEditingItem(null);
      setEditForm({});
      
      // Refresh data
      fetchUsers();
      fetchStats();
      fetchAllEventsForTable();
      fetchAllRemindersForTable();
      
      if (selectedUser) {
        handleUserSelect(selectedUser);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleFormChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const handleDeleteUser = async (user, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
      
      alert('User deleted successfully');
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
        setUserEvents({ owned: [], shared: [] });
        setSelectedEvent(null);
        setEventReminders([]);
      }
      fetchUsers();
      fetchStats();
      fetchAllEventsForTable();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteEvent = async (event, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete event "${event.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/events/${event.id}?userId=${event.user?.id || userId}`, { 
        method: 'DELETE' 
      });
      if (!response.ok) throw new Error('Failed to delete event');
      
      alert('Event deleted successfully');
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(null);
        setEventReminders([]);
      }
      if (selectedUser) {
        handleUserSelect(selectedUser);
      }
      fetchStats();
      fetchAllEventsForTable();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteReminder = async (reminder, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete this reminder?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/events/reminders/${reminder.id}`, { 
        method: 'DELETE' 
      });
      if (!response.ok) throw new Error('Failed to delete reminder');
      
      alert('Reminder deleted successfully');
      if (selectedEvent) {
        handleEventSelect(selectedEvent);
      }
      fetchStats();
      fetchAllRemindersForTable();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('sk-SK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEditModal = () => {
    if (!editingItem) return null;

    return (
      <div className="modal-backdrop" onClick={handleCancelEdit}>
        <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Edit {editingItem.type}</h2>
            <button onClick={handleCancelEdit} className="close-btn">&times;</button>
          </div>
          <div className="modal-body">
            {editingItem.type === 'user' && (
              <>
                <div className="form-group">
                  <label>Username:</label>
                  <input
                    type="text"
                    value={editForm.username || ''}
                    onChange={(e) => handleFormChange('username', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                  />
                </div>
              </>
            )}
            {editingItem.type === 'event' && (
              <>
                <div className="form-group">
                  <label>Title:</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Location:</label>
                  <input
                    type="text"
                    value={editForm.location || ''}
                    onChange={(e) => handleFormChange('location', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Start Time:</label>
                  <input
                    type="datetime-local"
                    value={editForm.startTime ? new Date(editForm.startTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>End Time:</label>
                  <input
                    type="datetime-local"
                    value={editForm.endTime ? new Date(editForm.endTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleFormChange('endTime', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Priority:</label>
                  <select
                    value={editForm.priority || 'MEDIUM'}
                    onChange={(e) => handleFormChange('priority', e.target.value)}
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Color:</label>
                  <input
                    type="color"
                    value={editForm.color || '#FFC107'}
                    onChange={(e) => handleFormChange('color', e.target.value)}
                  />
                </div>
                <div className="form-check">
                  <input
                    type="checkbox"
                    id="edit-allday"
                    checked={editForm.isAllDay || false}
                    onChange={(e) => handleFormChange('isAllDay', e.target.checked)}
                  />
                  <label htmlFor="edit-allday">All Day</label>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
            <button onClick={handleSaveEdit} className="save-btn">Save</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel-wrapper">
      {/* Statistics Bar at Top */}
      <div className="admin-stats-bar">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.users}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.events}</div>
            <div className="stat-label">Total Events</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔔</div>
          <div className="stat-info">
            <div className="stat-value">{stats.reminders}</div>
            <div className="stat-label">Total Reminders</div>
          </div>
        </div>
      </div>

      {/* Middle Section: 3-Column Master-Detail View */}
      <div className="admin-panel-container">
        <div className="admin-column users-column">
          <div className="column-header">
            <h2>👥 Users ({users.length})</h2>
          </div>
          <div className="column-content">
            {users.map(user => (
              <div
                key={user.id}
                className={`user-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
                onClick={() => handleUserSelect(user)}
              >
                <div className="item-main">
                  <div className="item-title">{user.username}</div>
                  <div className="item-subtitle">{user.email}</div>
                  <div className="item-meta">ID: {user.id}</div>
                </div>
                <div className="item-actions">
                  <button
                    className="edit-btn-icon"
                    onClick={(e) => { e.stopPropagation(); handleEdit(user, 'user'); }}
                    title="Edit user"
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-btn-icon"
                    onClick={(e) => handleDeleteUser(user, e)}
                    title="Delete user"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedUser && (
          <div className="admin-column events-column">
            <div className="column-header">
              <h2>📅 Events for {selectedUser.username}</h2>
            </div>
            <div className="column-content">
              {loading ? (
                <div className="loading-state">Loading...</div>
              ) : (
                <>
                  {userEvents.owned.length > 0 && (
                    <div className="events-section">
                      <h3 className="section-title owned-title">Owned Events ({userEvents.owned.length})</h3>
                      {userEvents.owned.map(event => (
                        <div
                          key={event.id}
                          className={`event-item owned-event ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                          onClick={() => handleEventSelect(event)}
                        >
                          <div className="item-main">
                            <div className="item-title">{event.title}</div>
                            <div className="item-subtitle">{event.description || 'No description'}</div>
                            <div className="item-meta">
                              📍 {event.location || 'No location'} | 
                              ⏰ {formatDateTime(event.startTime)}
                            </div>
                            <div className="item-meta">
                              Priority: {event.priority} | Shared: {event.isShared ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div className="item-actions">
                            <button
                              className="edit-btn-icon"
                              onClick={(e) => { e.stopPropagation(); handleEdit(event, 'event'); }}
                              title="Edit event"
                            >
                              ✏️
                            </button>
                            <button
                              className="delete-btn-icon"
                              onClick={(e) => handleDeleteEvent(event, e)}
                              title="Delete event"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {userEvents.shared.length > 0 && (
                    <div className="events-section">
                      <h3 className="section-title shared-title">Shared Events ({userEvents.shared.length})</h3>
                      {userEvents.shared.map(event => (
                        <div
                          key={event.id}
                          className={`event-item shared-event ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                          onClick={() => handleEventSelect(event)}
                        >
                          <div className="item-main">
                            <div className="item-title">{event.title}</div>
                            <div className="item-subtitle">{event.description || 'No description'}</div>
                            <div className="item-meta">
                              👤 Owner: {event.user?.username || 'Unknown'} | 
                              📍 {event.location || 'No location'}
                            </div>
                            <div className="item-meta">
                              ⏰ {formatDateTime(event.startTime)} | 
                              Priority: {event.priority}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {userEvents.owned.length === 0 && userEvents.shared.length === 0 && (
                    <div className="empty-state">No events found for this user</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {selectedEvent && (
          <div className="admin-column reminders-column">
            <div className="column-header">
              <h2>🔔 Reminders for "{selectedEvent.title}"</h2>
            </div>
            <div className="column-content">
              {loading ? (
                <div className="loading-state">Loading...</div>
              ) : eventReminders.length > 0 ? (
                eventReminders.map(reminder => (
                  <div key={reminder.id} className="reminder-item">
                    <div className="item-main">
                      <div className="item-title">
                        Reminder ID: {reminder.id}
                        {reminder.isSent && <span className="sent-badge">✓ Sent</span>}
                      </div>
                      <div className="item-subtitle">
                        👤 User: {reminder.user?.username || 'Unknown'}
                      </div>
                      <div className="item-meta">
                        ⏰ Reminder Time: {formatDateTime(reminder.reminderTime)}
                      </div>
                      <div className="item-meta">
                        📅 Created: {formatDateTime(reminder.createdAt)}
                      </div>
                      <div className="item-meta">
                        ⏱️ {reminder.minutesBeforeEvent} minutes before event
                      </div>
                      {reminder.sentAt && (
                        <div className="item-meta">
                          📤 Sent At: {formatDateTime(reminder.sentAt)}
                        </div>
                      )}
                      {reminder.message && (
                        <div className="item-message">💬 {reminder.message}</div>
                      )}
                    </div>
                    <button
                      className="delete-btn-icon"
                      onClick={(e) => handleDeleteReminder(reminder, e)}
                      title="Delete reminder"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">No reminders for this event</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Tabbed Tables View */}
      <div className="admin-tables-section">
        <div className="tables-header">
          <h2>📋 Database Tables</h2>
        </div>

        <div className="admin-tabs">
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Users Table
          </button>
          <button
            className={activeTab === 'events' ? 'active' : ''}
            onClick={() => setActiveTab('events')}
          >
            Events Table
          </button>
          <button
            className={activeTab === 'reminders' ? 'active' : ''}
            onClick={() => setActiveTab('reminders')}
          >
            Reminders Table
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'users' && (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td className="actions">
                        <button onClick={() => handleEdit(user, 'user')} className="edit-btn">Edit</button>
                        <button onClick={(e) => handleDeleteUser(user, e)} className="delete-btn">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Owner</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Priority</th>
                    <th>Shared</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allEvents.map(event => (
                    <tr key={event.id}>
                      <td>{event.id}</td>
                      <td>{event.title}</td>
                      <td>{event.user?.username || 'N/A'}</td>
                      <td>{formatDateTime(event.startTime)}</td>
                      <td>{formatDateTime(event.endTime)}</td>
                      <td>{event.priority}</td>
                      <td>{event.isShared ? 'Yes' : 'No'}</td>
                      <td className="actions">
                        <button onClick={() => handleEdit(event, 'event')} className="edit-btn">Edit</button>
                        <button onClick={(e) => handleDeleteEvent(event, e)} className="delete-btn">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reminders' && (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Event</th>
                    <th>User</th>
                    <th>Reminder Time</th>
                    <th>Minutes Before</th>
                    <th>Sent</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allReminders.map(reminder => (
                    <tr key={reminder.id}>
                      <td>{reminder.id}</td>
                      <td>{reminder.event?.title || 'N/A'}</td>
                      <td>{reminder.user?.username || 'N/A'}</td>
                      <td>{formatDateTime(reminder.reminderTime)}</td>
                      <td>{reminder.minutesBeforeEvent}</td>
                      <td>{reminder.isSent ? 'Yes' : 'No'}</td>
                      <td className="actions">
                        <button onClick={(e) => handleDeleteReminder(reminder, e)} className="delete-btn">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {renderEditModal()}

      {error && (
        <div className="error-toast">
          Error: {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;