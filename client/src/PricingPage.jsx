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
    <div>
      <div className="text-center mb-4">
        <h2 className="card-title mb-2">Choose Your Plan</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Upgrade to Premium to unlock powerful features and support CarPlate
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--spacing-xl)',
        marginBottom: 'var(--spacing-2xl)'
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
            'Send custom messages',
            'Premium supporter badge',
            'Priority email support',
            'Instant notifications (coming soon)',
            'Advanced inbox features (coming soon)',
            'Extended message history (coming soon)'
          ]}
          limitations={[]}
          buttonText={isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}
          buttonAction={isPremium ? handleManageSubscription : handleUpgrade}
          highlighted={true}
          current={isPremium}
        />
      </div>

      {/* Feature Comparison */}
      <div className="card" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <h3 className="card-title mb-3">Feature Comparison</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-sm)' }}>Feature</th>
              <th style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>Free</th>
              <th style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>Premium</th>
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
      <div className="card">
        <h3 className="card-title mb-3">Frequently Asked Questions</h3>

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
    <div className="card" style={{
      border: highlighted ? `3px solid var(--color-primary)` : undefined,
      backgroundColor: current ? 'var(--color-primary-subtle)' : undefined,
      position: 'relative',
      boxShadow: highlighted ? 'var(--shadow-lg)' : undefined
    }}>
      {highlighted && (
        <div style={{
          position: 'absolute',
          top: '-15px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          padding: 'var(--spacing-xs) var(--spacing-md)',
          borderRadius: 'var(--radius-xl)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-bold)'
        }}>
          MOST POPULAR
        </div>
      )}

      <h3 className="card-title mb-1">{title}</h3>
      <div className="mb-3">
        <span style={{
          fontSize: 'var(--font-size-3xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-primary)'
        }}>
          {price}
        </span>
        <span className="form-hint" style={{ marginLeft: 'var(--spacing-sm)' }}>/{period}</span>
      </div>

      <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 'var(--spacing-xl)' }}>
        {features.map((feature, index) => (
          <li key={index} style={{
            padding: 'var(--spacing-sm) 0',
            borderBottom: `1px solid var(--color-border-light)`,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}>
            <span className="badge badge-success" style={{ fontSize: 'var(--font-size-xs)' }}>✓</span>
            {feature}
          </li>
        ))}
        {limitations.map((limitation, index) => (
          <li key={`limit-${index}`} style={{
            padding: 'var(--spacing-sm) 0',
            borderBottom: `1px solid var(--color-border-light)`,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            color: 'var(--color-text-muted)'
          }}>
            <span className="badge badge-error" style={{ fontSize: 'var(--font-size-xs)' }}>✗</span>
            {limitation}
          </li>
        ))}
      </ul>

      <button
        onClick={buttonAction}
        disabled={buttonDisabled}
        className={`btn ${highlighted && !buttonDisabled ? 'btn-primary' : 'btn-secondary'}`}
        style={{ width: '100%' }}
      >
        {buttonText}
      </button>
    </div>
  );
};

// Feature Row Component
const FeatureRow = ({ feature, free, premium }) => (
  <tr style={{ borderBottom: `1px solid var(--color-border)` }}>
    <td style={{ padding: 'var(--spacing-sm)' }}>{feature}</td>
    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
      {free ? (
        <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-lg)' }}>✓</span>
      ) : (
        <span style={{ color: 'var(--color-error)' }}>—</span>
      )}
    </td>
    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
      {premium ? (
        <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-lg)' }}>✓</span>
      ) : (
        <span style={{ color: 'var(--color-error)' }}>—</span>
      )}
    </td>
  </tr>
);

// FAQ Item Component
const FAQItem = ({ question, answer }) => (
  <div className="mb-3">
    <h4 className="mb-1" style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-base)' }}>
      {question}
    </h4>
    <p className="mb-0" style={{ color: 'var(--color-text-secondary)', marginLeft: 'var(--spacing-md)' }}>
      {answer}
    </p>
  </div>
);

export default PricingPage;
