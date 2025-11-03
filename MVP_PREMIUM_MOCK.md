# MVP Premium Mock Setup

This document explains how to use the mock premium subscription system for MVP testing, and how to transition to real Stripe integration.

## ⚠️ Current Status: MOCK MODE

The premium subscription system is currently running in **MOCK MODE** for MVP testing. This allows you to test premium features without setting up Stripe.

---

## How to Enable Mock Premium (MVP Testing)

### Backend Setup

Add this to your `backend/.env` file:

```bash
# ⚠️ MVP MOCK - Remove when Stripe is configured
MOCK_PREMIUM=true
```

### Frontend Setup

Add this to your `client/.env` file:

```bash
# ⚠️ MVP MOCK - Remove when Stripe is configured
REACT_APP_MOCK_PREMIUM=true
```

### Restart Both Servers

```bash
# Backend
cd backend
node index.js

# Frontend (in another terminal)
cd client
npm start
```

---

## How to Use Mock Premium

### Option 1: Mock Toggle Button (Easiest)

1. Go to the **Profile** page
2. You'll see a yellow "MVP MOCK MODE" section at the top
3. Click **"Toggle Premium (Mock)"** to instantly enable/disable premium
4. Your premium status will update immediately

### Option 2: Mock Upgrade Flow

1. Click **"Upgrade to Premium"** on the Profile or Premium pages
2. Instead of redirecting to Stripe, it will instantly grant you premium
3. You'll be redirected back with `?subscription=success&mock=true` in the URL
4. Premium features will be immediately available

### What Gets Mocked

When you use mock premium:
- ✅ Premium status is set to `true`
- ✅ Subscription status is set to `active`
- ✅ Subscription end date is set to 30 days from now
- ✅ You can send custom messages (not just predefined ones)
- ✅ Premium badge appears on your messages
- ✅ Premium badge shows on your profile

---

## Testing Premium Features

Once premium is enabled (via mock):

### Custom Messages
1. Go to **Inbox** page
2. You can now type custom messages in the textarea
3. Send a custom message to any plate
4. The recipient will see your message with a ⭐ PREMIUM badge

### Premium Badge Display
- Your profile shows **⭐ PREMIUM** badge in the header
- Messages you send show **⭐ PREMIUM** badge next to your sender ID
- Subscription section shows **ACTIVE** status

### Toggle Back to Free
- Click **"Toggle Premium (Mock)"** again to test the free tier experience
- Custom message field will be disabled
- Premium badges will disappear

---

## Transitioning to Real Stripe Integration

When you're ready to use real Stripe payments:

### Step 1: Get Stripe API Keys

1. Sign up at [https://stripe.com](https://stripe.com)
2. Go to Developers > API Keys
3. Copy your **Secret Key** and **Publishable Key**
4. Create a webhook endpoint and get the **Webhook Secret**

### Step 2: Create Stripe Price

1. Go to Products in Stripe Dashboard
2. Create a product called "CarPlate Premium"
3. Set price to $4.99/month (recurring)
4. Copy the **Price ID** (starts with `price_`)

### Step 3: Update Backend Environment

In `backend/.env`, **remove** the mock flag and add real Stripe keys:

```bash
# ❌ REMOVE THIS LINE
# MOCK_PREMIUM=true

# ✅ ADD THESE LINES
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
FRONTEND_URL=https://yourapp.com
```

### Step 4: Update Frontend Environment

In `client/.env`, **remove** the mock flag:

```bash
# ❌ REMOVE THIS LINE
# REACT_APP_MOCK_PREMIUM=true
```

### Step 5: Clean Up Code (IMPORTANT!)

Search for and **remove** all mock code:

#### Backend: `backend/routes/subscription.js`

Remove these sections:
1. Line 13: `const MOCK_PREMIUM_ENABLED = process.env.MOCK_PREMIUM === 'true';`
2. Lines 22-59: Mock checkout session logic
3. Lines 102-127: Mock portal session logic
4. Lines 275-316: Mock toggle premium endpoint and warning

The endpoints should **only** contain the real Stripe logic.

#### Frontend: `client/src/ProfilePage.jsx`

Remove these sections:
1. Line 7: `const MOCK_PREMIUM_ENABLED = process.env.REACT_APP_MOCK_PREMIUM === 'true';`
2. Lines 156-168: `handleMockTogglePremium` function
3. Lines 236-268: Mock toggle UI section

#### Frontend: `client/src/api/plates.js`

Remove:
1. Lines 24-25: `mockTogglePremium` export

### Step 6: Set Up Stripe Webhook

1. In Stripe Dashboard, go to Developers > Webhooks
2. Add endpoint: `https://yourapp.com/api/subscription/webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to your backend `.env`

### Step 7: Test Real Stripe Flow

1. Restart backend and frontend
2. Click **"Upgrade to Premium"**
3. You should be redirected to real Stripe checkout
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify premium status is granted via webhook
7. Test subscription management portal

---

## Mock vs Real Stripe Comparison

| Feature | Mock Mode | Real Stripe |
|---------|-----------|-------------|
| Instant upgrade | ✅ Yes (1-click) | ❌ No (payment required) |
| Payment processing | ❌ No | ✅ Yes |
| Subscription management | ❌ Mock redirect only | ✅ Full portal |
| Webhooks | ❌ No | ✅ Yes |
| Recurring billing | ❌ No | ✅ Yes |
| Payment failures | ❌ No | ✅ Handled |
| Customer emails | ❌ No | ✅ Yes (from Stripe) |
| Testing toggle | ✅ Yes (toggle button) | ❌ No |

---

## Files Modified for Mock Support

### Backend
- `backend/routes/subscription.js` - Added mock logic (REMOVE when configuring Stripe)
- `backend/services/stripeService.js` - Already handles Stripe vs no-Stripe gracefully

### Frontend
- `client/src/ProfilePage.jsx` - Added mock toggle UI (REMOVE when configuring Stripe)
- `client/src/api/plates.js` - Added mock API call (REMOVE when configuring Stripe)

### Environment
- `backend/.env` - Set `MOCK_PREMIUM=true` (REMOVE when configuring Stripe)
- `client/.env` - Set `REACT_APP_MOCK_PREMIUM=true` (REMOVE when configuring Stripe)

---

## Checklist: Removing Mock Code

Before deploying to production with Stripe:

- [ ] Remove `MOCK_PREMIUM=true` from `backend/.env`
- [ ] Remove `REACT_APP_MOCK_PREMIUM=true` from `client/.env`
- [ ] Add real `STRIPE_SECRET_KEY` to `backend/.env`
- [ ] Add real `STRIPE_WEBHOOK_SECRET` to `backend/.env`
- [ ] Add real `STRIPE_PREMIUM_PRICE_ID` to `backend/.env`
- [ ] Remove mock logic from `backend/routes/subscription.js`
- [ ] Remove mock toggle UI from `client/src/ProfilePage.jsx`
- [ ] Remove mock API from `client/src/api/plates.js`
- [ ] Set up Stripe webhook endpoint
- [ ] Test real payment flow with Stripe test cards
- [ ] Verify webhook events are working
- [ ] Test subscription cancellation flow
- [ ] **Delete this file (`MVP_PREMIUM_MOCK.md`)**

---

## Questions?

If you need help setting up Stripe or have questions about the premium system:
1. Check [Stripe Documentation](https://stripe.com/docs)
2. Review `CLAUDE.md` for premium features architecture
3. Review `backend/services/stripeService.js` for integration details

---

**Last Updated**: 2025-11-03
**Status**: MVP Mock Mode Active
**Next Step**: Configure Stripe for production
