import React, { useState } from 'react';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const PricingPage = ({ userId, userEmail, isPremium }) => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!userEmail) {
      toast.error('Please add your email in your profile first');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/subscription/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: userEmail
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to start checkout');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/subscription/create-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to open subscription management');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast.error('Failed to open subscription management. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDowngrade = async () => {
    // Confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to downgrade to the Free plan?\n\n' +
      'You will lose access to:\n' +
      '• Custom messages\n' +
      '• Premium supporter badge\n' +
      '• Priority email support\n\n' +
      'Your claimed plates and message history will be preserved.'
    );

    if (!confirmed) return;

    // Check if in mock mode
    const isMockMode = process.env.REACT_APP_MOCK_PREMIUM === 'true';

    if (isMockMode) {
      // Mock mode: directly toggle premium status
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/subscription/mock-toggle-premium`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('Downgraded to Free plan');
          // Reload the page to refresh all premium status
          window.location.reload();
        } else {
          toast.error(data.error || 'Failed to downgrade');
        }
      } catch (error) {
        console.error('Error downgrading:', error);
        toast.error('Failed to downgrade. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Production mode: Open Stripe portal for cancellation
      handleManageSubscription();
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading checkout..." />;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Protect Your Car with CarPlate Premium</h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '1rem', fontSize: '1.1rem' }}>
        <strong>Never miss an urgent message about your car again.</strong>
      </p>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '3rem' }}>
        Get instant SMS alerts when someone needs to reach you about your vehicle. Avoid towing, tickets, and angry neighbors.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        {/* Free Plan */}
        <PricingCard
          title="Free"
          price="$0"
          period="forever"
          features={[
            '✅ Send unlimited messages (FREE for everyone!)',
            '✅ Send custom messages (no restrictions)',
            '✅ Claim unlimited license plates',
            '✅ Basic email notifications (delayed)',
            '✅ Message inbox for your plates'
          ]}
          limitations={[
            '⏱️ Delayed notifications (check manually)',
            '❌ No instant SMS alerts',
            '❌ No response ability',
            '❌ Risk missing urgent messages'
          ]}
          buttonText={!isPremium ? 'Current Plan' : 'Downgrade to Free'}
          buttonAction={isPremium ? handleDowngrade : null}
          buttonDisabled={!isPremium}
          current={!isPremium}
        />

        {/* Premium Plan - FOR CAR OWNERS */}
        <PricingCard
          title="Premium"
          subtitle="🚗 For Car Owners Who Want Peace of Mind"
          price="$9.99"
          period="per month"
          features={[
            '🚨 Instant SMS & Push Notifications',
            '⚡ Get alerted within seconds (avoid towing!)',
            '💬 Quick Response: Reply with ETA',
            '🏆 Responsive Driver Badge',
            '⏰ See urgency levels & countdown timers',
            '📊 Reputation score tracking',
            '🔔 Priority notifications for urgent messages',
            '✨ Premium support'
          ]}
          limitations={[]}
          buttonText={isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}
          buttonAction={isPremium ? handleManageSubscription : handleUpgrade}
          highlighted={true}
          current={isPremium}
        />
      </div>

      {/* Feature Comparison */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '2rem',
        borderRadius: '8px',
        marginTop: '2rem'
      }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Feature Comparison</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Feature</th>
              <th style={{ textAlign: 'center', padding: '0.75rem' }}>Free</th>
              <th style={{ textAlign: 'center', padding: '0.75rem' }}>Premium</th>
            </tr>
          </thead>
          <tbody>
            <FeatureRow feature="Send unlimited messages" free={true} premium={true} />
            <FeatureRow feature="Custom message content" free={true} premium={true} />
            <FeatureRow feature="Claim license plates" free={true} premium={true} />
            <FeatureRow feature="Instant SMS notifications" free={false} premium={true} />
            <FeatureRow feature="Instant push notifications" free={false} premium={true} />
            <FeatureRow feature="Quick response ability" free={false} premium={true} />
            <FeatureRow feature="See urgency & countdown timers" free={false} premium={true} />
            <FeatureRow feature="Reputation tracking" free={false} premium={true} />
            <FeatureRow feature="Responsive Driver badge" free={false} premium={true} />
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Frequently Asked Questions</h3>

        <FAQItem
          question="Why should I upgrade to Premium?"
          answer="Premium gives you instant SMS/push notifications so you never miss urgent messages about your car. Avoid towing ($200+), parking tickets ($50-150), and angry neighbors. Free users only get delayed email notifications."
        />

        <FAQItem
          question="Is sending messages really free?"
          answer="Yes! Anyone can send unlimited custom messages for FREE. We make money by helping car owners protect their vehicles with instant notifications, not by charging senders."
        />

        <FAQItem
          question="What happens if someone marks my message as urgent?"
          answer="Urgent messages have countdown timers (15 minutes). If the car owner doesn't respond in time, the message can be escalated to parking enforcement or towing. Premium owners get instant alerts to avoid this."
        />

        <FAQItem
          question="Can I cancel my subscription anytime?"
          answer="Yes! You can cancel your Premium subscription at any time. You'll retain access to Premium features until the end of your billing period. Your claimed plates and message history remain intact."
        />

        <FAQItem
          question="How do instant notifications work?"
          answer="Premium users receive SMS text messages and push notifications within seconds when someone messages their plate. Free users only get delayed email notifications that they must check manually."
        />
      </div>
    </div>
  );
};

// Pricing Card Component
const PricingCard = ({
  title,
  subtitle,
  price,
  period,
  features,
  limitations,
  buttonText,
  buttonAction,
  buttonDisabled,
  highlighted,
  current
}) => {
  return (
    <div style={{
      border: highlighted ? '3px solid #007bff' : '1px solid #dee2e6',
      borderRadius: '12px',
      padding: '2rem',
      backgroundColor: current ? '#e7f0ff' : 'white',
      position: 'relative',
      boxShadow: highlighted ? '0 8px 24px rgba(0,123,255,0.2)' : 'none'
    }}>
      {highlighted && (
        <div style={{
          position: 'absolute',
          top: '-15px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#dc3545',
          color: 'white',
          padding: '0.25rem 1rem',
          borderRadius: '20px',
          fontSize: '0.875rem',
          fontWeight: 'bold'
        }}>
          🔥 AVOID TOWING & TICKETS
        </div>
      )}

      <h3 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>{title}</h3>
      {subtitle && (
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{subtitle}</p>
      )}
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#007bff' }}>{price}</span>
        <span style={{ color: '#666', marginLeft: '0.5rem' }}>/{period}</span>
      </div>

      <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: '2rem' }}>
        {features.map((feature, index) => (
          <li key={index} style={{
            padding: '0.5rem 0',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ color: '#28a745', marginRight: '0.5rem' }}>✓</span>
            {feature}
          </li>
        ))}
        {limitations.map((limitation, index) => (
          <li key={`limit-${index}`} style={{
            padding: '0.5rem 0',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            color: '#999'
          }}>
            <span style={{ color: '#dc3545', marginRight: '0.5rem' }}>✗</span>
            {limitation}
          </li>
        ))}
      </ul>

      <button
        onClick={buttonAction}
        disabled={buttonDisabled}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: highlighted && !buttonDisabled ? '#007bff' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: buttonDisabled ? 'not-allowed' : 'pointer',
          opacity: buttonDisabled ? 0.6 : 1
        }}
      >
        {buttonText}
      </button>
    </div>
  );
};

// Feature Row Component
const FeatureRow = ({ feature, free, premium }) => (
  <tr style={{ borderBottom: '1px solid #dee2e6' }}>
    <td style={{ padding: '0.75rem' }}>{feature}</td>
    <td style={{ textAlign: 'center', padding: '0.75rem' }}>
      {free ? <span style={{ color: '#28a745', fontSize: '1.25rem' }}>✓</span> : <span style={{ color: '#dc3545' }}>✗</span>}
    </td>
    <td style={{ textAlign: 'center', padding: '0.75rem' }}>
      {premium ? <span style={{ color: '#28a745', fontSize: '1.25rem' }}>✓</span> : <span style={{ color: '#dc3545' }}>✗</span>}
    </td>
  </tr>
);

// FAQ Item Component
const FAQItem = ({ question, answer }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <h4 style={{ marginBottom: '0.5rem', color: '#007bff' }}>{question}</h4>
    <p style={{ color: '#666', marginLeft: '1rem' }}>{answer}</p>
  </div>
);

export default PricingPage;
