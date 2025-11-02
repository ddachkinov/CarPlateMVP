# Deployment Guide

## Production Environment Variables

### Backend (Required)

Configure these environment variables in your Render dashboard (or hosting platform):

```bash
# Database
MONGO_URI=mongodb+srv://your_connection_string
MONGO_DB_NAME=carplate

# Server
PORT=5001
NODE_ENV=production

# Email Service (Resend)
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=carplate@yourdomain.com

# Redis (Optional - for distributed rate limiting)
# Leave empty to use in-memory rate limiting
# REDIS_URL=redis://your_redis_url:6379
```

### Frontend (Required)

Configure these environment variables for the client build:

```bash
# Backend API URL
REACT_APP_API_URL=https://your-backend.onrender.com/api

# PlateRecognizer OCR API
REACT_APP_PLATE_RECOGNIZER_TOKEN=your_plate_recognizer_token
```

## Health Check Endpoint

Monitor your deployment health at:
```
GET https://your-backend.onrender.com/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-02T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "services": {
    "mongodb": "connected",
    "redis": "using memory store",
    "email": "configured"
  },
  "version": "1.0.0"
}
```

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] MongoDB connection string updated for production
- [ ] Email domain verified in Resend (if using custom domain)
- [ ] PlateRecognizer API token has sufficient credits
- [ ] CORS configured to allow frontend domain

### Post-Deployment
- [ ] Health check endpoint returns 200
- [ ] MongoDB connection successful
- [ ] Email service configured and working
- [ ] Test plate claim with email notification
- [ ] Test message sending (guest and registered users)
- [ ] Test OCR plate recognition
- [ ] Verify rate limiting is working
- [ ] Check error logs for any issues

## Common Deployment Issues

### Redis Connection Error
**Symptom**: `ECONNREFUSED` when connecting to Redis

**Solution**: Remove `REDIS_URL` environment variable to use in-memory rate limiting (fine for MVP). Add Redis later when scaling to multiple instances.

### Email Service Error
**Symptom**: Domain verification errors from Resend

**Solution**:
1. Use Resend sandbox domain: `FROM_EMAIL=onboarding@resend.dev` (can only send to your verified email)
2. OR verify your custom domain at https://resend.com/domains

### MongoDB Connection Timeout
**Symptom**: App crashes on startup with MongoDB connection error

**Solution**:
1. Check MongoDB connection string is correct
2. Verify IP whitelist in MongoDB Atlas (allow 0.0.0.0/0 or add Render IPs)
3. Ensure database name is correct

### CORS Errors
**Symptom**: Frontend can't reach backend API

**Solution**: Backend CORS is currently set to allow all origins (`cors()`). For production, consider restricting to your frontend domain.

## Monitoring

### Key Metrics to Monitor
- Response times for API endpoints
- Error rates (5xx responses)
- MongoDB connection status
- Email delivery success rate
- Rate limiting trigger frequency

### Logs to Watch
- MongoDB connection/disconnection events
- Redis fallback messages
- Email send failures
- Rate limiting violations
- Uncaught exceptions

## Scaling Considerations

### Current Setup (MVP)
- Single backend instance
- In-memory rate limiting
- No Redis required
- Email notifications via Resend

### When to Add Redis
- Multiple backend instances (horizontal scaling)
- Need consistent rate limiting across instances
- High traffic requiring distributed session management

### When to Optimize
- Response times > 1 second consistently
- MongoDB queries taking > 100ms
- Bundle size > 500KB (frontend)
- More than 1000 daily active users
