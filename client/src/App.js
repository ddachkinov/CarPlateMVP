import React, { useEffect, useState } from 'react';
import { sendMessage, getOwnedPlates, getUserMessages, getSubscriptionStatus, getUserTrustScore } from './api/plates';
import PlateForm from './PlateForm';
import PlateList from './PlateList';
import './App.css';
import LoginPage from './LoginPage';
import ProfilePage from './ProfilePage';
import AdminDashboard from './AdminDashboard';
import PricingPage from './PricingPage';
import LoadingSpinner from './LoadingSpinner';
import FeedbackButton from './FeedbackButton';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [view, setView] = useState('inbox'); // 'inbox', 'profile', 'premium', or 'admin'
  const [plate, setPlate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ownedPlates, setOwnedPlates] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '');
  const [isPremium, setIsPremium] = useState(false);
  const [userEmail, setUserEmail] = useState('');

useEffect(() => {
  // ensure userId exists and is registered
  let uid = localStorage.getItem('userId');
  if (!uid) {
    uid = 'user-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('userId', uid);
  }
  setUserId(uid);

  // register user on backend (idempotent)
  fetch(`${process.env.REACT_APP_API_URL}/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: uid })
  }).catch(console.error);

  // initial load
  loadInbox();
  loadOwnedPlates();
}, []);

// 🔧 NEW: when ownedPlates changes, re-fetch inbox
useEffect(() => {
  if (!userId) return;
  loadInbox();
}, [ownedPlates, userId]);

  // Plate loading disabled in inbox-only mode
  const loadPlates = async () => {
    // setLoading(true);
    // const res = await getPlates();
    // setPlates(res.data);
    // setLoading(false);
  };

  const loadInbox = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    const res = await getUserMessages(userId);
    setInbox(res.data);
  };

  const inboxPlates = Array.from(new Set(inbox.map((m) => m.plate))).map((plate) => ({ plate }));
  const inboxMessages = inbox;

  const loadOwnedPlates = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const res = await getOwnedPlates(userId);
      setOwnedPlates(res.data);
      console.log('👀 Owned plates response:', res.data);
    } catch (err) {
      console.error('❌ Failed to load owned plates:', err.message);
    }
  };

  const loadPremiumStatus = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const [subRes, trustRes] = await Promise.all([
        getSubscriptionStatus(userId),
        getUserTrustScore(userId)
      ]);
      setIsPremium(subRes.data.premium || false);
      setUserEmail(trustRes.data.email || '');
    } catch (err) {
      console.error('❌ Failed to load premium status:', err.message);
    }
  };

  useEffect(() => {
    loadPlates();
    loadInbox();
    loadOwnedPlates();
    loadPremiumStatus();
  }, []);

  // 🔧 NEW: call after claim/unclaim (from ProfilePage) to refresh data and go to Inbox
  const handlePlateChanged = async () => {
    await loadOwnedPlates();
    await loadInbox();
    setView('inbox'); // optional: jump back to inbox so the new messages are visible
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (plate.trim().length < 2 || message.trim().length < 2) {
      toast.error('Plate and Message must be at least 2 characters!');
      return;
    }

    if (!userId) {
      toast.error('User ID not found. Please refresh the page.');
      return;
    }

    setLoading(true);
    try {
      console.log('Registering plate:', plate);
      console.log('Sending message:', { plate, message, senderId: userId });
      await sendMessage({
        plate: plate.trim(),
        message: message.trim(),
        senderId: userId
      });

      console.log('✅ Message sent successfully!');
      await loadPlates();
      await loadInbox();

      setPlate('');
      setMessage('');
      toast.success('✅ Message sent successfully!');
    } catch (err) {
      console.error('❌ Error during submit:', err.response?.data || err.message);

      // Handle different error responses
      if (err.response?.status === 429) {
        // Rate limit error
        const retryAfter = err.response.headers['retry-after'] || 60;
        const minutes = Math.ceil(retryAfter / 60);
        toast.warning(`⏱ Too many requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before sending another message.`, {
          autoClose: 5000
        });
      } else if (err.response?.status === 402) {
        // Premium required
        toast.error(err.response.data.error, {
          autoClose: 5000,
          onClick: () => setView('premium')
        });
      } else if (err.response?.status === 400) {
        // Validation error
        toast.error(err.response.data.error || 'Invalid input. Please check your message.');
      } else if (err.response?.status === 403) {
        // Forbidden (e.g., guest trying to claim plate)
        toast.error(err.response.data.error || 'You do not have permission to perform this action.');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    }

    setLoading(false);
  };

  if (!userId) {
    return <LoginPage onLogin={(id) => setUserId(id)} />;
  }

  return (
    <div className="app-container">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">CarPlate</h1>
      </header>

      {/* Navigation */}
      <nav className="nav-container">
        <button
          onClick={() => setView('inbox')}
          className={`nav-button ${view === 'inbox' ? 'active' : ''}`}
        >
          Inbox
        </button>

        <button
          onClick={() => setView('profile')}
          className={`nav-button ${view === 'profile' ? 'active' : ''}`}
        >
          Profile
        </button>

        <button
          onClick={() => setView('premium')}
          className={`nav-button premium ${view === 'premium' ? 'active' : ''}`}
        >
          Premium
        </button>

        <button
          onClick={() => setView('admin')}
          className={`nav-button ${view === 'admin' ? 'active' : ''}`}
        >
          Admin
        </button>
      </nav>

      {/* Main Content */}
      <main className="content-wrapper">
        {/* Form only in inbox */}
        {view === 'inbox' && (
          <PlateForm
            plate={plate}
            setPlate={setPlate}
            message={message}
            setMessage={setMessage}
            handleSubmit={handleSubmit}
            loading={loading}
            isGuest={!ownedPlates.length}
            isPremium={isPremium}
            onUpgradeClick={() => setView('premium')}
          />
        )}

        {loading ? (
          <LoadingSpinner message="Sending message..." />
        ) : (
          <>
            {view === 'inbox' && <PlateList plates={inboxPlates} messages={inboxMessages} />}

            {view === 'profile' && (
              <ProfilePage
                userId={userId}
                ownedPlates={ownedPlates}
                refreshOwned={loadOwnedPlates}
                onPlateChanged={handlePlateChanged}
                onPremiumChanged={loadPremiumStatus}
              />
            )}

            {view === 'premium' && <PricingPage userId={userId} userEmail={userEmail} isPremium={isPremium} />}

            {view === 'admin' && <AdminDashboard />}
          </>
        )}
      </main>

      {/* Floating Feedback Button - appears on all pages */}
      <FeedbackButton userId={userId} />
    </div>
  );
}

export default App;
