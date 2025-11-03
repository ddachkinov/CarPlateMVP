import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL;

const NotificationPreferences = ({ userId }) => {
  const [preferences, setPreferences] = useState({
    push: true,
    email: true
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/preferences/${userId}`);
      setPreferences({
        push: response.data.push,
        email: response.data.email
      });
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
    } finally {
      setFetching(false);
    }
  };

  const updatePreferences = async (newPreferences) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/notifications/preferences`, {
        userId,
        ...newPreferences
      });
      setPreferences(newPreferences);
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePush = () => {
    const newValue = !preferences.push;
    updatePreferences({ ...preferences, push: newValue });
  };

  const handleToggleEmail = () => {
    const newValue = !preferences.email;
    updatePreferences({ ...preferences, email: newValue });
  };

  if (fetching) {
    return null;
  }

  return (
    <div style={{
      marginTop: '2rem',
      padding: '1.5rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Notification Preferences</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Push Notifications Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: 'white',
          borderRadius: '6px'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Push Notifications
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              Receive instant notifications in your browser
            </div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
            <input
              type="checkbox"
              checked={preferences.push}
              onChange={handleTogglePush}
              disabled={loading}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: loading ? 'not-allowed' : 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: preferences.push ? '#007bff' : '#ccc',
              transition: '0.3s',
              borderRadius: '24px'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '18px',
                width: '18px',
                left: preferences.push ? '29px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                transition: '0.3s',
                borderRadius: '50%'
              }}></span>
            </span>
          </label>
        </div>

        {/* Email Notifications Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: 'white',
          borderRadius: '6px'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Email Notifications
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              Receive email when you get a new message
            </div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={handleToggleEmail}
              disabled={loading}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: loading ? 'not-allowed' : 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: preferences.email ? '#007bff' : '#ccc',
              transition: '0.3s',
              borderRadius: '24px'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '18px',
                width: '18px',
                left: preferences.email ? '29px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                transition: '0.3s',
                borderRadius: '50%'
              }}></span>
            </span>
          </label>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '1rem', marginBottom: 0 }}>
        Note: You can always change these settings later
      </p>
    </div>
  );
};

export default NotificationPreferences;
