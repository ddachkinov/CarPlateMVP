import React, { useState, useEffect } from 'react';
import { verifyEmailCode, resendVerificationCode } from './api/plates';
import { toast } from 'react-toastify';

const EmailVerification = ({ userId, email, onVerified }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await verifyEmailCode({ email, code, userId });
      setCode('');
      // Let the parent component (ProfilePage) handle the success toast
      if (onVerified) {
        onVerified();
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error(err.response?.data?.error || 'Invalid or expired code');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationCode({ email, userId });
      toast.success('📧 Verification code resent to your email');
      setCountdown(60); // 60 second cooldown
    } catch (err) {
      console.error('Resend error:', err);
      toast.error(err.response?.data?.error || 'Failed to resend code');
    }
    setResending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && code.length === 6 && !loading) {
      handleVerify();
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
        Verification Code
      </label>
      <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.75rem' }}>
        We sent a 6-digit code to <strong>{email}</strong>
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyPress={handleKeyPress}
          placeholder="000000"
          maxLength={6}
          style={{
            flex: 1,
            maxWidth: '200px',
            padding: '0.75rem',
            border: '2px solid #007bff',
            borderRadius: '8px',
            fontSize: '1.5rem',
            letterSpacing: '0.5rem',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontWeight: 'bold'
          }}
        />
        <button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: loading || code.length !== 6 ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </div>

      <div style={{ marginTop: '0.75rem' }}>
        <button
          onClick={handleResend}
          disabled={resending || countdown > 0}
          style={{
            padding: '0',
            backgroundColor: 'transparent',
            color: countdown > 0 ? '#999' : '#007bff',
            border: 'none',
            cursor: countdown > 0 ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            textDecoration: 'underline'
          }}
        >
          {resending ? 'Sending...' : countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive it? Resend code"}
        </button>
      </div>

      <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem', marginBottom: 0 }}>
        💡 Check your spam folder if you don't see the email
      </p>
    </div>
  );
};

export default EmailVerification;
