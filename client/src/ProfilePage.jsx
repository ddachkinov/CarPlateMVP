import React, { useState, useEffect } from 'react';
import { claimPlate, getUserTrustScore, getSubscriptionStatus, createCheckoutSession, createPortalSession, mockTogglePremium } from './api/plates';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import EmailVerification from './EmailVerification';
import NotificationPermission from './NotificationPermission';
import NotificationPreferences from './NotificationPreferences';

// ⚠️ MVP MOCK - Check if mock premium is enabled
const MOCK_PREMIUM_ENABLED = process.env.REACT_APP_MOCK_PREMIUM === 'true';

const ProfilePage = ({ userId, ownedPlates, refreshOwned, onPremiumChanged }) => {
  const [newPlate, setNewPlate] = useState('');
  const [email, setEmail] = useState('');
  const [trustData, setTrustData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  // Fetch trust score function (exposed for refresh after verification)
  const fetchTrustScore = async () => {
    try {
      const response = await getUserTrustScore(userId);
      setTrustData(response.data);
    } catch (err) {
      console.error('Failed to fetch trust score:', err);
    }
  };

  useEffect(() => {
    // Fetch subscription status
    const fetchSubscription = async () => {
      try {
        const response = await getSubscriptionStatus(userId);
        setSubscriptionData(response.data);
      } catch (err) {
        console.error('Failed to fetch subscription status:', err);
      }
    };

    if (userId) {
      fetchTrustScore();
      fetchSubscription();
    }
  }, [userId]);

  const handleClaim = async () => {
    if (!newPlate.trim()) {
      toast.error('Please enter a plate number');
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter your email to receive notifications');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const response = await claimPlate({
        plate: newPlate.trim().toUpperCase(),
        ownerId: userId,
        email: email.trim().toLowerCase()
      });
      const { unreadCount, message, verificationRequired, verificationMessage } = response.data;

      if (unreadCount > 0) {
        toast.success(`Plate claimed! 🎉 ${message}`, { autoClose: 5000 });
      } else {
        toast.success('Plate claimed! You\'ll receive email notifications when someone sends you a message.', { autoClose: 5000 });
      }

      // Show verification prompt if needed
      if (verificationRequired && verificationMessage) {
        toast.info(verificationMessage, { autoClose: 10000 });
      }

      setNewPlate('');
      setEmail('');
      refreshOwned();
      fetchTrustScore(); // Refresh to show verification status
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('This plate is already claimed by another user');
      } else if (err.response?.status === 429) {
        // Rate limit error
        const retryAfter = err.response.headers['retry-after'] || 3600;
        const hours = Math.ceil(retryAfter / 3600);
        toast.warning(`Too many plate claims. Please wait ${hours} hour${hours > 1 ? 's' : ''} before claiming more plates.`, { autoClose: 5000 });
      } else if (err.response?.status === 400) {
        toast.error(err.response.data.error || 'Invalid input');
      } else if (err.response?.status === 403) {
        toast.error(err.response.data.error || 'You do not have permission to claim plates');
      } else {
        toast.error('Failed to claim plate');
      }
    }
  };

  const handleUnclaim = async (plateId, plateNumber) => {
    const confirmed = window.confirm(
      `Are you sure you want to unclaim plate ${plateNumber}?\n\nYou will stop receiving notifications for this plate.`
    );

    if (!confirmed) return;

    try {
      await fetch(`${process.env.REACT_APP_API_URL}/plates/${plateId}?ownerId=${userId}`, {
        method: 'DELETE'
      });
      toast.success('Plate unclaimed successfully');
      refreshOwned();
    } catch (err) {
      toast.error('Failed to unclaim plate');
    }
  };  

  const getTrustScoreColor = (score) => {
    if (score >= 80) return '#28a745';
    if (score >= 50) return '#ffc107';
    return '#dc3545';
  };

  const handleUpgradeToPremium = async () => {
    if (!ownedPlates.length || !trustData?.email) {
      toast.error('Please claim a plate with your email address before upgrading');
      return;
    }

    setLoadingSubscription(true);
    try {
      const response = await createCheckoutSession({
        userId,
        email: trustData.email
      });

      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      toast.error(err.response?.data?.error || 'Failed to start checkout process');
      setLoadingSubscription(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const response = await createPortalSession({ userId });

      // Redirect to Stripe customer portal
      window.location.href = response.data.url;
    } catch (err) {
      console.error('Failed to create portal session:', err);
      toast.error(err.response?.data?.error || 'Failed to open subscription management');
      setLoadingSubscription(false);
    }
  };

  // ⚠️ MVP MOCK - Toggle premium for testing (REMOVE WHEN STRIPE IS CONFIGURED)
  const handleMockTogglePremium = async () => {
    try {
      const response = await mockTogglePremium(userId);
      toast.success(response.data.message);

      // Refresh subscription data
      const updatedSub = await getSubscriptionStatus(userId);
      setSubscriptionData(updatedSub.data);

      // Notify parent (App.js) to refresh premium status globally
      if (onPremiumChanged) {
        onPremiumChanged();
      }
    } catch (err) {
      console.error('Failed to toggle premium:', err);
      toast.error('Failed to toggle premium status');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="card-title" style={{ margin: 0 }}>Your Profile</h2>
          {subscriptionData?.premium && (
            <span className="badge badge-premium">PREMIUM</span>
          )}
        </div>
        <p className="form-hint">
          Your anonymous ID: <code>{userId}</code>
        </p>
      </div>

      {/* Trust Score Display */}
      {trustData && (
        <div className={`alert ${trustData.blocked ? 'alert-error' : 'alert-info'}`}>
          <div className="flex justify-between items-center">
            <div>
              <strong>Trust Score:</strong>
              <span style={{
                marginLeft: 'var(--spacing-sm)',
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: getTrustScoreColor(trustData.trustScore)
              }}>
                {trustData.trustScore}/100
              </span>
            </div>
            {trustData.blocked && (
              <span className="badge badge-error">BLOCKED</span>
            )}
          </div>
          {trustData.blocked && (
            <p className="mt-1 mb-0">
              <strong>Reason:</strong> {trustData.blockedReason}
            </p>
          )}
          <p className="form-hint mt-1 mb-0">
            Your trust score affects your ability to send messages. Report violations to keep the community safe.
          </p>
        </div>
      )}

      {/* Email Verification Status */}
      {trustData && trustData.email && !trustData.emailVerified && (
        <div className="alert alert-warning">
          <div className="flex items-center gap-1 mb-1">
            <strong>Email Not Verified</strong>
          </div>
          <p className="mb-2" style={{ fontSize: 'var(--font-size-sm)' }}>
            Please verify your email address to receive notifications for messages sent to your claimed plates.
          </p>
          <EmailVerification
            userId={userId}
            email={trustData.email}
            onVerified={() => {
              toast.success('Email verified successfully!');
              fetchTrustScore(); // Refresh to show verified status
            }}
          />
        </div>
      )}

      {/* Email Verified Badge */}
      {trustData && trustData.email && trustData.emailVerified && (
        <div className="alert alert-success flex items-center gap-2">
          <div>
            <strong>Email Verified</strong>
            <p className="mb-0 mt-1" style={{ fontSize: 'var(--font-size-sm)' }}>
              {trustData.email}
            </p>
          </div>
        </div>
      )}

      {/* Push Notification Permission - Only show if user has owned plates */}
      {ownedPlates.length > 0 && (
        <>
          <div style={{ marginTop: '1rem' }}>
            <NotificationPermission userId={userId} />
          </div>
          <NotificationPreferences userId={userId} />
        </>
      )}

      {/* MVP MOCK - Premium Toggle for Testing */}
      {MOCK_PREMIUM_ENABLED && subscriptionData && (
        <div className="alert alert-warning text-center">
          <p className="mb-2" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
            MVP MOCK MODE - Testing Only
          </p>
          <button
            onClick={handleMockTogglePremium}
            className="btn btn-warning"
          >
            Toggle Premium (Mock)
          </button>
          <p className="form-hint mt-1 mb-0">
            Remove REACT_APP_MOCK_PREMIUM=true when Stripe is configured
          </p>
        </div>
      )}

      {/* Subscription Management */}
      {subscriptionData && (
        <div className={`card ${subscriptionData.premium ? 'alert-warning' : ''}`}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <strong>Subscription:</strong>
              <span style={{
                marginLeft: 'var(--spacing-sm)',
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)',
                color: subscriptionData.premium ? 'var(--color-premium)' : 'var(--color-primary)'
              }}>
                {subscriptionData.premium ? 'Premium' : 'Free'}
              </span>
            </div>
            {subscriptionData.premium && (
              <span className="badge badge-premium">ACTIVE</span>
            )}
          </div>

          {subscriptionData.premium ? (
            <>
              <p className="form-hint mb-2">
                {subscriptionData.subscriptionStatus === 'active' && subscriptionData.subscriptionEndDate && (
                  <>Next billing date: {new Date(subscriptionData.subscriptionEndDate).toLocaleDateString()}</>
                )}
                {subscriptionData.subscriptionStatus === 'canceled' && (
                  <>Access until: {new Date(subscriptionData.subscriptionEndDate).toLocaleDateString()}</>
                )}
              </p>
              <p className="form-hint mb-2">
                Custom messages • Priority support • Premium badge
              </p>
              {loadingSubscription ? (
                <LoadingSpinner message="Opening subscription management..." />
              ) : (
                <button
                  onClick={handleManageSubscription}
                  className="btn btn-primary"
                >
                  Manage Subscription
                </button>
              )}
            </>
          ) : (
            <>
              <p className="mb-2" style={{ fontSize: 'var(--font-size-sm)' }}>
                Upgrade to Premium for $4.99/month to unlock:
              </p>
              <ul className="mb-3" style={{ fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-lg)' }}>
                <li>Send custom messages (not just predefined ones)</li>
                <li>Premium badge displayed on your messages</li>
                <li>Priority customer support</li>
              </ul>
              {loadingSubscription ? (
                <LoadingSpinner message="Starting checkout..." />
              ) : (
                <button
                  onClick={handleUpgradeToPremium}
                  disabled={!ownedPlates.length}
                  className="btn btn-premium"
                  style={{ width: '100%' }}
                  title={!ownedPlates.length ? 'Claim a plate first to upgrade' : ''}
                >
                  Upgrade to Premium
                </button>
              )}
              {!ownedPlates.length && (
                <p className="form-hint mt-1 mb-0" style={{ color: 'var(--color-error)' }}>
                  Please claim a plate with your email before upgrading
                </p>
              )}
            </>
          )}
        </div>
      )}

      {ownedPlates.length > 0 ? (
        <div className="card">
          <h3 className="card-title mb-2">Your Claimed Plates</h3>
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {ownedPlates.map((p) => (
              <li key={p._id} className="flex justify-between items-center mb-2">
                <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{p.plate}</span>
                <button
                  onClick={() => handleUnclaim(p._id, p.plate)}
                  className="btn btn-sm btn-error"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="form-hint mb-0">
            You'll receive email notifications when someone sends a message to your claimed plates.
          </p>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🚗</div>
          <h3 className="empty-state-title">No plates claimed yet</h3>
          <p className="empty-state-description">
            Claim your license plate below to receive notifications when someone sends you a message!
          </p>
        </div>
      )}

      <div className="card">
        <h3 className="card-title mb-3">Claim a Plate</h3>

        <div className="form-group">
          <label className="form-label">
            License Plate Number
          </label>
          <input
            type="text"
            placeholder="e.g. CB1234AB"
            value={newPlate}
            onChange={(e) => setNewPlate(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Email Address
          </label>
          <input
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
          />
          <p className="form-hint">
            We'll email you when someone sends a message to this plate
          </p>
        </div>

        <button
          onClick={handleClaim}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          Claim Plate
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
