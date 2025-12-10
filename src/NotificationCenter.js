// NotificationCenter.js
import React, { useState, useEffect, useRef } from 'react';
import './NotificationCenter.css';
import { getPendingReminders, markReminderAsSent } from './EventService';

const NotificationCenter = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [shownReminderIds, setShownReminderIds] = useState(new Set());
  const [permissionStatus, setPermissionStatus] = useState('default');
  
  // Use ref to prevent duplicate checks and track shown IDs
  const isCheckingRef = useRef(false);
  const shownIdsRef = useRef(new Set());

  // Create audio context for notification sound
  const playNotificationSound = () => {
    try {
      // Try to play custom sound file first
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5; // 50% volume
      audio.play().catch(err => {
        console.log('Custom sound not found, using beep sound');
        // Fallback to Web Audio API beep sound
        playBeepSound();
      });
    } catch (err) {
      console.log('Audio playback failed, using beep sound');
      playBeepSound();
    }
  };

  // Fallback beep sound using Web Audio API
  const playBeepSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Pleasant notification tone (C note at 523.25 Hz)
      oscillator.frequency.value = 523.25;
      oscillator.type = 'sine';

      // Volume envelope for smooth sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.error('Failed to play beep sound:', err);
    }
  };

  // Request notification permission when component mounts
  useEffect(() => {
    const requestPermission = async () => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        console.log('Notification permission:', permission);
      } else {
        console.warn('Browser does not support notifications');
      }
    };
    
    requestPermission();
  }, []);

  // Check for pending reminders every 30 seconds
  useEffect(() => {
    if (!userId) {
      console.log('NotificationCenter: No userId provided');
      return;
    }

    const checkForReminders = async () => {
      // Prevent concurrent checks
      if (isCheckingRef.current) {
        console.log('Already checking for reminders, skipping...');
        return;
      }

      isCheckingRef.current = true;

      try {
        console.log('Checking for pending reminders for user:', userId);
        const pendingReminders = await getPendingReminders(userId);
        console.log('Pending reminders:', pendingReminders);
        
        // Filter out reminders we've already shown using ref
        const newReminders = pendingReminders.filter(
          reminder => !shownIdsRef.current.has(reminder.id)
        );

        if (newReminders.length > 0) {
          console.log('New reminders to show:', newReminders.length, 'notifications');
          
          // Add new notifications
          const newNotifications = newReminders.map(reminder => ({
            id: reminder.id,
            eventId: reminder.event.id,
            title: reminder.event.title,
            message: reminder.message,
            minutesBefore: reminder.minutesBeforeEvent,
            startTime: reminder.event.startTime,
            timestamp: new Date(),
          }));

          setNotifications(prev => [...prev, ...newNotifications]);

          // Play notification sound! 🔊
          playNotificationSound();

          // Mark these reminders as shown in the backend
          newReminders.forEach(reminder => {
            markReminderAsSent(reminder.id).catch(err => 
              console.error('Failed to mark reminder as sent:', err)
            );
          });

          // Update shown IDs in both ref and state
          newReminders.forEach(r => shownIdsRef.current.add(r.id));
          setShownReminderIds(new Set(shownIdsRef.current));

          // Show browser notification if permission granted
          if (permissionStatus === 'granted' && newNotifications.length > 0) {
            try {
              new Notification('Pripomienka udalosti', {
                body: newNotifications[0].message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
              });
            } catch (err) {
              console.error('Failed to show browser notification:', err);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check for reminders:', error);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Check immediately on mount
    console.log('NotificationCenter mounted for user:', userId);
    checkForReminders();

    // Then check every 30 seconds
    const interval = setInterval(checkForReminders, 30000);

    return () => {
      console.log('NotificationCenter unmounting');
      clearInterval(interval);
    };
  }, [userId, permissionStatus]); // Removed shownReminderIds from dependencies!

  // Auto-remove notifications after 10 seconds
  useEffect(() => {
    if (notifications.length === 0) return;

    const timeouts = notifications.map((notification, index) => {
      return setTimeout(() => {
        removeNotification(notification.id);
      }, 10000); // 10 seconds
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [notifications]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Test function to show a notification immediately
  const showTestNotification = () => {
    console.log('🔔 Showing test notification...');
    
    // Create a test notification
    const testNotification = {
      id: `test-${Date.now()}`,
      eventId: null,
      title: 'Test Notification',
      message: 'This is a test notification! If you see this, notifications are working! 🎉',
      minutesBefore: 0,
      startTime: new Date().toISOString(),
      timestamp: new Date(),
    };

    // Add to popup notifications
    setNotifications(prev => [...prev, testNotification]);

    // Play notification sound! 🔊
    playNotificationSound();

    // Show browser notification if permission granted
    if (permissionStatus === 'granted') {
      try {
        new Notification('Test Notification 🔔', {
          body: 'If you see this, browser notifications are working! 🎉',
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.error('Failed to show browser notification:', err);
      }
    } else {
      console.warn('Browser notification permission not granted. Status:', permissionStatus);
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  };

  if (notifications.length === 0) {
    // Show test button even when no notifications
    return (
      <div className="notification-test-button-container">
        <button 
          className="notification-test-button"
          onClick={showTestNotification}
          title="Test notifications"
        >
          🔔 Test Notification
        </button>
      </div>
    );
  }

  return (
    <div className="notification-center">
      {/* Test button */}
      <button 
        className="notification-test-button notification-test-button-with-notifications"
        onClick={showTestNotification}
        title="Test notifications"
      >
        🔔 Test
      </button>
      
      {notifications.map(notification => (
        <div key={notification.id} className="notification-popup">
          <button 
            className="notification-close"
            onClick={() => removeNotification(notification.id)}
          >
            ×
          </button>
          <div className="notification-icon">🔔</div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">
              Začína o {notification.minutesBefore} minút ({formatTime(notification.startTime)})
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;