# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview & Problem Statement

**Problem Being Solved:**
CarPlate addresses the common situation where people need to communicate with vehicle owners about urgent issues (headlights left on, blocking driveways, car alarms, etc.) but have no way to contact them. Currently, people either leave physical notes (which can blow away or be missed) or have no recourse at all.

**Solution:**
CarPlate is a privacy-respecting, frictionless app that enables anonymous messaging to vehicle owners using license plate numbers. It emphasizes safety, ease-of-use, and accountability while preventing abuse through tiered user permissions and trust systems.

**MVP Goals:**
- Allow anonymous users to send predefined safety messages to any license plate
- Enable car owners to claim their plates and receive messages in a dedicated inbox
- Prevent abuse through guest restrictions and trust scoring
- Provide OCR-based plate recognition for convenient message sending
- Create a foundation for premium features and verification systems

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

**Plate Model** (backend/models/Plate.js):
- `plate`: License plate number (uppercase, unique)
- `ownerId`: References User who claimed the plate

**Message Model** (backend/models/Message.js):
- `plate`: Target license plate
- `senderId`: User who sent the message
- `message`: Message content
- `createdAt`: Timestamp

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
- User management: view all users, filter by blocked/trust score
- Statistics dashboard: total users, blocked users, pending reports, average trust score

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

**1. Guest Users (Unregistered):**
- Auto-assigned userId but not registered in backend
- Cannot claim plates
- Can only send predefined safety messages ("Your headlights are on", "Your car is blocking another car", etc.)
- Rate limited to 1 message per minute
- UI disables custom message textarea with helpful message
- Anonymous sending (shows as "user-xxxx" to recipients)
- can register

**2. Registered Users (Car Owners):**
- Identified by unique userId stored in localStorage
- Can claim one or more license plates 
- Can send custom messages (in addition to predefined ones)
- Can receive messages in dedicated inbox
- Can set nickname and choose to show their plate when sending
- Profile page for managing claimed plates and settings

**3. Premium Users (Future Enhancement):**
- All registered user features plus:
- Can send/receive custom messages
- Instant notifications vs delayed batches for free users
- Advanced inbox features (grouping, importance flags, longer storage)
- Verification badge and priority treatment
- Community supporter badge

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
- ✅ Plate normalization and data consistency
- ✅ Toast notifications and loading states
- ✅ Health monitoring endpoint

**Current Limitations (Future Enhancements):**
- No actual plate verification (immediate ownership on claim)
- Simple localStorage-based authentication (no passwords/OAuth)
- No real-time notifications (manual refresh required)
- No premium monetization system implemented
- No advanced inbox features (grouping by sender, importance flags)

## Future Roadmap (from Documentation)

**Priority Enhancements:**
1. **Premium Features**: Custom messaging, instant notifications, advanced inbox
2. **Verification System**: SMS/OAuth verification, document upload for plate ownership
3. **Trust & Safety**: Server-side trust scoring, automatic user blocking with AI capabilities for offensive patterns, abuse prevention
4. **Admin Tools**: Backend reporting system, user management interface, usage statistics pane
5. **Notifications**: Push notifications with batch vs instant delivery tiers
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