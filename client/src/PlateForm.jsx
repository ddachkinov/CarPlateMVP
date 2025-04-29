import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; // ← ✅ You need this now

const PlateForm = ({ plate, setPlate, message, setMessage, handleSubmit, loading }) => {
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const uploadRef = useRef(null); 

  // ⬇️ Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (uploadRef.current && !uploadRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('upload', file);
    formData.append('config', JSON.stringify({
      region: 'none',
      detect_region: false
    }));


    setLoadingOCR(true); // Show loading text

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

      console.log('Plate Recognizer Response:', res.data);

      if (res.data.results.length > 0) {
        const plateNumber = res.data.results[0].plate.toUpperCase();
        setPlate(plateNumber);
      } else {
        alert('No plate detected. Please try another photo.');
      }
    } catch (error) {
      console.error('Full error object:', error);
      console.log('Token:', process.env.REACT_APP_PLATE_RECOGNIZER_TOKEN);
      const message = error.response?.data?.error || 'Failed to recognize plate. Please try again.';
      alert(message);
    }
    
    
    finally {
      setLoadingOCR(false); // Always stop spinner
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
          style={{
            padding: '0.5rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            width: '200px'
          }}
        />
       <div style={{ position: 'relative' }} ref={uploadRef}>
  <button
    type="button"
    onClick={() => setShowOptions((prev) => !prev)}
    style={{
      border: '1px solid #007bff',
      background: 'white',
      color: '#007bff',
      padding: '0.5rem',
      borderRadius: '8px',
      cursor: 'pointer'
    }}
  >
    📷
  </button>

  {showOptions && (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      background: '#f9f9f9',
      border: '1px solid #ccc',
      borderRadius: '8px',
      marginTop: '0.5rem',
      padding: '0.5rem',
      zIndex: 1
    }}>
      {/* Upload from device */}
      <label style={{ display: 'block', cursor: 'pointer', marginBottom: '0.5rem' }}>
        📂 Upload
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </label>

      {/* Take a photo */}
      <label style={{ display: 'block', cursor: 'pointer' }}>
        📸 Take Photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  )}
</div>

      </div>

      {loadingOCR && (
        <p style={{ color: '#007bff', fontSize: '0.9rem', marginBottom: '1rem' }}>
          🛠 Reading plate, please wait...
        </p>
      )}

      <textarea
        placeholder="Message"
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
