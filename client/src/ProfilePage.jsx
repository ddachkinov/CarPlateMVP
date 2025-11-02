import React, { useState } from 'react';
import { claimPlate } from './api/plates';
import { toast } from 'react-toastify';

const ProfilePage = ({ userId, ownedPlates, refreshOwned }) => {
  const [newPlate, setNewPlate] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleUnclaim = async (plateId) => {
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

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🧑 Your Profile</h2>
      <p style={{ fontSize: '0.9rem', color: '#555' }}>
        Your anonymous ID: <code>{userId}</code>
      </p>

      {ownedPlates.length > 0 ? (
        <>
          <h3 style={{ marginTop: '1.5rem' }}>🚘 Your Claimed Plates</h3>
          <ul style={{ paddingLeft: '1rem' }}>
  {ownedPlates.map((p) => (
    <li key={p._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
      <span style={{ fontWeight: 'bold' }}>{p.plate}</span>
      <button
        onClick={() => handleUnclaim(p._id)}
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

      {error && (
        <p style={{
          color: '#dc3545',
          marginTop: '1rem',
          padding: '0.5rem',
          backgroundColor: '#f8d7da',
          borderRadius: '4px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </p>
      )}
      {success && (
        <p style={{
          color: '#155724',
          marginTop: '1rem',
          padding: '0.5rem',
          backgroundColor: '#d4edda',
          borderRadius: '4px',
          border: '1px solid #c3e6cb'
        }}>
          {success}
        </p>
      )}
    </div>
  );
};

export default ProfilePage;
