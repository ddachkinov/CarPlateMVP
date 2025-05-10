import React, { useState } from 'react';
import { claimPlate, getOwnedPlates } from './api/plates';

function UserProfile({ userId, ownedPlates, refreshOwned }) {
  const [newPlate, setNewPlate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleClaim = async () => {
    if (!newPlate.trim()) return;
    try {
      await claimPlate({ plate: newPlate.trim().toUpperCase(), userId });
      setSuccess('✅ Plate claimed successfully');
      setError('');
      setNewPlate('');
      refreshOwned(); // reload claimed plates
    } catch (err) {
      if (err.response?.status === 409) {
        setError('❌ This plate is already claimed by another user');
      } else {
        setError('❌ Failed to claim plate');
      }
      setSuccess('');
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3>🧑‍💼 Your Profile</h3>
      <input
        placeholder="Enter plate to claim"
        value={newPlate}
        onChange={(e) => setNewPlate(e.target.value)}
      />
      <button onClick={handleClaim}>Claim</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <h4>🚘 Your Claimed Plates</h4>
      <ul>
        {ownedPlates.map((p) => (
          <li key={p._id}>{p.plate}</li>
        ))}
      </ul>
    </div>
  );
}

export default UserProfile;
