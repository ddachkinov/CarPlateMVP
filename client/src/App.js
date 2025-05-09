import React, { useEffect, useState } from 'react';
import { getPlates, sendMessage, getMessages, getOwnedPlates } from './api/plates';
import PlateForm from './PlateForm';
import PlateList from './PlateList';
import './App.css';
import { claimPlate } from './api/plates';
import OwnedPlates from './OwnedPlates';


function App() {
  const [plates, setPlates] = useState([]);
  const [plate, setPlate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState([]); // ✅ Safe default to empty array
  const [error, setError] = useState('');
  const [ownedPlates, setOwnedPlates] = useState([]);

  useEffect(() => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = 'user-' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('userId', userId);
    }
  
    fetch(`${process.env.REACT_APP_API_URL}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).catch(console.error);
  }, []);
  

  const loadPlates = async () => {
    setLoading(true);
    const res = await getPlates();
    setPlates(res.data);
    setLoading(false);
  };

  const loadMessages = async () => {
    const res = await getMessages();
    setMessages(res.data);
  }; 

  const loadOwnedPlates = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const res = await getOwnedPlates(userId);
      setOwnedPlates(res.data);
      console.log('👀 Owned plates response:', res.data);
    } catch (err) {
      console.error('❌ Failed to load owned plates:', err.message);
    }
  };

  useEffect(() => {
    loadPlates();
   loadMessages();
   loadOwnedPlates();
  }, []);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (plate.trim().length < 2 || message.trim().length < 2) {
      alert('Plate and Message must be at least 2 characters!');
      return;
    }
  
    setLoading(true);
    try {
      const senderId = localStorage.getItem('userId') || 'guest';
  
      console.log('Registering plate:', plate);
      await claimPlate({ plate: plate.trim(), userId: senderId });
  
      console.log('Sending message:', { plate, message, senderId });
      await sendMessage({
        plate: plate.trim(),
        message: message.trim(),
        senderId
      });
  
      console.log('✅ Message sent successfully!');
      await loadPlates();
      await loadMessages();
  
      setPlate('');
      setMessage('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('❌ Error during submit:', err.response?.data || err.message);
      setError('❌ Failed to send message. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  
    setLoading(false);
  };
  
  
  

  return (
    <div>
      <h1>🚗 CarPlate</h1>

      <p
        style={{
          color: 'green',
          opacity: success ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
        }}
      >
        ✅ Message sent successfully!
      </p>

      <PlateForm
        plate={plate}
        setPlate={setPlate}
        message={message}
        setMessage={setMessage}
        handleSubmit={handleSubmit}
        loading={loading}
      />

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search plates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '0.5rem',
            width: '300px',
            borderRadius: '8px',
            border: '1px solid #ccc'
          }}
        />
      </div>

      {loading ? (
  <p>Loading...</p>
) : (
  <>
    {error && (
      <p
        style={{
          color: 'red',
          opacity: error ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
        }}
      >
        {error}
      </p>
    )}
{/* 
    {ownedPlates.length > 0 && (
  <div style={{ marginBottom: '2rem' }}>
    <h3>🚘 Your Claimed Plates</h3>
    <ul style={{ paddingLeft: '1rem' }}>
      {ownedPlates.map((p) => (
        <li key={p._id} style={{ fontSize: '0.95rem' }}>{p.plate}</li>
      ))}
    </ul>
  </div>
)} */}

<OwnedPlates plates={ownedPlates} />

    <PlateList
      plates={plates.filter((p) =>
        p.plate.toLowerCase().includes(search.toLowerCase())
      )}
      messages={messages}
    />
  </>
)}
    </div>
  );
}

export default App;
