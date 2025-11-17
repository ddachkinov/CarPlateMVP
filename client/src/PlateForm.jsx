import React, { useState } from 'react';
import axios from 'axios';

const PlateForm = ({ plate, setPlate, message, setMessage, handleSubmit, loading, isGuest, isPremium, onUpgradeClick, urgency, setUrgency, context, setContext }) => {
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [showUrgencyInfo, setShowUrgencyInfo] = useState(false);

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

      {/* 🔥 NEW: Everyone can send custom messages for FREE! */}
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
        placeholder="Or write a custom message... (FREE for everyone!)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{
          padding: '0.5rem',
          width: '90%',
          maxWidth: '600px',
          borderRadius: '8px',
          border: '1px solid #ccc',
          height: '100px',
          marginBottom: '0.5rem',
          resize: 'vertical'
        }}
      />

      {/* 🔥 NEW: Urgency Selector */}
      <div style={{ width: '90%', maxWidth: '600px', marginBottom: '0.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
          Urgency Level:
          <button
            type="button"
            onClick={() => setShowUrgencyInfo(!showUrgencyInfo)}
            style={{
              marginLeft: '0.5rem',
              background: 'none',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            ℹ️ What's this?
          </button>
        </label>
        <select
          value={urgency || 'normal'}
          onChange={(e) => setUrgency(e.target.value)}
          style={{
            padding: '0.5rem',
            width: '100%',
            borderRadius: '8px',
            border: '1px solid #ccc'
          }}
        >
          <option value="normal">🟢 Normal - Not time sensitive</option>
          <option value="urgent">🟡 Urgent - Please respond soon (15 min)</option>
          <option value="emergency">🔴 Emergency - Immediate response needed (5 min)</option>
        </select>

        {showUrgencyInfo && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            backgroundColor: '#e7f3ff',
            borderRadius: '8px',
            border: '1px solid #b3d9ff',
            fontSize: '0.875rem'
          }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>How urgency works:</p>
            <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
              <li><strong>Normal:</strong> No deadline, casual message</li>
              <li><strong>Urgent:</strong> 15-minute countdown. If no response, can escalate to parking enforcement</li>
              <li><strong>Emergency:</strong> 5-minute countdown. For blocking driveways, fire lanes, etc.</li>
            </ul>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
              💡 Premium car owners get instant SMS alerts to avoid escalation!
            </p>
          </div>
        )}
      </div>

      {/* 🔥 NEW: Optional Context Field */}
      <input
        type="text"
        placeholder="Optional: Add context (e.g., 'blocking driveway #5')"
        value={context || ''}
        onChange={(e) => setContext(e.target.value)}
        style={{
          padding: '0.5rem',
          width: '90%',
          maxWidth: '600px',
          borderRadius: '8px',
          border: '1px solid #ccc',
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}
      />

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