import React, { useState } from 'react';
import { claimPlate } from './api/plates';

const ProfilePage = ({ userId, ownedPlates, refreshOwned }) => {
  const [newPlate, setNewPlate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleClaim = async () => {
    if (!newPlate.trim()) return;
    try {
      const response = await claimPlate({ plate: newPlate.trim().toUpperCase(), ownerId: userId });
      const { unreadCount, message } = response.data;

      if (unreadCount > 0) {
        setSuccess(`✅ Plate claimed! 🎉 ${message}`);
      } else {
        setSuccess('✅ Plate claimed (MVP: verified by default)');
      }

      setError('');
      setNewPlate('');
      refreshOwned();
    } catch (err) {
      if (err.response?.status === 409) {
        setError('❌ This plate is already claimed by another user');
      } else if (err.response?.status === 429) {
        // Rate limit error
        const retryAfter = err.response.headers['retry-after'] || 3600;
        const hours = Math.ceil(retryAfter / 3600);
        setError(`⏱ Too many plate claims. Please wait ${hours} hour${hours > 1 ? 's' : ''} before claiming more plates.`);
      } else if (err.response?.status === 400) {
        setError(err.response.data.error || '❌ Invalid plate number');
      } else if (err.response?.status === 403) {
        setError(err.response.data.error || '❌ You do not have permission to claim plates');
      } else {
        setError('❌ Failed to claim plate');
      }
      setSuccess('');
    }
  };

  const handleUnclaim = async (plateId) => {
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/plates/${plateId}?ownerId=${userId}`, {
        method: 'DELETE'
      });
      refreshOwned();
    } catch (err) {
      alert('❌ Failed to unclaim plate');
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
    <li key={p._id} style={{ display: 'flex', justifyContent: 'space-between' }}>
      {p.plate}
      <button onClick={() => handleUnclaim(p._id)} style={{ marginLeft: '1rem' }}>🗑 Remove</button>
    </li>
  ))}
</ul>
          <p style={{ fontSize: '0.85rem', color: '#888' }}>
            🛠️ For MVP, we assume verification is already completed.
          </p>
        </>
      ) : (
        <p style={{ marginTop: '1rem', color: '#555' }}>
  You haven’t registered any plates yet. <strong>(guest mode).</strong> <p style={{ marginTop: '1rem', color: '#555' }}>
  Claim your carPlate to become a Premium user.
</p> 
</p>
      )}

      <h4 style={{ marginTop: '2rem' }}>➕ Claim a Plate</h4>
      <input
        placeholder="e.g. CB1234AB"
        value={newPlate}
        onChange={(e) => setNewPlate(e.target.value)}
        style={{ padding: '0.5rem', width: '100%', marginBottom: '0.5rem' }}
      />
      <button onClick={handleClaim} style={{ padding: '0.5rem 1rem' }}>
        Claim
      </button>

      {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
      {success && <p style={{ color: 'green', marginTop: '0.5rem' }}>{success}</p>}
    </div>
  );
};

export default ProfilePage;
