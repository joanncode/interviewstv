# Interviews.tv API Documentation

Welcome to the Interviews.tv API! This comprehensive REST API provides access to all platform features including user management, interview operations, notifications, and file uploads.

## 🚀 Quick Start

### Base URL
```
Production: https://api.interviews.tv/v1
Staging: https://staging-api.interviews.tv/v1
Development: http://localhost:8000/api
```

### Authentication
All API requests require authentication using Bearer tokens:

```bash
curl -H "Authorization: Bearer your-token-here" \
     https://api.interviews.tv/v1/users/profile
```

### Get Your API Token
1. Register or login to get a session
2. Use the session to access protected endpoints
3. For long-term access, generate an API key in your profile settings

## 📋 API Overview

### Core Features
- **Authentication**: Secure user registration, login, and session management
- **User Management**: Profile management, settings, and social features
- **Interviews**: CRUD operations for interview content
- **Notifications**: Real-time notification system
- **File Uploads**: Video and image upload with processing
- **Search**: Advanced search and filtering capabilities

### Response Format
All API responses follow a consistent JSON format:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8,
    "has_more": true
  }
}
```

### Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE",
  "errors": {
    "field_name": ["Validation error message"]
  }
}
```

## 🔐 Authentication

### Register New User
```bash
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "remember_me": false
}
```

### Logout
```bash
POST /auth/logout
Authorization: Bearer your-token-here
```

## 👤 User Management

### Get Current User Profile
```bash
GET /users/profile
Authorization: Bearer your-token-here
```

### Update Profile
```bash
PUT /users/profile
Authorization: Bearer your-token-here
Content-Type: application/json

{
  "name": "John Doe",
  "bio": "Software engineer with 5 years of experience",
  "location": "San Francisco, CA",
  "website": "https://johndoe.com",
  "linkedin_url": "https://linkedin.com/in/johndoe"
}
```

### Upload Avatar
```bash
POST /upload/avatar
Authorization: Bearer your-token-here
Content-Type: multipart/form-data

# Form data:
avatar: [image file]
```

## 🎥 Interview Management

### List Interviews
```bash
GET /interviews?page=1&limit=20&category=technology&difficulty=intermediate
Authorization: Bearer your-token-here
```

### Create Interview
```bash
POST /interviews
Authorization: Bearer your-token-here
Content-Type: application/json

{
  "title": "Senior JavaScript Developer Interview",
  "description": "Comprehensive interview covering React, Node.js, and system design",
  "category": "technology",
  "difficulty": "intermediate",
  "tags": ["javascript", "react", "nodejs"],
  "is_public": true
}
```

### Get Interview Details
```bash
GET /interviews/456
Authorization: Bearer your-token-here
```

### Update Interview
```bash
PUT /interviews/456
Authorization: Bearer your-token-here
Content-Type: application/json

{
  "title": "Updated Interview Title",
  "description": "Updated description",
  "is_public": false
}
```

### Delete Interview
```bash
DELETE /interviews/456
Authorization: Bearer your-token-here
```

### Upload Interview Video
```bash
POST /upload/video
Authorization: Bearer your-token-here
Content-Type: multipart/form-data

# Form data:
video: [video file]
interview_id: 456
```

## 🔔 Notifications

### Get Notifications
```bash
GET /notifications?page=1&limit=10&unread_only=true
Authorization: Bearer your-token-here
```

### Mark Notification as Read
```bash
PUT /notifications/789/read
Authorization: Bearer your-token-here
```

### Mark All Notifications as Read
```bash
PUT /notifications/mark-all-read
Authorization: Bearer your-token-here
```

## 📊 Rate Limiting

The API implements rate limiting to ensure fair usage:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 1000 requests | 1 hour |
| Authentication | 5 attempts | 5 minutes |
| File Upload | 10 uploads | 10 minutes |
| Search | 100 requests | 5 minutes |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## 🛡️ Security

### CSRF Protection
Include CSRF token in requests:
```bash
curl -H "X-CSRF-Token: your-csrf-token" \
     -H "Authorization: Bearer your-token" \
     -X POST https://api.interviews.tv/v1/interviews
```

### Input Validation
All inputs are validated and sanitized:
- Email format validation
- Password strength requirements
- File type and size restrictions
- SQL injection prevention
- XSS protection

### Security Headers
The API includes security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HTTPS only)

## 📝 Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `VALIDATION_FAILED` | Input validation errors |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `CSRF_INVALID` | CSRF token validation failed |
| `FILE_TOO_LARGE` | Uploaded file exceeds size limit |
| `INVALID_FILE_TYPE` | Unsupported file type |
| `RESOURCE_NOT_FOUND` | Requested resource not found |

## 🧪 Testing

### Using cURL
```bash
# Set your token
TOKEN="your-token-here"

# Test authentication
curl -H "Authorization: Bearer $TOKEN" \
     https://api.interviews.tv/v1/users/profile

# Create an interview
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Interview","description":"Test description","category":"technology","difficulty":"beginner"}' \
     https://api.interviews.tv/v1/interviews
```

### Using Postman
1. Import the OpenAPI specification from `docs/api/openapi.yaml`
2. Set up environment variables for base URL and token
3. Use the pre-configured requests and examples

### Using JavaScript
```javascript
const API_BASE = 'https://api.interviews.tv/v1';
const token = 'your-token-here';

async function getProfile() {
  const response = await fetch(`${API_BASE}/users/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data;
}
```

## 📚 SDKs and Libraries

### JavaScript/Node.js
```bash
npm install interviews-tv-api
```

```javascript
import InterviewsTV from 'interviews-tv-api';

const client = new InterviewsTV({
  apiKey: 'your-api-key',
  baseURL: 'https://api.interviews.tv/v1'
});

const profile = await client.users.getProfile();
```

### Python
```bash
pip install interviews-tv-python
```

```python
from interviews_tv import Client

client = Client(api_key='your-api-key')
profile = client.users.get_profile()
```

### PHP
```bash
composer require interviews-tv/php-sdk
```

```php
use InterviewsTV\Client;

$client = new Client('your-api-key');
$profile = $client->users()->getProfile();
```

## 🔗 Webhooks

Configure webhooks to receive real-time notifications:

### Supported Events
- `user.registered`
- `interview.created`
- `interview.approved`
- `notification.sent`
- `security.alert`

### Webhook Configuration
```bash
POST /webhooks
Authorization: Bearer your-token-here
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/interviews-tv",
  "events": ["interview.created", "user.registered"],
  "secret": "your-webhook-secret"
}
```

## 📞 Support

- **Documentation**: [https://docs.interviews.tv](https://docs.interviews.tv)
- **API Status**: [https://status.interviews.tv](https://status.interviews.tv)
- **Support Email**: api-support@interviews.tv
- **GitHub Issues**: [https://github.com/interviews-tv/api/issues](https://github.com/interviews-tv/api/issues)

## 📄 License

This API is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Happy coding! 🚀**
