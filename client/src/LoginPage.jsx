// src/LoginPage.jsx
import React, { useState } from 'react';

const LoginPage = ({ onLogin }) => {
  const [nickname, setNickname] = useState('');

  const handleLogin = () => {
    const userId = 'user-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('userId', userId);
    localStorage.setItem('nickname', nickname.trim());
    onLogin(userId);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h2>👤 Welcome to CarPlate</h2>
      <p>To start sending or receiving messages, you’ll need an identity.</p>
      <input
        placeholder="Optional nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        style={{ padding: '0.5rem', marginTop: '1rem', borderRadius: '6px', border: '1px solid #ccc' }}
      />
      <button
        onClick={handleLogin}
        style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '6px', background: '#007bff', color: 'white', border: 'none' }}
      >
        Continue
      </button>
    </div>
  );
};

export default LoginPage;
