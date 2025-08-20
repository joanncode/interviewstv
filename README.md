# Interviews.tv

A specialized social networking platform designed to create, share, discover, and engage with interviews.

## Project Structure (Industry Standard)

```
interviews-tv/
├── api/                    # PHP Backend API
│   ├── config/            # Application configuration
│   ├── public/            # Web server document root
│   ├── routes/            # API route definitions
│   ├── src/               # Application source code
│   │   ├── Controllers/   # API controllers
│   │   ├── Models/        # Data models
│   │   ├── Services/      # Business logic services
│   │   ├── Middleware/    # HTTP middleware
│   │   └── Http/          # HTTP layer (Router, Request, Response)
│   ├── storage/           # File storage (logs, uploads)
│   └── composer.json      # PHP dependencies
├── web/                   # Frontend Application
│   ├── public/            # Static assets
│   ├── src/               # Frontend source code
│   ├── dist/              # Built assets (generated)
│   └── package.json       # Node.js dependencies
├── config/                # Shared configuration files
├── shared/                # Shared utilities and database
│   ├── database/          # Database migrations and seeds
│   └── utils/             # Helper functions
├── docker/                # Docker configuration
└── docs/                  # Documentation
```

## Technology Stack

- **Backend**: PHP 8+ with custom framework
- **Frontend**: Vanilla JavaScript with Bootstrap 5
- **Database**: MySQL/MariaDB
- **Media Storage**: AWS S3
- **Gallery**: Fancybox (no top tools)
- **Build Tools**: Webpack, Composer

## Color Scheme

- Primary Black: #000000
- Primary Red: #FF0000
- Primary White: #FFFFFF

## Features

- User management with roles (user, interviewer, interviewee, promoter, admin)
- Interview creation and management (video, audio, text, live)
- Media galleries with Fancybox
- Social features (likes, comments, follows)
- Business directory and profiles
- Event management and linking
- Search and discovery
- Clean URLs (no .php extensions)

## Development Setup

1. Clone the repository
2. Set up MySQL/MariaDB database
3. Configure environment variables
4. Install dependencies
5. Run database migrations
6. Start development servers

## API Endpoints

All API endpoints use clean URLs without .php extensions:
- `/api/users` - User management
- `/api/interviews` - Interview operations
- `/api/events` - Event management
- `/api/businesses` - Business directory
- `/api/comments` - Comment system
- `/api/likes` - Like functionality

## URL Structure

- `/` - Home page
- `/explore` - Discover content
- `/interviews/:id` - Interview details
- `/profile/:username` - User profiles
- `/events` - Event listings
- `/business` - Business directory
- `/create` - Content creation
- `/settings` - User settings
