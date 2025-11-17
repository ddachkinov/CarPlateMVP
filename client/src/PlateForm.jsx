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
    <form onSubmit={handleSubmit} className="card">
      <div className="form-group">
        <label className="form-label">License Plate Number</label>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="e.g. ABC123"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
          />
          <label className="btn btn-secondary" style={{ margin: 0, cursor: 'pointer' }}>
            Upload Photo
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>
        </div>
        {loadingOCR && (
          <p className="form-hint" style={{ color: 'var(--color-primary)' }}>
            Reading plate from image, please wait...
          </p>
        )}
      </div>

{!isPremium ? (
  <>
    <div className="form-group">
      <label className="form-label">Select a Message</label>
      <select
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="form-select"
      >
        <option value="">Choose a predefined message...</option>
        {predefinedMessages.map((msg, idx) => (
          <option key={idx} value={msg}>{msg}</option>
        ))}
      </select>
    </div>

    <div className="form-group">
      <label className="form-label">Custom Message</label>
      <textarea
        readOnly
        placeholder="Upgrade to Premium to send custom messages"
        value=""
        onFocus={() => setShowWarning(true)}
        className="form-textarea"
        disabled
      />
      <p className="form-hint">Custom messages are available for Premium users only.</p>
    </div>

    {showWarning && onUpgradeClick && (
      <div className="alert alert-warning" style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          <strong>Guest users can only send predefined messages.</strong>
        </p>
        <button
          type="button"
          onClick={onUpgradeClick}
          className="btn btn-premium"
        >
          Claim a Plate to Unlock Premium
        </button>
      </div>
    )}
  </>
) : (
  <>
    <div className="form-group">
      <label className="form-label">Quick Message (Optional)</label>
      <select
        value=""
        onChange={(e) => setMessage(e.target.value)}
        className="form-select"
      >
        <option value="">Select a quick message...</option>
        {predefinedMessages.map((msg, idx) => (
          <option key={idx} value={msg}>{msg}</option>
        ))}
      </select>
    </div>

    <div className="form-group">
      <label className="form-label">Custom Message</label>
      <textarea
        placeholder="Write your custom message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="form-textarea"
      />
      <p className="form-hint">As a Premium user, you can send custom messages.</p>
    </div>
  </>
)}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary"
        style={{ width: '100%' }}
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
};

export default PlateForm;