# Development Guide

## Getting Started

### Prerequisites
- PHP 8.0+
- MySQL/MariaDB 8.0+
- Node.js 16+
- Composer
- npm/yarn

### Initial Setup

1. **Clone and setup project structure**
   ```bash
   git clone <repository-url>
   cd interviews-tv
   ```

2. **Backend Setup**
   ```bash
   cd backend
   composer install
   cp .env.example .env
   # Edit .env with your database and AWS credentials
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Database Setup**
   ```bash
   # Create database
   mysql -u root -p
   CREATE DATABASE interviews_tv;
   
   # Run migrations
   cd backend
   php migrations/migrate.php
   ```

### Development Servers

1. **Start Backend (PHP)**
   ```bash
   cd backend/public
   php -S localhost:8000
   ```

2. **Start Frontend (Webpack Dev Server)**
   ```bash
   cd frontend
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

### Project Structure

```
interviews-tv/
├── backend/
│   ├── config/           # Database and app configuration
│   ├── controllers/      # API endpoint controllers
│   ├── models/          # Database models
│   ├── routes/          # Route definitions
│   ├── public/          # Web server document root
│   ├── utils/           # Helper functions
│   └── migrations/      # Database schema migrations
├── frontend/
│   ├── public/          # Static assets
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page-specific components
│       ├── services/    # API communication
│       ├── utils/       # Helper functions
│       └── styles/      # CSS/SCSS files
└── docs/               # Documentation
```

### Key Technologies

- **Backend**: PHP 8+ with PDO, JWT authentication, AWS S3 SDK
- **Frontend**: Vanilla JS with Bootstrap 5, Webpack, Fancybox
- **Database**: MySQL with foreign keys and FULLTEXT indexes
- **Media**: AWS S3 for file storage
- **Styling**: Bootstrap 5 with custom CSS variables

### API Conventions

- All endpoints use clean URLs (no .php extensions)
- RESTful design patterns
- JSON request/response format
- JWT token authentication
- CORS enabled for development

### Color Scheme

- Primary Black: #000000
- Primary Red: #FF0000
- Primary White: #FFFFFF

### Development Notes

- No social logins during development (will be added later)
- Fancybox galleries with no top tools
- Clean URLs throughout the application
- Responsive Bootstrap design
- AJAX for dynamic interactions
