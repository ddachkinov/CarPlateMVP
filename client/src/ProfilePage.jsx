import React, { useState, useEffect } from 'react';
import { claimPlate, getUserTrustScore } from './api/plates';
import { toast } from 'react-toastify';

const ProfilePage = ({ userId, ownedPlates, refreshOwned }) => {
  const [newPlate, setNewPlate] = useState('');
  const [email, setEmail] = useState('');
  const [trustData, setTrustData] = useState(null);

  useEffect(() => {
    // Fetch user's trust score
    const fetchTrustScore = async () => {
      try {
        const response = await getUserTrustScore(userId);
        setTrustData(response.data);
      } catch (err) {
        console.error('Failed to fetch trust score:', err);
      }
    };

    if (userId) {
      fetchTrustScore();
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
      const { unreadCount, message } = response.data;

      if (unreadCount > 0) {
        toast.success(`Plate claimed! 🎉 ${message}`, { autoClose: 5000 });
      } else {
        toast.success('Plate claimed! You\'ll receive email notifications when someone sends you a message.', { autoClose: 5000 });
      }

      setNewPlate('');
      setEmail('');
      refreshOwned();
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

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🧑 Your Profile</h2>
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
