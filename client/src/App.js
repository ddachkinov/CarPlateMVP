import React, { useEffect, useState } from 'react';
import {sendMessage, getOwnedPlates } from './api/plates';
import PlateForm from './PlateForm';
import PlateList from './PlateList';
import './App.css';
import { getUserMessages } from './api/plates';
import LoginPage from './LoginPage';
import ProfilePage from './ProfilePage';

function App() {
  const [view, setView] = useState('inbox'); // 'inbox' or 'profile'
  const [plate, setPlate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // const [messages, setMessages] = useState([]); // ✅ Safe default to empty array
  const [error, setError] = useState('');
  const [ownedPlates, setOwnedPlates] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '');
  const [lastGuestMessageTime, setLastGuestMessageTime] = useState(null);

  const isGuest = !ownedPlates.length;

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
  
// Plate loading disabled in inbox-only mode
  const loadPlates = async () => {
    // setLoading(true);
    // const res = await getPlates();
    // setPlates(res.data);
    // setLoading(false);
  };

  const loadInbox = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    const res = await getUserMessages(userId);
    setInbox(res.data);
  };

  const inboxPlates = Array.from(
    new Set(inbox.map((m) => m.plate))
  ).map((plate) => ({ plate }));
  
  const inboxMessages = inbox;

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
   loadInbox();
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
      console.log('Sending message:', { plate, message, senderId });
      await sendMessage({
        plate: plate.trim(),
        message: message.trim(),
        senderId
      });
  
      console.log('✅ Message sent successfully!');
      await loadPlates();
      await loadInbox(); 
  
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

    const predefinedMessages = [
      'Your headlights are on',
      'Your car is blocking another car',
      'Your window is open',
      'Your alarm is ringing',
      'Your tire looks flat'
    ];
    
    const isPredefined = predefinedMessages.includes(message.trim());
    
    if (isGuest) {
      const now = Date.now();

      if (isGuest && !predefinedMessages.some(msg => msg === message.trim())) {
        alert('🛑 Guests can only send predefined messages.');
        return;
      }
      
      if (!isPredefined) {
        alert('🛑 Guests can only send predefined messages.');
        return;
      }
    
      if (lastGuestMessageTime && now - lastGuestMessageTime < 60 * 1000) {
        alert('⏱ Please wait a moment before sending another message.');
        return;
      }
    
      setLastGuestMessageTime(now);
    }
    

  };
  
  
  if (!userId) {
    return <LoginPage onLogin={(id) => setUserId(id)} />;
  }

  return (
    <div>
      <div style={{
  display: 'flex',
  justifyContent: 'center',
  gap: '1rem',
  margin: '2rem 0'
}}>
  <button
    onClick={() => setView('inbox')}
    style={{
      padding: '0.5rem 1.5rem',
      borderRadius: '6px',
      border: view === 'inbox' ? '2px solid #007bff' : '1px solid #ccc',
      backgroundColor: view === 'inbox' ? '#e7f0ff' : 'white',
      color: view === 'inbox' ? '#007bff' : '#555',
      fontWeight: view === 'inbox' ? 'bold' : 'normal',
      cursor: 'pointer'
    }}
  >
    📥 Inbox
  </button>

  <button
    onClick={() => setView('profile')}
    style={{
      padding: '0.5rem 1.5rem',
      borderRadius: '6px',
      border: view === 'profile' ? '2px solid #007bff' : '1px solid #ccc',
      backgroundColor: view === 'profile' ? '#e7f0ff' : 'white',
      color: view === 'profile' ? '#007bff' : '#555',
      fontWeight: view === 'profile' ? 'bold' : 'normal',
      cursor: 'pointer'
    }}
  >
    👤 Profile
  </button>
</div>

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
        isGuest={!ownedPlates.length}
      />

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
  
{view === 'inbox' && (
  <PlateList plates={inboxPlates} messages={inboxMessages} />
)}

{view === 'profile' && (
  <ProfilePage
    userId={userId}
    ownedPlates={ownedPlates}
    refreshOwned={loadOwnedPlates}
  />
)}

  </>
)}
    </div>
  );
}

export default App;
