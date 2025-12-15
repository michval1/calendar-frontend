// EventService.js
const API_URL = "http://localhost:8080/api/v1/events";

export const getAllEvents = async (userId, startDate = null, endDate = null) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to fetch events");
    }
    
    let url = `${API_URL}?userId=${userId}`;
    
    if (startDate && endDate) {
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      url += `&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch events");
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

export const createEvent = async (eventData, userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to create an event");
    }
    
    const response = await fetch(`${API_URL}?userId=${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Failed to create event");
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

export const updateEvent = async (eventId, eventData, userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to update an event");
    }
    
    console.log("DEBUG Frontend: Original eventData:", eventData);
    
    const formattedData = { ...eventData };
    
    if (formattedData.userPermissions) {
      const idBasedPermissions = {};
      for (const userId in formattedData.userPermissions) {
        idBasedPermissions[userId] = formattedData.userPermissions[userId];
      }
      formattedData.userPermissions = idBasedPermissions;
      console.log("DEBUG Frontend: Formatted userPermissions:", formattedData.userPermissions);
    } else {
      console.log("DEBUG Frontend: No userPermissions in eventData");
    }
    
    console.log("DEBUG Frontend: Full payload being sent:", JSON.stringify(formattedData, null, 2));
    
    const response = await fetch(`${API_URL}/${eventId}?userId=${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to update event");
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteEvent = async (eventId, userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to delete an event");
    }
    
    const response = await fetch(`${API_URL}/${eventId}?userId=${userId}`, {
      method: "DELETE"
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Failed to delete event");
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'HIGH':
      return '#FF5252';
    case 'MEDIUM':
      return '#FFC107';
    case 'LOW':
      return '#4CAF50';
    default:
      return '#2196F3';
  }
};

export const getAllUserEvents = async (userId) => {
  const data = await getAllEvents(userId);
  return [...data.ownedEvents, ...data.sharedEvents];
};

export const getUserEvents = async (userId) => {
  const data = await getAllEvents(userId);
  return data.ownedEvents;
};

export const getEventsInRange = async (userId, startDate, endDate) => {
  const data = await getAllEvents(userId, startDate, endDate);
  return data.ownedEvents;
};

export const getAllEventsInRange = async (userId, startDate, endDate) => {
  const data = await getAllEvents(userId, startDate, endDate);
  return [...data.ownedEvents, ...data.sharedEvents];
};

export const getSharedEvents = async (userId) => {
  const data = await getAllEvents(userId);
  return data.sharedEvents;
};

export const getSharedEventsInRange = async (userId, startDate, endDate) => {
  const data = await getAllEvents(userId, startDate, endDate);
  return data.sharedEvents;
};

export const getPendingReminders = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/reminders/pending?userId=${userId}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch pending reminders");
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};


export const markReminderAsSent = async (reminderId) => {
  try {
    const response = await fetch(`${API_URL}/reminders/${reminderId}/mark-sent`, {
      method: "PUT",
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Failed to mark reminder as sent");
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};