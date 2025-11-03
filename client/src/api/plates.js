// api/plates.js (frontend API client)
import axios from 'axios';

// ✅ Automatically uses correct API URL from .env (based on environment)
const API = axios.create({ baseURL: process.env.REACT_APP_API_URL });

export const getPlates = () => API.get('/plates');
export const claimPlate = (data) => API.post('/plates/claim', data); // Automatically marks as verified in MVP
export const sendMessage = (data) => API.post('/message', data);
export const getMessages = () => API.get('/plates/messages');
export const getOwnedPlates = (userId) => API.get(`/plates/owned/${userId}`);
export const registerUser = (userId) => API.post('/user/register', { userId });
export const getUserMessages = (userId) => API.get(`/plates/inbox/${userId}`);

// Trust & Safety
export const reportMessage = (data) => API.post('/report', data);
export const getUserTrustScore = (userId) => API.get(`/report/user/${userId}`);

// Subscription & Premium
export const getSubscriptionStatus = (userId) => API.get(`/subscription/status/${userId}`);
export const createCheckoutSession = (data) => API.post('/subscription/create-checkout-session', data);
export const createPortalSession = (data) => API.post('/subscription/create-portal-session', data);

// ⚠️ MVP MOCK - REMOVE WHEN STRIPE IS CONFIGURED
export const mockTogglePremium = (userId) => API.post('/subscription/mock-toggle-premium', { userId });

// Verification & Email
export const sendVerificationCode = (data) => API.post('/verification/send-code', data);
export const verifyEmailCode = (data) => API.post('/verification/verify-code', data);
export const resendVerificationCode = (data) => API.post('/verification/resend-code', data);
export const getVerificationStatus = (userId) => API.get(`/verification/status/${userId}`);


// 🛠️ Future enhancement (not in MVP):
// When claiming a plate, we'll instead POST a verification request with:
// export const requestPlateVerification = (data) => API.post('/plates/verify-request', data);
// Admin or AI will later mark it verified, or user uploads proof

// ✅ For MVP: backend trusts userId and marks the plate as owned immediately
// We'll show a frontend note saying: "Verification is assumed (MVP mock)"
