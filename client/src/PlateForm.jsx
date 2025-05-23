import React, { useState } from 'react';
import axios from 'axios'; // ✅ Needed

const PlateForm = ({ plate, setPlate, message, setMessage, handleSubmit, loading }) => {
  const [loadingOCR, setLoadingOCR] = useState(false);

  const isVerified = localStorage.getItem('verified') === 'true'; // ✅ Check verified from localStorage

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
  
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Compression failed'));
              const resizedFile = new File([blob], file.name, { type: 'image/jpeg' });
              resolve(resizedFile);
            },
            'image/jpeg',
            quality // 0 to 1
          );
        };
        img.src = event.target.result;
      };
  
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };
  

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    setLoadingOCR(true);
  
    try {
      const MAX_SIZE = 3 * 1024 * 1024; // 3MB in bytes
      const resizedFile = file.size > MAX_SIZE ? await resizeImage(file) : file;
      console.log(`Original: ${file.size / 1024} KB`);
      console.log(`Resized: ${resizedFile.size / 1024} KB`);
  
      const formData = new FormData();
      formData.append('upload', resizedFile);
      formData.append('config', JSON.stringify({
        region: 'none',
        detect_region: false
      }));
  
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
      console.error('Plate recognition failed:', error);
      alert('Failed to recognize plate. Please try again.');
    } finally {
      setLoadingOCR(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Plate + Upload */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem'
      }}>
        <input
          type="text"
          placeholder="Plate"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            width: '200px'
          }}
        />

        <label style={{
          border: '1px solid #007bff',
          background: 'white',
          color: '#007bff',
          padding: '0.5rem',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px'
        }}>
          📷
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {loadingOCR && (
        <p style={{ color: '#007bff', fontSize: '0.9rem', marginBottom: '1rem' }}>
          🛠 Reading plate, please wait...
        </p>
      )}

      {/* Message field */}
      {isVerified ? (
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
      ) : (
        <select
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            padding: '0.5rem',
            width: '90%',
            maxWidth: '600px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            height: '50px',
            marginBottom: '1rem'
          }}
        >
          <option value="">Select a message...</option>
          {predefinedMessages.map((msg, idx) => (
            <option key={idx} value={msg}>
              {msg}
            </option>
          ))}
        </select>
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
