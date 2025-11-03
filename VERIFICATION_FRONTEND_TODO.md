# Email Verification Frontend Implementation

The backend email verification system is complete. This document outlines what needs to be added to the frontend.

## What's Already Done (Backend)

✅ Verification code model with auto-expiration
✅ Email sending service with beautiful HTML templates
✅ Verification API endpoints (/send-code, /verify-code, /resend-code, /status)
✅ Automatic code sending when claiming plates
✅ User model updated with emailVerified and emailVerifiedAt fields

## What Needs to Be Done (Frontend)

### 1. Add API Calls to `client/src/api/plates.js`

```javascript
// Verification & Email
export const sendVerificationCode = (data) => API.post('/verification/send-code', data);
export const verifyEmailCode = (data) => API.post('/verification/verify-code', data);
export const resendVerificationCode = (data) => API.post('/verification/resend-code', data);
export const getVerificationStatus = (userId) => API.get(`/verification/status/${userId}`);
```

### 2. Create Verification Component `client/src/EmailVerification.jsx`

Create a new component that shows:
- Input field for 6-digit verification code
- "Verify Email" button
- "Resend Code" button (with cooldown timer)
- Success/error messages
- Loading states

Example structure:
```javascript
const EmailVerification = ({ userId, email, onVerified }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const handleVerify = async () => {
    // Call verifyEmailCode API
    // On success, call onVerified()
  };

  const handleResend = async () => {
    // Call resendVerificationCode API
    // Start countdown timer
  };

  return (
    // UI with code input, verify button, resend button
  );
};
```

### 3. Update `ProfilePage.jsx`

After successful plate claiming:
```javascript
const handleClaim = async () => {
  // ... existing code ...

  const response = await claimPlate({
    plate: newPlate.trim().toUpperCase(),
    ownerId: userId,
    email: email.trim().toLowerCase()
  });

  const { verificationRequired, verificationMessage } = response.data;

  if (verificationRequired) {
    toast.info(verificationMessage, { autoClose: 10000 });
    // Show email verification UI
    setShowVerification(true);
  }
};
```

Add verification status display:
```javascript
{trustData && !trustData.emailVerified && (
  <div style={{
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#fff3cd',
    borderRadius: '8px',
    borderLeft: '4px solid #ffc107'
  }}>
    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
      ⚠️ Email Not Verified
    </p>
    <p style={{ fontSize: '0.875rem', color: '#856404' }}>
      Please check your email for a verification code to receive notifications.
    </p>
    <EmailVerification
      userId={userId}
      email={trustData.email}
      onVerified={() => {
        toast.success('Email verified successfully!');
        fetchTrustScore(); // Refresh to show verified status
      }}
    />
  </div>
)}
```

### 4. Show Verified Badge

In ProfilePage, add a verified badge next to email:
```javascript
{trustData?.emailVerified && (
  <span style={{
    marginLeft: '0.5rem',
    padding: '0.125rem 0.4rem',
    backgroundColor: '#28a745',
    color: 'white',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: 'bold'
  }}>
    ✓ VERIFIED
  </span>
)}
```

### 5. Testing the Flow

1. **Claim a plate with your real email**
2. **Check your inbox** for verification code
3. **Enter the 6-digit code** in the UI
4. **Click "Verify Email"**
5. **See success message** and verified badge appear

### 6. Example Verification UI (Full Component)

```javascript
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
      toast.success('Email verified successfully!');
      onVerified();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or expired code');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationCode({ email, userId });
      toast.success('Verification code resent to your email');
      setCountdown(60);
    } catch (err) {
      toast.error('Failed to resend code');
    }
    setResending(false);
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
        Verification Code (check your email)
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          style={{
            flex: 1,
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1.2rem',
            letterSpacing: '0.5rem',
            textAlign: 'center',
            fontFamily: 'monospace'
          }}
        />
        <button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: loading || code.length !== 6 ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </div>
      <button
        onClick={handleResend}
        disabled={resending || countdown > 0}
        style={{
          marginTop: '0.5rem',
          padding: '0.25rem 0.75rem',
          backgroundColor: 'transparent',
          color: countdown > 0 ? '#999' : '#007bff',
          border: 'none',
          cursor: countdown > 0 ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          textDecoration: 'underline'
        }}
      >
        {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
      </button>
    </div>
  );
};

export default EmailVerification;
```

## Backend API Reference

### Send Verification Code
```
POST /api/verification/send-code
Body: { email, userId }
Response: { message, email }
```

### Verify Code
```
POST /api/verification/verify-code
Body: { email, code, userId }
Response: { message, emailVerified }
```

### Resend Code
```
POST /api/verification/resend-code
Body: { email, userId }
Response: { message, email }
```

### Get Status
```
GET /api/verification/status/:userId
Response: { emailVerified, email, emailVerifiedAt }
```

## Notes

- Codes expire after **15 minutes**
- Codes are **6 digits** (e.g., 123456)
- Verification is **automatic** when claiming plates
- Users can **resend codes** if lost
- Verification status is shown in **Profile page**

## Future Enhancements (Not MVP)

- SMS verification (Tier 2) - commented in User model
- KYC verification (Tier 3) - commented in User model
- Phone number field - ready to uncomment when needed

---

**Implementation Priority:** Medium (nice to have for MVP, not blocking)
**Estimated Time:** 1-2 hours for frontend work
