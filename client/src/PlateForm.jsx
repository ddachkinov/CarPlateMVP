import React, { useState } from 'react';
import axios from 'axios';

const PlateForm = ({ plate, setPlate, message, setMessage, handleSubmit, loading, isGuest, isPremium, onUpgradeClick }) => {
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const predefinedMessages = [
    "Your headlights are on",
    "Your car is blocking another car",
    "Your window is open",
    "Your alarm is ringing",
    "Your tire looks flat"
  ];

  const resizeImage = (file, maxWidth = 1024, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scaleFactor = maxWidth / img.width;
          canvas.width = Math.min(maxWidth, img.width);
          canvas.height = img.height * scaleFactor;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const resized = file.size > 3 * 1024 * 1024 ? await resizeImage(file) : file;

    const formData = new FormData();
    formData.append('upload', resized);
    formData.append('config', JSON.stringify({ region: 'none', detect_region: false }));

    setLoadingOCR(true);

    try {
      const res = await axios.post(
        'https://api.platerecognizer.com/v1/plate-reader/',
        formData,
        {
          headers: {
            Authorization: `Token ${process.env.REACT_APP_PLATE_RECOGNIZER_TOKEN}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (res.data.results.length > 0) {
        const plateNumber = res.data.results[0].plate.toUpperCase();
        setPlate(plateNumber);
      } else {
        alert('No plate detected. Please try another photo.');
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to recognize plate.');
    } finally {
      setLoadingOCR(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Plate"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc', width: '200px' }}
        />
        <label style={{ background: '#007bff', color: 'white', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
        📷
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {loadingOCR && (
        <p style={{ color: '#007bff', fontSize: '0.9rem', marginBottom: '1rem' }}>
          🛠 Reading plate, please wait...
        </p>
      )}

{!isPremium ? (
  <>
    <select
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      style={{
        padding: '0.5rem',
        width: '90%',
        maxWidth: '600px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        marginBottom: '0.5rem'
      }}
    >
      <option value="">Select a predefined message...</option>
      {predefinedMessages.map((msg, idx) => (
        <option key={idx} value={msg}>{msg}</option>
      ))}
    </select>

    <textarea
      readOnly
      placeholder="⭐ Upgrade to Premium to send custom messages"
      value=""
      onFocus={() => setShowWarning(true)}
      style={{
        padding: '0.5rem',
        width: '90%',
        maxWidth: '600px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        height: '100px',
        marginBottom: '1rem',
        backgroundColor: '#f5f5f5',
        color: '#777',
        resize: 'none',
        cursor: 'not-allowed'
      }}
    />

{showWarning && (
  <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
    <p style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
      🛑 Guests can only send predefined messages.
    </p>
    {onUpgradeClick && (
      <button
        type="button"
        onClick={onUpgradeClick}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#ffc107',
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '0.875rem'
        }}
      >
        ⭐ Claim a Plate to Unlock Custom Messages
      </button>
    )}
  </div>
)}

  </>
) : (
  <>
    <select
      value=""
      onChange={(e) => setMessage(e.target.value)}
      style={{
        padding: '0.5rem',
        width: '90%',
        maxWidth: '600px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        marginBottom: '0.5rem'
      }}
    >
      <option value="">💬 Quick message...</option>
      {predefinedMessages.map((msg, idx) => (
        <option key={idx} value={msg}>{msg}</option>
      ))}
    </select>

    <textarea
      placeholder="Write your message..."
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      style={{
        padding: '0.5rem',
        width: '90%',
        maxWidth: '600px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        height: '100px',
        marginBottom: '1rem'
      }}
    />
  </>
)}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        {loading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
};

export default PlateForm;