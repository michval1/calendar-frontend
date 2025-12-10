// ReminderSelector.js
import React, { useState, useEffect } from 'react';
import './ReminderSelector.css';

const ReminderSelector = ({ selectedReminders, onChange, disabled = false }) => {
  const [customMinutes, setCustomMinutes] = useState('');
  
  // Predefined reminder options (minutes before event)
  const predefinedOptions = [
    { label: '5 minút', value: 5 },
    { label: '10 minút', value: 10 },
    { label: '15 minút', value: 15 },
    { label: '30 minút', value: 30 },
    { label: '1 hodina', value: 60 },
    { label: '2 hodiny', value: 120 },
    { label: '1 deň', value: 1440 },
  ];

  const toggleReminder = (minutes) => {
    if (disabled) return;
    
    if (selectedReminders.includes(minutes)) {
      onChange(selectedReminders.filter(m => m !== minutes));
    } else {
      onChange([...selectedReminders, minutes].sort((a, b) => a - b));
    }
  };

  const addCustomReminder = () => {
    const minutes = parseInt(customMinutes, 10);
    if (!isNaN(minutes) && minutes > 0 && !selectedReminders.includes(minutes)) {
      onChange([...selectedReminders, minutes].sort((a, b) => a - b));
      setCustomMinutes('');
    }
  };

  const formatReminderLabel = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} h`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} deň`;
    }
  };

  return (
    <div className="reminder-selector">
      <label>Pripomienky pred udalosťou:</label>
      
      <div className="reminder-options">
        {predefinedOptions.map(option => (
          <button
            key={option.value}
            type="button"
            className={`reminder-option ${selectedReminders.includes(option.value) ? 'selected' : ''}`}
            onClick={() => toggleReminder(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!disabled && (
        <div className="custom-reminder">
          <input
            type="number"
            placeholder="Vlastné minúty"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            min="1"
          />
          <button
            type="button"
            onClick={addCustomReminder}
            disabled={!customMinutes}
          >
            Pridať
          </button>
        </div>
      )}

      {selectedReminders.length > 0 && (
        <div className="selected-reminders">
          <span>Vybrané pripomienky:</span>
          <div className="reminder-chips">
            {selectedReminders.map(minutes => (
              <div key={minutes} className="reminder-chip">
                {formatReminderLabel(minutes)}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleReminder(minutes)}
                    className="remove-chip"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderSelector;