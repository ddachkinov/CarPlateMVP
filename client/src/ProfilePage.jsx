import React, { useState, useEffect } from 'react';
import { claimPlate, getUserTrustScore, getSubscriptionStatus, createCheckoutSession, createPortalSession, mockTogglePremium } from './api/plates';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import EmailVerification from './EmailVerification';

// ⚠️ MVP MOCK - Check if mock premium is enabled
const MOCK_PREMIUM_ENABLED = process.env.REACT_APP_MOCK_PREMIUM === 'true';

const ProfilePage = ({ userId, ownedPlates, refreshOwned }) => {
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
    } catch (err) {
      console.error('Failed to toggle premium:', err);
      toast.error('Failed to toggle premium status');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>🧑 Your Profile</h2>
        {subscriptionData?.premium && (
          <span style={{
            padding: '0.25rem 0.6rem',
            backgroundColor: '#ffc107',
            color: '#000',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold'
          }}>
            ⭐ PREMIUM
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.9rem', color: '#555' }}>
        Your anonymous ID: <code>{userId}</code>
      </p>

      {/* Trust Score Display */}
      {trustData && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: trustData.blocked ? '#ffe6e6' : '#f8f9fa',
          borderRadius: '8px',
          borderLeft: `4px solid ${trustData.blocked ? '#dc3545' : getTrustScoreColor(trustData.trustScore)}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Trust Score:</strong>
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: getTrustScoreColor(trustData.trustScore)
              }}>
                {trustData.trustScore}/100
              </span>
            </div>
            {trustData.blocked && (
              <span style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#dc3545',
                color: 'white',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                BLOCKED
              </span>
            )}
          </div>
          {trustData.blocked && (
            <p style={{ marginTop: '0.5rem', color: '#dc3545', fontSize: '0.875rem' }}>
              <strong>Reason:</strong> {trustData.blockedReason}
            </p>
          )}
          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem', marginBottom: 0 }}>
            Your trust score affects your ability to send messages. Report violations to keep the community safe.
          </p>
        </div>
      )}

      {/* Email Verification Status */}
      {trustData && trustData.email && !trustData.emailVerified && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          borderLeft: '4px solid #ffc107'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <strong style={{ fontSize: '1rem' }}>Email Not Verified</strong>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#856404', marginBottom: '0.75rem' }}>
            Please verify your email address to receive notifications for messages sent to your claimed plates.
          </p>
          <EmailVerification
            userId={userId}
            email={trustData.email}
            onVerified={() => {
              toast.success('✅ Email verified successfully!');
              fetchTrustScore(); // Refresh to show verified status
            }}
          />
        </div>
      )}

      {/* Email Verified Badge */}
      {trustData && trustData.email && trustData.emailVerified && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: '#d4edda',
          borderRadius: '8px',
          borderLeft: '4px solid #28a745',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>✅</span>
          <div>
            <strong style={{ color: '#155724' }}>Email Verified</strong>
            <p style={{ fontSize: '0.875rem', color: '#155724', margin: '0.25rem 0 0 0' }}>
              {trustData.email}
            </p>
          </div>
        </div>
      )}

      {/* ⚠️ MVP MOCK - Premium Toggle for Testing */}
      {MOCK_PREMIUM_ENABLED && subscriptionData && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          borderLeft: '4px solid #ff9800',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '0.875rem', color: '#856404', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            🧪 MVP MOCK MODE - Testing Only
          </p>
          <button
            onClick={handleMockTogglePremium}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}
          >
            Toggle Premium (Mock)
          </button>
          <p style={{ fontSize: '0.7rem', color: '#856404', marginTop: '0.5rem', marginBottom: 0 }}>
            ⚠️ Remove REACT_APP_MOCK_PREMIUM=true when Stripe is configured
          </p>
        </div>
      )}

      {/* Subscription Management */}
      {subscriptionData && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: subscriptionData.premium ? '#fff8e1' : '#f8f9fa',
          borderRadius: '8px',
          borderLeft: `4px solid ${subscriptionData.premium ? '#ffc107' : '#007bff'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div>
              <strong>Subscription:</strong>
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: subscriptionData.premium ? '#f57c00' : '#007bff'
              }}>
                {subscriptionData.premium ? '⭐ Premium' : 'Free'}
              </span>
            </div>
            {subscriptionData.premium && (
              <span style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#ffc107',
                color: '#000',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                ACTIVE
              </span>
            )}
          </div>

          {subscriptionData.premium ? (
            <>
              <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                {subscriptionData.subscriptionStatus === 'active' && subscriptionData.subscriptionEndDate && (
                  <>Next billing date: {new Date(subscriptionData.subscriptionEndDate).toLocaleDateString()}</>
                )}
                {subscriptionData.subscriptionStatus === 'canceled' && (
                  <>Access until: {new Date(subscriptionData.subscriptionEndDate).toLocaleDateString()}</>
                )}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.75rem' }}>
                ✅ Custom messages • ✅ Priority support • ✅ Premium badge
              </p>
              {loadingSubscription ? (
                <LoadingSpinner message="Opening subscription management..." />
              ) : (
                <button
                  onClick={handleManageSubscription}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}
                >
                  Manage Subscription
                </button>
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                Upgrade to Premium for $4.99/month to unlock:
              </p>
              <ul style={{ fontSize: '0.875rem', color: '#666', marginLeft: '1.25rem', marginBottom: '0.75rem' }}>
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
                  style={{
                    padding: '0.6rem 1.5rem',
                    backgroundColor: !ownedPlates.length ? '#ccc' : '#ffc107',
                    color: !ownedPlates.length ? '#666' : '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: !ownedPlates.length ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                  title={!ownedPlates.length ? 'Claim a plate first to upgrade' : ''}
                >
                  ⭐ Upgrade to Premium
                </button>
              )}
              {!ownedPlates.length && (
                <p style={{ fontSize: '0.75rem', color: '#dc3545', marginTop: '0.5rem', marginBottom: 0 }}>
                  Please claim a plate with your email before upgrading
                </p>
              )}
            </>
          )}
        </div>
      )}

      {ownedPlates.length > 0 ? (
        <>
          <h3 style={{ marginTop: '1.5rem' }}>🚘 Your Claimed Plates</h3>
          <ul style={{ paddingLeft: '1rem' }}>
  {ownedPlates.map((p) => (
    <li key={p._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
      <span style={{ fontWeight: 'bold' }}>{p.plate}</span>
      <button
        onClick={() => handleUnclaim(p._id, p.plate)}
        style={{
          marginLeft: '1rem',
          padding: '0.25rem 0.5rem',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        🗑 Remove
      </button>
    </li>
  ))}
</ul>
          <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '1rem' }}>
            💡 You'll receive email notifications when someone sends a message to your claimed plates.
          </p>
        </>
      ) : (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ color: '#555', marginBottom: '0.5rem' }}>
            <strong>You haven't claimed any plates yet.</strong>
          </p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Claim your license plate below to receive notifications when someone sends you a message!
          </p>
        </div>
      )}

      <h4 style={{ marginTop: '2rem' }}>➕ Claim a Plate</h4>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', color: '#555' }}>
          License Plate Number *
        </label>
        <input
          type="text"
          placeholder="e.g. CB1234AB"
          value={newPlate}
          onChange={(e) => setNewPlate(e.target.value)}
          style={{
            padding: '0.5rem',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '1rem'
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem', color: '#555' }}>
          Email Address * (for notifications)
        </label>
        <input
          type="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: '0.5rem',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '1rem'
          }}
        />
        <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.3rem', marginBottom: 0 }}>
          We'll email you when someone sends a message to this plate
        </p>
      </div>

      <button
        onClick={handleClaim}
        style={{
          padding: '0.6rem 1.5rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}
      >
        Claim Plate
      </button>
    </div>
  );
};

export default ProfilePage;
