# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview & Problem Statement

**Problem Being Solved:**
CarPlate addresses the common situation where people need to communicate with vehicle owners about urgent issues (headlights left on, blocking driveways, car alarms, etc.) but have no way to contact them. Currently, people either leave physical notes (which can blow away or be missed) or have no recourse at all.

**🔥 NEW BUSINESS MODEL (Post-Pivot):**
CarPlate creates **urgency and fear of consequences** for car owners through an escalation system, making premium subscriptions a necessity rather than a nice-to-have.

**Core Value Proposition:**
- **For Senders (FREE):** Send unlimited custom messages to any license plate for free. No barriers.
- **For Car Owners (PREMIUM $9.99/mo):** Get instant SMS/push notifications to avoid towing ($200+), parking tickets ($50-150), and escalations. Free users only get delayed email notifications they must check manually.

**Key Innovation - Escalation System:**
1. Sender marks message as urgent/emergency
2. Car owner has 5-15 minutes to respond (countdown timer)
3. If no response → Auto-escalate to parking enforcement/towing
4. Premium owners get instant alerts to avoid consequences
5. Reputation system tracks response rate & avg response time

**MVP Goals:**
- ✅ Free sending for everyone (no premium gate for senders)
- ✅ Urgency levels with countdown timers (normal, urgent, emergency)
- ✅ Escalation system with auto-escalation after deadline
- ✅ Two-way communication (car owners can respond with ETA)
- ✅ Reputation & badges system (Responsive Driver, Quick Responder)
- ✅ Premium tier for car owners ($9.99/mo) → instant notifications
- ✅ OCR-based plate recognition for convenient message sending
- ✅ Trust & safety with AI moderation and reporting

**Tech Stack:**
- Frontend: React 19.1.0 with functional components and hooks
- Backend: Node.js with Express 5.1.0 and MongoDB/Mongoose 8.13.3
- OCR: PlateRecognizer API integration for automatic plate detection from images

## Development Commands

### Client (React Frontend)
```bash
cd client
npm start          # Development server on http://localhost:3000
npm test           # Run test suite in watch mode
npm run build      # Production build to build/ folder
```

### Backend (Express Server)
```bash
cd backend
node index.js      # Start server on port 5001 (or PORT env var)
```

**Note:** No test command configured for backend yet - only placeholder in package.json.

## Project Architecture

### Directory Structure
```
CarPlateApp/
├── client/          # React frontend
│   ├── src/
│   │   ├── api/plates.js     # Centralized API client with axios
│   │   ├── App.js            # Main component with routing logic
│   │   ├── PlateForm.jsx     # Form for plate input and OCR
│   │   ├── PlateList.jsx     # Display messages for plates
│   │   ├── ProfilePage.jsx   # User profile and owned plates
│   │   └── LoginPage.jsx     # User authentication flow
│   └── package.json
└── backend/         # Express API server
    ├── models/
    │   ├── User.js           # User schema with premium/trust features
    │   ├── Plate.js          # Plate ownership records
    │   └── Message.js        # Messages sent to plate owners
    ├── routes/
    │   ├── plates.js         # Plate and messaging endpoints
    │   ├── user.js           # User management endpoints
    │   └── message.js        # Message handling endpoints
    └── index.js              # Express server setup
```

### Data Models

**User Model** (backend/models/User.js):
- `userId`: Unique identifier (stored in localStorage)
- `verified`, `premium`, `trustScore`: User status fields
- `nickname`, `showPlate`: Profile customization
- 🔥 **NEW:** `reputation`: responseRate, averageResponseTime, totalMessages, totalResponses, escalationsReceived, escalationsResolved
- 🔥 **NEW:** `badges`: Array of badges (responsive_driver, quick_responder, etc.)
- 🔥 **NEW:** `lastResponseAt`: When they last responded to a message

**Plate Model** (backend/models/Plate.js):
- `plate`: License plate number (uppercase, unique)
- `ownerId`: References User who claimed the plate

**Message Model** (backend/models/Message.js):
- `plate`: Target license plate
- `senderId`: User who sent the message
- `message`: Message content
- `createdAt`: Timestamp
- 🔥 **NEW:** `urgency`: 'normal' | 'urgent' | 'emergency'
- 🔥 **NEW:** `escalated`, `escalatedAt`, `escalationLevel`: Escalation tracking
- 🔥 **NEW:** `escalationDeadline`: When auto-escalation will occur
- 🔥 **NEW:** `hasResponse`, `response`: { message, respondedAt, eta }
- 🔥 **NEW:** `responseTime`: Minutes to respond
- 🔥 **NEW:** `resolved`, `resolvedAt`: Resolution tracking
- 🔥 **NEW:** `context`: Optional additional context (e.g., "blocking driveway #5")

**🔥 NEW: Escalation Model** (backend/models/Escalation.js):
- `messageId`: Reference to the original message
- `plate`: License plate that was escalated
- `escalatedBy`: User who initiated escalation
- `level`: 'reminder_sent' | 'authority_notified' | 'towing_requested'
- `urgency`: 'urgent' | 'emergency'
- `authorityContacted`, `authorityType`, `authorityReferenceNumber`: Authority notification tracking
- `resolved`, `resolvedAt`, `outcome`: Resolution tracking

### 🔥 NEW: Escalation & Response Architecture

**The Core Innovation - Escalation Flow:**

This is what makes CarPlate a **necessary** app instead of a nice-to-have:

1. **Sender marks urgency level:**
   - 🟢 Normal: No deadline, casual message
   - 🟡 Urgent: 15-minute countdown, can escalate to parking enforcement
   - 🔴 Emergency: 5-minute countdown, for blocking driveways/fire lanes

2. **Automatic escalation deadline calculation:**
   - Server sets `escalationDeadline` field on message
   - Background cron job checks for expired messages every minute
   - Auto-escalates if no response within deadline

3. **Escalation levels:**
   - Level 1: `reminder_sent` - Additional urgent notification to car owner
   - Level 2: `authority_notified` - Contact parking enforcement/property manager
   - Level 3: `towing_requested` - Request towing service

4. **Car owner response system:**
   - Car owners can respond with quick replies: "Moving in 5 min", "On my way"
   - Response tracks `responseTime` (minutes from message creation to response)
   - Resolves escalation if responded before authority contact
   - Updates user reputation: `responseRate`, `averageResponseTime`

5. **Reputation & Badges:**
   - **Responsive Driver** badge: 90%+ response rate
   - **Quick Responder** badge: Avg response time ≤ 10 minutes
   - **Frequent Offender** badge: Multiple escalations with no response

6. **Premium value proposition:**
   - Free users: Delayed email notifications (check inbox manually)
   - Premium users ($9.99/mo): Instant SMS + push notifications
   - **Key insight:** Fear of towing ($200+) makes $10/mo feel cheap
   - Premium users can respond before escalation → better reputation

**API Endpoints:**

**Escalation Routes** (`/api/escalation`):
- `POST /escalate/:messageId` - Manually escalate a message
- `POST /auto-escalate` - Background job endpoint (called by cron every minute)
- `GET /pending` - Get all pending escalations (for admin/authority dashboard)
- `PATCH /:escalationId/resolve` - Mark escalation as resolved

**Response Routes** (`/api/response`):
- `POST /:messageId` - Respond to a message (car owner only)
- `GET /quick-responses` - Get predefined quick response options
- `GET /conversation/:messageId` - Get full conversation thread

**Why This Works:**

- **Network effects:** More senders using it = more car owners subscribe
- **Fear-based motivation:** Towing/tickets cost $50-200, premium is only $10/mo
- **Viral loop:** Escalations create urgency → car owners hear about app → they subscribe
- **B2B potential:** Apartment buildings, parking garages want to manage their own escalations

### Trust & Safety Architecture

**Trust Score System:**
- All users start with trust score of 100
- Each report decreases reported user's score by 10 points
- Automatic blocking when score drops below 50
- Trust score displayed in user profile
- Blocked users cannot send messages or claim plates

**Report Model** (backend/models/Report.js):
- `reportedUserId`: User being reported
- `reporterId`: User who submitted the report
- `messageId`: Reference to the reported message
- `reason`: Report reason/description
- `status`: pending | reviewed | dismissed | action_taken
- `adminNotes`: Admin comments on the report
- `reviewedBy`, `reviewedAt`: Admin review tracking

**Blocking System:**
- User.blocked field prevents all message/plate actions
- Block check middleware (`checkUserBlocked`) on all user actions
- Automatic blocking when trust score < 50
- Admin can manually block/unblock users
- Blocked users see clear error messages

**AI Content Moderation** (Optional):
- OpenAI Moderation API integration
- Automatically screens all messages before sending
- Severity levels: high (auto-block), medium (flag for review), low (allow but log)
- Creates automatic reports for flagged content
- Reduces trust score by 20 points for AI-detected violations
- Falls back gracefully if OpenAI API key not configured

**Admin Dashboard** (`/admin` route in frontend):
- Secure admin authentication via `X-Admin-Key` header
- View all reports with filtering (pending, reviewed, dismissed)
- Take actions: block user, reduce trust, dismiss report
- User management: view all users, filter by blocked/trust score, view owned plates
- Statistics dashboard: total users, blocked users, pending reports, average trust score
- Premium badge display for premium users

### Premium Features Architecture

**Subscription System:**
- Stripe integration for payment processing ($4.99/month)
- Two tiers: Free (predefined messages only) vs Premium (custom messages)
- Subscription fields in User model: `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`, `subscriptionEndDate`
- Premium status check: `user.premium === true && user.subscriptionStatus === 'active'`

**Message Restrictions:**
- Validation middleware checks premium status before allowing custom messages
- Free users: Can only send predefined safety messages
- Registered non-premium users: Same as free users, but can claim plates
- Premium users: Can send any custom message (2-500 characters, sanitized)
- Returns 402 Payment Required status when free user tries custom message

**Stripe Integration:**
- `backend/services/stripeService.js`: Stripe SDK wrapper with error handling
- Checkout sessions for new subscriptions with metadata (userId, plan)
- Customer portal for subscription management (cancel, update payment)
- Webhook handling for subscription lifecycle events
- Raw body parser middleware for webhook signature verification

**Webhook Events Handled:**
- `checkout.session.completed`: Updates stripeCustomerId and email
- `customer.subscription.created/updated`: Sets premium=true, updates status
- `customer.subscription.deleted`: Sets premium=false, marks as canceled
- `invoice.payment_failed`: Updates status to past_due

**Frontend UI:**
- PricingPage component with feature comparison (Free vs Premium)
- ProfilePage shows subscription status with upgrade/manage buttons
- Premium badge displayed in messages, profile, and admin dashboard
- Upgrade prompts when free users attempt custom messages (402 error handling)
- Toast notifications with "Upgrade to Premium" button on custom message attempt

**API Endpoints** (`/api/subscription`):
- `POST /create-checkout-session`: Create Stripe checkout for new subscription
- `POST /create-portal-session`: Open Stripe customer portal for management
- `POST /webhook`: Handle Stripe webhook events (requires raw body)
- `GET /status/:userId`: Get user's subscription status

### Key API Endpoints

**Plates Routes** (`/api/plates`):
- `GET /` - List all plates
- `POST /claim` - Claim plate ownership (MVP: immediate ownership)
- `GET /owned/:userId` - Get plates owned by user
- `GET /inbox/:userId` - Get messages for user's plates
- `DELETE /:plateId?ownerId=...` - Unclaim plate

**Message Routes** (`/api/message`):
- `POST /` - Send message to plate owner

**User Routes** (`/api/user`):
- `POST /register` - Register/update user

**Report Routes** (`/api/report`):
- `POST /` - Submit a message report (decrements trust score, auto-blocks if needed)
- `GET /user/:userId` - Get user's trust score and blocked status

**Admin Routes** (`/api/admin`) - Requires `X-Admin-Key` header:
- `GET /stats` - Dashboard statistics (total users, blocked users, pending reports, etc.)
- `GET /reports?status=pending` - Get all reports with optional status filter
- `PATCH /reports/:reportId` - Update report status and take action (block, adjust trust)
- `GET /users` - Get all users with optional filtering (blocked, trust score range)
- `PATCH /users/:userId` - Update user (block/unblock, adjust trust score)

### User Types & Authentication Flow

**🔥 MAJOR CHANGE:** Premium is now for **CAR OWNERS**, not senders!

**1. Anyone Can Send (FREE):**
- Auto-assigned userId (no signup required)
- 🔥 **NEW:** Can send **unlimited custom messages for FREE**
- Can mark messages as urgent/emergency with escalation timers
- Can add context to messages
- Rate limited to 1 message per minute (anti-spam)
- Anonymous sending (shows as "user-xxxx" to recipients)
- Can register and claim plates at any time

**2. Registered Car Owners (FREE tier):**
- Can claim one or more license plates
- Receive messages in dedicated inbox
- ⚠️ **Delayed email notifications only** (must check manually)
- ❌ **No instant SMS/push notifications**
- ❌ **Cannot respond to messages with ETA**
- **Risk:** Miss urgent messages → get towed/ticketed

**3. Premium Car Owners** ($9.99/month subscription):
- 🔥 **Instant SMS notifications** (within seconds)
- 🔥 **Instant push notifications** (browser/mobile)
- 🔥 **Can respond with ETA:** "Moving in 5 min", "On my way"
- 🔥 **Reputation tracking:** Response rate, avg response time
- 🔥 **Earn badges:** Responsive Driver, Quick Responder
- 🔥 **See urgency levels & countdown timers** prominently
- Premium badge displayed on responses
- Priority customer support
- Access to Stripe customer portal for subscription management
- **Value prop:** Avoid towing ($200+), tickets ($50-150), angry neighbors

**Key Insight:** Free senders create urgency → car owners fear consequences → premium subscriptions sell themselves

### Environment Configuration

**Client** (client/.env):
- `REACT_APP_API_URL`: Backend API base URL (defaults to http://localhost:5001/api)
- `REACT_APP_PLATE_RECOGNIZER_TOKEN`: OCR service API token

**Backend** (backend/.env):
- `MONGO_URI`: MongoDB connection string
- `MONGO_DB_NAME`: Database name
- `PORT`: Server port (defaults to 5001)
- `RESEND_API_KEY`: Resend API key for email notifications
- `FROM_EMAIL`: Sender email address for notifications
- `OPENAI_API_KEY`: (Optional) OpenAI API key for AI content moderation
- `ADMIN_KEY`: Secret key for admin dashboard authentication
- `REDIS_HOST`, `REDIS_PORT`: (Optional) Redis for distributed rate limiting
- `STRIPE_SECRET_KEY`: (Optional) Stripe API secret key for premium subscriptions
- `STRIPE_WEBHOOK_SECRET`: (Optional) Stripe webhook signing secret
- `FRONTEND_URL`: Frontend URL for Stripe redirects (defaults to http://localhost:3000)

### Development Patterns

**Frontend:**
- State management via React hooks (`useState`, `useEffect`)
- API calls centralized in `client/src/api/plates.js`
- Component props for data flow between parent/child components
- Conditional rendering for guest vs registered user features

**Backend:**
- RESTful API design with Express router modules
- Mongoose for MongoDB ODM with schema validation
- CORS enabled for cross-origin frontend requests
- Error handling with try/catch and appropriate HTTP status codes

### Key Features & MVP Functionality

**Core Messaging System:**
1. **Plate Registration & Messaging**: Enter license plate → send message → recipient gets it in inbox
2. **OCR Integration**: Upload photo → PlateRecognizer API → auto-fill plate number (3MB limit with auto-resize)
3. **Predefined Safety Messages**: "Your headlights are on", "Your car is blocking another car", "Your window is open", "Your alarm is ringing", "Your tire looks flat"
4. **Anonymous Communication**: Messages show sender as anonymous ID (unless user opts to show plate)

**User Management:**
1. **Plate Claiming**: Car owners can claim their plates to receive messages (MVP: instant ownership, no verification in MVP versrion)
2. **Inbox System**: Claimed plates receive messages in organized inbox view
3. **Message Grouping**: Duplicate predefined messages from multiple senders show as "3 people sent this message"
4. **Guest Restrictions**: Unverified users limited to predefined messages with 1-minute rate limiting

**Safety & Trust Features:**
1. **Server-Side Trust Score System**: All users start with score of 100, decremented by reports (10 points per report)
2. **Automatic User Blocking**: Users automatically blocked when trust score drops below 50
3. **Message Reporting System**: Backend API for reporting inappropriate messages with admin review
4. **AI Content Moderation**: Optional OpenAI integration for automatic message screening (blocks high-severity violations)
5. **Admin Dashboard**: Full admin interface for managing reports, users, and trust scores
6. **Plate Normalization**: All plates stored as uppercase and trimmed for consistency
7. **Privacy Protection**: Photos never stored, only plate text extracted via OCR

### Current MVP Status & Limitations

**Implemented Features:**
- ✅ Basic messaging system with predefined messages
- ✅ Plate claiming and ownership
- ✅ Guest user restrictions and rate limiting
- ✅ OCR integration with image resize
- ✅ Inbox system for claimed plates
- ✅ Message grouping for duplicates
- ✅ **Server-side trust score and reporting system**
- ✅ **Automatic user blocking (trust score < 50)**
- ✅ **AI content moderation with OpenAI (optional)**
- ✅ **Admin dashboard for report/user management**
- ✅ **Email notifications (Resend integration)**
- ✅ **Premium subscription system with Stripe**
- ✅ **Custom messages for premium users only**
- ✅ **Premium badge display throughout UI**
- ✅ **Subscription management (upgrade, cancel via Stripe portal)**
- ✅ Plate normalization and data consistency
- ✅ Toast notifications and loading states
- ✅ Health monitoring endpoint

**Current Limitations (Future Enhancements):**
- No actual plate verification (immediate ownership on claim)
- Simple localStorage-based authentication (no passwords/OAuth)
- No real-time notifications (manual refresh required)
- No advanced inbox features (grouping by sender, importance flags)
- Premium features limited to custom messages (future: instant notifications, advanced inbox)

**⚠️ MVP MOCK MODE - Premium Subscriptions:**
- Premium subscription system is currently in **MOCK MODE** for MVP testing
- Set `MOCK_PREMIUM=true` in backend and `REACT_APP_MOCK_PREMIUM=true` in frontend to enable
- Allows instant premium toggling without Stripe configuration
- See `MVP_PREMIUM_MOCK.md` for complete setup and transition guide
- **REMOVE mock code when configuring real Stripe integration**

## Future Roadmap (from Documentation)

**Priority Enhancements:**
1. ~~**Premium Features**: Custom messaging~~ **✅ COMPLETED** (instant notifications, advanced inbox still pending)
2. **Verification System**: SMS/OAuth verification, document upload for plate ownership
3. ~~**Trust & Safety**: Server-side trust scoring, automatic user blocking with AI capabilities~~  **✅ COMPLETED**
4. ~~**Admin Tools**: Backend reporting system, user management interface, usage statistics pane~~ **✅ COMPLETED**
5. **Notifications**: Push notifications with batch vs instant delivery tiers (partially complete - email only)
6. **Mobile UX**: Polish upload flow, toast notifications, dark mode
7. **Localization**: Plate region detection, international format support

## Common Development Tasks

When working on this codebase:

1. **Adding new API endpoints**: Create in appropriate route file, update client/src/api/plates.js
2. **Database changes**: Modify Mongoose schemas in backend/models/
3. **Frontend components**: Follow existing pattern with .jsx files and functional components
4. **User flow changes**: Consider guest vs registered vs premium user permissions
5. **Message handling**: Remember plate normalization (trim + uppercase) for consistency
6. **Environment changes**: Update both client and backend .env files as needed
7. **Testing**: Currently limited to React's default test setup - backend testing not configured

**Development Notes:**
- PlateRecognizer API has 3MB image limit (auto-resize implemented)
- All plates normalized to uppercase for consistency
- Guest users have 1-minute rate limiting on message sending
- Inbox auto-refreshes when plates are claimed/unclaimed
- Trust score managed server-side with automatic blocking
- AI moderation is optional - gracefully degrades if OPENAI_API_KEY not set
- Admin dashboard requires ADMIN_KEY in environment variables

## Session History

### 2025-11-03 (Session 3)
**Completed - Premium Features Foundation (Option 3):**

**Phase 1: Stripe Integration**
- Installed Stripe SDK and configured stripe service wrapper
- Created checkout session endpoint for new subscriptions ($4.99/month)
- Implemented webhook handler for subscription lifecycle events
- Added raw body parser middleware for webhook signature verification

**Phase 2: Subscription Management**
- Extended User model with Stripe subscription fields (stripeCustomerId, stripeSubscriptionId, subscriptionStatus, subscriptionEndDate)
- Implemented subscription status endpoint for frontend
- Built customer portal integration for subscription management
- Webhook handlers for checkout.session.completed, subscription created/updated/deleted, payment failures

**Phase 3: Premium Features**
- Updated validation middleware to check premium status before allowing custom messages
- Returns 402 Payment Required when non-premium users try custom messages
- Premium check: `user.premium === true && user.subscriptionStatus === 'active'`
- Graceful handling when Stripe keys not configured (dev mode)

**Phase 4: Frontend UI**
- Created PricingPage component with Free vs Premium feature comparison
- Integrated pricing page into main navigation (⭐ Premium button)
- Added upgrade prompts with toast notifications on 402 error
- Built subscription management section in ProfilePage (shows status, billing date, upgrade/manage buttons)
- Premium badge display in ProfilePage header, PlateList messages, and AdminDashboard
- Disabled upgrade button until user claims a plate (email required)

**Phase 5: Testing & Documentation**
- Documented Premium Features Architecture in CLAUDE.md
- Added Stripe environment variables documentation
- Updated API endpoints section with subscription routes
- Updated User Types section with premium user tier
- Marked Premium Features as completed in roadmap

**Key Features Added:**
- Two-tier system: Free (predefined messages) vs Premium ($4.99/month, custom messages)
- Stripe checkout and customer portal integration
- Premium badge displayed throughout UI
- Subscription management in user profile
- 402 error handling with upgrade prompts
- Backend validation prevents custom messages for non-premium users

**Environment Variables Added:**
- `STRIPE_SECRET_KEY`: Stripe API secret key (optional for dev)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `FRONTEND_URL`: Frontend URL for Stripe redirects

**Files Created:**
- `backend/services/stripeService.js`: Stripe SDK wrapper
- `backend/routes/subscription.js`: Subscription API endpoints
- `client/src/PricingPage.jsx`: Pricing comparison page

**Files Modified:**
- `backend/models/User.js`: Added subscription fields
- `backend/middleware/validation.js`: Premium status checking
- `backend/index.js`: Raw body parser for webhooks
- `client/src/App.js`: Premium navigation, 402 error handling
- `client/src/ProfilePage.jsx`: Subscription management UI
- `client/src/PlateList.jsx`: Premium badge in messages
- `client/src/PlateForm.jsx`: Upgrade prompt for guests
- `client/src/api/plates.js`: Subscription API functions
- `client/src/AdminDashboard.jsx`: Premium badge in admin view

### 2025-11-02 (Session 2)
**Completed - Trust & Safety Enhancements (Option 2):**

**Phase 1: Backend Trust System**
- Created Report model for tracking message reports (status, admin notes, review tracking)
- Updated User model with blocked status fields (blocked, blockedReason, blockedAt)
- Built report submission endpoint with automatic trust score decrement
- Implemented automatic blocking when trust score drops below 50
- Added block check middleware to prevent blocked users from taking actions

**Phase 2: Admin Interface**
- Created comprehensive admin API routes with secure authentication (X-Admin-Key)
- Built AdminDashboard component with tabs for stats, reports, and users
- Admin can view/filter reports and take actions (block user, reduce trust, dismiss)
- User management with ability to manually block/unblock users
- Real-time statistics dashboard (total users, blocked users, pending reports, avg trust score)

**Phase 3: AI Content Moderation**
- Integrated OpenAI Moderation API for automatic message screening
- Severity-based auto-actions: high (block), medium (flag), low (allow but log)
- Automatic report creation for AI-flagged content
- Trust score penalty (20 points) for AI-detected violations
- Graceful degradation when OpenAI API key not configured

**Phase 4: Frontend Updates**
- Updated PlateList to use server-side reporting API
- Changed from tracking reported senders to reported messages
- Added trust score display in ProfilePage with color-coded status
- Blocked status badge and reason display for blocked users
- Toast notifications for all trust & safety actions

**Phase 5: Testing & Documentation**
- Tested backend server startup and health endpoint
- Updated CLAUDE.md with complete Trust & Safety architecture
- Documented all new API endpoints and environment variables
- Added development notes for trust score thresholds and AI moderation

**Key Changes:**
- Trust score now server-side (was localStorage)
- Automatic blocking at score < 50 (10 points per report, 20 for AI violations)
- Optional AI moderation with OpenAI
- Full admin dashboard for moderation
- Trust score visible in user profile

**Environment Variables Added:**
- `OPENAI_API_KEY`: (Optional) For AI content moderation
- `ADMIN_KEY`: Required for admin dashboard access

### 2025-11-02 (Session 1)
**Completed - Production Polish & Readiness (Option 1):**

**Phase 1: Deployment & Environment**
- Enhanced health check endpoint (`/health`) with comprehensive service monitoring
- Created DEPLOYMENT.md with full deployment guide
- Fixed Redis connection handling to prevent deployment crashes
- Added resend package to backend dependencies (deployment fix)

**Phase 2: Error Handling & User Feedback**
- Implemented react-toastify for professional toast notifications
- Replaced all alert() calls with toast notifications
- Better error messages for all user actions
- Error Boundary already in place

**Phase 3: UX Polish**
- Created LoadingSpinner component for better loading states
- Improved empty states (inbox and profile)
- Added confirmation dialog for unclaiming plates
- Professional, clean UI improvements

**Deployment Fixes:**
- Fixed "Cannot find module 'resend'" error
- Fixed Redis ECONNREFUSED error with better error handling
- Documented all required environment variables

**In Progress:**
- Testing end-to-end flows on production

**Next Session Options:**
- Option 2: Trust & Safety (server-side trust scoring, moderation)
- Option 3: Premium Features (Stripe, subscriptions)
- Option 4: Verification System (email/SMS verification)
- Option 5: Admin Dashboard (user management, analytics)
- Option 6: Mobile & UX (dark mode, PWA, responsive)

### 2025-10-02
**Completed:**
- Fixed warning for guest users and polished text
- Fixed User Model with updateOne
- Extended User Model with Premium and Profile Fields
- Auto-refresh inbox when plates change; streamlined user init
- Formatting improvements to PlateList