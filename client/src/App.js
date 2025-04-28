import React, { useEffect, useState } from 'react';
import { getPlates, claimPlate, sendMessage, getMessages } from './api/plates';
import PlateForm from './PlateForm';
import PlateList from './PlateList';
import './App.css';

function App() {
  const [plates, setPlates] = useState([]);
  const [plate, setPlate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState([]); // ✅ Safe default to empty array

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

  useEffect(() => {
    loadPlates();
    loadMessages(); // ✅ Load both on page open
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!plate.trim() || !message.trim()) {
      alert('Please fill in both Plate and Message!');
      return;
    }
    setLoading(true);
    try {
      const senderId = localStorage.getItem('userId') || 'guest';
      
      console.log('Creating plate:', plate, senderId);
      await claimPlate({ plate, userId: senderId });
      console.log('✅ Plate created');
  
      console.log('Sending message:', plate, message, senderId);
      await sendMessage({ plate, message, senderId });
      console.log('✅ Message sent');
  
      await loadPlates();
      await loadMessages();
  
      setPlate('');
      setMessage('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('❌ Error during submit:', err.response ? err.response.data : err.message);
      alert('Error sending message');
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
        <PlateList
          plates={plates.filter((p) =>
            p.plate.toLowerCase().includes(search.toLowerCase())
          )}
          messages={messages}
        />
      )}
    </div>
  );
}

export default App;
