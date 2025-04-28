import React, { useState } from 'react';
import { API } from './api/plates'; 

function ClaimPlateForm() {
    const [plate, setPlate] = useState('');
    const [userId, setUserId] = useState(localStorage.getItem('userId') || 'guest' + Math.random().toString(36).substring(2, 10));
    const [message, setMessage] = useState('');
    

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/plates/claim', { plate, userId });
      localStorage.setItem('userId', userId); // ✅ Save to localStorage
      localStorage.setItem('claimedPlate', plate); // ✅ Save plate too
      setMessage('Plate claimed successfully!');
      setPlate('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error claiming plate');
    }
  };
  

  return (
    <div>
      <h2>Claim Your Plate</h2>
      <form onSubmit={handleSubmit}>
        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="Enter Plate Number"
        />
        <button type="submit">Claim</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default ClaimPlateForm;
