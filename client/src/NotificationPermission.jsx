import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

/**
 * Component to request notification permission and manage push subscriptions
 */
const NotificationPermission = ({ userId, onSubscriptionChange }) => {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check current permission status
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check if already subscribed
    checkSubscription();
  }, [userId]);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!userId) {
      toast.error('Please claim a plate first to enable notifications');
      return;
    }

    setLoading(true);

    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        toast.error('Your browser does not support notifications');
        return;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toast.error('Your browser does not support push notifications');
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        toast.warning('Notification permission denied. You won\'t receive push notifications.');
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;

      console.log('Service Worker registered');

      // Get VAPID public key from backend
      const vapidResponse = await axios.get(`${API_URL}/notifications/vapid-public-key`);
      const vapidPublicKey = vapidResponse.data.publicKey;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('Push subscription:', subscription);

      // Send subscription to backend
      await axios.post(`${API_URL}/notifications/subscribe`, {
        userId,
        subscription: subscription.toJSON()
      });

      setIsSubscribed(true);
      toast.success('Push notifications enabled! You\'ll be notified of new messages.');

      if (onSubscriptionChange) {
        onSubscriptionChange(true);
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);

      if (error.response?.status === 503) {
        toast.error('Push notifications are not configured on the server');
      } else {
        toast.error('Failed to enable push notifications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;

        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove subscription from backend
        await axios.post(`${API_URL}/notifications/unsubscribe`, {
          userId,
          endpoint
        });

        setIsSubscribed(false);
        toast.success('Push notifications disabled');

        if (onSubscriptionChange) {
          onSubscriptionChange(false);
        }
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setLoading(false);
    }
  };

  // Don't show anything if notifications not supported
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  // If permission denied, show info message
  if (permission === 'denied') {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#856404' }}>
          🔕 Push notifications are blocked. To enable them, please change your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: isSubscribed ? '#d4edda' : '#cfe2ff',
      border: `1px solid ${isSubscribed ? '#c3e6cb' : '#b6d4fe'}`,
      borderRadius: '8px',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: isSubscribed ? '#155724' : '#084298' }}>
            {isSubscribed ? '🔔 Push Notifications Enabled' : '🔕 Enable Push Notifications'}
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: isSubscribed ? '#155724' : '#084298' }}>
            {isSubscribed
              ? 'You\'ll receive instant notifications for new messages'
              : 'Get notified instantly when someone sends you a message'
            }
          </p>
        </div>
        <button
          onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isSubscribed ? '#dc3545' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? '...' : (isSubscribed ? 'Disable' : 'Enable')}
        </button>
      </div>
    </div>
  );
};

export default NotificationPermission;
