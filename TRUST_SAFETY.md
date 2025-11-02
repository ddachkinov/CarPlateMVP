# Trust & Safety System - Implementation Guide

## Overview

CarPlate now includes a comprehensive trust and safety system to prevent abuse and maintain community standards. This system includes:

1. **Server-side trust scoring** with automatic blocking
2. **Message reporting** with admin review workflow
3. **AI content moderation** using OpenAI (optional)
4. **Admin dashboard** for managing reports and users

## Architecture

### Trust Score System

- **Starting Score**: All users begin with 100 trust points
- **Penalty for Reports**: -10 points per user report
- **Penalty for AI Violations**: -20 points for AI-detected policy violations
- **Auto-Block Threshold**: Users automatically blocked when score drops below 50
- **Visibility**: Trust score displayed in user profile with color coding:
  - Green (80-100): Good standing
  - Yellow (50-79): Warning zone
  - Red (<50): Blocked

### Blocking System

When a user is blocked:
- Cannot send messages (403 error)
- Cannot claim plates (403 error)
- See clear error messages explaining the block
- Block reason stored and displayed to user
- Admin can manually unblock if needed

### Report Workflow

1. **User Reports Message**
   - Click "Report" button in inbox
   - Report sent to backend with messageId, reporterId, reason
   - Reported user's trust score decreased by 10
   - Auto-block if score drops below 50

2. **Admin Review**
   - Admin views report in dashboard
   - Can see message content, reporter, reason
   - Actions available:
     - **Block User**: Manually block the reported user
     - **Reduce Trust**: Additional -20 point penalty
     - **Dismiss**: No action taken, mark as reviewed

3. **Report Statuses**
   - `pending`: Awaiting admin review
   - `reviewed`: Admin viewed but no action taken
   - `dismissed`: Report rejected
   - `action_taken`: Admin took action (block or trust adjustment)

### AI Content Moderation (Optional)

If `OPENAI_API_KEY` is configured:

1. **Pre-Send Screening**
   - All messages screened before sending
   - Uses OpenAI Moderation API

2. **Severity Levels**
   - **High**: Hate speech, violence, sexual content involving minors
     - Action: Block message, auto-report, -20 trust score
   - **Medium**: Harassment, general violence
     - Action: Allow but flag for admin review
   - **Low**: Minor concerns
     - Action: Allow but log

3. **Auto-Reports**
   - AI-flagged content creates automatic reports
   - Reporter shown as "system-ai-moderator"
   - Reason includes flagged categories

4. **Graceful Degradation**
   - If API key not set, moderation disabled
   - System logs warning but continues normally
   - No impact on core functionality

## Admin Dashboard

### Access

- Navigate to "Admin" tab in UI
- Enter admin key (set in environment variables)
- Key stored in localStorage for session

### Features

**Statistics Tab**
- Total users count
- Blocked users count
- Pending reports count
- Total reports count
- Average trust score

**Reports Tab**
- View all reports with filtering (All, Pending, Reviewed, Dismissed)
- See message content, plate, reporter, reported user
- Add admin notes
- Take actions: Block user, Reduce trust, Dismiss

**Users Tab**
- View all users with filtering (All, Blocked, Low Trust <50)
- See trust scores, email, blocked status
- Block/unblock users with reason
- Search and filter capabilities

### Admin Authentication

- Simple key-based authentication via `X-Admin-Key` header
- Set `ADMIN_KEY` in backend environment variables
- Choose a strong, random key for production
- Example: `openssl rand -base64 32`

## Environment Variables

### Required

```bash
# Backend
ADMIN_KEY=your_secure_random_admin_key_here
```

### Optional

```bash
# Backend - AI Moderation
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## API Endpoints

### Report Endpoints

**Submit Report**
```
POST /api/report
Body: {
  messageId: "message_id",
  reporterId: "user_id",
  reason: "Inappropriate content"
}
Response: {
  message: "Report submitted successfully",
  userBlocked: false
}
```

**Get User Trust Score**
```
GET /api/report/user/:userId
Response: {
  userId: "user-abc123",
  trustScore: 90,
  blocked: false,
  registered: true
}
```

### Admin Endpoints (Require X-Admin-Key header)

**Get Statistics**
```
GET /api/admin/stats
Headers: { X-Admin-Key: "your_admin_key" }
Response: {
  totalUsers: 150,
  blockedUsers: 5,
  pendingReports: 3,
  totalReports: 12,
  averageTrustScore: 85.5
}
```

**Get Reports**
```
GET /api/admin/reports?status=pending
Headers: { X-Admin-Key: "your_admin_key" }
Response: [
  {
    _id: "report_id",
    reportedUserId: "user-123",
    reporterId: "user-456",
    messageId: "msg_id",
    messageContent: "offensive text",
    messagePlate: "ABC123",
    reason: "Inappropriate content",
    status: "pending",
    createdAt: "2025-11-02T..."
  }
]
```

**Update Report**
```
PATCH /api/admin/reports/:reportId
Headers: { X-Admin-Key: "your_admin_key" }
Body: {
  status: "action_taken",
  action: "block",
  adminNotes: "User violated community guidelines"
}
```

**Get Users**
```
GET /api/admin/users?blocked=true
Headers: { X-Admin-Key: "your_admin_key" }
Response: [
  {
    userId: "user-123",
    trustScore: 20,
    blocked: true,
    blockedReason: "Multiple policy violations",
    email: "user@example.com",
    nickname: "User123"
  }
]
```

**Update User**
```
PATCH /api/admin/users/:userId
Headers: { X-Admin-Key: "your_admin_key" }
Body: {
  blocked: true,
  blockedReason: "Spam violation",
  trustScore: 0
}
```

## Database Models

### Report Model

```javascript
{
  reportedUserId: String,     // User being reported
  reporterId: String,         // User who reported
  messageId: ObjectId,        // Reference to Message
  reason: String,             // Report reason
  status: String,             // pending | reviewed | dismissed | action_taken
  adminNotes: String,         // Admin comments
  reviewedBy: String,         // Admin who reviewed
  reviewedAt: Date,           // Review timestamp
  createdAt: Date             // Report creation time
}
```

### User Model Updates

```javascript
{
  // Existing fields...
  trustScore: Number,         // Default: 100
  blocked: Boolean,           // Default: false
  blockedReason: String,      // Why user was blocked
  blockedAt: Date            // When user was blocked
}
```

## Testing Trust & Safety

### Test Report Flow

1. Create two users by claiming plates with different emails
2. Send a message from User A to User B's plate
3. User B reports the message
4. Check User A's trust score decreased by 10
5. Verify report appears in admin dashboard

### Test Auto-Blocking

1. Create a test user
2. Submit 5 reports against that user (manually via API or admin)
3. Verify user's trust score is now 50 (100 - 5*10)
4. Submit one more report
5. Verify user is auto-blocked (trust score 40 < 50)
6. Try to send message as blocked user - should get 403 error

### Test AI Moderation (if enabled)

1. Set OPENAI_API_KEY in environment
2. Try sending offensive message (e.g., explicit hate speech)
3. Should be blocked with 403 error
4. Check backend logs for moderation result
5. Verify auto-report created in admin dashboard
6. Verify trust score decreased by 20

### Test Admin Dashboard

1. Navigate to Admin tab
2. Enter admin key
3. View statistics
4. Filter reports by "pending"
5. Review a report and take action
6. Verify user blocked/trust adjusted
7. Navigate to Users tab
8. Filter by "Blocked" users
9. Unblock a user
10. Verify user can send messages again

## Production Deployment

### 1. Set Environment Variables

On Render.com (or your platform):

```bash
ADMIN_KEY=<generate with: openssl rand -base64 32>
OPENAI_API_KEY=sk-your-key-here  # Optional but recommended
```

### 2. Update Health Check

The `/health` endpoint now includes moderation service status:

```json
{
  "status": "ok",
  "services": {
    "mongodb": "connected",
    "redis": "connected",
    "email": "configured",
    "moderation": "configured"  // or "not configured"
  }
}
```

### 3. Monitor Logs

Watch for:
- `🚫 Message blocked by AI moderation` - High-severity blocks
- `⚠️  Message flagged for review` - Medium-severity flags
- `📉 User trust score decreased` - Report penalties
- `🚫 User auto-blocked` - Automatic blocks

### 4. Admin Best Practices

- Change admin key regularly
- Review pending reports daily
- Monitor blocked users list
- Adjust trust score thresholds if needed
- Use admin notes to document decisions

## Future Enhancements

1. **Email Notifications**
   - Notify users when reported
   - Notify admins of new reports
   - Warn users approaching block threshold

2. **Appeal System**
   - Allow blocked users to appeal
   - Admin review of appeals
   - Temporary vs permanent blocks

3. **Advanced Analytics**
   - Report trends over time
   - Most reported content categories
   - False positive rate tracking

4. **Multi-Admin Support**
   - Admin user accounts instead of shared key
   - Admin action audit log
   - Role-based permissions

5. **Automated Patterns**
   - Detect coordinated abuse
   - Identify repeat offenders
   - Pattern-based auto-blocking

## Support

For issues or questions about the trust & safety system:
1. Check backend logs for error messages
2. Verify environment variables are set correctly
3. Test with simple cases first (manual reports before AI)
4. Review this documentation and CLAUDE.md

## Security Considerations

1. **Admin Key Security**
   - Never commit admin key to git
   - Use environment variables only
   - Rotate keys if compromised

2. **OpenAI API Key**
   - Keep secure like admin key
   - Monitor usage on OpenAI dashboard
   - Set usage limits if needed

3. **User Privacy**
   - Messages stored for moderation purposes
   - Admin sees reported content only
   - No personal data exposed unnecessarily

4. **Rate Limiting**
   - Existing rate limits still apply
   - Prevents report spam
   - Admin endpoints not rate limited
