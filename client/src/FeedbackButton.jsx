import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL;

const FeedbackButton = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('other');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (message.trim().length < 5) {
      toast.error('Please provide at least 5 characters of feedback');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/feedback`, {
        userId,
        email: email.trim() || null,
        type,
        message: message.trim()
      });

      toast.success('Thank you for your feedback!');
      setMessage('');
      setEmail('');
      setType('other');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error(error.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0, 123, 255, 0.4)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)';
        }}
      >
        <span style={{ fontSize: '18px' }}>💬</span>
        Feedback
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Modal Content */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '550px',
                width: '90%',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>📝 Send Feedback</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#999'
                  }}
                >
                  ×
                </button>
              </div>

              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
                Help us improve! Share your ideas, report bugs, or suggest improvements.
              </p>

              <form onSubmit={handleSubmit}>
                {/* Feedback Type */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.95rem', color: '#333' }}>
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '1.5px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      backgroundColor: '#fafafa',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  >
                    <option value="bug">🐛 Bug Report</option>
                    <option value="feature">✨ Feature Request</option>
                    <option value="improvement">🔧 Improvement Suggestion</option>
                    <option value="other">💭 Other</option>
                  </select>
                </div>

                {/* Message */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.95rem', color: '#333' }}>
                    Message <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    required
                    maxLength={1000}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '1.5px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      minHeight: '140px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: '1.6',
                      backgroundColor: '#fafafa',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                    {message.length}/1000 characters
                  </div>
                </div>

                {/* Optional Email */}
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.95rem', color: '#333' }}>
                    Email <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#666' }}>(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '1.5px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      backgroundColor: '#fafafa',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                    We'll only use this to respond to your feedback
                  </div>
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={loading}
                    style={{
                      padding: '0.875rem 1.75rem',
                      border: '1.5px solid #ddd',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '500',
                      opacity: loading ? 0.6 : 1,
                      transition: 'all 0.2s',
                      color: '#555'
                    }}
                    onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#f5f5f5')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = 'white')}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || message.trim().length < 5}
                    style={{
                      padding: '0.875rem 1.75rem',
                      backgroundColor: (loading || message.trim().length < 5) ? '#ccc' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (loading || message.trim().length < 5) ? 'not-allowed' : 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      boxShadow: (loading || message.trim().length < 5) ? 'none' : '0 2px 8px rgba(0, 123, 255, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && message.trim().length >= 5) {
                        e.target.style.backgroundColor = '#0056b3';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#007bff';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    {loading ? 'Sending...' : 'Send Feedback'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default FeedbackButton;
