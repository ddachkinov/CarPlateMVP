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
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Choose Your Plan</h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '3rem' }}>
        Upgrade to Premium to unlock powerful features and support CarPlate
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
            'Send predefined safety messages',
            'Claim unlimited license plates',
            'Receive email notifications',
            'Message inbox for your plates',
            'Report inappropriate messages'
          ]}
          limitations={[
            'No custom messages',
            'Standard support'
          ]}
          buttonText={!isPremium ? 'Current Plan' : 'Downgrade to Free'}
          buttonAction={isPremium ? handleDowngrade : null}
          buttonDisabled={!isPremium}
          current={!isPremium}
        />

        {/* Premium Plan */}
        <PricingCard
          title="Premium"
          price="$4.99"
          period="per month"
          features={[
            '✨ Send custom messages',
            '✨ Premium supporter badge',
            '✨ Priority email support',
            '⚡ Instant notifications (coming soon)',
            '📊 Advanced inbox features (coming soon)',
            '💾 Extended message history (coming soon)'
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
            <FeatureRow feature="Predefined safety messages" free={true} premium={true} />
            <FeatureRow feature="Custom messages" free={false} premium={true} />
            <FeatureRow feature="Claim license plates" free={true} premium={true} />
            <FeatureRow feature="Email notifications" free={true} premium={true} />
            <FeatureRow feature="Premium badge" free={false} premium={true} />
            <FeatureRow feature="Priority support" free={false} premium={true} />
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Frequently Asked Questions</h3>

        <FAQItem
          question="Can I cancel my subscription anytime?"
          answer="Yes! You can cancel your Premium subscription at any time. You'll retain access to Premium features until the end of your billing period."
        />

        <FAQItem
          question="What payment methods do you accept?"
          answer="We accept all major credit cards (Visa, Mastercard, American Express, Discover) through Stripe, our secure payment processor."
        />

        <FAQItem
          question="Will I lose my plates if I cancel?"
          answer="No! Your claimed plates and message history remain intact if you cancel Premium. You'll just be limited to predefined messages going forward."
        />

        <FAQItem
          question="Is my payment information secure?"
          answer="Absolutely. We use Stripe for payment processing, which is PCI-DSS compliant and handles billions of dollars in transactions annually."
        />
      </div>
    </div>
  );
};

// Pricing Card Component
const PricingCard = ({
  title,
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
          backgroundColor: '#007bff',
          color: 'white',
          padding: '0.25rem 1rem',
          borderRadius: '20px',
          fontSize: '0.875rem',
          fontWeight: 'bold'
        }}>
          MOST POPULAR
        </div>
      )}

      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{title}</h3>
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
