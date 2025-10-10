// Simple Interviews.tv Application
// This is a basic version that works without webpack

class InterviewsApp {
    constructor() {
        this.container = document.getElementById('app');
        this.currentPage = 'home';
        this.isAuthenticated = false;

        // Dark Mode Color Scheme - Store in memory for consistency across all pages
        this.darkModeColors = {
            primary: '#FF0000',           // Red accent
            primaryDark: '#CC0000',       // Darker red
            background: '#1a1a1a',        // Main dark background
            backgroundGradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 100%)', // Page background
            cardBackground: '#2a2a2a',    // Card backgrounds
            cardBorder: '#404040',        // Card borders
            inputBackground: '#3a3a3a',   // Form input backgrounds
            inputBorder: '#555555',       // Form input borders
            textPrimary: '#ffffff',       // Primary text (white)
            textSecondary: '#cccccc',     // Secondary text (light grey)
            textMuted: '#aaaaaa',         // Muted text (light grey)
            textDanger: '#FF0000',        // Red text/icons
            borderColor: '#404040',       // General borders
            hoverBackground: '#404040',   // Hover states
            shadowColor: 'rgba(255, 0, 0, 0.2)' // Red shadow for hovers
        };

        // Predefined User Accounts for Different Roles
        this.predefinedUsers = {
            'admin@interviews.tv': {
                id: 'admin-001',
                name: 'Admin User',
                email: 'admin@interviews.tv',
                password: 'admin123',
                role: 'admin',
                avatar: null,
                permissions: ['all'],
                description: 'Platform Administrator'
            },
            'creator@interviews.tv': {
                id: 'creator-001',
                name: 'Content Creator',
                email: 'creator@interviews.tv',
                password: 'creator123',
                role: 'creator',
                avatar: null,
                permissions: ['create_content', 'manage_profile', 'conduct_interviews'],
                description: 'Professional Content Creator'
            },
            'business@interviews.tv': {
                id: 'business-001',
                name: 'Business Owner',
                email: 'business@interviews.tv',
                password: 'business123',
                role: 'business',
                avatar: null,
                permissions: ['manage_business', 'manage_profile', 'respond_interviews'],
                description: 'Business Profile Manager'
            },
            'user@interviews.tv': {
                id: 'user-001',
                name: 'Regular User',
                email: 'user@interviews.tv',
                password: 'user123',
                role: 'user',
                avatar: null,
                permissions: ['view_content', 'manage_profile'],
                description: 'Platform User'
            }
        };

        // API Configuration
        this.apiBaseUrl = 'http://localhost:8080';
        this.authToken = localStorage.getItem('auth_token');
    }

    init() {
        console.log('Initializing Interviews.tv...');

        // Check if user is already authenticated
        this.checkAuthStatus();

        // Set initial page based on URL
        this.setInitialPage();

        // Remove loading screen
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            console.log('Removing loading screen...');
            setTimeout(() => {
                loadingElement.style.opacity = '0';
                setTimeout(() => {
                    loadingElement.style.display = 'none';
                    console.log('Loading screen removed');
                }, 300);
            }, 500);
        }

        // Render the application
        this.render();
        this.setupEventListeners();

        // Setup hash change listener for client-side routing
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash) {
                this.navigateTo(hash);
            }
        });

        console.log('Interviews.tv application initialized successfully!');
    }

    setInitialPage() {
        const path = window.location.pathname;
        const hash = window.location.hash.substring(1); // Remove # from hash

        // Check if there's a hash-based route
        if (hash) {
            this.currentPage = hash;
        } else if (path === '/' || path === '') {
            // If user is not authenticated, redirect to login
            if (!this.isAuthenticated) {
                this.currentPage = 'login';
            } else {
                this.currentPage = 'home';
            }
        } else {
            this.currentPage = path.substring(1); // Remove leading slash
        }
        console.log('Initial page set to:', this.currentPage);
    }

    checkAuthStatus() {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');

        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                console.log('User already authenticated:', this.currentUser.email);
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.logout();
            }
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="d-flex flex-column min-vh-100">
                ${this.renderNavigation()}
                <main id="main-content" class="flex-grow-1">
                    ${this.renderCurrentPage()}
                </main>
                ${this.renderFooter()}
            </div>
        `;
        
        this.setupNavigationEvents();
    }

    // API Helper Methods
    async apiRequest(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (this.authToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    async apiGet(endpoint) {
        return this.apiRequest(endpoint, { method: 'GET' });
    }

    async apiPost(endpoint, data) {
        return this.apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async apiPut(endpoint, data) {
        return this.apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async apiDelete(endpoint) {
        return this.apiRequest(endpoint, { method: 'DELETE' });
    }

    setAuthToken(token) {
        this.authToken = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    renderNavigation() {
        return `
            <nav class="navbar navbar-expand-lg navbar-dark">
                <div class="container">
                    <a class="navbar-brand" href="javascript:void(0)" onclick="app.navigateTo('home'); return false;">
                        Interviews<span class="brand-accent">.tv</span>
                    </a>
                    
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav me-auto">
                            <li class="nav-item">
                                <a class="nav-link ${this.currentPage === 'home' ? 'active' : ''}" href="javascript:void(0)" onclick="app.navigateTo('home'); return false;">
                                    <i class="fas fa-home me-1"></i>Home
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${this.currentPage === 'explore' ? 'active' : ''}" href="javascript:void(0)" onclick="app.navigateTo('explore'); return false;">
                                    <i class="fas fa-compass me-1"></i>Explore
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${this.currentPage === 'gallery' ? 'active' : ''}" href="javascript:void(0)" onclick="app.navigateTo('gallery'); return false;">
                                    <i class="fas fa-images me-1"></i>Gallery
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${this.currentPage === 'live' ? 'active' : ''}" href="javascript:void(0)" onclick="app.navigateTo('live'); return false;">
                                    <i class="fas fa-broadcast-tower me-1"></i>Live Stream
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${this.currentPage === 'business' ? 'active' : ''}" href="javascript:void(0)" onclick="app.navigateTo('business'); return false;">
                                    <i class="fas fa-building me-1"></i>Business
                                </a>
                            </li>
                        </ul>

                        <!-- Modern Search Bar -->
                        <div class="navbar-search me-3 d-none d-lg-block">
                            <div class="search-container position-relative">
                                <input type="text" class="form-control search-input" id="navbarSearch"
                                       placeholder="Search interviews, creators, topics..."
                                       style="background-color: #3a3a3a; border: 1px solid #555555; color: #ffffff; padding-left: 40px; border-radius: 25px; width: 300px;"
                                       onkeyup="app.handleSearchInput(event)"
                                       onfocus="app.showSearchSuggestions()"
                                       onblur="app.hideSearchSuggestions()">
                                <i class="fas fa-search position-absolute" style="left: 12px; top: 50%; transform: translateY(-50%); color: #aaa; pointer-events: none;"></i>
                                <div id="searchSuggestions" class="search-suggestions position-absolute w-100" style="top: 100%; z-index: 1000; display: none;">
                                </div>
                            </div>
                        </div>

                        <ul class="navbar-nav">
                            <!-- Mobile Search Button -->
                            <li class="nav-item d-lg-none">
                                <a class="nav-link" href="#" onclick="app.toggleMobileSearch(); return false;">
                                    <i class="fas fa-search"></i>
                                </a>
                            </li>
                            ${this.isAuthenticated ? this.renderAuthenticatedNav() : this.renderGuestNav()}
                        </ul>
                    </div>
                </div>
            </nav>
        `;
    }

    renderAuthenticatedNav() {
        const userRole = this.currentUser ? this.currentUser.role : 'user';
        const roleIcon = this.getRoleIcon(userRole);
        const roleBadge = this.getRoleBadge(userRole);

        return `
            ${this.canCreateContent() ? `
                <li class="nav-item">
                    <a class="nav-link ${this.currentPage === 'create' ? 'active' : ''}" href="javascript:void(0)" onclick="app.navigateTo('create'); return false;">
                        <i class="fas fa-plus me-1"></i>Create
                    </a>
                </li>
            ` : ''}

            ${this.isAdmin() ? `
                <li class="nav-item">
                    <a class="nav-link" href="javascript:void(0)" onclick="app.showAdminPanel(); return false;">
                        <i class="fas fa-shield-alt me-1"></i>Admin
                    </a>
                </li>
            ` : ''}

            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="javascript:void(0)" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                    <i class="${roleIcon} me-1"></i>${this.currentUser ? this.currentUser.name : 'User'}
                    ${roleBadge}
                </a>
                <ul class="dropdown-menu">
                    <li class="dropdown-header">
                        <small class="text-muted">${this.currentUser ? this.currentUser.description : ''}</small>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="javascript:void(0)" onclick="app.navigateTo('profile'); return false;">
                        <i class="fas fa-user me-2"></i>My Profile
                    </a></li>
                    <li><a class="dropdown-item" href="javascript:void(0)" onclick="app.navigateTo('settings'); return false;">
                        <i class="fas fa-cog me-2"></i>Settings
                    </a></li>

                    ${this.isBusiness() ? `
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="app.navigateTo('business'); return false;">
                            <i class="fas fa-building me-2"></i>Business Directory
                        </a></li>
                    ` : ''}

                    ${this.isCreator() ? `
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="app.navigateTo('create'); return false;">
                            <i class="fas fa-video me-2"></i>My Content
                        </a></li>
                    ` : ''}

                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="javascript:void(0)" onclick="app.logout(); return false;">
                        <i class="fas fa-sign-out-alt me-2"></i>Logout
                    </a></li>
                </ul>
            </li>
        `;
    }

    getRoleIcon(role) {
        switch(role) {
            case 'admin': return 'fas fa-shield-alt';
            case 'creator': return 'fas fa-video';
            case 'business': return 'fas fa-building';
            case 'user':
            default: return 'fas fa-user';
        }
    }

    getRoleBadge(role) {
        const colors = {
            admin: 'danger',
            creator: 'warning',
            business: 'info',
            user: 'secondary'
        };

        return `<span class="badge bg-${colors[role] || 'secondary'} ms-1">${role}</span>`;
    }

    renderGuestNav() {
        return `
            <li class="nav-item">
                <a class="nav-link ${this.currentPage === 'login' ? 'active' : ''}" href="javascript:void(0)" onclick="app.navigateTo('login'); return false;">
                    <i class="fas fa-sign-in-alt me-1"></i>Login
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${this.currentPage === 'register' ? 'active' : ''}" href="javascript:void(0)" onclick="app.navigateTo('register'); return false;">
                    <i class="fas fa-user-plus me-1"></i>Register
                </a>
            </li>
        `;
    }

    renderCurrentPage() {
        switch(this.currentPage) {
            case 'home':
                return this.renderHomePage();
            case 'explore':
                return this.renderExplorePage();
            case 'gallery':
                return this.renderGalleryPage();
            case 'business':
                return this.renderBusinessPage();
            case 'login':
                return this.renderLoginPage();
            case 'register':
                return this.renderRegisterPage();
            case 'profile':
                return this.renderProfilePage();
            case 'create':
                return this.renderCreatePage();
            case 'settings':
                return this.renderSettingsPage();
            case 'business-profile':
                return this.renderBusinessProfilePage();
            case 'admin':
                return this.renderAdminPage();
            case 'admin-interviews':
                return this.renderAdminInterviewsPage();
            case 'admin-content':
                return this.renderAdminContentPage();
            case 'admin-security':
                return this.renderAdminSecurityPage();
            case 'admin-streams':
                return this.renderAdminStreamsPage();
            case 'search':
                return this.renderSearchPage();
            case 'watch':
                return this.renderWatchPage();
            case 'live':
                return this.renderLiveStreamPage();
            default:
                return this.renderHomePage();
        }
    }

    renderHomePage() {
        return `
            <section class="hero">
                <div class="container text-center">
                    <h1 class="hero-title">
                        Welcome to <span class="accent">Interviews.tv</span>
                    </h1>
                    <p class="hero-subtitle">
                        Create, share, discover, and engage with interviews from artists, musicians, 
                        politicians, business owners, and everyday people sharing their stories.
                    </p>
                    <div class="d-flex gap-3 justify-content-center">
                        <button class="btn btn-primary btn-lg" onclick="app.navigateTo('explore'); return false;">
                            <i class="fas fa-play me-2"></i>Start Exploring
                        </button>
                        <button class="btn btn-outline-light btn-lg" onclick="app.navigateTo('register'); return false;">
                            <i class="fas fa-user-plus me-2"></i>Join Now
                        </button>
                    </div>
                </div>
            </section>
            
            <section class="py-5">
                <div class="container">
                    <div class="row">
                        <div class="col-lg-4 mb-4">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <i class="fas fa-video fa-3x text-primary mb-3"></i>
                                    <h5 class="card-title">Create Interviews</h5>
                                    <p class="card-text">Record and share your interviews with video, audio, or text formats.</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4 mb-4">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <i class="fas fa-users fa-3x text-primary mb-3"></i>
                                    <h5 class="card-title">Connect & Engage</h5>
                                    <p class="card-text">Follow creators, like content, and engage with the community.</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4 mb-4">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <i class="fas fa-search fa-3x text-primary mb-3"></i>
                                    <h5 class="card-title">Discover Stories</h5>
                                    <p class="card-text">Explore interviews from diverse voices and perspectives.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderExplorePage() {
        return `
            <div class="explore-page-dark">
                <div class="container py-5">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2 class="mb-0 text-white">
                            <i class="fas fa-compass me-2 text-danger"></i>Explore Interviews
                        </h2>
                        <div class="d-flex gap-2">
                            <select class="form-select form-select-sm explore-filter" style="width: auto;">
                                <option>All Categories</option>
                                <option>Business</option>
                                <option>Technology</option>
                                <option>Arts & Culture</option>
                                <option>Music</option>
                                <option>Politics</option>
                            </select>
                            <select class="form-select form-select-sm explore-filter" style="width: auto;">
                                <option>Latest</option>
                                <option>Most Popular</option>
                                <option>Most Liked</option>
                            </select>
                        </div>
                    </div>

                <div class="row">
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card explore-card-dark h-100">
                            <img src="https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Tech+CEO+Interview" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-primary mb-2">Technology</span>
                                <h5 class="card-title text-white">Tech CEO on AI Revolution</h5>
                                <p class="card-text text-light">An insightful conversation about the future of artificial intelligence and its impact on business.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-light-grey">
                                        <i class="fas fa-eye me-1 text-danger"></i>2.1k views
                                        <i class="fas fa-heart ms-2 me-1 text-danger"></i>89 likes
                                    </small>
                                    <small class="text-light-grey">2 days ago</small>
                                </div>
                                <button class="btn btn-danger w-100" onclick="app.navigateTo('watch?id=1')">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card explore-card-dark h-100">
                            <img src="https://via.placeholder.com/300x200/333333/FFFFFF?text=Artist+Story" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-warning mb-2">Arts & Culture</span>
                                <h5 class="card-title text-white">Local Artist's Journey</h5>
                                <p class="card-text text-light">From street art to gallery exhibitions - a compelling story of artistic growth and community impact.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-light-grey">
                                        <i class="fas fa-eye me-1 text-danger"></i>1.5k views
                                        <i class="fas fa-heart ms-2 me-1 text-danger"></i>67 likes
                                    </small>
                                    <small class="text-light-grey">5 days ago</small>
                                </div>
                                <button class="btn btn-danger w-100" onclick="app.navigateTo('watch?id=2')">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card explore-card-dark h-100">
                            <img src="https://via.placeholder.com/300x200/28a745/FFFFFF?text=Entrepreneur+Tips" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-success mb-2">Business</span>
                                <h5 class="card-title text-white">Startup Success Stories</h5>
                                <p class="card-text text-light">Three entrepreneurs share their journey from idea to successful business, including failures and lessons learned.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-light-grey">
                                        <i class="fas fa-eye me-1 text-danger"></i>3.2k views
                                        <i class="fas fa-heart ms-2 me-1 text-danger"></i>124 likes
                                    </small>
                                    <small class="text-light-grey">1 week ago</small>
                                </div>
                                <button class="btn btn-danger w-100" onclick="app.navigateTo('watch?id=3')">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card explore-card-dark h-100">
                            <img src="https://via.placeholder.com/300x200/6f42c1/FFFFFF?text=Music+Producer" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-info mb-2">Music</span>
                                <h5 class="card-title text-white">Behind the Beats</h5>
                                <p class="card-text text-light">Grammy-winning producer discusses the creative process and evolution of modern music production.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-light-grey">
                                        <i class="fas fa-eye me-1 text-danger"></i>4.7k views
                                        <i class="fas fa-heart ms-2 me-1 text-danger"></i>203 likes
                                    </small>
                                    <small class="text-light-grey">3 days ago</small>
                                </div>
                                <button class="btn btn-danger w-100" onclick="app.navigateTo('watch?id=4')">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card explore-card-dark h-100">
                            <img src="https://via.placeholder.com/300x200/dc3545/FFFFFF?text=Community+Leader" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-danger mb-2">Politics</span>
                                <h5 class="card-title text-white">Community Leadership</h5>
                                <p class="card-text text-light">Local community leader shares insights on grassroots organizing and creating positive change.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-light-grey">
                                        <i class="fas fa-eye me-1 text-danger"></i>1.8k views
                                        <i class="fas fa-heart ms-2 me-1 text-danger"></i>95 likes
                                    </small>
                                    <small class="text-light-grey">4 days ago</small>
                                </div>
                                <button class="btn btn-danger w-100" onclick="app.navigateTo('watch?id=5')">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card explore-card-dark h-100">
                            <img src="https://via.placeholder.com/300x200/fd7e14/FFFFFF?text=Chef+Stories" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-secondary mb-2">Lifestyle</span>
                                <h5 class="card-title text-white">Culinary Adventures</h5>
                                <p class="card-text text-light">Award-winning chef talks about culinary innovation, sustainability, and the future of dining.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-light-grey">
                                        <i class="fas fa-eye me-1 text-danger"></i>2.9k views
                                        <i class="fas fa-heart ms-2 me-1 text-danger"></i>156 likes
                                    </small>
                                    <small class="text-light-grey">6 days ago</small>
                                </div>
                                <button class="btn btn-danger w-100" onclick="app.navigateTo('watch?id=6')">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="text-center mt-4">
                    <button class="btn btn-outline-danger btn-lg explore-load-more">
                        <i class="fas fa-plus me-2"></i>Load More Interviews
                    </button>
                </div>
                </div>
            </div>
        `;
    }

    renderGalleryPage() {
        return `
            <div class="container py-5">
                <h2 class="mb-4">Media Gallery</h2>
                <p class="text-muted mb-4">Browse photos, videos, and audio clips from interviews.</p>
                <div class="row gallery-grid">
                    <div class="col-md-4 mb-4">
                        <div class="card gallery-card">
                            <img src="https://via.placeholder.com/300x200" class="card-img-top gallery-thumbnail" alt="Gallery Item">
                            <div class="card-body">
                                <p class="card-text">Sample gallery item</p>
                            </div>
                        </div>
                    </div>
                    <!-- More gallery items would go here -->
                </div>
            </div>
        `;
    }

    renderBusinessPage() {
        return `
            <div class="business-directory-dark">
                <div class="container py-5">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 class="mb-1 text-white">Business Directory</h2>
                            <p class="text-light-grey mb-0">Discover businesses and their stories through interviews</p>
                        </div>
                        ${this.isAuthenticated ? `
                            <button class="btn btn-danger" onclick="app.showAddBusinessModal()">
                                <i class="fas fa-plus me-1"></i>Add Your Business
                            </button>
                        ` : ''}
                    </div>

                    <!-- Search and Filter -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="input-group">
                                <input type="text" class="form-control business-search-input" placeholder="Search businesses..." id="businessSearch">
                                <button class="btn btn-outline-danger" onclick="app.searchBusinesses()">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <select class="form-select business-filter-select" id="businessCategory" onchange="app.filterBusinesses()">
                                <option value="">All Industries</option>
                                <option value="technology">Technology</option>
                                <option value="retail">Retail</option>
                                <option value="food">Food & Beverage</option>
                                <option value="healthcare">Healthcare</option>
                                <option value="finance">Finance</option>
                                <option value="education">Education</option>
                                <option value="consulting">Consulting</option>
                                <option value="manufacturing">Manufacturing</option>
                            </select>
                        </div>
                    </div>

                    <div class="row" id="businessGrid">
                        <div class="col-md-6 col-lg-4 mb-4">
                            <div class="card business-card-dark h-100">
                                <img src="https://via.placeholder.com/300x200/007bff/ffffff?text=TechStart+Inc" class="card-img-top" alt="Business">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <h5 class="card-title mb-0 text-white">TechStart Inc</h5>
                                        <span class="badge bg-primary">Technology</span>
                                    </div>
                                    <p class="text-light-grey small mb-2">
                                        <i class="fas fa-map-marker-alt me-1 text-danger"></i>San Francisco, CA
                                    </p>
                                    <p class="card-text text-light">Innovative software solutions for modern businesses. Specializing in AI and machine learning applications.</p>
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <small class="text-light-grey">
                                            <i class="fas fa-video me-1"></i>3 interviews
                                            <i class="fas fa-users ms-2 me-1"></i>245 followers
                                        </small>
                                        <div class="text-warning">
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <small class="text-light ms-1">4.8</small>
                                        </div>
                                    </div>
                                    <button class="btn btn-danger w-100" onclick="app.viewBusinessProfile('techstart-inc')">
                                        <i class="fas fa-eye me-1"></i>View Profile
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-6 col-lg-4 mb-4">
                            <div class="card business-card-dark h-100">
                                <img src="https://via.placeholder.com/300x200/28a745/ffffff?text=Green+Eats" class="card-img-top" alt="Business">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <h5 class="card-title mb-0 text-white">Green Eats Cafe</h5>
                                        <span class="badge bg-success">Food & Beverage</span>
                                    </div>
                                    <p class="text-light-grey small mb-2">
                                        <i class="fas fa-map-marker-alt me-1 text-danger"></i>Portland, OR
                                    </p>
                                    <p class="card-text text-light">Organic, locally-sourced meals with a focus on sustainability and community health.</p>
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <small class="text-light-grey">
                                            <i class="fas fa-video me-1"></i>2 interviews
                                            <i class="fas fa-users ms-2 me-1"></i>189 followers
                                        </small>
                                        <div class="text-warning">
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="far fa-star"></i>
                                            <small class="text-light ms-1">4.2</small>
                                        </div>
                                    </div>
                                    <button class="btn btn-danger w-100" onclick="app.viewBusinessProfile('green-eats-cafe')">
                                        <i class="fas fa-eye me-1"></i>View Profile
                                    </button>
                                </div>
                            </div>
                        </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                            <div class="card business-card-dark h-100">
                                <img src="https://via.placeholder.com/300x200/dc3545/ffffff?text=Design+Studio" class="card-img-top" alt="Business">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <h5 class="card-title mb-0 text-white">Creative Design Studio</h5>
                                        <span class="badge bg-warning">Consulting</span>
                                    </div>
                                    <p class="text-light-grey small mb-2">
                                        <i class="fas fa-map-marker-alt me-1 text-danger"></i>New York, NY
                                    </p>
                                    <p class="card-text text-light">Full-service design agency helping brands tell their story through visual communication.</p>
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <small class="text-light-grey">
                                            <i class="fas fa-video me-1"></i>5 interviews
                                            <i class="fas fa-users ms-2 me-1"></i>567 followers
                                        </small>
                                        <div class="text-warning">
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <small class="text-light ms-1">4.9</small>
                                        </div>
                                    </div>
                                    <button class="btn btn-danger w-100" onclick="app.viewBusinessProfile('creative-design-studio')">
                                        <i class="fas fa-eye me-1"></i>View Profile
                                    </button>
                                </div>
                            </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                            <div class="card business-card-dark h-100">
                            <img src="https://via.placeholder.com/300x200/6f42c1/ffffff?text=Health+Plus" class="card-img-top" alt="Business">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0 text-white">HealthPlus Clinic</h5>
                                    <span class="badge bg-info">Healthcare</span>
                                </div>
                                <p class="text-light-grey small mb-2">
                                    <i class="fas fa-map-marker-alt me-1 text-danger"></i>Austin, TX
                                </p>
                                <p class="card-text text-light">Comprehensive healthcare services with a focus on preventive care and patient wellness.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-light-grey">
                                        <i class="fas fa-video me-1"></i>4 interviews
                                        <i class="fas fa-users ms-2 me-1"></i>423 followers
                                    </small>
                                    <div class="text-warning">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <small class="text-light ms-1">4.7</small>
                                    </div>
                                </div>
                                <button class="btn btn-danger w-100" onclick="app.viewBusinessProfile('healthplus-clinic')">
                                    <i class="fas fa-eye me-1"></i>View Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card business-card-dark h-100">
                            <img src="https://via.placeholder.com/300x200/fd7e14/ffffff?text=EduTech" class="card-img-top" alt="Business">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0 text-white">EduTech Solutions</h5>
                                    <span class="badge bg-secondary">Education</span>
                                </div>
                                <p class="text-light-grey small mb-2">
                                    <i class="fas fa-map-marker-alt me-1 text-danger"></i>Boston, MA
                                </p>
                                <p class="card-text text-light">Educational technology platform revolutionizing online learning for students and professionals.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-light-grey">
                                        <i class="fas fa-video me-1"></i>6 interviews
                                        <i class="fas fa-users ms-2 me-1"></i>892 followers
                                    </small>
                                    <div class="text-warning">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="far fa-star"></i>
                                        <small class="text-light ms-1">4.3</small>
                                    </div>
                                </div>
                                <button class="btn btn-danger w-100" onclick="app.viewBusinessProfile('edutech-solutions')">
                                    <i class="fas fa-eye me-1"></i>View Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card business-card-dark h-100">
                            <img src="https://via.placeholder.com/300x200/20c997/ffffff?text=Local+Market" class="card-img-top" alt="Business">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0 text-white">Local Market Co</h5>
                                    <span class="badge bg-success">Retail</span>
                                </div>
                                <p class="text-light-grey small mb-2">
                                    <i class="fas fa-map-marker-alt me-1 text-danger"></i>Denver, CO
                                </p>
                                <p class="card-text text-light">Community marketplace supporting local artisans and sustainable products.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-light-grey">
                                        <i class="fas fa-video me-1"></i>2 interviews
                                        <i class="fas fa-users ms-2 me-1"></i>334 followers
                                    </small>
                                    <div class="text-warning">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <small class="text-light ms-1">4.6</small>
                                    </div>
                                </div>
                                <button class="btn btn-danger w-100" onclick="app.viewBusinessProfile('local-market-co')">
                                    <i class="fas fa-eye me-1"></i>View Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                    <div class="text-center mt-4">
                        <button class="btn btn-outline-light btn-lg" onclick="app.loadMoreBusinesses()">
                            <i class="fas fa-plus me-2"></i>Load More Businesses
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderLoginPage() {
        return `
            <div class="login-page-dark">
                <div class="container-fluid vh-100 d-flex align-items-center justify-content-center">
                    <div class="row w-100 justify-content-center">
                        <div class="col-11 col-sm-8 col-md-6 col-lg-5 col-xl-4">
                            <div class="login-card-modern">
                                <!-- Brand Header -->
                                <div class="text-center mb-4">
                                    <div class="login-brand-icon mb-3">
                                        <i class="fas fa-video text-danger"></i>
                                    </div>
                                    <h1 class="login-brand-title mb-2">
                                        Interviews<span class="text-danger">.tv</span>
                                    </h1>
                                    <p class="login-subtitle text-light-grey">
                                        Sign in to your account
                                    </p>
                                </div>

                                <!-- Login Form -->
                                <form onsubmit="app.handleLogin(event)" class="login-form">
                                    <div class="mb-3">
                                        <label for="loginEmail" class="form-label text-white mb-2">
                                            <i class="fas fa-envelope me-2 text-danger"></i>Email address
                                        </label>
                                        <input type="email" class="form-control login-input" id="loginEmail"
                                               placeholder="Enter your email address" required>
                                    </div>

                                    <div class="mb-4">
                                        <label for="loginPassword" class="form-label text-white mb-2">
                                            <i class="fas fa-lock me-2 text-danger"></i>Password
                                        </label>
                                        <input type="password" class="form-control login-input" id="loginPassword"
                                               placeholder="Enter your password" required>
                                    </div>

                                    <div class="d-flex justify-content-between align-items-center mb-4">
                                        <div class="form-check">
                                            <input class="form-check-input login-checkbox" type="checkbox" id="rememberMe">
                                            <label class="form-check-label text-light" for="rememberMe">
                                                Remember me
                                            </label>
                                        </div>
                                        <a href="#" class="login-link text-danger">Forgot password?</a>
                                    </div>

                                    <button type="submit" class="btn login-btn-primary w-100 mb-4">
                                        <i class="fas fa-sign-in-alt me-2"></i>Sign In
                                    </button>
                                </form>

                                <!-- Divider -->
                                <div class="login-divider mb-4">
                                    <span class="text-light-grey">or</span>
                                </div>

                                <!-- Social Login -->
                                <div class="row g-2 mb-4">
                                    <div class="col-6">
                                        <button type="button" class="btn login-btn-social w-100">
                                            <i class="fab fa-google me-2"></i>Google
                                        </button>
                                    </div>
                                    <div class="col-6">
                                        <button type="button" class="btn login-btn-social w-100">
                                            <i class="fab fa-github me-2"></i>GitHub
                                        </button>
                                    </div>
                                </div>

                                <!-- Demo Accounts -->
                                <div class="demo-accounts mb-4">
                                    <div class="text-center mb-3">
                                        <small class="text-light-grey">Demo Accounts</small>
                                    </div>
                                    <div class="row g-2">
                                        <div class="col-6">
                                            <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="app.fillDemoLogin('admin')">
                                                <i class="fas fa-shield-alt me-1"></i>Admin
                                            </button>
                                        </div>
                                        <div class="col-6">
                                            <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="app.fillDemoLogin('creator')">
                                                <i class="fas fa-video me-1"></i>Creator
                                            </button>
                                        </div>
                                        <div class="col-6">
                                            <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="app.fillDemoLogin('business')">
                                                <i class="fas fa-building me-1"></i>Business
                                            </button>
                                        </div>
                                        <div class="col-6">
                                            <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="app.fillDemoLogin('user')">
                                                <i class="fas fa-user me-1"></i>User
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Register Link -->
                                <div class="text-center">
                                    <p class="text-light-grey mb-0">
                                        Don't have an account?
                                        <a href="#" onclick="app.navigateTo('register')" class="login-link text-danger">
                                            Create one
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRegisterPage() {
        return `
            <div class="login-page-dark">
                <div class="container-fluid vh-100 d-flex align-items-center justify-content-center">
                    <div class="row w-100 justify-content-center">
                        <div class="col-11 col-sm-8 col-md-6 col-lg-5 col-xl-4">
                            <div class="login-card-modern">
                                <!-- Brand Header -->
                                <div class="text-center mb-4">
                                    <div class="login-brand-icon mb-3">
                                        <i class="fas fa-video text-danger"></i>
                                    </div>
                                    <h1 class="login-brand-title mb-2">
                                        Interviews<span class="text-danger">.tv</span>
                                    </h1>
                                    <p class="login-subtitle text-light-grey">
                                        Create your account
                                    </p>
                                </div>

                                <!-- Register Form -->
                                <form onsubmit="app.handleRegister(event)" class="login-form">
                                    <div class="mb-3">
                                        <label for="registerName" class="form-label text-white mb-2">
                                            <i class="fas fa-user me-2 text-danger"></i>Full Name
                                        </label>
                                        <input type="text" class="form-control login-input" id="registerName"
                                               placeholder="Enter your full name" required>
                                    </div>

                                    <div class="mb-3">
                                        <label for="registerEmail" class="form-label text-white mb-2">
                                            <i class="fas fa-envelope me-2 text-danger"></i>Email address
                                        </label>
                                        <input type="email" class="form-control login-input" id="registerEmail"
                                               placeholder="Enter your email address" required>
                                    </div>

                                    <div class="mb-4">
                                        <label for="registerPassword" class="form-label text-white mb-2">
                                            <i class="fas fa-lock me-2 text-danger"></i>Password
                                        </label>
                                        <input type="password" class="form-control login-input" id="registerPassword"
                                               placeholder="Create a secure password (min 6 characters)" required minlength="6">
                                    </div>

                                    <div class="form-check mb-4">
                                        <input class="form-check-input login-checkbox" type="checkbox" id="agreeTerms" required>
                                        <label class="form-check-label text-light" for="agreeTerms">
                                            I agree to the <a href="#" class="login-link text-danger">Terms of Service</a>
                                            and <a href="#" class="login-link text-danger">Privacy Policy</a>
                                        </label>
                                    </div>

                                    <button type="submit" class="btn login-btn-primary w-100 mb-4">
                                        <i class="fas fa-user-plus me-2"></i>Create Account
                                    </button>
                                </form>

                                <!-- Divider -->
                                <div class="login-divider mb-4">
                                    <span class="text-light-grey">or</span>
                                </div>

                                <!-- Social Login -->
                                <div class="row g-2 mb-4">
                                    <div class="col-6">
                                        <button type="button" class="btn login-btn-social w-100">
                                            <i class="fab fa-google me-2"></i>Google
                                        </button>
                                    </div>
                                    <div class="col-6">
                                        <button type="button" class="btn login-btn-social w-100">
                                            <i class="fab fa-github me-2"></i>GitHub
                                        </button>
                                    </div>
                                </div>

                                <!-- Login Link -->
                                <div class="text-center">
                                    <p class="text-light-grey mb-0">
                                        Already have an account?
                                        <a href="#" onclick="app.navigateTo('login')" class="login-link text-danger">
                                            Sign in
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showAdminPanel() {
        this.navigateTo('admin');
    }

    navigateToAdminSection(section) {
        switch (section) {
            case 'interviews':
                this.navigateTo('admin-interviews');
                break;
            case 'streams':
                this.navigateTo('admin-streams');
                break;
            case 'content':
                this.navigateTo('admin-content');
                break;
            case 'analytics':
                this.navigateTo('admin-analytics');
                break;
            case 'security':
                this.navigateTo('admin-security');
                break;
            default:
                this.navigateTo('admin');
        }
    }

    fillDemoLogin(role) {
        const emailField = document.getElementById('loginEmail');
        const passwordField = document.getElementById('loginPassword');

        if (emailField && passwordField) {
            emailField.value = `${role}@interviews.tv`;
            passwordField.value = `password123`;

            // Add visual feedback
            emailField.focus();
            this.showToast(`Demo ${role} credentials filled. Click Sign In to login.`, 'info');
        }
    }

    renderProfilePage() {
        if (!this.isAuthenticated) {
            return `
                <div class="container py-5">
                    <div class="alert alert-warning text-center">
                        <h4>Access Denied</h4>
                        <p>Please <a href="#" onclick="app.navigateTo('login')">login</a> to view your profile.</p>
                    </div>
                </div>
            `;
        }

        const user = this.currentUser;
        const profileData = JSON.parse(localStorage.getItem('profile_data') || '{}');

        // Get hero banner from profile data
        const heroBanner = profileData.heroBanner;
        console.log('Profile page - Hero banner data:', heroBanner ? 'EXISTS' : 'NOT FOUND');
        console.log('Profile data:', profileData);

        const heroBackgroundStyle = heroBanner
            ? `background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${heroBanner}); background-size: cover; background-position: center;`
            : `background: linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 50%, #1a1a1a 100%);`;

        console.log('Hero background style:', heroBackgroundStyle.substring(0, 100) + '...');

        return `
            <div class="profile-page-dark">
                <!-- Hero Banner -->
                <div class="profile-hero-banner position-relative">
                    <div class="hero-background" style="${heroBackgroundStyle} height: 450px; position: relative; overflow: hidden;">
                        <div class="hero-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3);"></div>
                        <div class="hero-pattern" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.1;"></div>
                    </div>

                    <div class="container position-relative" style="margin-top: -350px; padding-top: 80px;">
                        <div class="row">
                            <div class="col-12">
                                <div class="profile-header d-flex align-items-start text-white">
                                    <!-- Left side: Avatar -->
                                    <div class="profile-avatar-section me-5">
                                        <div class="profile-avatar-container position-relative d-inline-block">
                                            <img src="${user.avatar || `https://via.placeholder.com/220x220/333333/FFFFFF?text=${user.name.charAt(0)}`}"
                                                 class="profile-avatar-main"
                                                 alt="Profile Picture">
                                            <div class="position-absolute bottom-0 end-0" style="margin-bottom: 10px; margin-right: 10px;">
                                                <span class="badge bg-${user.role === 'admin' ? 'danger' : user.role === 'creator' ? 'warning' : 'primary'} rounded-pill px-3 py-2 fs-6">
                                                    <i class="fas fa-${user.role === 'admin' ? 'crown' : user.role === 'creator' ? 'video' : 'user'} me-1"></i>
                                                    ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Right side: Name, bio, stats, actions -->
                                    <div class="profile-info-section flex-grow-1" style="padding-top: 20px;">
                                        <h1 class="display-5 fw-bold mb-3 text-white">${user.name}</h1>
                                        ${profileData.bio ? `<p class="lead mb-4 text-light">${profileData.bio}</p>` : '<p class="lead mb-4 text-light opacity-75">Welcome to my profile on Interviews.tv</p>'}

                                        <div class="profile-meta d-flex align-items-center flex-wrap gap-3 mb-3">
                                            ${profileData.location ? `<span class="text-light opacity-75"><i class="fas fa-map-marker-alt me-1"></i>${profileData.location}</span>` : ''}
                                            ${profileData.company ? `<span class="text-light opacity-75"><i class="fas fa-building me-1"></i>${profileData.company}</span>` : ''}
                                            ${profileData.website ? `<a href="${profileData.website}" target="_blank" class="text-white text-decoration-none"><i class="fas fa-globe me-1"></i>Website</a>` : ''}
                                            <span class="text-light opacity-75"><i class="fas fa-calendar me-1"></i>Joined ${user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {month: 'long', year: 'numeric'}) : 'Recently'}</span>
                                        </div>

                                        <div class="d-flex justify-content-between align-items-end mb-4">
                                            <div class="profile-stats d-flex gap-4">
                                                <div class="stat-item">
                                                    <div class="stat-number h5 fw-bold mb-0 text-white">12</div>
                                                    <div class="stat-label small text-light opacity-75">Interviews</div>
                                                </div>
                                                <div class="stat-item">
                                                    <div class="stat-number h5 fw-bold mb-0 text-white">245</div>
                                                    <div class="stat-label small text-light opacity-75">Followers</div>
                                                </div>
                                                <div class="stat-item">
                                                    <div class="stat-number h5 fw-bold mb-0 text-white">89</div>
                                                    <div class="stat-label small text-light opacity-75">Following</div>
                                                </div>
                                                <div class="stat-item">
                                                    <div class="stat-number h5 fw-bold mb-0 text-white">1.2k</div>
                                                    <div class="stat-label small text-light opacity-75">Views</div>
                                                </div>
                                            </div>

                                            <div class="profile-actions d-flex gap-3">
                                                <button class="btn btn-primary px-4" onclick="app.navigateTo('settings')">
                                                    <i class="fas fa-edit me-2"></i>Edit Profile
                                                </button>
                                                <button class="btn btn-outline-light px-4" onclick="app.navigateTo('create')">
                                                    <i class="fas fa-plus me-2"></i>Create Interview
                                                </button>
                                                <button class="btn btn-outline-light" onclick="app.shareProfile()">
                                                    <i class="fas fa-share me-2"></i>Share
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="container" style="padding-top: 20px; padding-bottom: 2rem;">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card profile-card-dark">
                                <div class="card-header">
                                    <h6 class="mb-0 text-white">About</h6>
                                </div>
                                <div class="card-body">
                                    ${profileData.bio ? `<p class="mb-3 text-light">${profileData.bio}</p>` : '<p class="text-light opacity-75 mb-3">No bio available yet.</p>'}

                                    <div class="profile-details">
                                        ${profileData.location ? `<div class="mb-2 text-light"><i class="fas fa-map-marker-alt me-2 text-danger"></i>${profileData.location}</div>` : ''}
                                        ${profileData.company ? `<div class="mb-2 text-light"><i class="fas fa-building me-2 text-danger"></i>${profileData.company}</div>` : ''}
                                        ${profileData.website ? `<div class="mb-2 text-light"><i class="fas fa-globe me-2 text-danger"></i><a href="${profileData.website}" target="_blank" class="text-white text-decoration-none">${profileData.website}</a></div>` : ''}
                                        ${profileData.phone ? `<div class="mb-2 text-light"><i class="fas fa-phone me-2 text-danger"></i>${profileData.phone}</div>` : ''}
                                        <div class="mb-2 text-light"><i class="fas fa-envelope me-2 text-danger"></i>${user.email}</div>
                                        <div class="mb-0 text-light"><i class="fas fa-calendar me-2 text-danger"></i>Joined ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="card profile-card-dark mt-4">
                                <div class="card-header">
                                    <h6 class="mb-0 text-white">Quick Actions</h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-outline-danger" onclick="app.navigateTo('settings')">
                                            <i class="fas fa-cog me-2"></i>Edit Profile
                                        </button>
                                        <button class="btn btn-danger" onclick="app.navigateTo('create')">
                                            <i class="fas fa-plus me-2"></i>Create Interview
                                        </button>
                                        <button class="btn btn-outline-light" onclick="app.shareProfile()">
                                            <i class="fas fa-share me-2"></i>Share Profile
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-8">
                            <div class="card profile-card-dark">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0 text-white">My Interviews</h5>
                                    <button class="btn btn-danger btn-sm" onclick="app.navigateTo('create')">
                                        <i class="fas fa-plus me-1"></i>New Interview
                                    </button>
                                </div>
                                <div class="card-body">
                                    ${this.renderUserInterviews()}
                                </div>

                                    <div class="text-center">
                                        <button class="btn btn-outline-light">
                                            <i class="fas fa-plus me-2"></i>Load More Interviews
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderUserInterviews() {
        // Get stored interviews and merge with demo data
        const storedInterviews = JSON.parse(localStorage.getItem('user_interviews') || '{}');
        const demoInterviews = {
            1: {
                id: 1,
                title: "My First Interview",
                description: "This is my first interview on the platform. I discuss my journey and experiences.",
                category: "Personal",
                tags: ["personal", "journey", "experience"],
                thumbnail: "https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Interview+1",
                status: "published",
                created_at: "2024-01-15T10:30:00Z",
                views: 1200,
                likes: 45
            },
            2: {
                id: 2,
                title: "Tech Industry Insights",
                description: "Deep dive into the current state of the tech industry and future trends.",
                category: "Technology",
                tags: ["tech", "industry", "trends", "future"],
                thumbnail: "https://via.placeholder.com/300x200/000000/FFFFFF?text=Interview+2",
                status: "published",
                created_at: "2024-01-08T14:20:00Z",
                views: 856,
                likes: 32
            }
        };

        // Merge stored interviews with demo data (stored data takes precedence)
        const allInterviews = { ...demoInterviews, ...storedInterviews };

        // Convert to array and sort by creation date
        const interviewsArray = Object.values(allInterviews).sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        if (interviewsArray.length === 0) {
            return `
                <div class="text-center py-5">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <h5 class="text-white mb-2">No Interviews Yet</h5>
                    <p class="text-light opacity-75 mb-3">Start creating your first interview to share your story.</p>
                    <button class="btn btn-danger" onclick="app.navigateTo('create')">
                        <i class="fas fa-plus me-2"></i>Create Your First Interview
                    </button>
                </div>
            `;
        }

        const formatDate = (dateString) => {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) return 'Published 1 day ago';
            if (diffDays < 7) return `Published ${diffDays} days ago`;
            if (diffDays < 30) return `Published ${Math.ceil(diffDays / 7)} week${Math.ceil(diffDays / 7) > 1 ? 's' : ''} ago`;
            return `Published ${Math.ceil(diffDays / 30)} month${Math.ceil(diffDays / 30) > 1 ? 's' : ''} ago`;
        };

        const formatViews = (views) => {
            if (views >= 1000) return `${(views / 1000).toFixed(1)}k`;
            return views.toString();
        };

        return `
            <div class="row">
                ${interviewsArray.map(interview => `
                    <div class="col-md-6 mb-4">
                        <div class="card interview-card-dark">
                            <img src="${interview.thumbnail || 'https://via.placeholder.com/300x200/333333/FFFFFF?text=No+Image'}"
                                 class="card-img-top" alt="${interview.title}" style="height: 200px; object-fit: cover;">
                            <div class="card-body">
                                <h6 class="card-title text-white">${interview.title}</h6>
                                <p class="card-text small text-light opacity-75">${formatDate(interview.created_at)}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-light opacity-75">
                                        <i class="fas fa-eye me-1"></i>${formatViews(interview.views || 0)} views
                                        <i class="fas fa-heart ms-2 me-1"></i>${interview.likes || 0} likes
                                    </small>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-light btn-sm" onclick="app.editInterview(${interview.id})" title="Edit Interview">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-outline-danger btn-sm" onclick="app.deleteInterview(${interview.id})" title="Delete Interview">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="text-center">
                <button class="btn btn-outline-light">
                    <i class="fas fa-plus me-2"></i>Load More Interviews
                </button>
            </div>
        `;
    }

    renderCreatePage() {
        if (!this.isAuthenticated) {
            return `
                <div class="container py-5">
                    <div class="alert alert-warning text-center">
                        <h4>Access Denied</h4>
                        <p>Please <a href="#" onclick="app.navigateTo('login')">login</a> to create interviews.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="create-interview-dark">
                <div class="container py-5">
                    <div class="row justify-content-center">
                        <div class="col-lg-8">
                            <div class="card">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h4 class="mb-0">
                                        <i class="fas fa-video me-2"></i>Create New Interview
                                    </h4>
                                    <div class="d-flex align-items-center gap-3">
                                        <span class="text-white-50 small">Dark Mode</span>
                                        <i class="fas fa-moon text-warning"></i>
                                    </div>
                                </div>
                            <div class="card-body">
                                <!-- Progress Steps -->
                                <div class="progress-steps mb-4">
                                    <div class="row">
                                        <div class="col-4">
                                            <div class="step active">
                                                <div class="step-number">1</div>
                                                <div class="step-title">Basic Info</div>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="step">
                                                <div class="step-number">2</div>
                                                <div class="step-title">Media Upload</div>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="step">
                                                <div class="step-number">3</div>
                                                <div class="step-title">Review & Publish</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <form id="createInterviewForm" onsubmit="app.handleCreateInterview(event)">
                                    <!-- Step 1: Basic Information -->
                                    <div id="step1" class="step-content">
                                        <h5 class="mb-3">Interview Details</h5>

                                        <div class="mb-3">
                                            <label for="interviewTitle" class="form-label">Interview Title *</label>
                                            <input type="text" class="form-control" id="interviewTitle"
                                                   placeholder="Enter a compelling title for your interview" required>
                                        </div>

                                        <div class="mb-3">
                                            <label for="interviewDescription" class="form-label">Description</label>
                                            <textarea class="form-control" id="interviewDescription" rows="4"
                                                      placeholder="Describe what this interview is about..."></textarea>
                                        </div>

                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="interviewType" class="form-label">Interview Type *</label>
                                                    <select class="form-select" id="interviewType" required onchange="app.updateMediaUploadType()">
                                                        <option value="">Select type...</option>
                                                        <option value="video">Video Interview</option>
                                                        <option value="audio">Audio Interview</option>
                                                        <option value="text">Text Interview</option>
                                                        <option value="live">Live Interview</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="interviewCategory" class="form-label">Category</label>
                                                    <select class="form-select" id="interviewCategory">
                                                        <option value="">Select category...</option>
                                                        <option value="business">Business</option>
                                                        <option value="technology">Technology</option>
                                                        <option value="arts">Arts & Culture</option>
                                                        <option value="music">Music</option>
                                                        <option value="politics">Politics</option>
                                                        <option value="sports">Sports</option>
                                                        <option value="lifestyle">Lifestyle</option>
                                                        <option value="education">Education</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="mb-3">
                                            <label for="interviewTags" class="form-label">Tags</label>
                                            <input type="text" class="form-control" id="interviewTags"
                                                   placeholder="Enter tags separated by commas (e.g., entrepreneur, startup, innovation)">
                                            <div class="form-text">Tags help people discover your interview</div>
                                        </div>

                                        <div class="d-flex justify-content-end">
                                            <button type="button" class="btn btn-primary" onclick="app.nextStep(2)">
                                                Next: Upload Media <i class="fas fa-arrow-right ms-1"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Step 2: Media Upload -->
                                    <div id="step2" class="step-content" style="display: none;">
                                        <h5 class="mb-3">Upload Media</h5>

                                        <div id="mediaUploadSection">
                                            <!-- Video Upload -->
                                            <div id="videoUpload" class="upload-section" style="display: none;">
                                                <div class="upload-area border border-2 border-dashed rounded p-4 text-center mb-3"
                                                     onclick="document.getElementById('videoFile').click()" style="cursor: pointer;">
                                                    <i class="fas fa-video fa-3x mb-3"></i>
                                                    <h6 class="text-white">Click to upload video file</h6>
                                                    <p class="mb-0">Supports MP4, MOV, AVI, WebM (Max 500MB)</p>
                                                    <input type="file" id="videoFile" accept="video/*" style="display: none;" onchange="app.handleFileUpload(this, 'video')">
                                                </div>
                                            </div>

                                            <!-- Audio Upload -->
                                            <div id="audioUpload" class="upload-section" style="display: none;">
                                                <div class="upload-area border border-2 border-dashed rounded p-4 text-center mb-3"
                                                     onclick="document.getElementById('audioFile').click()" style="cursor: pointer;">
                                                    <i class="fas fa-microphone fa-3x mb-3"></i>
                                                    <h6 class="text-white">Click to upload audio file</h6>
                                                    <p class="mb-0">Supports MP3, WAV, M4A, AAC (Max 100MB)</p>
                                                    <input type="file" id="audioFile" accept="audio/*" style="display: none;" onchange="app.handleFileUpload(this, 'audio')">
                                                </div>
                                            </div>

                                            <!-- Text Interview -->
                                            <div id="textUpload" class="upload-section" style="display: none;">
                                                <div class="row mb-3">
                                                    <div class="col-md-6">
                                                        <h6 class="text-white">Option 1: Upload Document</h6>
                                                        <div class="upload-area border border-2 border-dashed rounded p-4 text-center mb-3"
                                                             onclick="document.getElementById('textFile').click()" style="cursor: pointer;">
                                                            <i class="fas fa-file-alt fa-3x mb-3"></i>
                                                            <h6 class="text-white">Click to upload document</h6>
                                                            <p class="mb-0">Supports TXT, PDF, DOC, DOCX (Max 50MB)</p>
                                                            <input type="file" id="textFile" accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                                   style="display: none;" onchange="app.handleFileUpload(this, 'text')">
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <h6 class="text-white">Option 2: Type Content</h6>
                                                        <div class="mb-3">
                                                            <textarea class="form-control" id="interviewContent" rows="8"
                                                                      placeholder="Enter the full interview content here..."></textarea>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div class="alert alert-info">
                                                    <i class="fas fa-info-circle me-2"></i>
                                                    <strong>Text Interview Tips:</strong>
                                                    <ul class="mb-0 mt-2">
                                                        <li>Include speaker names (e.g., "Interviewer:", "Guest:")</li>
                                                        <li>Use clear formatting for questions and answers</li>
                                                        <li>Add timestamps if available (e.g., "[00:05:30]")</li>
                                                        <li>Include relevant context or background information</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            <!-- Live Interview -->
                                            <div id="liveUpload" class="upload-section" style="display: none;">
                                                <div class="alert alert-info">
                                                    <i class="fas fa-info-circle me-2"></i>
                                                    <strong>Live Interview Setup</strong><br>
                                                    Schedule your live interview session. Participants will be notified.
                                                </div>
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label for="liveDate" class="form-label">Date</label>
                                                            <input type="date" class="form-control" id="liveDate">
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label for="liveTime" class="form-label">Time</label>
                                                            <input type="time" class="form-control" id="liveTime">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Upload Progress -->
                                        <div id="uploadProgress" style="display: none;">
                                            <div class="mb-2">
                                                <div class="d-flex justify-content-between">
                                                    <span>Uploading...</span>
                                                    <span id="progressPercent">0%</span>
                                                </div>
                                            </div>
                                            <div class="progress mb-3">
                                                <div class="progress-bar" id="progressBar" role="progressbar" style="width: 0%"></div>
                                            </div>
                                        </div>

                                        <!-- Uploaded Files -->
                                        <div id="uploadedFiles"></div>

                                        <div class="d-flex justify-content-between">
                                            <button type="button" class="btn btn-outline-secondary" onclick="app.previousStep(1)">
                                                <i class="fas fa-arrow-left me-1"></i>Back
                                            </button>
                                            <button type="button" class="btn btn-primary" onclick="app.nextStep(3)">
                                                Next: Review <i class="fas fa-arrow-right ms-1"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Step 3: Review & Publish -->
                                    <div id="step3" class="step-content" style="display: none;">
                                        <h5 class="mb-3">Review & Publish</h5>

                                        <div class="interview-preview-card">
                                            <div id="previewContent">
                                                <!-- Preview will be generated here -->
                                            </div>
                                        </div>

                                        <div class="mt-4">
                                            <h6>Publishing Options</h6>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="publishStatus" id="publishDraft" value="draft" checked>
                                                <label class="form-check-label" for="publishDraft">
                                                    Save as Draft
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="publishStatus" id="publishNow" value="published">
                                                <label class="form-check-label" for="publishNow">
                                                    Publish Now
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="publishStatus" id="publishScheduled" value="scheduled">
                                                <label class="form-check-label" for="publishScheduled">
                                                    Schedule for Later
                                                </label>
                                            </div>
                                        </div>

                                        <div class="d-flex justify-content-between mt-4">
                                            <button type="button" class="btn btn-outline-secondary" onclick="app.previousStep(2)">
                                                <i class="fas fa-arrow-left me-1"></i>Back
                                            </button>
                                            <button type="submit" class="btn btn-success">
                                                <i class="fas fa-check me-1"></i>Create Interview
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSettingsPage() {
        if (!this.isAuthenticated) {
            return `
                <div class="container py-5">
                    <div class="alert alert-warning text-center">
                        <h4>Access Denied</h4>
                        <p>Please <a href="javascript:void(0)" onclick="app.navigateTo('login'); return false;">login</a> to access settings.</p>
                    </div>
                </div>
            `;
        }

        const user = this.currentUser;
        const currentTab = this.currentSettingsTab || 'profile';

        return `
            <div class="settings-page-dark">
                <div class="container py-5">
                    <div class="row">
                        <div class="col-md-3">
                            <div class="card settings-card-dark">
                                <div class="card-header">
                                    <h6 class="mb-0 text-white">Settings</h6>
                                </div>
                                <div class="list-group list-group-flush settings-nav" id="settingsNav">
                                    <a href="javascript:void(0)" class="list-group-item list-group-item-action settings-nav-item ${currentTab === 'profile' ? 'active' : ''}" onclick="app.showSettingsTab('profile'); return false;">
                                        <i class="fas fa-user me-2"></i>Profile
                                    </a>
                                    <a href="javascript:void(0)" class="list-group-item list-group-item-action settings-nav-item ${currentTab === 'account' ? 'active' : ''}" onclick="app.showSettingsTab('account'); return false;">
                                        <i class="fas fa-cog me-2"></i>Account
                                    </a>
                                    <a href="javascript:void(0)" class="list-group-item list-group-item-action settings-nav-item ${currentTab === 'privacy' ? 'active' : ''}" onclick="app.showSettingsTab('privacy'); return false;">
                                        <i class="fas fa-shield-alt me-2"></i>Privacy
                                    </a>
                                    <a href="javascript:void(0)" class="list-group-item list-group-item-action settings-nav-item ${currentTab === 'notifications' ? 'active' : ''}" onclick="app.showSettingsTab('notifications'); return false;">
                                        <i class="fas fa-bell me-2"></i>Notifications
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-9">
                            <div id="settingsContent">
                                ${this.renderSettingsTabContent(currentTab, user)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSettingsTabContent(tab, user) {
        switch(tab) {
            case 'profile':
                return this.renderProfileSettingsTab(user);
            case 'account':
                return this.renderAccountSettingsTab(user);
            case 'privacy':
                return this.renderPrivacySettingsTab(user);
            case 'notifications':
                return this.renderNotificationSettingsTab(user);
            default:
                return this.renderProfileSettingsTab(user);
        }
    }

    renderProfileSettingsTab(user) {
        const savedData = JSON.parse(localStorage.getItem('profile_data') || '{}');

        return `
            <div class="card settings-card-dark">
                <div class="card-header">
                    <h5 class="mb-0 text-white">Profile Settings</h5>
                </div>
                <div class="card-body">
                    <form onsubmit="app.handleUpdateProfile(event)">
                        <!-- Hero Banner Upload Section -->
                        <div class="mb-4">
                            <h6 class="text-white mb-3">Hero Banner</h6>
                            <div class="hero-banner-upload position-relative">
                                <div class="hero-banner-preview" id="heroBannerPreview"
                                     onclick="document.getElementById('heroBannerUpload').click()"
                                     style="${savedData.heroBanner ? `background: url(${savedData.heroBanner}); background-size: cover; background-position: center;` : 'background: linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 50%, #1a1a1a 100%);'}
                                            height: 200px;
                                            border-radius: 0.5rem;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            border: 2px dashed #555555;
                                            cursor: pointer;">
                                    ${savedData.heroBanner ? '' : `
                                        <div class="text-center text-light">
                                            <i class="fas fa-image fa-3x mb-2 opacity-50"></i>
                                            <p class="mb-0">Click to upload hero banner</p>
                                            <small class="text-light-grey">Recommended: 1200x400px</small>
                                        </div>
                                    `}
                                </div>
                                <input type="file" class="d-none" id="heroBannerUpload" accept="image/*" onchange="app.handleHeroBannerUpload(this)">
                                <button type="button" class="btn btn-danger position-absolute top-0 end-0 m-2"
                                        onclick="document.getElementById('heroBannerUpload').click()">
                                    <i class="fas fa-camera me-1"></i>Upload Banner
                                </button>
                            </div>
                            <div class="form-text text-light-grey mt-2">Upload a hero banner for your profile (JPG, PNG, max 10MB)</div>
                            <button type="button" class="btn btn-outline-light btn-sm mt-2" onclick="app.debugHeroBanner()">
                                <i class="fas fa-bug me-1"></i>Debug Hero Banner Data
                            </button>
                        </div>

                        <!-- Avatar Upload Section -->
                        <div class="text-center mb-4">
                            <h6 class="text-white mb-3">Profile Picture</h6>
                            <div class="position-relative d-inline-block">
                                <img src="${user.avatar || `https://via.placeholder.com/150x150/333333/FFFFFF?text=${user.name.charAt(0)}`}"
                                     class="rounded-circle mb-3 border border-3 border-light" alt="Profile Picture" width="150" height="150" id="avatarPreview">
                                <button type="button" class="btn btn-sm btn-danger position-absolute bottom-0 end-0 rounded-circle"
                                        onclick="document.getElementById('profileAvatar').click()" style="width: 40px; height: 40px;">
                                    <i class="fas fa-camera"></i>
                                </button>
                            </div>
                            <div>
                                <input type="file" class="d-none" id="profileAvatar" accept="image/*" onchange="app.handleAvatarUpload(this)">
                                <div class="form-text text-light-grey">Click the camera icon to upload a new profile picture (JPG, PNG, max 5MB)</div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profileName" class="form-label text-white">Full Name</label>
                                    <input type="text" class="form-control settings-input" id="profileName" value="${user.name}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profileEmail" class="form-label text-white">Email</label>
                                    <input type="email" class="form-control settings-input" id="profileEmail" value="${user.email}">
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="profileBio" class="form-label text-white">Bio</label>
                            <textarea class="form-control settings-input" id="profileBio" rows="3"
                                      placeholder="Tell people about yourself...">${savedData.bio || ''}</textarea>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profileLocation" class="form-label text-white">Location</label>
                                    <input type="text" class="form-control settings-input" id="profileLocation"
                                           placeholder="City, Country" value="${savedData.location || ''}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profileWebsite" class="form-label text-white">Website</label>
                                    <input type="url" class="form-control settings-input" id="profileWebsite"
                                           placeholder="https://yourwebsite.com" value="${savedData.website || ''}">
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profilePhone" class="form-label text-white">Phone</label>
                                    <input type="tel" class="form-control settings-input" id="profilePhone"
                                           placeholder="+1 (555) 123-4567" value="${savedData.phone || ''}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profileCompany" class="form-label text-white">Company</label>
                                    <input type="text" class="form-control settings-input" id="profileCompany"
                                           placeholder="Your company name" value="${savedData.company || ''}">
                                </div>
                            </div>
                        </div>

                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-outline-light" onclick="app.navigateTo('profile'); return false;">
                                <i class="fas fa-eye me-1"></i>View Profile
                            </button>
                            <button type="submit" class="btn btn-danger">
                                <i class="fas fa-save me-1"></i>Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderAccountSettingsTab(user) {
        return `
            <div class="card settings-card-dark">
                <div class="card-header">
                    <h5 class="mb-0 text-white">Account Settings</h5>
                </div>
                <div class="card-body">
                    <form onsubmit="app.handleUpdateAccount(event)">
                        <div class="mb-4">
                            <h6 class="text-white">Change Password</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="currentPassword" class="form-label text-white">Current Password</label>
                                        <input type="password" class="form-control settings-input" id="currentPassword">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="newPassword" class="form-label text-white">New Password</label>
                                        <input type="password" class="form-control settings-input" id="newPassword">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="confirmPassword" class="form-label text-white">Confirm New Password</label>
                                        <input type="password" class="form-control settings-input" id="confirmPassword">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="border-secondary">

                        <div class="mb-4">
                            <h6 class="text-white">Account Status</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label text-white">Email Verification</label>
                                        <div class="d-flex align-items-center">
                                            <span class="badge bg-success me-2">Verified</span>
                                            <small class="text-light-grey">Your email is verified</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label text-white">Account Type</label>
                                        <div class="d-flex align-items-center">
                                            <span class="badge bg-${user.role === 'admin' ? 'danger' : user.role === 'creator' ? 'warning' : 'primary'} me-2">
                                                ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                            </span>
                                            <small class="text-light-grey">Your current role</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="border-secondary">

                        <div class="mb-4">
                            <h6 class="text-danger">Danger Zone</h6>
                            <div class="border border-danger rounded p-3" style="background: rgba(255, 0, 0, 0.1);">
                                <div class="mb-3">
                                    <strong class="text-white">Delete Account</strong>
                                    <p class="text-light-grey mb-2">Once you delete your account, there is no going back. Please be certain.</p>
                                    <button type="button" class="btn btn-outline-danger" onclick="app.confirmDeleteAccount()">
                                        <i class="fas fa-trash me-1"></i>Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex justify-content-end">
                            <button type="submit" class="btn btn-danger">
                                <i class="fas fa-save me-1"></i>Update Account
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderPrivacySettingsTab(user) {
        const savedPrivacy = JSON.parse(localStorage.getItem('privacy_settings') || '{}');

        return `
            <div class="card settings-card-dark">
                <div class="card-header">
                    <h5 class="mb-0 text-white">Privacy Settings</h5>
                </div>
                <div class="card-body">
                    <form onsubmit="app.handleUpdatePrivacy(event)">
                        <div class="mb-4">
                            <h6 class="text-white">Profile Visibility</h6>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="radio" name="profileVisibility" id="profilePublic"
                                       value="public" ${savedPrivacy.profileVisibility !== 'private' ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="profilePublic">
                                    <strong class="text-white">Public</strong> - Anyone can view your profile
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="radio" name="profileVisibility" id="profilePrivate"
                                       value="private" ${savedPrivacy.profileVisibility === 'private' ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="profilePrivate">
                                    <strong class="text-white">Private</strong> - Only followers can view your profile
                                </label>
                            </div>
                        </div>

                        <div class="mb-4">
                            <h6 class="text-white">Interview Privacy</h6>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="allowComments"
                                       ${savedPrivacy.allowComments !== false ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="allowComments">
                                    Allow comments on my interviews
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="allowDownloads"
                                       ${savedPrivacy.allowDownloads === true ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="allowDownloads">
                                    Allow downloads of my interviews
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="showInSearch"
                                       ${savedPrivacy.showInSearch !== false ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="showInSearch">
                                    Show my interviews in search results
                                </label>
                            </div>
                        </div>

                        <div class="mb-4">
                            <h6 class="text-white">Contact Preferences</h6>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="allowMessages"
                                       ${savedPrivacy.allowMessages !== false ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="allowMessages">
                                    Allow direct messages from other users
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="allowInterviewRequests"
                                       ${savedPrivacy.allowInterviewRequests !== false ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="allowInterviewRequests">
                                    Allow interview requests from other users
                                </label>
                            </div>
                        </div>

                        <div class="d-flex justify-content-end">
                            <button type="submit" class="btn btn-danger">
                                <i class="fas fa-save me-1"></i>Save Privacy Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderNotificationSettingsTab(user) {
        const savedNotifications = JSON.parse(localStorage.getItem('notification_settings') || '{}');

        return `
            <div class="card settings-card-dark">
                <div class="card-header">
                    <h5 class="mb-0 text-white">Notification Settings</h5>
                </div>
                <div class="card-body">
                    <form onsubmit="app.handleUpdateNotifications(event)">
                        <div class="mb-4">
                            <h6 class="text-white">
                                <i class="fas fa-envelope me-2 text-danger"></i>Email Notifications
                            </h6>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="emailNewFollowers"
                                       ${savedNotifications.emailNewFollowers !== false ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="emailNewFollowers">
                                    New followers
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="emailNewComments"
                                       ${savedNotifications.emailNewComments !== false ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="emailNewComments">
                                    New comments on my interviews
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="emailInterviewRequests"
                                       ${savedNotifications.emailInterviewRequests !== false ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="emailInterviewRequests">
                                    Interview requests
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="emailWeeklyDigest"
                                       ${savedNotifications.emailWeeklyDigest !== false ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="emailWeeklyDigest">
                                    Weekly digest of platform activity
                                </label>
                            </div>
                        </div>

                        <div class="mb-4">
                            <h6 class="text-white">
                                <i class="fas fa-mobile-alt me-2 text-danger"></i>Push Notifications
                            </h6>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="pushNewFollowers"
                                       ${savedNotifications.pushNewFollowers === true ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="pushNewFollowers">
                                    New followers
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="pushNewComments"
                                       ${savedNotifications.pushNewComments === true ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="pushNewComments">
                                    New comments on my interviews
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="pushInterviewRequests"
                                       ${savedNotifications.pushInterviewRequests === true ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="pushInterviewRequests">
                                    Interview requests
                                </label>
                            </div>
                        </div>

                        <div class="mb-4">
                            <h6 class="text-white">
                                <i class="fas fa-bell me-2 text-danger"></i>In-App Notifications
                            </h6>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="inAppAll"
                                       ${savedNotifications.inAppAll !== false ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="inAppAll">
                                    Show all in-app notifications
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input settings-checkbox" type="checkbox" id="inAppSound"
                                       ${savedNotifications.inAppSound === true ? 'checked' : ''}>
                                <label class="form-check-label text-light" for="inAppSound">
                                    Play sound for notifications
                                </label>
                            </div>
                        </div>

                        <div class="d-flex justify-content-end">
                            <button type="submit" class="btn btn-danger">
                                <i class="fas fa-save me-1"></i>Save Notification Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderFooter() {
        return `
            <footer class="footer-enhanced">
                <div class="footer-pattern"></div>
                <div class="container position-relative">
                    <div class="row align-items-center py-5">
                        <div class="col-lg-4 col-md-6 mb-4 mb-lg-0">
                            <div class="footer-brand-section">
                                <h3 class="footer-brand-title mb-3">
                                    <i class="fas fa-video me-2 text-danger"></i>
                                    Interviews<span class="text-danger">.tv</span>
                                </h3>
                                <p class="footer-message text-light-grey mb-3">
                                    Discover authentic stories and connect with inspiring voices from around the world.
                                    Your gateway to meaningful conversations.
                                </p>
                                <div class="footer-social d-flex gap-3">
                                    <a href="#" class="social-link" title="Twitter">
                                        <i class="fab fa-twitter"></i>
                                    </a>
                                    <a href="#" class="social-link" title="LinkedIn">
                                        <i class="fab fa-linkedin"></i>
                                    </a>
                                    <a href="#" class="social-link" title="YouTube">
                                        <i class="fab fa-youtube"></i>
                                    </a>
                                    <a href="#" class="social-link" title="Instagram">
                                        <i class="fab fa-instagram"></i>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div class="col-lg-2 col-md-6 mb-4 mb-lg-0">
                            <h6 class="footer-section-title mb-3">Platform</h6>
                            <ul class="footer-links list-unstyled">
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('home')">
                                    <i class="fas fa-home me-2"></i>Home
                                </a></li>
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('explore')">
                                    <i class="fas fa-compass me-2"></i>Explore
                                </a></li>
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('gallery')">
                                    <i class="fas fa-images me-2"></i>Gallery
                                </a></li>
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('business')">
                                    <i class="fas fa-building me-2"></i>Business
                                </a></li>
                            </ul>
                        </div>

                        <div class="col-lg-2 col-md-6 mb-4 mb-lg-0">
                            <h6 class="footer-section-title mb-3">Create</h6>
                            <ul class="footer-links list-unstyled">
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('create')">
                                    <i class="fas fa-plus me-2"></i>New Interview
                                </a></li>
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('profile')">
                                    <i class="fas fa-user me-2"></i>My Profile
                                </a></li>
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('settings')">
                                    <i class="fas fa-cog me-2"></i>Settings
                                </a></li>
                            </ul>
                        </div>

                        <div class="col-lg-2 col-md-6 mb-4 mb-lg-0">
                            <h6 class="footer-section-title mb-3">Support</h6>
                            <ul class="footer-links list-unstyled">
                                <li><a href="#" class="footer-link">
                                    <i class="fas fa-question-circle me-2"></i>Help Center
                                </a></li>
                                <li><a href="#" class="footer-link">
                                    <i class="fas fa-shield-alt me-2"></i>Privacy
                                </a></li>
                                <li><a href="#" class="footer-link">
                                    <i class="fas fa-file-contract me-2"></i>Terms
                                </a></li>
                                <li><a href="#" class="footer-link">
                                    <i class="fas fa-envelope me-2"></i>Contact
                                </a></li>
                            </ul>
                        </div>

                        <div class="col-lg-2 col-md-12">
                            <div class="footer-cta text-center">
                                <div class="cta-box p-4 rounded-3">
                                    <i class="fas fa-rocket fa-2x text-danger mb-3"></i>
                                    <h6 class="text-white mb-2">Start Creating</h6>
                                    <p class="small text-light-grey mb-3">Share your story with the world</p>
                                    <button class="btn btn-danger btn-sm" onclick="app.navigateTo('create')">
                                        Get Started
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="footer-divider my-4">

                    <div class="row align-items-center py-3">
                        <div class="col-md-6">
                            <p class="footer-copyright mb-0 text-light-grey">
                                &copy; 2025 Interviews.tv. All rights reserved.
                            </p>
                        </div>
                        <div class="col-md-6 text-md-end">
                            <p class="footer-design mb-0 text-light-grey">
                                Design by <a href="https://xkinteractive.com" target="_blank" class="design-link">XK</a>
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }

    navigateTo(page) {
        console.log('Navigating to:', page);

        // Handle page with parameters (e.g., "watch?id=1")
        const [pageName, params] = page.split('?');
        this.currentPage = pageName;

        // Update URL hash without triggering hashchange event
        const newHash = '#' + page;
        if (window.location.hash !== newHash) {
            window.history.replaceState(null, null, newHash);
        }

        this.render();

        // Load page-specific data
        if (page === 'admin') {
            setTimeout(() => {
                this.loadAdminData();
                this.setupAdminEventListeners();
            }, 100); // Small delay to ensure DOM is ready
        }

        // Update URL without page reload
        const url = page === 'home' ? '/' : `/${page}`;
        window.history.pushState({page}, '', url);

        // Scroll to top
        window.scrollTo(0, 0);
    }

    setupEventListeners() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.currentPage = event.state.page;
            } else {
                // Handle direct URL access
                this.setInitialPage();
            }
            this.render();
        });
    }

    setupNavigationEvents() {
        // Any additional navigation setup can go here
    }

    async handleLogin(event) {
        event.preventDefault();

        const email = document.getElementById('loginEmail').value.toLowerCase();
        const password = document.getElementById('loginPassword').value;

        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;

        try {
            // Make API call to login endpoint
            const response = await this.apiPost('/auth/login.php', {
                email: email,
                password: password
            });

            if (response.success) {
                // Store authentication data
                this.setAuthToken(response.data.token);
                this.isAuthenticated = true;
                this.currentUser = response.data.user;

                // Store user data in localStorage for persistence
                localStorage.setItem('user_data', JSON.stringify(this.currentUser));
                localStorage.setItem('is_authenticated', 'true');

                this.showToast(`Welcome ${this.currentUser.name}! Logged in as ${this.currentUser.role}.`, 'success');

                // Role-specific redirect
                this.handleRoleBasedRedirect(this.currentUser.role);
            } else {
                this.showToast(response.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message || 'Login failed. Please check your credentials.', 'error');
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    handleRoleBasedRedirect(role) {
        switch(role) {
            case 'admin':
                this.navigateTo('home'); // Admin dashboard would go here
                break;
            case 'creator':
                this.navigateTo('profile'); // Creator profile
                break;
            case 'business':
                this.navigateTo('business'); // Business directory
                break;
            case 'user':
            default:
                this.navigateTo('home'); // Regular home page
                break;
        }
    }

    // Permission checking methods
    hasPermission(permission) {
        if (!this.isAuthenticated || !this.currentUser) return false;
        if (this.currentUser.role === 'admin') return true; // Admin has all permissions
        return this.currentUser.permissions && this.currentUser.permissions.includes(permission);
    }

    canCreateContent() {
        return this.hasPermission('create_content') || this.hasPermission('all');
    }

    canManageBusiness() {
        return this.hasPermission('manage_business') || this.hasPermission('all');
    }

    canConductInterviews() {
        return this.hasPermission('conduct_interviews') || this.hasPermission('all');
    }

    isAdmin() {
        return this.isAuthenticated && this.currentUser && this.currentUser.role === 'admin';
    }

    isCreator() {
        return this.isAuthenticated && this.currentUser && this.currentUser.role === 'creator';
    }

    isBusiness() {
        return this.isAuthenticated && this.currentUser && this.currentUser.role === 'business';
    }

    isUser() {
        return this.isAuthenticated && this.currentUser && this.currentUser.role === 'user';
    }

    async handleRegister(event) {
        event.preventDefault();

        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        if (!name || !email || !password) {
            alert('Please fill in all fields.');
            return;
        }

        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;

        try {
            // Make API call to register endpoint
            const response = await this.apiPost('/auth/register.php', {
                name: name,
                email: email,
                password: password,
                role: 'user' // Default role
            });

            if (response.success) {
                // Store authentication data
                this.setAuthToken(response.data.token);
                this.isAuthenticated = true;
                this.currentUser = response.data.user;

                // Store user data in localStorage for persistence
                localStorage.setItem('user_data', JSON.stringify(this.currentUser));
                localStorage.setItem('is_authenticated', 'true');

                this.showToast(`Welcome ${this.currentUser.name}! Registration successful.`, 'success');
                this.navigateTo('home');
            } else {
                this.showToast(response.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Unable to connect to server. Please ensure the API server is running on port 8080.');
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    logout() {
        // Clear stored authentication data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');

        this.isAuthenticated = false;
        this.currentUser = null;
        this.navigateTo('home');
        alert('Logged out successfully!');
    }

    handleCreateInterview(event) {
        event.preventDefault();

        const title = document.getElementById('interviewTitle').value;
        const description = document.getElementById('interviewDescription').value;
        const type = document.getElementById('interviewType').value;
        const category = document.getElementById('interviewCategory').value;
        const tags = document.getElementById('interviewTags').value;
        const publishStatus = document.querySelector('input[name="publishStatus"]:checked').value;

        if (!title || !type) {
            alert('Please fill in the required fields (Title and Type)');
            return;
        }

        // Get additional content based on type
        let additionalContent = '';
        if (type === 'text') {
            additionalContent = document.getElementById('interviewContent').value;
        } else if (type === 'live') {
            const date = document.getElementById('liveDate').value;
            const time = document.getElementById('liveTime').value;
            additionalContent = `Scheduled for: ${date} at ${time}`;
        }

        // Show success message
        const statusText = publishStatus === 'draft' ? 'saved as draft' :
                          publishStatus === 'scheduled' ? 'scheduled for publishing' : 'published';

        alert(`Interview "${title}" ${statusText} successfully!\n\nType: ${type}\nCategory: ${category || 'Uncategorized'}\nStatus: ${publishStatus}\n\nThis would normally save to the database and redirect to the interview page.`);

        // Redirect to profile to see the new interview
        this.navigateTo('profile');
    }

    handleUpdateProfile(event) {
        event.preventDefault();

        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        const bio = document.getElementById('profileBio').value;
        const location = document.getElementById('profileLocation').value;
        const website = document.getElementById('profileWebsite').value;

        // Update current user data
        this.currentUser.name = name;
        this.currentUser.email = email;

        // Update localStorage
        localStorage.setItem('user_data', JSON.stringify(this.currentUser));

        alert('Profile updated successfully!');
        this.navigateTo('profile');
    }

    nextStep(stepNumber) {
        // Validate current step before proceeding
        if (stepNumber === 2) {
            const title = document.getElementById('interviewTitle').value;
            const type = document.getElementById('interviewType').value;

            if (!title || !type) {
                alert('Please fill in the required fields (Title and Type) before proceeding.');
                return;
            }
        }

        // Validate step 2 before going to step 3
        if (stepNumber === 3) {
            const type = document.getElementById('interviewType').value;
            let hasContent = false;

            if (type === 'text') {
                const textContent = document.getElementById('interviewContent').value;
                const hasUploadedFile = document.getElementById('uploadedFiles').innerHTML.trim() !== '';
                hasContent = textContent.trim() !== '' || hasUploadedFile;
            } else if (type === 'live') {
                const date = document.getElementById('liveDate').value;
                const time = document.getElementById('liveTime').value;
                hasContent = date && time;
            } else {
                // For video/audio, check if file is uploaded
                hasContent = document.getElementById('uploadedFiles').innerHTML.trim() !== '';
            }

            if (!hasContent) {
                alert('Please upload media or add content before proceeding to review.');
                return;
            }
        }

        // Hide all steps
        document.querySelectorAll('.step-content').forEach(step => {
            step.style.display = 'none';
        });

        // Show target step
        document.getElementById(`step${stepNumber}`).style.display = 'block';

        // Update progress indicators
        this.updateProgressSteps(stepNumber);

        // Update media upload section based on interview type
        if (stepNumber === 2) {
            this.updateMediaUploadType();
        }

        // Generate preview if going to step 3
        if (stepNumber === 3) {
            this.generatePreview();
        }
    }

    previousStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(step => {
            step.style.display = 'none';
        });

        // Show target step
        document.getElementById(`step${stepNumber}`).style.display = 'block';

        // Update progress indicators
        this.updateProgressSteps(stepNumber);
    }

    updateProgressSteps(currentStep) {
        const steps = document.querySelectorAll('.progress-steps .step');
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');

            if (stepNumber === currentStep) {
                step.classList.add('active');
            } else if (stepNumber < currentStep) {
                step.classList.add('completed');
            }
        });
    }

    updateMediaUploadType() {
        const interviewType = document.getElementById('interviewType').value;

        // Hide all upload sections
        document.querySelectorAll('.upload-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show relevant upload section
        if (interviewType) {
            const uploadSection = document.getElementById(`${interviewType}Upload`);
            if (uploadSection) {
                uploadSection.style.display = 'block';
            }
        }
    }

    handleFileUpload(input, type) {
        const file = input.files[0];
        if (!file) return;

        // Validate file size based on type
        let maxSize;
        if (type === 'video') {
            maxSize = 500 * 1024 * 1024; // 500MB
        } else if (type === 'audio') {
            maxSize = 100 * 1024 * 1024; // 100MB
        } else if (type === 'text') {
            maxSize = 50 * 1024 * 1024; // 50MB
        }

        if (file.size > maxSize) {
            const maxSizeText = type === 'video' ? '500MB' : type === 'audio' ? '100MB' : '50MB';
            alert(`File size too large. Maximum size is ${maxSizeText}.`);
            input.value = '';
            return;
        }

        // Validate file type for text files
        if (type === 'text') {
            const allowedTypes = [
                'text/plain',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            const allowedExtensions = ['.txt', '.pdf', '.doc', '.docx'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

            if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
                alert('Invalid file type. Please upload TXT, PDF, DOC, or DOCX files only.');
                input.value = '';
                return;
            }
        }

        // Show upload progress
        this.showUploadProgress();

        // Handle text file processing
        if (type === 'text') {
            this.processTextFile(file);
        } else {
            // Simulate file upload with progress for media files
            this.simulateFileUpload(file, type);
        }
    }

    showUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'block';
    }

    hideUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'none';
    }

    simulateFileUpload(file, type) {
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        let progress = 0;

        // Update progress text based on file type
        const progressText = document.querySelector('#uploadProgress .d-flex span:first-child');
        progressText.textContent = `Uploading ${type} file...`;

        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;

            progressBar.style.width = progress + '%';
            progressPercent.textContent = Math.round(progress) + '%';

            if (progress >= 100) {
                clearInterval(interval);
                progressText.textContent = 'Upload complete!';
                setTimeout(() => {
                    this.hideUploadProgress();
                    this.showUploadedFile(file, type);
                }, 500);
            }
        }, 200);
    }

    showUploadedFile(file, type) {
        const uploadedFiles = document.getElementById('uploadedFiles');
        const fileSize = (file.size / (1024 * 1024)).toFixed(2);

        let icon, typeText;
        if (type === 'video') {
            icon = 'video';
            typeText = 'Video';
        } else if (type === 'audio') {
            icon = 'microphone';
            typeText = 'Audio';
        } else if (type === 'text') {
            icon = 'file-alt';
            typeText = 'Document';
        }

        uploadedFiles.innerHTML = `
            <div class="alert alert-success d-flex align-items-center">
                <i class="fas fa-${icon} me-3"></i>
                <div class="flex-grow-1">
                    <strong>${file.name}</strong><br>
                    <small class="text-muted">${fileSize} MB • ${typeText} file</small>
                    ${type === 'text' ? '<br><small class="text-info">Content loaded into editor below</small>' : ''}
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="app.removeUploadedFile()">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    processTextFile(file) {
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

        if (fileExtension === '.txt') {
            // Read plain text file
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                document.getElementById('interviewContent').value = content;
                this.hideUploadProgress();
                this.showUploadedFile(file, 'text');
                alert('Text file content has been loaded into the editor. You can review and edit it before proceeding.');
            };
            reader.onerror = () => {
                this.hideUploadProgress();
                alert('Error reading the text file. Please try again.');
            };
            reader.readAsText(file);
        } else if (fileExtension === '.pdf') {
            // For PDF files, we'll simulate processing since we can't extract text without additional libraries
            setTimeout(() => {
                this.hideUploadProgress();
                this.showUploadedFile(file, 'text');
                document.getElementById('interviewContent').value = `[PDF Document: ${file.name}]\n\nPDF content would be extracted here in a full implementation.\nFor now, please manually copy and paste the interview content from your PDF into this text area.`;
                alert('PDF file uploaded successfully. In a full implementation, the text would be automatically extracted. For now, please copy and paste the content manually.');
            }, 1500);
        } else if (fileExtension === '.doc' || fileExtension === '.docx') {
            // For Word documents, we'll simulate processing
            setTimeout(() => {
                this.hideUploadProgress();
                this.showUploadedFile(file, 'text');
                document.getElementById('interviewContent').value = `[Word Document: ${file.name}]\n\nWord document content would be extracted here in a full implementation.\nFor now, please manually copy and paste the interview content from your document into this text area.`;
                alert('Word document uploaded successfully. In a full implementation, the text would be automatically extracted. For now, please copy and paste the content manually.');
            }, 1500);
        }
    }

    removeUploadedFile() {
        document.getElementById('uploadedFiles').innerHTML = '';
        // Clear file inputs
        document.getElementById('videoFile').value = '';
        document.getElementById('audioFile').value = '';
        document.getElementById('textFile').value = '';

        // Clear text content if it was from a file
        const textContent = document.getElementById('interviewContent');
        if (textContent && (textContent.value.includes('[PDF Document:') || textContent.value.includes('[Word Document:'))) {
            textContent.value = '';
        }
    }

    generatePreview() {
        const title = document.getElementById('interviewTitle').value;
        const description = document.getElementById('interviewDescription').value;
        const type = document.getElementById('interviewType').value;
        const category = document.getElementById('interviewCategory').value;
        const tags = document.getElementById('interviewTags').value;

        // Get content based on type
        let contentPreview = '';
        if (type === 'text') {
            const textContent = document.getElementById('interviewContent').value;
            if (textContent) {
                const preview = textContent.length > 200 ? textContent.substring(0, 200) + '...' : textContent;
                contentPreview = `
                    <div class="mt-3">
                        <h6>Content Preview:</h6>
                        <div class="border rounded p-3 bg-light">
                            <pre style="white-space: pre-wrap; font-family: inherit;">${preview}</pre>
                        </div>
                    </div>
                `;
            }
        } else if (type === 'live') {
            const date = document.getElementById('liveDate').value;
            const time = document.getElementById('liveTime').value;
            if (date && time) {
                contentPreview = `
                    <div class="mt-3">
                        <h6>Live Session Details:</h6>
                        <div class="border rounded p-3 bg-light">
                            <i class="fas fa-calendar me-2"></i><strong>Date:</strong> ${date}<br>
                            <i class="fas fa-clock me-2"></i><strong>Time:</strong> ${time}
                        </div>
                    </div>
                `;
            }
        } else {
            // For video/audio, show uploaded file info
            const uploadedFiles = document.getElementById('uploadedFiles').innerHTML;
            if (uploadedFiles.trim() !== '') {
                contentPreview = `
                    <div class="mt-3">
                        <h6>Uploaded Media:</h6>
                        ${uploadedFiles}
                    </div>
                `;
            }
        }

        const previewContent = document.getElementById('previewContent');
        previewContent.innerHTML = `
            <h4>${title}</h4>
            <p class="text-muted">${description || 'No description provided'}</p>
            <div class="mb-3">
                <span class="badge bg-primary me-2">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                ${category ? `<span class="badge bg-secondary me-2">${category.charAt(0).toUpperCase() + category.slice(1)}</span>` : ''}
            </div>
            ${tags ? `<p><strong>Tags:</strong> ${tags}</p>` : ''}
            ${contentPreview}
            <div class="text-muted mt-3">
                <small>Created by: ${this.currentUser.name}</small>
            </div>
        `;
    }

    viewBusinessProfile(businessId) {
        // Store the business ID for the profile page
        this.currentBusinessId = businessId;
        this.navigateTo('business-profile');
    }

    renderBusinessProfilePage() {
        const businessId = this.currentBusinessId || 'techstart-inc';

        // Mock business data (in real app, this would come from API)
        const businesses = {
            'techstart-inc': {
                name: 'TechStart Inc',
                category: 'Technology',
                location: 'San Francisco, CA',
                description: 'Innovative software solutions for modern businesses. Specializing in AI and machine learning applications.',
                rating: 4.8,
                followers: 245,
                interviews: 3,
                founded: '2019',
                employees: '50-100',
                website: 'https://techstart.com',
                email: 'contact@techstart.com',
                phone: '+1 (555) 123-4567'
            },
            'green-eats-cafe': {
                name: 'Green Eats Cafe',
                category: 'Food & Beverage',
                location: 'Portland, OR',
                description: 'Organic, locally-sourced meals with a focus on sustainability and community health.',
                rating: 4.2,
                followers: 189,
                interviews: 2,
                founded: '2020',
                employees: '10-25',
                website: 'https://greeneats.com',
                email: 'hello@greeneats.com',
                phone: '+1 (555) 234-5678'
            },
            'creative-design-studio': {
                name: 'Creative Design Studio',
                category: 'Consulting',
                location: 'New York, NY',
                description: 'Full-service design agency helping brands tell their story through visual communication.',
                rating: 4.9,
                followers: 567,
                interviews: 5,
                founded: '2017',
                employees: '25-50',
                website: 'https://creativedesign.com',
                email: 'info@creativedesign.com',
                phone: '+1 (555) 345-6789'
            }
        };

        const business = businesses[businessId] || businesses['techstart-inc'];
        const categoryColor = this.getColorForCategory(business.category);

        // Check if following this business and update button state
        setTimeout(() => {
            const isFollowing = localStorage.getItem(`following_${businessId}`) === 'true';
            if (isFollowing) {
                const heroFollowBtn = document.querySelector('.hero-follow-btn button');
                if (heroFollowBtn) {
                    heroFollowBtn.innerHTML = '<i class="fas fa-check me-2"></i>Following';
                    heroFollowBtn.className = 'btn btn-success btn-lg px-4';
                }
            }
        }, 100);

        return `
            <div class="profile-page-dark">
                <!-- Business Hero Banner -->
                <div class="profile-hero-banner position-relative">
                    <div class="hero-background" style="background: linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 50%, #1a1a1a 100%); height: 450px; position: relative; overflow: hidden;">
                        <div class="hero-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6);"></div>
                        <div class="hero-pattern" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.1;"></div>
                    </div>

                    <div class="container position-relative" style="margin-top: -350px; padding-top: 80px;">
                        <div class="row">
                            <div class="col-12">
                                <div class="profile-header d-flex align-items-start text-white">
                                    <!-- Left side: Business Logo -->
                                    <div class="profile-avatar-section me-5">
                                        <div class="profile-avatar-container position-relative d-inline-block">
                                            <div class="business-logo-main bg-white shadow-lg d-flex align-items-center justify-content-center">
                                                <div class="text-center">
                                                    <i class="fas fa-${this.getIconForCategory(business.category)} fa-4x mb-2" style="color: #${categoryColor};"></i>
                                                    <div class="fw-bold" style="color: #${categoryColor}; font-size: 0.8rem;">${business.name.split(' ')[0]}</div>
                                                </div>
                                            </div>
                                            <div class="position-absolute bottom-0 end-0" style="margin-bottom: 10px; margin-right: 10px;">
                                                <span class="badge bg-${this.getBadgeColorForCategory(business.category)} rounded-pill px-3 py-2 fs-6">
                                                    ${business.category}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Right side: Business info, stats, actions -->
                                    <div class="profile-info-section flex-grow-1" style="padding-top: 20px;">
                                        <div class="d-flex justify-content-between align-items-start mb-3">
                                            <div class="flex-grow-1 me-4">
                                                <h1 class="display-5 fw-bold mb-2 text-white">${business.name}</h1>
                                                <p class="lead mb-0 text-light">${business.description}</p>
                                            </div>
                                            <div class="profile-actions-right d-flex flex-column gap-2 align-items-end">
                                                <div class="hero-follow-btn">
                                                    <button class="btn btn-danger btn-lg px-4" onclick="app.followBusiness('${businessId}')">
                                                        <i class="fas fa-plus me-2"></i>Follow
                                                    </button>
                                                </div>
                                                <div class="d-flex gap-2">
                                                    <button class="btn btn-outline-light px-3" onclick="app.contactBusiness('${businessId}')" title="Contact">
                                                        <i class="fas fa-envelope"></i>
                                                    </button>
                                                    ${this.isAuthenticated ? `
                                                        <button class="btn btn-outline-light px-3" onclick="app.requestInterview('${businessId}')" title="Request Interview">
                                                            <i class="fas fa-microphone"></i>
                                                        </button>
                                                    ` : ''}
                                                    <button class="btn btn-outline-light px-3" onclick="app.shareBusiness('${businessId}')" title="Share">
                                                        <i class="fas fa-share"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="profile-meta d-flex align-items-center flex-wrap gap-3 mb-3">
                                            <span class="text-light opacity-75"><i class="fas fa-map-marker-alt me-1"></i>${business.location}</span>
                                            <span class="text-light opacity-75"><i class="fas fa-calendar me-1"></i>Founded ${business.founded}</span>
                                            <span class="text-light opacity-75"><i class="fas fa-users me-1"></i>${business.employees} employees</span>
                                            <div class="text-warning">
                                                ${this.renderStars(business.rating)}
                                                <span class="text-white ms-1">${business.rating}</span>
                                            </div>
                                        </div>

                                        <div class="profile-stats d-flex gap-4 mb-4">
                                            <div class="stat-item">
                                                <div class="stat-number h5 fw-bold mb-0 text-white">${business.interviews}</div>
                                                <div class="stat-label small text-light opacity-75">Interviews</div>
                                            </div>
                                            <div class="stat-item">
                                                <div class="stat-number h5 fw-bold mb-0 text-white">${business.followers}</div>
                                                <div class="stat-label small text-light opacity-75">Followers</div>
                                            </div>
                                            <div class="stat-item">
                                                <div class="stat-number h5 fw-bold mb-0 text-white">${business.rating}</div>
                                                <div class="stat-label small text-light opacity-75">Rating</div>
                                            </div>
                                            <div class="stat-item">
                                                <div class="stat-number h5 fw-bold mb-0 text-white">2.5k</div>
                                                <div class="stat-label small text-light opacity-75">Views</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="container" style="padding-top: 20px; padding-bottom: 2rem;">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card profile-card-dark">
                                <div class="card-header">
                                    <h6 class="mb-0 text-white">Business Information</h6>
                                </div>
                                <div class="card-body">
                                    <div class="text-center mb-3">
                                        <div class="text-warning mb-2">
                                            ${this.renderStars(business.rating)}
                                            <span class="text-white ms-1">${business.rating}</span>
                                        </div>
                                    </div>

                                    <div class="profile-details">
                                        <div class="mb-2 text-light"><i class="fas fa-calendar me-2 text-danger"></i>Founded ${business.founded}</div>
                                        <div class="mb-2 text-light"><i class="fas fa-users me-2 text-danger"></i>${business.employees} employees</div>
                                        <div class="mb-2 text-light"><i class="fas fa-globe me-2 text-danger"></i><a href="${business.website}" target="_blank" class="text-white text-decoration-none">${business.website}</a></div>
                                        <div class="mb-2 text-light"><i class="fas fa-envelope me-2 text-danger"></i><a href="mailto:${business.email}" class="text-white text-decoration-none">${business.email}</a></div>
                                        <div class="mb-0 text-light"><i class="fas fa-phone me-2 text-danger"></i><a href="tel:${business.phone}" class="text-white text-decoration-none">${business.phone}</a></div>
                                    </div>
                                </div>
                            </div>

                            <div class="card profile-card-dark mt-4">
                                <div class="card-header">
                                    <h6 class="mb-0 text-white">Quick Actions</h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-outline-danger" onclick="app.contactBusiness('${businessId}')">
                                            <i class="fas fa-envelope me-2"></i>Contact
                                        </button>
                                        ${this.isAuthenticated ? `
                                            <button class="btn btn-outline-light" onclick="app.requestInterview('${businessId}')">
                                                <i class="fas fa-microphone me-2"></i>Request Interview
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-outline-light" onclick="app.shareBusiness('${businessId}')">
                                            <i class="fas fa-share me-2"></i>Share Business
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-8">
                            <div class="card profile-card-dark">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0 text-white">Business Interviews</h5>
                                    ${this.isAuthenticated ? `
                                        <button class="btn btn-danger btn-sm" onclick="app.requestInterview('${businessId}')">
                                            <i class="fas fa-microphone me-1"></i>Request Interview
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6 mb-4">
                                            <div class="card interview-card-dark">
                                                <img src="https://via.placeholder.com/300x200/FF0000/FFFFFF?text=CEO+Interview" class="card-img-top" alt="Interview">
                                                <div class="card-body">
                                                    <h6 class="card-title text-white">CEO Vision & Strategy</h6>
                                                    <p class="card-text small text-light opacity-75">Discussing the future of technology and innovation.</p>
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <small class="text-light opacity-75">2 days ago</small>
                                                        <button class="btn btn-sm btn-outline-light">
                                                            <i class="fas fa-play me-1"></i>Watch
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-4">
                                            <div class="card interview-card-dark">
                                                <img src="https://via.placeholder.com/300x200/000000/FFFFFF?text=Team+Culture" class="card-img-top" alt="Interview">
                                                <div class="card-body">
                                                    <h6 class="card-title text-white">Building Team Culture</h6>
                                                    <p class="card-text small text-light opacity-75">How we create an inclusive work environment.</p>
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <small class="text-light opacity-75">1 week ago</small>
                                                        <button class="btn btn-sm btn-outline-light">
                                                            <i class="fas fa-play me-1"></i>Watch
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="text-center">
                                        <button class="btn btn-outline-light">
                                            <i class="fas fa-plus me-2"></i>View All Interviews
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>

                <div class="mt-4">
                    <button class="btn btn-outline-secondary" onclick="app.navigateTo('business')">
                        <i class="fas fa-arrow-left me-1"></i>Back to Business Directory
                    </button>
                </div>
            </div>
        `;
    }

    getColorForCategory(category) {
        const colors = {
            'Technology': '007bff',
            'Food & Beverage': '28a745',
            'Consulting': 'ffc107',
            'Healthcare': '17a2b8',
            'Education': '6c757d',
            'Retail': '20c997'
        };
        return colors[category] || '6c757d';
    }

    getIconForCategory(category) {
        const icons = {
            'Technology': 'laptop-code',
            'Food & Beverage': 'utensils',
            'Consulting': 'handshake',
            'Healthcare': 'heartbeat',
            'Education': 'graduation-cap',
            'Retail': 'shopping-cart'
        };
        return icons[category] || 'building';
    }

    getBadgeColorForCategory(category) {
        const colors = {
            'Technology': 'primary',
            'Food & Beverage': 'success',
            'Consulting': 'warning',
            'Healthcare': 'info',
            'Education': 'secondary',
            'Retail': 'success'
        };
        return colors[category] || 'secondary';
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }

        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }

        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    }

    searchBusinesses() {
        const searchTerm = document.getElementById('businessSearch').value;
        alert(`Searching for: "${searchTerm}"\n\nIn a full implementation, this would filter the business list based on the search term.`);
    }

    filterBusinesses() {
        const category = document.getElementById('businessCategory').value;
        alert(`Filtering by category: "${category || 'All Industries'}"\n\nIn a full implementation, this would show only businesses in the selected category.`);
    }

    loadMoreBusinesses() {
        alert('Loading more businesses...\n\nIn a full implementation, this would load additional business listings from the server.');
    }

    showAddBusinessModal() {
        const modalHtml = `
            <div class="modal fade" id="addBusinessModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark text-white">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title">
                                <i class="fas fa-building me-2 text-danger"></i>Add Your Business
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addBusinessForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label text-white">Business Name *</label>
                                        <input type="text" class="form-control bg-dark text-white border-secondary" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label text-white">Industry *</label>
                                        <select class="form-select bg-dark text-white border-secondary" required>
                                            <option value="">Select Industry</option>
                                            <option value="technology">Technology</option>
                                            <option value="retail">Retail</option>
                                            <option value="food">Food & Beverage</option>
                                            <option value="healthcare">Healthcare</option>
                                            <option value="finance">Finance</option>
                                            <option value="education">Education</option>
                                            <option value="consulting">Consulting</option>
                                            <option value="manufacturing">Manufacturing</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label text-white">Location *</label>
                                        <input type="text" class="form-control bg-dark text-white border-secondary" placeholder="City, State" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label text-white">Website</label>
                                        <input type="url" class="form-control bg-dark text-white border-secondary" placeholder="https://yourwebsite.com">
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label text-white">Email *</label>
                                        <input type="email" class="form-control bg-dark text-white border-secondary" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label text-white">Phone</label>
                                        <input type="tel" class="form-control bg-dark text-white border-secondary">
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label text-white">Business Description *</label>
                                    <textarea class="form-control bg-dark text-white border-secondary" rows="3" placeholder="Tell us about your business..." required></textarea>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label text-white">Founded Year</label>
                                        <input type="number" class="form-control bg-dark text-white border-secondary" min="1800" max="2025">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label text-white">Number of Employees</label>
                                        <select class="form-select bg-dark text-white border-secondary">
                                            <option value="">Select Size</option>
                                            <option value="1-10">1-10 employees</option>
                                            <option value="11-50">11-50 employees</option>
                                            <option value="51-200">51-200 employees</option>
                                            <option value="201-500">201-500 employees</option>
                                            <option value="500+">500+ employees</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="alert alert-info bg-dark border-info text-light">
                                    <i class="fas fa-info-circle me-2"></i>
                                    Your business will be reviewed before appearing in the directory. You'll receive an email confirmation once approved.
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer border-secondary">
                            <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" onclick="app.submitBusinessApplication()">
                                <i class="fas fa-paper-plane me-2"></i>Submit Application
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('addBusinessModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addBusinessModal'));
        modal.show();
    }

    submitBusinessApplication() {
        // In a real implementation, this would submit the form data to the server
        this.showToast('Business application submitted successfully! We\'ll review it and get back to you within 24 hours.', 'success');

        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addBusinessModal'));
        modal.hide();
    }

    followBusiness(businessId) {
        // Check if already following
        const isFollowing = localStorage.getItem(`following_${businessId}`) === 'true';

        if (isFollowing) {
            // Unfollow
            localStorage.removeItem(`following_${businessId}`);
            this.showToast('Unfollowed business successfully!', 'info');

            // Update hero button specifically
            const heroFollowBtn = document.querySelector('.hero-follow-btn button');
            if (heroFollowBtn) {
                heroFollowBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Follow';
                heroFollowBtn.className = 'btn btn-danger btn-lg px-4';
            }
        } else {
            // Follow
            localStorage.setItem(`following_${businessId}`, 'true');
            this.showToast('Following business successfully!', 'success');

            // Update hero button specifically
            const heroFollowBtn = document.querySelector('.hero-follow-btn button');
            if (heroFollowBtn) {
                heroFollowBtn.innerHTML = '<i class="fas fa-check me-2"></i>Following';
                heroFollowBtn.className = 'btn btn-success btn-lg px-4';
            }
        }
    }

    contactBusiness(businessId) {
        // Get business data
        const businesses = {
            'techstart-inc': {
                name: 'TechStart Inc.',
                email: 'contact@techstart.com',
                phone: '+1 (555) 123-4567',
                website: 'https://techstart.com'
            },
            'green-eats': {
                name: 'Green Eats',
                email: 'hello@greeneats.com',
                phone: '+1 (555) 234-5678',
                website: 'https://greeneats.com'
            },
            'consulting-pro': {
                name: 'Consulting Pro',
                email: 'info@consultingpro.com',
                phone: '+1 (555) 345-6789',
                website: 'https://consultingpro.com'
            }
        };

        const business = businesses[businessId];
        if (!business) {
            this.showToast('Business contact information not found', 'error');
            return;
        }

        // Create contact modal
        const modalHtml = `
            <div class="modal fade" id="contactModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content bg-dark text-white">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title">Contact ${business.name}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="contact-options">
                                <div class="mb-3">
                                    <h6 class="text-danger">Contact Information</h6>
                                    <div class="mb-2">
                                        <i class="fas fa-envelope me-2 text-danger"></i>
                                        <a href="mailto:${business.email}" class="text-white text-decoration-none">${business.email}</a>
                                    </div>
                                    <div class="mb-2">
                                        <i class="fas fa-phone me-2 text-danger"></i>
                                        <a href="tel:${business.phone}" class="text-white text-decoration-none">${business.phone}</a>
                                    </div>
                                    <div class="mb-3">
                                        <i class="fas fa-globe me-2 text-danger"></i>
                                        <a href="${business.website}" target="_blank" class="text-white text-decoration-none">${business.website}</a>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-danger">Quick Actions</h6>
                                    <div class="d-grid gap-2">
                                        <a href="mailto:${business.email}" class="btn btn-danger">
                                            <i class="fas fa-envelope me-2"></i>Send Email
                                        </a>
                                        <a href="tel:${business.phone}" class="btn btn-outline-light">
                                            <i class="fas fa-phone me-2"></i>Call Now
                                        </a>
                                        <a href="${business.website}" target="_blank" class="btn btn-outline-light">
                                            <i class="fas fa-globe me-2"></i>Visit Website
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer border-secondary">
                            <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('contactModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('contactModal'));
        modal.show();
    }

    requestInterview(businessId) {
        alert(`Interview request sent to: ${businessId}\n\nIn a full implementation, this would send an interview request to the business owner.`);
    }

    shareProfile() {
        const user = this.currentUser;
        const profileUrl = `${window.location.origin}/profile/${user.id || 'user'}`;

        if (navigator.share) {
            navigator.share({
                title: `${user.name} - Interviews.tv`,
                text: `Check out ${user.name}'s profile on Interviews.tv`,
                url: profileUrl
            });
        } else {
            // Fallback for browsers without Web Share API
            navigator.clipboard.writeText(profileUrl).then(() => {
                this.showToast('Profile link copied to clipboard!', 'success');
            }).catch(() => {
                prompt('Copy this link to share your profile:', profileUrl);
            });
        }
    }

    shareBusiness(businessId) {
        const businessUrl = `${window.location.origin}/business-profile?id=${businessId}`;

        if (navigator.share) {
            navigator.share({
                title: `Business Profile - Interviews.tv`,
                text: `Check out this business profile on Interviews.tv`,
                url: businessUrl
            });
        } else {
            // Fallback for browsers without Web Share API
            navigator.clipboard.writeText(businessUrl).then(() => {
                this.showToast('Business link copied to clipboard!', 'success');
            }).catch(() => {
                prompt('Copy this link to share this business:', businessUrl);
            });
        }
    }

    showSettingsTab(tab) {
        this.currentSettingsTab = tab;

        // Update active tab in navigation
        document.querySelectorAll('#settingsNav .list-group-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`#settingsNav .list-group-item[onclick*="${tab}"]`).classList.add('active');

        // Update content
        const user = this.currentUser;
        document.getElementById('settingsContent').innerHTML = this.renderSettingsTabContent(tab, user);
    }

    handleAvatarUpload(input) {
        const file = input.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, GIF, etc.)');
            input.value = '';
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size too large. Maximum size is 5MB.');
            input.value = '';
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const avatarPreview = document.getElementById('avatarPreview');
            if (avatarPreview) {
                avatarPreview.src = e.target.result;

                // Store avatar in user data
                this.currentUser.avatar = e.target.result;
                localStorage.setItem('user_data', JSON.stringify(this.currentUser));

                // Show success message
                this.showToast('Profile picture updated successfully!', 'success');
            }
        };
        reader.readAsDataURL(file);
    }

    async handleHeroBannerUpload(input) {
        console.log('Hero banner upload started', input.files);
        const file = input.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File selected:', file.name, file.size, file.type);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file (JPG, PNG, GIF, etc.)', 'error');
            input.value = '';
            return;
        }

        // Validate file size (10MB max for hero banner)
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('File size too large. Maximum size is 10MB for hero banners.', 'error');
            input.value = '';
            return;
        }

        try {
            // Show loading state
            this.showToast('Uploading hero banner...', 'info');

            // Upload to server
            const response = await Auth.uploadHeroBanner(file);

            if (response.success) {
                // Update preview
                const heroBannerPreview = document.getElementById('heroBannerPreview');
                if (heroBannerPreview) {
                    heroBannerPreview.style.backgroundImage = `url(${response.data.url})`;
                    heroBannerPreview.style.backgroundSize = 'cover';
                    heroBannerPreview.style.backgroundPosition = 'center';
                    heroBannerPreview.innerHTML = ''; // Remove placeholder content
                }

                // Show success message
                this.showToast('Hero banner uploaded successfully!', 'success');
            } else {
                this.showToast(response.message || 'Failed to upload hero banner', 'error');
            }

        } catch (error) {
            console.error('Hero banner upload error:', error);
            this.showToast('Error uploading hero banner. Please try again.', 'error');
        }

        // Clear input
        input.value = '';
    }

    debugHeroBanner() {
        const profileData = JSON.parse(localStorage.getItem('profile_data') || '{}');
        console.log('=== HERO BANNER DEBUG ===');
        console.log('Profile data keys:', Object.keys(profileData));
        console.log('Hero banner exists:', !!profileData.heroBanner);
        console.log('Hero banner length:', profileData.heroBanner ? profileData.heroBanner.length : 0);
        console.log('Hero banner preview (first 100 chars):', profileData.heroBanner ? profileData.heroBanner.substring(0, 100) : 'NONE');
        console.log('Full profile data:', profileData);

        // Show in toast as well
        const message = profileData.heroBanner
            ? `Hero banner found! Length: ${profileData.heroBanner.length} characters`
            : 'No hero banner found in localStorage';
        this.showToast(message, profileData.heroBanner ? 'success' : 'error');
    }

    handleUpdateProfile(event) {
        event.preventDefault();

        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        const bio = document.getElementById('profileBio').value;
        const location = document.getElementById('profileLocation').value;
        const website = document.getElementById('profileWebsite').value;
        const phone = document.getElementById('profilePhone').value;
        const company = document.getElementById('profileCompany').value;

        // Update current user data
        this.currentUser.name = name;
        this.currentUser.email = email;

        // Get existing profile data to preserve hero banner
        const existingProfileData = JSON.parse(localStorage.getItem('profile_data') || '{}');

        // Save profile data (preserve existing hero banner)
        const profileData = {
            bio, location, website, phone, company,
            heroBanner: existingProfileData.heroBanner // Preserve hero banner
        };
        localStorage.setItem('profile_data', JSON.stringify(profileData));
        localStorage.setItem('user_data', JSON.stringify(this.currentUser));

        this.showToast('Profile updated successfully!', 'success');
    }

    handleUpdateAccount(event) {
        event.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword && newPassword !== confirmPassword) {
            this.showToast('New passwords do not match!', 'error');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            this.showToast('Password must be at least 6 characters long!', 'error');
            return;
        }

        // In a real app, this would make an API call
        this.showToast('Account settings updated successfully!', 'success');

        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    }

    handleUpdatePrivacy(event) {
        event.preventDefault();

        const privacySettings = {
            profileVisibility: document.querySelector('input[name="profileVisibility"]:checked').value,
            allowComments: document.getElementById('allowComments').checked,
            allowDownloads: document.getElementById('allowDownloads').checked,
            showInSearch: document.getElementById('showInSearch').checked,
            allowMessages: document.getElementById('allowMessages').checked,
            allowInterviewRequests: document.getElementById('allowInterviewRequests').checked
        };

        localStorage.setItem('privacy_settings', JSON.stringify(privacySettings));
        this.showToast('Privacy settings updated successfully!', 'success');
    }

    handleUpdateNotifications(event) {
        event.preventDefault();

        const notificationSettings = {
            emailNewFollowers: document.getElementById('emailNewFollowers').checked,
            emailNewComments: document.getElementById('emailNewComments').checked,
            emailInterviewRequests: document.getElementById('emailInterviewRequests').checked,
            emailWeeklyDigest: document.getElementById('emailWeeklyDigest').checked,
            pushNewFollowers: document.getElementById('pushNewFollowers').checked,
            pushNewComments: document.getElementById('pushNewComments').checked,
            pushInterviewRequests: document.getElementById('pushInterviewRequests').checked,
            inAppAll: document.getElementById('inAppAll').checked,
            inAppSound: document.getElementById('inAppSound').checked
        };

        localStorage.setItem('notification_settings', JSON.stringify(notificationSettings));
        this.showToast('Notification settings updated successfully!', 'success');
    }

    confirmDeleteAccount() {
        const confirmed = confirm('Are you sure you want to delete your account?\n\nThis action cannot be undone. All your interviews, comments, and profile data will be permanently deleted.');

        if (confirmed) {
            const doubleConfirm = confirm('This is your final warning!\n\nType "DELETE" in the next prompt to confirm account deletion.');

            if (doubleConfirm) {
                const deleteConfirmation = prompt('Type "DELETE" to confirm account deletion:');

                if (deleteConfirmation === 'DELETE') {
                    // In a real app, this would make an API call to delete the account
                    alert('Account deletion request submitted. You will receive an email confirmation shortly.');
                    this.logout();
                } else {
                    alert('Account deletion cancelled.');
                }
            }
        }
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        document.body.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    renderProfileDetails() {
        const profileData = JSON.parse(localStorage.getItem('profile_data') || '{}');
        let details = '';

        if (profileData.bio) {
            details += `<p class="text-muted small mb-2">${profileData.bio}</p>`;
        }

        if (profileData.location) {
            details += `<p class="text-muted small mb-1"><i class="fas fa-map-marker-alt me-1"></i>${profileData.location}</p>`;
        }

        if (profileData.website) {
            details += `<p class="text-muted small mb-1"><i class="fas fa-globe me-1"></i><a href="${profileData.website}" target="_blank" class="text-decoration-none">${profileData.website}</a></p>`;
        }

        if (profileData.company) {
            details += `<p class="text-muted small mb-1"><i class="fas fa-building me-1"></i>${profileData.company}</p>`;
        }

        return details;
    }

    renderAdminPage() {
        if (!this.isAdmin()) {
            return `
                <div class="container mt-5">
                    <div class="alert alert-danger">
                        <h4>Access Denied</h4>
                        <p>You need administrator privileges to access this page.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="container-fluid mt-4 bg-primary-dark" style="background-color: #1a1a1a !important; color: #ffffff !important; min-height: 100vh;">
                <!-- Admin Header -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 class="text-primary-light mb-1">
                                    <i class="fas fa-shield-alt text-danger me-2"></i>Admin Dashboard
                                </h1>
                                <p class="text-secondary-light mb-0">User Management & System Overview</p>
                            </div>
                            <div>
                                <button class="btn btn-danger" onclick="app.showCreateUserModal()">
                                    <i class="fas fa-plus me-2"></i>Add User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Admin Navigation -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-2">
                                        <a href="javascript:void(0)" onclick="app.navigateTo('admin')"
                                           class="btn btn-outline-primary w-100 ${this.currentPage === 'admin' ? 'active' : ''}">
                                            <i class="fas fa-users me-2"></i>Users
                                        </a>
                                    </div>
                                    <div class="col-md-2">
                                        <a href="javascript:void(0)" onclick="app.navigateToAdminSection('interviews')"
                                           class="btn btn-outline-primary w-100">
                                            <i class="fas fa-video me-2"></i>Interviews
                                        </a>
                                    </div>
                                    <div class="col-md-2">
                                        <a href="javascript:void(0)" onclick="app.navigateToAdminSection('streams')"
                                           class="btn btn-outline-primary w-100">
                                            <i class="fas fa-broadcast-tower me-2"></i>Live Streams
                                        </a>
                                    </div>
                                    <div class="col-md-2">
                                        <a href="javascript:void(0)" onclick="app.navigateToAdminSection('content')"
                                           class="btn btn-outline-primary w-100">
                                            <i class="fas fa-file-alt me-2"></i>Content
                                        </a>
                                    </div>
                                    <div class="col-md-2">
                                        <a href="javascript:void(0)" onclick="app.navigateToAdminSection('analytics')"
                                           class="btn btn-outline-primary w-100">
                                            <i class="fas fa-chart-line me-2"></i>Analytics
                                        </a>
                                    </div>
                                    <div class="col-md-2">
                                        <a href="javascript:void(0)" onclick="app.navigateToAdminSection('security')"
                                           class="btn btn-outline-primary w-100">
                                            <i class="fas fa-shield-alt me-2"></i>Security
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Statistics Cards -->
                <div class="row mb-4" id="admin-stats">
                    <div class="col-md-3 mb-3">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1" style="color: #cccccc; font-size: 0.875rem;">Total Users</h6>
                                        <h3 class="mb-0" style="color: #ffffff; font-weight: 600;" id="total-users">-</h3>
                                    </div>
                                    <div class="text-primary">
                                        <i class="fas fa-users fa-2x" style="color: #007bff;"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1" style="color: #cccccc; font-size: 0.875rem;">Active Users</h6>
                                        <h3 class="mb-0" style="color: #ffffff; font-weight: 600;" id="active-users">-</h3>
                                    </div>
                                    <div class="text-success">
                                        <i class="fas fa-user-check fa-2x" style="color: #28a745;"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1" style="color: #cccccc; font-size: 0.875rem;">Verified Users</h6>
                                        <h3 class="mb-0" style="color: #ffffff; font-weight: 600;" id="verified-users">-</h3>
                                    </div>
                                    <div class="text-info">
                                        <i class="fas fa-certificate fa-2x" style="color: #17a2b8;"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1" style="color: #cccccc; font-size: 0.875rem;">Active (30d)</h6>
                                        <h3 class="mb-0" style="color: #ffffff; font-weight: 600;" id="active-30-days">-</h3>
                                    </div>
                                    <div class="text-warning">
                                        <i class="fas fa-chart-line fa-2x" style="color: #ffc107;"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- User Management Section -->
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-header border-0" style="background-color: #333333; border-bottom: 1px solid #444444;">
                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <h5 class="mb-0" style="color: #ffffff;">
                                            <i class="fas fa-users me-2"></i>User Management
                                        </h5>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="row g-2">
                                            <div class="col-md-6">
                                                <input type="text" class="form-control border-0"
                                                       style="background-color: #3a3a3a; color: #ffffff; border: 1px solid #555555 !important;"
                                                       placeholder="Search users..." id="user-search">
                                            </div>
                                            <div class="col-md-3">
                                                <select class="form-select border-0"
                                                        style="background-color: #3a3a3a; color: #ffffff; border: 1px solid #555555 !important;"
                                                        id="role-filter">
                                                    <option value="">All Roles</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="creator">Creator</option>
                                                    <option value="business">Business</option>
                                                    <option value="user">User</option>
                                                </select>
                                            </div>
                                            <div class="col-md-3">
                                                <select class="form-select border-0"
                                                        style="background-color: #3a3a3a; color: #ffffff; border: 1px solid #555555 !important;"
                                                        id="status-filter">
                                                    <option value="">All Status</option>
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <!-- Users Table -->
                                <div class="table-responsive">
                                    <table class="table table-dark table-hover mb-0" style="background-color: #2a2a2a !important;">
                                        <thead style="background-color: #1a1a1a !important;">
                                            <tr>
                                                <th class="sortable" data-sort="id" style="color: #ffffff !important; border-color: #444444 !important; cursor: pointer; background-color: #1a1a1a !important;">
                                                    ID <i class="fas fa-sort ms-1 text-danger"></i>
                                                </th>
                                                <th class="sortable" data-sort="name" style="color: #ffffff !important; border-color: #444444 !important; cursor: pointer; background-color: #1a1a1a !important;">
                                                    Name <i class="fas fa-sort ms-1 text-danger"></i>
                                                </th>
                                                <th class="sortable" data-sort="email" style="color: #ffffff !important; border-color: #444444 !important; cursor: pointer; background-color: #1a1a1a !important;">
                                                    Email <i class="fas fa-sort ms-1 text-danger"></i>
                                                </th>
                                                <th class="sortable" data-sort="role" style="color: #ffffff !important; border-color: #444444 !important; cursor: pointer; background-color: #1a1a1a !important;">
                                                    Role <i class="fas fa-sort ms-1 text-danger"></i>
                                                </th>
                                                <th style="color: #ffffff !important; border-color: #444444 !important; background-color: #1a1a1a !important;">Status</th>
                                                <th class="sortable" data-sort="created_at" style="color: #ffffff !important; border-color: #444444 !important; cursor: pointer; background-color: #1a1a1a !important;">
                                                    Created <i class="fas fa-sort ms-1 text-danger"></i>
                                                </th>
                                                <th class="sortable" data-sort="last_login" style="color: #ffffff !important; border-color: #444444 !important; cursor: pointer; background-color: #1a1a1a !important;">
                                                    Last Login <i class="fas fa-sort ms-1 text-danger"></i>
                                                </th>
                                                <th style="color: #ffffff !important; border-color: #444444 !important; background-color: #1a1a1a !important;">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="users-table-body">
                                            <tr style="background-color: #2a2a2a !important;">
                                                <td colspan="8" class="text-center py-4" style="color: #ffffff !important; border-color: #444444 !important; background-color: #2a2a2a !important;">
                                                    <div class="spinner-border text-danger" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                    <div class="mt-2" style="color: #cccccc;">Loading users...</div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <!-- Pagination -->
                                <div class="card-footer border-0" style="background-color: #333333; border-top: 1px solid #444444;">
                                    <div class="row align-items-center">
                                        <div class="col-md-6">
                                            <span style="color: #cccccc;" id="pagination-info">Loading...</span>
                                        </div>
                                        <div class="col-md-6">
                                            <nav>
                                                <ul class="pagination pagination-sm justify-content-end mb-0" id="pagination-controls">
                                                </ul>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAdminData() {
        if (this.currentPage !== 'admin') return;

        try {
            // Show loading state
            this.showAdminLoadingState();

            // Check if user is authenticated and is admin
            console.log('Admin panel auth check:', {
                isAuthenticated: this.isAuthenticated,
                currentUser: this.currentUser,
                isAdmin: this.isAdmin(),
                authToken: this.authToken ? 'Present' : 'Missing'
            });

            if (!this.isAuthenticated || !this.isAdmin()) {
                this.showAdminError('Please login as an administrator to access this page.');
                return;
            }

            // First test API connectivity
            await this.testApiConnection();

            // Load user statistics and user list
            const response = await this.apiGet('/admin/users.php?page=1&limit=20');

            if (response.success) {
                this.updateAdminStats(response.data.statistics);
                this.updateUsersTable(response.data.users);
                this.updatePagination(response.data.pagination);
            } else {
                this.showAdminError('Failed to load admin data: ' + (response.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error loading admin data:', error);

            // Check if it's a network/API connection error
            if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
                this.showAdminError('Cannot connect to API server. Please ensure the API server is running on port 8080.');
            } else if (error.message.includes('Unauthorized') || error.message.includes('403')) {
                this.showAdminError('Access denied. Please login as administrator first.');
            } else {
                this.showAdminError('Failed to load admin data: ' + error.message);
            }
        }
    }

    async testApiConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/status`);
            if (!response.ok) {
                throw new Error(`API server returned ${response.status}`);
            }
            const data = await response.json();
            if (data.status !== 'healthy') {
                throw new Error(data.message || 'API test failed');
            }
            console.log('API connection test passed:', data);
            console.log('Current auth state:', {
                isAuthenticated: this.isAuthenticated,
                currentUser: this.currentUser,
                authToken: this.authToken ? 'Present' : 'Missing'
            });
        } catch (error) {
            console.error('API connection test failed:', error);
            throw new Error('API server is not accessible. Please start the API server with: php -S localhost:8080 -t api/');
        }
    }

    showAdminLoadingState() {
        // Update stats with loading
        document.getElementById('total-users').textContent = '...';
        document.getElementById('active-users').textContent = '...';
        document.getElementById('verified-users').textContent = '...';
        document.getElementById('active-30-days').textContent = '...';

        // Show loading in table
        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <div class="mt-2 text-light-grey">Loading admin data...</div>
                    </td>
                </tr>
            `;
        }
    }

    showAdminError(message) {
        // Update stats with error
        document.getElementById('total-users').textContent = 'Error';
        document.getElementById('active-users').textContent = 'Error';
        document.getElementById('verified-users').textContent = 'Error';
        document.getElementById('active-30-days').textContent = 'Error';

        // Show error in table with setup instructions
        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <div class="alert alert-danger mb-4">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Error:</strong> ${message}
                        </div>

                        <div class="card bg-dark border-warning">
                            <div class="card-header bg-warning text-dark">
                                <h6 class="mb-0"><i class="fas fa-rocket me-2"></i>Quick Setup Guide</h6>
                            </div>
                            <div class="card-body text-start">
                                <h6 class="text-white mb-3">To get the admin panel working:</h6>
                                <ol class="text-light-grey">
                                    <li class="mb-2">
                                        <strong>Set up the database:</strong><br>
                                        <code class="bg-secondary px-2 py-1 rounded">php setup.php</code>
                                    </li>
                                    <li class="mb-2">
                                        <strong>Start the API server:</strong><br>
                                        <code class="bg-secondary px-2 py-1 rounded">php -S localhost:8080 -t api/</code>
                                    </li>
                                    <li class="mb-2">
                                        <strong>Ensure MariaDB/MySQL is running</strong>
                                    </li>
                                    <li class="mb-2">
                                        <strong>Login with admin credentials:</strong><br>
                                        Email: <code class="bg-secondary px-1 rounded">admin@interviews.tv</code><br>
                                        Password: <code class="bg-secondary px-1 rounded">admin123</code>
                                    </li>
                                </ol>

                                <div class="mt-3 d-flex gap-2 justify-content-center">
                                    <button class="btn btn-warning btn-sm" onclick="app.loadAdminData()">
                                        <i class="fas fa-redo me-1"></i>Retry Connection
                                    </button>
                                    <button class="btn btn-outline-info btn-sm" onclick="app.showDemoAdminData()">
                                        <i class="fas fa-eye me-1"></i>Show Demo Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }

        // Show toast notification
        this.showToast(message, 'error');
    }

    showDemoAdminData() {
        // Show demo data when API is not available
        const demoStats = {
            total_users: 4,
            active_users: 4,
            verified_users: 4,
            active_30_days: 2
        };

        const demoUsers = [
            {
                id: 1,
                name: 'Admin User',
                email: 'admin@interviews.tv',
                role: 'admin',
                avatar_url: null,
                bio: 'Platform Administrator with full system access',
                is_active: true,
                email_verified: true,
                created_at: '2024-01-01T00:00:00Z',
                last_login: '2024-01-20T10:30:00Z'
            },
            {
                id: 2,
                name: 'Content Creator',
                email: 'creator@interviews.tv',
                role: 'creator',
                avatar_url: null,
                bio: 'Professional content creator specializing in business interviews',
                is_active: true,
                email_verified: true,
                created_at: '2024-01-02T00:00:00Z',
                last_login: '2024-01-19T15:45:00Z'
            },
            {
                id: 3,
                name: 'Business Owner',
                email: 'business@interviews.tv',
                role: 'business',
                avatar_url: null,
                bio: 'Business profile manager and entrepreneur',
                is_active: true,
                email_verified: true,
                created_at: '2024-01-03T00:00:00Z',
                last_login: '2024-01-18T09:15:00Z'
            },
            {
                id: 4,
                name: 'Regular User',
                email: 'user@interviews.tv',
                role: 'user',
                avatar_url: null,
                bio: 'Platform user interested in business content',
                is_active: true,
                email_verified: false,
                created_at: '2024-01-04T00:00:00Z',
                last_login: null
            }
        ];

        const demoPagination = {
            current_page: 1,
            total_pages: 1,
            total_count: 4,
            limit: 20,
            has_next: false,
            has_prev: false
        };

        this.updateAdminStats(demoStats);
        this.updateUsersTable(demoUsers);
        this.updatePagination(demoPagination);

        this.showToast('Showing demo data (API not connected)', 'info');
    }

    updateAdminStats(stats) {
        document.getElementById('total-users').textContent = stats.total_users || 0;
        document.getElementById('active-users').textContent = stats.active_users || 0;
        document.getElementById('verified-users').textContent = stats.verified_users || 0;
        document.getElementById('active-30-days').textContent = stats.active_30_days || 0;
    }

    updateUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr style="background-color: #2a2a2a !important;">
                    <td colspan="8" class="text-center py-4" style="color: #cccccc !important; border-color: #444444 !important; background-color: #2a2a2a !important;">
                        <i class="fas fa-users fa-2x text-muted mb-2"></i><br>
                        No users found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr style="background-color: #2a2a2a !important; border-color: #444444 !important;"
                onmouseover="this.style.backgroundColor='#3a3a3a !important'"
                onmouseout="this.style.backgroundColor='#2a2a2a !important'">
                <td style="color: #ffffff !important; border-color: #444444 !important; background-color: #2a2a2a !important; font-weight: 500;">${user.id}</td>
                <td style="border-color: #444444 !important; background-color: #2a2a2a !important;">
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm me-2">
                            <img src="${user.avatar_url || 'https://via.placeholder.com/32x32/FF0000/ffffff?text=' + user.name.charAt(0)}"
                                 class="rounded-circle" width="32" height="32" alt="${user.name}">
                        </div>
                        <div>
                            <div style="color: #ffffff !important; font-weight: 600;">${user.name}</div>
                            ${user.bio ? `<small style="color: #cccccc !important;">${user.bio.substring(0, 50)}${user.bio.length > 50 ? '...' : ''}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td style="color: #ffffff !important; border-color: #444444 !important; background-color: #2a2a2a !important;">${user.email}</td>
                <td style="border-color: #444444 !important; background-color: #2a2a2a !important;">
                    <span class="badge bg-${this.getRoleBadgeColor(user.role)} text-white" style="font-weight: 500;">${user.role.toUpperCase()}</span>
                </td>
                <td style="border-color: #444444 !important; background-color: #2a2a2a !important;">
                    <div class="d-flex align-items-center">
                        <span class="badge bg-${user.is_active ? 'success' : 'secondary'} me-2 text-white" style="font-weight: 500;">
                            ${user.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                        ${user.email_verified ? '<i class="fas fa-certificate text-success" title="Email Verified" style="font-size: 14px;"></i>' : '<i class="fas fa-exclamation-triangle text-warning" title="Email Not Verified" style="font-size: 14px;"></i>'}
                    </div>
                </td>
                <td style="color: #cccccc !important; border-color: #444444 !important; background-color: #2a2a2a !important; font-weight: 500;">
                    ${new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style="color: #cccccc !important; border-color: #444444 !important; background-color: #2a2a2a !important; font-weight: 500;">
                    ${user.last_login ? new Date(user.last_login).toLocaleDateString() : '<span style="color: #999999;">Never</span>'}
                </td>
                <td style="border-color: #444444 !important; background-color: #2a2a2a !important;">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-light btn-sm" onclick="app.editUser(${user.id})" title="Edit User"
                                style="border-color: #6c757d; color: #ffffff; background-color: transparent;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-info btn-sm" onclick="app.viewUserProfile(${user.id})" title="View Profile"
                                style="border-color: #17a2b8; color: #17a2b8; background-color: transparent;">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-${user.is_active ? 'warning' : 'success'} btn-sm"
                                onclick="app.toggleUserStatus(${user.id}, ${!user.is_active})"
                                title="${user.is_active ? 'Deactivate User' : 'Activate User'}"
                                style="border-color: ${user.is_active ? '#ffc107' : '#28a745'}; color: ${user.is_active ? '#ffc107' : '#28a745'}; background-color: transparent;">
                            <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getRoleBadgeColor(role) {
        const colors = {
            admin: 'danger',
            creator: 'warning',
            business: 'info',
            user: 'secondary'
        };
        return colors[role] || 'secondary';
    }

    updatePagination(pagination) {
        const info = document.getElementById('pagination-info');
        const controls = document.getElementById('pagination-controls');

        if (!info || !controls) return;

        // Update info
        const start = ((pagination.current_page - 1) * pagination.limit) + 1;
        const end = Math.min(start + pagination.limit - 1, pagination.total_count);
        info.textContent = `Showing ${start}-${end} of ${pagination.total_count} users`;

        // Update pagination controls
        let paginationHtml = '';

        // Previous button
        if (pagination.has_prev) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link"
                       style="background-color: #3a3a3a; border-color: #555555; color: #ffffff;"
                       href="#" onclick="app.loadUsersPage(${pagination.current_page - 1}); return false;">
                        Previous
                    </a>
                </li>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, pagination.current_page - 2);
        const endPage = Math.min(pagination.total_pages, pagination.current_page + 2);

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === pagination.current_page;
            paginationHtml += `
                <li class="page-item ${isActive ? 'active' : ''}">
                    <a class="page-link"
                       style="background-color: ${isActive ? '#dc3545' : '#3a3a3a'}; border-color: ${isActive ? '#dc3545' : '#555555'}; color: #ffffff;"
                       href="#" onclick="app.loadUsersPage(${i}); return false;">
                        ${i}
                    </a>
                </li>
            `;
        }

        // Next button
        if (pagination.has_next) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link"
                       style="background-color: #3a3a3a; border-color: #555555; color: #ffffff;"
                       href="#" onclick="app.loadUsersPage(${pagination.current_page + 1}); return false;">
                        Next
                    </a>
                </li>
            `;
        }

        controls.innerHTML = paginationHtml;
    }

    async loadUsersPage(page) {
        const search = document.getElementById('user-search')?.value || '';
        const role = document.getElementById('role-filter')?.value || '';
        const status = document.getElementById('status-filter')?.value || '';

        try {
            const params = new URLSearchParams({
                page: page,
                limit: 20,
                ...(search && { search }),
                ...(role && { role }),
                ...(status && { status })
            });

            const response = await this.apiGet(`/admin/users.php?${params}`);

            if (response.success) {
                this.updateUsersTable(response.data.users);
                this.updatePagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Error loading users page:', error);
            this.showToast('Failed to load users', 'error');
        }
    }

    showCreateUserModal() {
        const modalHtml = `
            <div class="modal fade" id="createUserModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content" style="background-color: #2a2a2a; border: 1px solid #444444;">
                        <div class="modal-header" style="border-bottom: 1px solid #444444;">
                            <h5 class="modal-title" style="color: #ffffff;">
                                <i class="fas fa-user-plus me-2 text-danger"></i>Create New User
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createUserForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="createUserName" class="form-label" style="color: #ffffff;">Full Name *</label>
                                            <input type="text" class="form-control" id="createUserName"
                                                   style="background-color: #3a3a3a; color: #ffffff; border: 1px solid #555555;"
                                                   placeholder="Enter full name" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="createUserEmail" class="form-label" style="color: #ffffff;">Email Address *</label>
                                            <input type="email" class="form-control" id="createUserEmail"
                                                   style="background-color: #3a3a3a; color: #ffffff; border: 1px solid #555555;"
                                                   placeholder="Enter email address" required>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="createUserPassword" class="form-label" style="color: #ffffff;">Password *</label>
                                            <input type="password" class="form-control" id="createUserPassword"
                                                   style="background-color: #3a3a3a; color: #ffffff; border: 1px solid #555555;"
                                                   placeholder="Enter password" required minlength="6">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="createUserRole" class="form-label" style="color: #ffffff;">Role *</label>
                                            <select class="form-select" id="createUserRole"
                                                    style="background-color: #3a3a3a; color: #ffffff; border: 1px solid #555555;" required>
                                                <option value="">Select Role</option>
                                                <option value="user">User</option>
                                                <option value="creator">Creator</option>
                                                <option value="business">Business</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="createUserLocation" class="form-label" style="color: #ffffff;">Location</label>
                                            <input type="text" class="form-control" id="createUserLocation"
                                                   style="background-color: #3a3a3a; color: #ffffff; border: 1px solid #555555;"
                                                   placeholder="Enter location">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="createUserWebsite" class="form-label" style="color: #ffffff;">Website</label>
                                            <input type="url" class="form-control" id="createUserWebsite"
                                                   style="background-color: #3a3a3a; color: #ffffff; border: 1px solid #555555;"
                                                   placeholder="https://example.com">
                                        </div>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="createUserBio" class="form-label" style="color: #ffffff;">Bio</label>
                                    <textarea class="form-control" id="createUserBio" rows="3"
                                              style="background-color: #3a3a3a; color: #ffffff; border: 1px solid #555555;"
                                              placeholder="Enter user bio"></textarea>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="createUserVerified"
                                                   style="background-color: #3a3a3a; border: 1px solid #555555;">
                                            <label class="form-check-label" for="createUserVerified" style="color: #ffffff;">
                                                Email Verified
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="createUserActive" checked
                                                   style="background-color: #3a3a3a; border: 1px solid #555555;">
                                            <label class="form-check-label" for="createUserActive" style="color: #ffffff;">
                                                Active Account
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer" style="border-top: 1px solid #444444;">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" onclick="app.createUser()">
                                <i class="fas fa-plus me-2"></i>Create User
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('createUserModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
        modal.show();
    }

    async createUser() {
        const form = document.getElementById('createUserForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const userData = {
            name: document.getElementById('createUserName').value.trim(),
            email: document.getElementById('createUserEmail').value.trim(),
            password: document.getElementById('createUserPassword').value,
            role: document.getElementById('createUserRole').value,
            location: document.getElementById('createUserLocation').value.trim(),
            website: document.getElementById('createUserWebsite').value.trim(),
            bio: document.getElementById('createUserBio').value.trim(),
            email_verified: document.getElementById('createUserVerified').checked,
            is_active: document.getElementById('createUserActive').checked
        };

        // Validate required fields
        if (!userData.name || !userData.email || !userData.password || !userData.role) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }

        // Validate password length
        if (userData.password.length < 6) {
            this.showToast('Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            // Debug authentication
            console.log('Creating user with auth token:', this.authToken ? 'Present' : 'Missing');
            console.log('User data:', userData);

            // Show loading state
            const createBtn = document.querySelector('#createUserModal .btn-danger');
            const originalText = createBtn.innerHTML;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';
            createBtn.disabled = true;

            const response = await this.apiPost('/admin/users.php', userData);

            if (response.success) {
                this.showToast(`User "${userData.name}" created successfully!`, 'success');

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
                modal.hide();

                // Reload admin data to show new user
                this.loadAdminData();
            } else {
                this.showToast(response.message || 'Failed to create user', 'error');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            this.showToast(error.message || 'Failed to create user', 'error');
        } finally {
            // Reset button state
            const createBtn = document.querySelector('#createUserModal .btn-danger');
            if (createBtn) {
                createBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Create User';
                createBtn.disabled = false;
            }
        }
    }

    async editUser(userId) {
        try {
            // Get user data from API
            const response = await this.apiGet(`/admin/users.php?id=${userId}`);

            if (!response.success) {
                this.showToast('Failed to load user data', 'error');
                return;
            }

            const user = response.data.user || response.data.users.find(u => u.id == userId);
            if (!user) {
                this.showToast('User not found', 'error');
                return;
            }

            this.showEditUserModal(user);
        } catch (error) {
            console.error('Error loading user for edit:', error);
            this.showToast('Failed to load user data', 'error');
        }
    }

    showEditUserModal(user) {
        const modalHtml = `
            <div class="modal fade" id="editUserModal" tabindex="-1" aria-labelledby="editUserModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-secondary-dark" style="background-color: #2a2a2a !important; border: 1px solid #444444;">
                        <div class="modal-header" style="border-bottom: 1px solid #444444;">
                            <h5 class="modal-title text-white" id="editUserModalLabel">
                                <i class="fas fa-edit text-danger me-2"></i>Edit User
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editUserForm">
                                <input type="hidden" id="editUserId" value="${user.id}">

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editUserName" class="form-label text-white">Full Name *</label>
                                            <input type="text" class="form-control bg-tertiary-dark text-white"
                                                   id="editUserName" value="${user.name}" required
                                                   style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editUserEmail" class="form-label text-white">Email Address *</label>
                                            <input type="email" class="form-control bg-tertiary-dark text-white"
                                                   id="editUserEmail" value="${user.email}" required
                                                   style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editUserRole" class="form-label text-white">Role *</label>
                                            <select class="form-select bg-tertiary-dark text-white" id="editUserRole" required
                                                    style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                                <option value="creator" ${user.role === 'creator' ? 'selected' : ''}>Content Creator</option>
                                                <option value="business" ${user.role === 'business' ? 'selected' : ''}>Business Owner</option>
                                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>Regular User</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editUserLocation" class="form-label text-white">Location</label>
                                            <input type="text" class="form-control bg-tertiary-dark text-white"
                                                   id="editUserLocation" value="${user.location || ''}"
                                                   style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editUserWebsite" class="form-label text-white">Website</label>
                                            <input type="url" class="form-control bg-tertiary-dark text-white"
                                                   id="editUserWebsite" value="${user.website || ''}"
                                                   style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editUserPhone" class="form-label text-white">Phone</label>
                                            <input type="tel" class="form-control bg-tertiary-dark text-white"
                                                   id="editUserPhone" value="${user.phone || ''}"
                                                   style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                        </div>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="editUserCompany" class="form-label text-white">Company</label>
                                    <input type="text" class="form-control bg-tertiary-dark text-white"
                                           id="editUserCompany" value="${user.company || ''}"
                                           style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                </div>

                                <div class="mb-3">
                                    <label for="editUserBio" class="form-label text-white">Bio</label>
                                    <textarea class="form-control bg-tertiary-dark text-white" id="editUserBio" rows="3"
                                              style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">${user.bio || ''}</textarea>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-check mb-3">
                                            <input class="form-check-input" type="checkbox" id="editUserActive" ${user.is_active ? 'checked' : ''}
                                                   style="background-color: #3a3a3a; border: 1px solid #555555;">
                                            <label class="form-check-label text-white" for="editUserActive">
                                                Account Active
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-check mb-3">
                                            <input class="form-check-input" type="checkbox" id="editUserVerified" ${user.email_verified ? 'checked' : ''}
                                                   style="background-color: #3a3a3a; border: 1px solid #555555;">
                                            <label class="form-check-label text-white" for="editUserVerified">
                                                Email Verified
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="editUserPassword" class="form-label text-white">New Password (leave blank to keep current)</label>
                                    <input type="password" class="form-control bg-tertiary-dark text-white"
                                           id="editUserPassword" placeholder="Enter new password to change"
                                           style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                    <div class="form-text text-muted">Leave blank to keep the current password</div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer" style="border-top: 1px solid #444444;">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" onclick="app.updateUser()">
                                <i class="fas fa-save me-2"></i>Update User
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('editUserModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();

        // Clean up when modal is hidden
        document.getElementById('editUserModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    async updateUser() {
        const form = document.getElementById('editUserForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const userId = document.getElementById('editUserId').value;
        const userData = {
            id: userId,
            name: document.getElementById('editUserName').value.trim(),
            email: document.getElementById('editUserEmail').value.trim(),
            role: document.getElementById('editUserRole').value,
            location: document.getElementById('editUserLocation').value.trim(),
            website: document.getElementById('editUserWebsite').value.trim(),
            phone: document.getElementById('editUserPhone').value.trim(),
            company: document.getElementById('editUserCompany').value.trim(),
            bio: document.getElementById('editUserBio').value.trim(),
            is_active: document.getElementById('editUserActive').checked,
            email_verified: document.getElementById('editUserVerified').checked
        };

        // Add password if provided
        const newPassword = document.getElementById('editUserPassword').value.trim();
        if (newPassword) {
            if (newPassword.length < 6) {
                this.showToast('Password must be at least 6 characters long', 'error');
                return;
            }
            userData.password = newPassword;
        }

        try {
            // Show loading state
            const updateBtn = document.querySelector('#editUserModal .btn-danger');
            const originalText = updateBtn.innerHTML;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Updating...';
            updateBtn.disabled = true;

            const response = await this.apiPut('/admin/users.php', userData);

            if (response.success) {
                this.showToast('User updated successfully!', 'success');

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                modal.hide();

                // Refresh the users table
                this.loadUsersPage();
            } else {
                this.showToast(response.message || 'Failed to update user', 'error');
            }

            // Restore button state
            updateBtn.innerHTML = originalText;
            updateBtn.disabled = false;

        } catch (error) {
            console.error('Error updating user:', error);
            this.showToast('Failed to update user', 'error');

            // Restore button state
            const updateBtn = document.querySelector('#editUserModal .btn-danger');
            if (updateBtn) {
                updateBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update User';
                updateBtn.disabled = false;
            }
        }
    }

    async viewUserProfile(userId) {
        try {
            // Get user data from API
            const response = await this.apiGet(`/admin/users.php?id=${userId}`);

            if (!response.success) {
                this.showToast('Failed to load user profile', 'error');
                return;
            }

            const user = response.data.user || response.data.users.find(u => u.id == userId);
            if (!user) {
                this.showToast('User not found', 'error');
                return;
            }

            this.showUserProfileModal(user);
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.showToast('Failed to load user profile', 'error');
        }
    }

    showUserProfileModal(user) {
        const formatDate = (dateString) => {
            if (!dateString) return 'Never';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const getRoleBadgeColor = (role) => {
            switch (role) {
                case 'admin': return 'danger';
                case 'creator': return 'primary';
                case 'business': return 'success';
                case 'user': return 'secondary';
                default: return 'secondary';
            }
        };

        const modalHtml = `
            <div class="modal fade" id="viewUserModal" tabindex="-1" aria-labelledby="viewUserModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-secondary-dark" style="background-color: #2a2a2a !important; border: 1px solid #444444;">
                        <div class="modal-header" style="border-bottom: 1px solid #444444;">
                            <h5 class="modal-title text-white" id="viewUserModalLabel">
                                <i class="fas fa-user text-info me-2"></i>User Profile
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- User Header -->
                            <div class="row mb-4">
                                <div class="col-md-3 text-center">
                                    <img src="${user.avatar_url || 'https://via.placeholder.com/120x120/FF0000/ffffff?text=' + user.name.charAt(0)}"
                                         class="rounded-circle mb-3" width="120" height="120" alt="${user.name}">
                                    <div>
                                        <span class="badge bg-${getRoleBadgeColor(user.role)} fs-6">${user.role.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div class="col-md-9">
                                    <h3 class="text-white mb-2">${user.name}</h3>
                                    <p class="text-info mb-2">
                                        <i class="fas fa-envelope me-2"></i>${user.email}
                                        ${user.email_verified ? '<i class="fas fa-certificate text-success ms-2" title="Email Verified"></i>' : '<i class="fas fa-exclamation-triangle text-warning ms-2" title="Email Not Verified"></i>'}
                                    </p>
                                    ${user.bio ? `<p class="text-light-grey mb-3">${user.bio}</p>` : ''}
                                    <div class="d-flex align-items-center mb-2">
                                        <span class="badge bg-${user.is_active ? 'success' : 'secondary'} me-3">
                                            <i class="fas fa-${user.is_active ? 'check-circle' : 'ban'} me-1"></i>
                                            ${user.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                        <small class="text-muted">
                                            <i class="fas fa-calendar-alt me-1"></i>
                                            Joined ${formatDate(user.created_at)}
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <!-- User Details -->
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="card bg-tertiary-dark mb-3" style="background-color: #3a3a3a !important; border: 1px solid #555555;">
                                        <div class="card-header bg-quaternary-dark" style="background-color: #1a1a1a !important; border-bottom: 1px solid #555555;">
                                            <h6 class="text-white mb-0">
                                                <i class="fas fa-info-circle text-info me-2"></i>Contact Information
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            ${user.location ? `
                                                <div class="mb-2">
                                                    <small class="text-muted">Location</small>
                                                    <div class="text-white">
                                                        <i class="fas fa-map-marker-alt text-danger me-2"></i>${user.location}
                                                    </div>
                                                </div>
                                            ` : ''}
                                            ${user.phone ? `
                                                <div class="mb-2">
                                                    <small class="text-muted">Phone</small>
                                                    <div class="text-white">
                                                        <i class="fas fa-phone text-success me-2"></i>${user.phone}
                                                    </div>
                                                </div>
                                            ` : ''}
                                            ${user.website ? `
                                                <div class="mb-2">
                                                    <small class="text-muted">Website</small>
                                                    <div class="text-white">
                                                        <i class="fas fa-globe text-primary me-2"></i>
                                                        <a href="${user.website}" target="_blank" class="text-info">${user.website}</a>
                                                    </div>
                                                </div>
                                            ` : ''}
                                            ${user.company ? `
                                                <div class="mb-2">
                                                    <small class="text-muted">Company</small>
                                                    <div class="text-white">
                                                        <i class="fas fa-building text-warning me-2"></i>${user.company}
                                                    </div>
                                                </div>
                                            ` : ''}
                                            ${!user.location && !user.phone && !user.website && !user.company ? `
                                                <div class="text-center text-muted py-3">
                                                    <i class="fas fa-info-circle mb-2"></i><br>
                                                    No contact information provided
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>

                                <div class="col-md-6">
                                    <div class="card bg-tertiary-dark mb-3" style="background-color: #3a3a3a !important; border: 1px solid #555555;">
                                        <div class="card-header bg-quaternary-dark" style="background-color: #1a1a1a !important; border-bottom: 1px solid #555555;">
                                            <h6 class="text-white mb-0">
                                                <i class="fas fa-chart-line text-success me-2"></i>Account Activity
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="mb-2">
                                                <small class="text-muted">User ID</small>
                                                <div class="text-white">
                                                    <i class="fas fa-hashtag text-info me-2"></i>${user.id}
                                                </div>
                                            </div>
                                            <div class="mb-2">
                                                <small class="text-muted">Account Created</small>
                                                <div class="text-white">
                                                    <i class="fas fa-calendar-plus text-success me-2"></i>${formatDate(user.created_at)}
                                                </div>
                                            </div>
                                            <div class="mb-2">
                                                <small class="text-muted">Last Updated</small>
                                                <div class="text-white">
                                                    <i class="fas fa-edit text-warning me-2"></i>${formatDate(user.updated_at)}
                                                </div>
                                            </div>
                                            <div class="mb-2">
                                                <small class="text-muted">Last Login</small>
                                                <div class="text-white">
                                                    <i class="fas fa-sign-in-alt text-primary me-2"></i>${formatDate(user.last_login)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer" style="border-top: 1px solid #444444;">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-outline-primary" onclick="app.editUser(${user.id}); bootstrap.Modal.getInstance(document.getElementById('viewUserModal')).hide();">
                                <i class="fas fa-edit me-2"></i>Edit User
                            </button>
                            <button type="button" class="btn btn-outline-${user.is_active ? 'warning' : 'success'}"
                                    onclick="app.toggleUserStatus(${user.id}, ${!user.is_active}); bootstrap.Modal.getInstance(document.getElementById('viewUserModal')).hide();">
                                <i class="fas fa-${user.is_active ? 'ban' : 'check'} me-2"></i>
                                ${user.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('viewUserModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
        modal.show();

        // Clean up when modal is hidden
        document.getElementById('viewUserModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    async toggleUserStatus(userId, newStatus) {
        try {
            const response = await this.apiPut('/admin/users.php', {
                id: userId,
                is_active: newStatus
            });

            if (response.success) {
                this.showToast(`User ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
                this.loadAdminData(); // Reload the data
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            this.showToast('Failed to update user status', 'error');
        }
    }

    setupAdminEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.loadUsersPage(1); // Reset to page 1 when searching
                }, 500);
            });
        }

        // Filter functionality
        const roleFilter = document.getElementById('role-filter');
        const statusFilter = document.getElementById('status-filter');

        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                this.loadUsersPage(1); // Reset to page 1 when filtering
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.loadUsersPage(1); // Reset to page 1 when filtering
            });
        }

        // Sortable columns
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sortField = header.dataset.sort;
                const currentOrder = header.dataset.order || 'desc';
                const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';

                // Update all headers to remove active state
                sortableHeaders.forEach(h => {
                    h.classList.remove('active');
                    h.querySelector('i').className = 'fas fa-sort ms-1';
                });

                // Update clicked header
                header.classList.add('active');
                header.dataset.order = newOrder;
                header.querySelector('i').className = `fas fa-sort-${newOrder === 'asc' ? 'up' : 'down'} ms-1`;

                // Load data with new sort
                this.loadUsersPageWithSort(1, sortField, newOrder);
            });
        });
    }

    async loadUsersPageWithSort(page, sort, order) {
        const search = document.getElementById('user-search')?.value || '';
        const role = document.getElementById('role-filter')?.value || '';
        const status = document.getElementById('status-filter')?.value || '';

        try {
            const params = new URLSearchParams({
                page: page,
                limit: 20,
                sort: sort,
                order: order,
                ...(search && { search }),
                ...(role && { role }),
                ...(status && { status })
            });

            const response = await this.apiGet(`/admin/users.php?${params}`);

            if (response.success) {
                this.updateUsersTable(response.data.users);
                this.updatePagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Error loading users page:', error);
            this.showToast('Failed to load users', 'error');
        }
    }

    // Interview Management Functions
    editInterview(interviewId) {
        // Get interview data from localStorage or use demo data
        const storedInterviews = JSON.parse(localStorage.getItem('user_interviews') || '{}');
        const demoInterviews = {
            1: {
                id: 1,
                title: "My First Interview",
                description: "This is my first interview on the platform. I discuss my journey and experiences.",
                category: "Personal",
                tags: ["personal", "journey", "experience"],
                thumbnail: "https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Interview+1",
                status: "published",
                created_at: "2024-01-15T10:30:00Z"
            },
            2: {
                id: 2,
                title: "Tech Industry Insights",
                description: "Deep dive into the current state of the tech industry and future trends.",
                category: "Technology",
                tags: ["tech", "industry", "trends", "future"],
                thumbnail: "https://via.placeholder.com/300x200/000000/FFFFFF?text=Interview+2",
                status: "published",
                created_at: "2024-01-08T14:20:00Z"
            }
        };

        // Merge stored interviews with demo data
        const allInterviews = { ...demoInterviews, ...storedInterviews };

        const interview = allInterviews[interviewId];
        if (!interview) {
            this.showToast('Interview not found', 'error');
            return;
        }

        this.showEditInterviewModal(interview);
    }

    showEditInterviewModal(interview) {
        const modalHtml = `
            <div class="modal fade" id="editInterviewModal" tabindex="-1" aria-labelledby="editInterviewModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-secondary-dark" style="background-color: #2a2a2a !important; border: 1px solid #444444;">
                        <div class="modal-header" style="border-bottom: 1px solid #444444;">
                            <h5 class="modal-title text-white" id="editInterviewModalLabel">
                                <i class="fas fa-edit text-danger me-2"></i>Edit Interview
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editInterviewForm">
                                <input type="hidden" id="editInterviewId" value="${interview.id}">

                                <div class="mb-3">
                                    <label for="editInterviewTitle" class="form-label text-white">Title *</label>
                                    <input type="text" class="form-control bg-tertiary-dark text-white"
                                           id="editInterviewTitle" value="${interview.title}" required
                                           style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                </div>

                                <div class="mb-3">
                                    <label for="editInterviewDescription" class="form-label text-white">Description</label>
                                    <textarea class="form-control bg-tertiary-dark text-white" id="editInterviewDescription" rows="4"
                                              style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">${interview.description}</textarea>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editInterviewCategory" class="form-label text-white">Category</label>
                                            <select class="form-select bg-tertiary-dark text-white" id="editInterviewCategory"
                                                    style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                                <option value="Personal" ${interview.category === 'Personal' ? 'selected' : ''}>Personal</option>
                                                <option value="Technology" ${interview.category === 'Technology' ? 'selected' : ''}>Technology</option>
                                                <option value="Business" ${interview.category === 'Business' ? 'selected' : ''}>Business</option>
                                                <option value="Entertainment" ${interview.category === 'Entertainment' ? 'selected' : ''}>Entertainment</option>
                                                <option value="Education" ${interview.category === 'Education' ? 'selected' : ''}>Education</option>
                                                <option value="Other" ${interview.category === 'Other' ? 'selected' : ''}>Other</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editInterviewStatus" class="form-label text-white">Status</label>
                                            <select class="form-select bg-tertiary-dark text-white" id="editInterviewStatus"
                                                    style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                                <option value="draft" ${interview.status === 'draft' ? 'selected' : ''}>Draft</option>
                                                <option value="published" ${interview.status === 'published' ? 'selected' : ''}>Published</option>
                                                <option value="private" ${interview.status === 'private' ? 'selected' : ''}>Private</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="editInterviewTags" class="form-label text-white">Tags</label>
                                    <input type="text" class="form-control bg-tertiary-dark text-white"
                                           id="editInterviewTags" value="${interview.tags ? interview.tags.join(', ') : ''}"
                                           placeholder="Enter tags separated by commas"
                                           style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                    <div class="form-text text-muted">Separate tags with commas (e.g., tech, interview, insights)</div>
                                </div>

                                <div class="mb-3">
                                    <label for="editInterviewThumbnail" class="form-label text-white">Thumbnail Image</label>
                                    <div class="row">
                                        <div class="col-md-8">
                                            <input type="file" class="form-control bg-tertiary-dark text-white"
                                                   id="editInterviewThumbnail" accept="image/*"
                                                   style="background-color: #3a3a3a !important; border: 1px solid #555555; color: #ffffff !important;">
                                            <div class="form-text text-muted">Upload a new thumbnail image (JPG, PNG, GIF - Max 5MB)</div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="current-thumbnail">
                                                <label class="form-label text-white small">Current Thumbnail</label>
                                                <div class="thumbnail-preview" style="border: 1px solid #555555; border-radius: 4px; overflow: hidden;">
                                                    <img src="${interview.thumbnail || 'https://via.placeholder.com/150x100/333333/FFFFFF?text=No+Image'}"
                                                         class="img-fluid" alt="Current thumbnail" style="width: 100%; height: 80px; object-fit: cover;">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer" style="border-top: 1px solid #444444;">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" onclick="app.updateInterview()">
                                <i class="fas fa-save me-2"></i>Update Interview
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('editInterviewModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editInterviewModal'));
        modal.show();

        // Add file upload preview functionality
        document.getElementById('editInterviewThumbnail').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file size
                if (file.size > 5 * 1024 * 1024) {
                    app.showToast('File size must be less than 5MB', 'error');
                    this.value = '';
                    return;
                }

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    app.showToast('Please select an image file', 'error');
                    this.value = '';
                    return;
                }

                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewImg = document.querySelector('.thumbnail-preview img');
                    if (previewImg) {
                        previewImg.src = e.target.result;
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Clean up when modal is hidden
        document.getElementById('editInterviewModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    updateInterview() {
        const form = document.getElementById('editInterviewForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Get form data
        const interviewData = {
            id: document.getElementById('editInterviewId').value,
            title: document.getElementById('editInterviewTitle').value.trim(),
            description: document.getElementById('editInterviewDescription').value.trim(),
            category: document.getElementById('editInterviewCategory').value,
            status: document.getElementById('editInterviewStatus').value,
            tags: document.getElementById('editInterviewTags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
        };

        // Handle thumbnail file upload
        const thumbnailFile = document.getElementById('editInterviewThumbnail').files[0];
        if (thumbnailFile) {
            // Validate file size (5MB max)
            if (thumbnailFile.size > 5 * 1024 * 1024) {
                this.showToast('Thumbnail file size must be less than 5MB', 'error');
                return;
            }

            // Validate file type
            if (!thumbnailFile.type.startsWith('image/')) {
                this.showToast('Thumbnail must be an image file', 'error');
                return;
            }

            // For demo purposes, create a local URL
            interviewData.thumbnail = URL.createObjectURL(thumbnailFile);
            interviewData.thumbnailFile = thumbnailFile;
        }

        try {
            // Show loading state
            const updateBtn = document.querySelector('#editInterviewModal .btn-danger');
            const originalText = updateBtn.innerHTML;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Updating...';
            updateBtn.disabled = true;

            // Handle file upload if there's a new thumbnail
            if (interviewData.thumbnailFile) {
                this.showToast('Uploading thumbnail...', 'info');

                // Create FormData for file upload
                const formData = new FormData();
                formData.append('thumbnail', interviewData.thumbnailFile);
                formData.append('interview_id', interviewData.id);

                // In a real application, you would upload to your server here
                // For demo purposes, we'll simulate the upload
                setTimeout(() => {
                    this.showToast('Thumbnail uploaded successfully!', 'success');

                    // Update interview data
                    this.updateInterviewData(interviewData);
                }, 1500);
            } else {
                // No file upload needed, just update the data
                this.updateInterviewData(interviewData);
            }

        } catch (error) {
            console.error('Error updating interview:', error);
            this.showToast('Failed to update interview', 'error');

            // Restore button state
            const updateBtn = document.querySelector('#editInterviewModal .btn-danger');
            if (updateBtn) {
                updateBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Interview';
                updateBtn.disabled = false;
            }
        }
    }

    updateInterviewData(interviewData) {
        try {
            // Save updated interview data to localStorage
            const storedInterviews = JSON.parse(localStorage.getItem('user_interviews') || '{}');
            storedInterviews[interviewData.id] = {
                ...storedInterviews[interviewData.id],
                ...interviewData,
                updated_at: new Date().toISOString()
            };
            localStorage.setItem('user_interviews', JSON.stringify(storedInterviews));

            // Simulate API call to update interview data
            setTimeout(() => {
                this.showToast('Interview updated successfully!', 'success');

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editInterviewModal'));
                modal.hide();

                // Refresh the profile page to show updated interview
                this.render();

                // Restore button state
                const updateBtn = document.querySelector('#editInterviewModal .btn-danger');
                if (updateBtn) {
                    updateBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Interview';
                    updateBtn.disabled = false;
                }
            }, 1000);

        } catch (error) {
            console.error('Error updating interview:', error);
            this.showToast('Failed to update interview', 'error');

            // Restore button state
            const updateBtn = document.querySelector('#editInterviewModal .btn-danger');
            if (updateBtn) {
                updateBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Interview';
                updateBtn.disabled = false;
            }
        }
    }

    deleteInterview(interviewId) {
        // Show confirmation dialog
        const confirmed = confirm('Are you sure you want to delete this interview? This action cannot be undone.');

        if (!confirmed) {
            return;
        }

        try {
            // Remove from localStorage
            const storedInterviews = JSON.parse(localStorage.getItem('user_interviews') || '{}');
            delete storedInterviews[interviewId];
            localStorage.setItem('user_interviews', JSON.stringify(storedInterviews));

            // Simulate API call (replace with actual API call)
            this.showToast('Deleting interview...', 'info');

            setTimeout(() => {
                this.showToast('Interview deleted successfully!', 'success');

                // Refresh the profile page to remove deleted interview
                this.render();
            }, 1000);

        } catch (error) {
            console.error('Error deleting interview:', error);
            this.showToast('Failed to delete interview', 'error');
        }
    }

    // Modern Search Functionality
    handleSearchInput(event) {
        const query = event.target.value.trim();

        if (event.key === 'Enter' && query) {
            this.performSearch(query);
            return;
        }

        if (query.length >= 2) {
            this.showSearchSuggestions(query);
        } else {
            this.hideSearchSuggestions();
        }
    }

    showSearchSuggestions(query = '') {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer) return;

        if (!query) {
            // Show recent searches and popular topics
            const recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]');
            const popularTopics = ['Technology', 'Business', 'Entertainment', 'Education', 'Health', 'Politics'];

            suggestionsContainer.innerHTML = `
                <div class="search-dropdown" style="background-color: #2a2a2a; border: 1px solid #444444; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-height: 400px; overflow-y: auto;">
                    ${recentSearches.length > 0 ? `
                        <div class="search-section p-3 border-bottom" style="border-color: #444444 !important;">
                            <h6 class="text-white mb-2"><i class="fas fa-clock me-2"></i>Recent Searches</h6>
                            ${recentSearches.slice(0, 5).map(search => `
                                <div class="search-item p-2 rounded mb-1" style="cursor: pointer; transition: background-color 0.2s;"
                                     onmouseover="this.style.backgroundColor='#3a3a3a'"
                                     onmouseout="this.style.backgroundColor='transparent'"
                                     onclick="app.performSearch('${search}')">
                                    <i class="fas fa-search me-2 text-muted"></i>
                                    <span class="text-white">${search}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="search-section p-3">
                        <h6 class="text-white mb-2"><i class="fas fa-fire me-2"></i>Popular Topics</h6>
                        ${popularTopics.map(topic => `
                            <div class="search-item p-2 rounded mb-1" style="cursor: pointer; transition: background-color 0.2s;"
                                 onmouseover="this.style.backgroundColor='#3a3a3a'"
                                 onmouseout="this.style.backgroundColor='transparent'"
                                 onclick="app.performSearch('${topic}')">
                                <i class="fas fa-hashtag me-2 text-danger"></i>
                                <span class="text-white">${topic}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            // Show search suggestions based on query
            const suggestions = this.getSearchSuggestions(query);

            suggestionsContainer.innerHTML = `
                <div class="search-dropdown" style="background-color: #2a2a2a; border: 1px solid #444444; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-height: 400px; overflow-y: auto;">
                    ${suggestions.length > 0 ? `
                        <div class="search-section p-3">
                            <h6 class="text-white mb-2"><i class="fas fa-search me-2"></i>Suggestions</h6>
                            ${suggestions.map(suggestion => `
                                <div class="search-item p-2 rounded mb-1" style="cursor: pointer; transition: background-color 0.2s;"
                                     onmouseover="this.style.backgroundColor='#3a3a3a'"
                                     onmouseout="this.style.backgroundColor='transparent'"
                                     onclick="app.performSearch('${suggestion.text}')">
                                    <i class="fas fa-${suggestion.type === 'interview' ? 'video' : suggestion.type === 'creator' ? 'user' : 'hashtag'} me-2 text-${suggestion.type === 'interview' ? 'danger' : suggestion.type === 'creator' ? 'info' : 'warning'}"></i>
                                    <span class="text-white">${suggestion.text}</span>
                                    <small class="text-muted ms-2">${suggestion.type}</small>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="search-section p-3 text-center">
                            <i class="fas fa-search fa-2x text-muted mb-2"></i>
                            <p class="text-muted mb-0">No suggestions found</p>
                        </div>
                    `}
                </div>
            `;
        }

        suggestionsContainer.style.display = 'block';
    }

    hideSearchSuggestions() {
        setTimeout(() => {
            const suggestionsContainer = document.getElementById('searchSuggestions');
            if (suggestionsContainer) {
                suggestionsContainer.style.display = 'none';
            }
        }, 200); // Delay to allow click events
    }

    getSearchSuggestions(query) {
        const suggestions = [];
        const lowerQuery = query.toLowerCase();

        // Mock data for suggestions
        const mockInterviews = [
            'Tech Industry Insights',
            'My First Interview',
            'Business Leadership Tips',
            'Creative Process Discussion',
            'Future of AI Technology',
            'Startup Success Stories'
        ];

        const mockCreators = [
            'John Smith',
            'Sarah Johnson',
            'Mike Chen',
            'Emily Davis',
            'Alex Rodriguez'
        ];

        const mockTopics = [
            'Technology',
            'Business',
            'Entertainment',
            'Education',
            'Health',
            'Politics',
            'Science',
            'Art',
            'Music',
            'Sports'
        ];

        // Add matching interviews
        mockInterviews.forEach(interview => {
            if (interview.toLowerCase().includes(lowerQuery)) {
                suggestions.push({
                    text: interview,
                    type: 'interview'
                });
            }
        });

        // Add matching creators
        mockCreators.forEach(creator => {
            if (creator.toLowerCase().includes(lowerQuery)) {
                suggestions.push({
                    text: creator,
                    type: 'creator'
                });
            }
        });

        // Add matching topics
        mockTopics.forEach(topic => {
            if (topic.toLowerCase().includes(lowerQuery)) {
                suggestions.push({
                    text: topic,
                    type: 'topic'
                });
            }
        });

        return suggestions.slice(0, 8); // Limit to 8 suggestions
    }

    performSearch(query) {
        if (!query.trim()) return;

        // Save to recent searches
        const recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]');
        const updatedSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
        localStorage.setItem('recent_searches', JSON.stringify(updatedSearches));

        // Clear search input and hide suggestions
        const searchInput = document.getElementById('navbarSearch');
        if (searchInput) {
            searchInput.value = query;
        }
        this.hideSearchSuggestions();

        // Navigate to search results page
        this.currentPage = 'search';
        this.currentSearchQuery = query;
        this.render();

        // Update URL
        window.history.pushState({}, '', `/search?q=${encodeURIComponent(query)}`);

        this.showToast(`Searching for "${query}"...`, 'info');
    }

    renderSearchPage() {
        const query = this.currentSearchQuery || '';
        const results = this.getSearchResults(query);

        return `
            <div class="search-page-dark">
                <div class="container py-5">
                    <!-- Search Header -->
                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="search-header">
                                <h2 class="text-white mb-3">
                                    <i class="fas fa-search me-2 text-danger"></i>Search Results
                                </h2>
                                <div class="search-info d-flex justify-content-between align-items-center mb-4">
                                    <div>
                                        <p class="text-light mb-0">
                                            ${results.total} results found for "<span class="text-danger">${query}</span>"
                                        </p>
                                    </div>
                                    <div class="search-filters">
                                        <select class="form-select form-select-sm" style="background-color: #3a3a3a; border: 1px solid #555555; color: #ffffff; width: auto;" onchange="app.filterSearchResults(this.value)">
                                            <option value="all">All Results</option>
                                            <option value="interviews">Interviews</option>
                                            <option value="creators">Creators</option>
                                            <option value="topics">Topics</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Search Results -->
                    <div class="row">
                        <div class="col-lg-8">
                            ${this.renderSearchResults(results)}
                        </div>
                        <div class="col-lg-4">
                            ${this.renderSearchSidebar(query)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSearchResults(query) {
        // Mock search results - in a real app, this would call your API
        const mockResults = {
            interviews: [
                {
                    id: 1,
                    title: "Tech Industry Insights",
                    description: "Deep dive into the current state of the tech industry and future trends.",
                    creator: "John Smith",
                    thumbnail: "https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Tech+Interview",
                    views: 1200,
                    duration: "25:30",
                    created_at: "2024-01-15T10:30:00Z"
                },
                {
                    id: 2,
                    title: "My First Interview",
                    description: "Personal journey and experiences in the industry.",
                    creator: "Sarah Johnson",
                    thumbnail: "https://via.placeholder.com/300x200/000000/FFFFFF?text=Personal+Story",
                    views: 856,
                    duration: "18:45",
                    created_at: "2024-01-08T14:20:00Z"
                },
                {
                    id: 3,
                    title: "Business Leadership Tips",
                    description: "Essential leadership skills for modern business.",
                    creator: "Mike Chen",
                    thumbnail: "https://via.placeholder.com/300x200/333333/FFFFFF?text=Business+Tips",
                    views: 2100,
                    duration: "32:15",
                    created_at: "2024-01-01T09:00:00Z"
                }
            ],
            creators: [
                {
                    id: 1,
                    name: "John Smith",
                    bio: "Tech industry expert and entrepreneur",
                    avatar: "https://via.placeholder.com/80x80/FF0000/FFFFFF?text=JS",
                    followers: 1500,
                    interviews: 12
                },
                {
                    id: 2,
                    name: "Sarah Johnson",
                    bio: "Content creator and storyteller",
                    avatar: "https://via.placeholder.com/80x80/000000/FFFFFF?text=SJ",
                    followers: 890,
                    interviews: 8
                }
            ],
            topics: [
                { name: "Technology", count: 45 },
                { name: "Business", count: 32 },
                { name: "Entertainment", count: 28 }
            ]
        };

        // Filter results based on query
        const lowerQuery = query.toLowerCase();
        const filteredInterviews = mockResults.interviews.filter(interview =>
            interview.title.toLowerCase().includes(lowerQuery) ||
            interview.description.toLowerCase().includes(lowerQuery) ||
            interview.creator.toLowerCase().includes(lowerQuery)
        );

        const filteredCreators = mockResults.creators.filter(creator =>
            creator.name.toLowerCase().includes(lowerQuery) ||
            creator.bio.toLowerCase().includes(lowerQuery)
        );

        const filteredTopics = mockResults.topics.filter(topic =>
            topic.name.toLowerCase().includes(lowerQuery)
        );

        return {
            interviews: filteredInterviews,
            creators: filteredCreators,
            topics: filteredTopics,
            total: filteredInterviews.length + filteredCreators.length + filteredTopics.length
        };
    }

    renderSearchResults(results) {
        if (results.total === 0) {
            return `
                <div class="no-results text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4 class="text-white mb-2">No Results Found</h4>
                    <p class="text-light opacity-75 mb-4">Try adjusting your search terms or browse our popular content.</p>
                    <button class="btn btn-danger" onclick="app.navigateTo('explore')">
                        <i class="fas fa-compass me-2"></i>Explore Content
                    </button>
                </div>
            `;
        }

        return `
            <!-- Interview Results -->
            ${results.interviews.length > 0 ? `
                <div class="search-section mb-5">
                    <h4 class="text-white mb-3">
                        <i class="fas fa-video me-2 text-danger"></i>Interviews (${results.interviews.length})
                    </h4>
                    <div class="row">
                        ${results.interviews.map(interview => `
                            <div class="col-md-6 mb-4">
                                <div class="card interview-card-dark h-100">
                                    <img src="${interview.thumbnail}" class="card-img-top" alt="${interview.title}" style="height: 200px; object-fit: cover;">
                                    <div class="card-body">
                                        <h6 class="card-title text-white">${interview.title}</h6>
                                        <p class="card-text text-light opacity-75 small">${interview.description}</p>
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <small class="text-muted">
                                                <i class="fas fa-user me-1"></i>${interview.creator}
                                            </small>
                                            <small class="text-muted">
                                                <i class="fas fa-clock me-1"></i>${interview.duration}
                                            </small>
                                        </div>
                                        <div class="d-flex justify-content-between align-items-center">
                                            <small class="text-light opacity-75">
                                                <i class="fas fa-eye me-1"></i>${interview.views} views
                                            </small>
                                            <button class="btn btn-danger btn-sm">
                                                <i class="fas fa-play me-1"></i>Watch
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Creator Results -->
            ${results.creators.length > 0 ? `
                <div class="search-section mb-5">
                    <h4 class="text-white mb-3">
                        <i class="fas fa-users me-2 text-info"></i>Creators (${results.creators.length})
                    </h4>
                    ${results.creators.map(creator => `
                        <div class="card creator-card-dark mb-3">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <img src="${creator.avatar}" class="rounded-circle me-3" width="60" height="60" alt="${creator.name}">
                                    <div class="flex-grow-1">
                                        <h6 class="text-white mb-1">${creator.name}</h6>
                                        <p class="text-light opacity-75 mb-2 small">${creator.bio}</p>
                                        <div class="d-flex gap-3">
                                            <small class="text-muted">
                                                <i class="fas fa-users me-1"></i>${creator.followers} followers
                                            </small>
                                            <small class="text-muted">
                                                <i class="fas fa-video me-1"></i>${creator.interviews} interviews
                                            </small>
                                        </div>
                                    </div>
                                    <button class="btn btn-outline-light btn-sm">
                                        <i class="fas fa-user-plus me-1"></i>Follow
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <!-- Topic Results -->
            ${results.topics.length > 0 ? `
                <div class="search-section mb-5">
                    <h4 class="text-white mb-3">
                        <i class="fas fa-hashtag me-2 text-warning"></i>Topics (${results.topics.length})
                    </h4>
                    <div class="d-flex flex-wrap gap-2">
                        ${results.topics.map(topic => `
                            <button class="btn btn-outline-light btn-sm" onclick="app.performSearch('${topic.name}')">
                                <i class="fas fa-hashtag me-1"></i>${topic.name} (${topic.count})
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderSearchSidebar(query) {
        const recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]');
        const popularTopics = ['Technology', 'Business', 'Entertainment', 'Education', 'Health'];

        return `
            <!-- Search Filters -->
            <div class="card search-sidebar-dark mb-4">
                <div class="card-header">
                    <h6 class="text-white mb-0">
                        <i class="fas fa-filter me-2"></i>Refine Search
                    </h6>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label text-white small">Content Type</label>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="filterInterviews" checked>
                            <label class="form-check-label text-light" for="filterInterviews">
                                Interviews
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="filterCreators" checked>
                            <label class="form-check-label text-light" for="filterCreators">
                                Creators
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="filterTopics" checked>
                            <label class="form-check-label text-light" for="filterTopics">
                                Topics
                            </label>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label text-white small">Duration</label>
                        <select class="form-select form-select-sm" style="background-color: #3a3a3a; border: 1px solid #555555; color: #ffffff;">
                            <option value="">Any Duration</option>
                            <option value="short">Under 10 minutes</option>
                            <option value="medium">10-30 minutes</option>
                            <option value="long">Over 30 minutes</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label class="form-label text-white small">Upload Date</label>
                        <select class="form-select form-select-sm" style="background-color: #3a3a3a; border: 1px solid #555555; color: #ffffff;">
                            <option value="">Any Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="year">This Year</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Recent Searches -->
            ${recentSearches.length > 0 ? `
                <div class="card search-sidebar-dark mb-4">
                    <div class="card-header">
                        <h6 class="text-white mb-0">
                            <i class="fas fa-clock me-2"></i>Recent Searches
                        </h6>
                    </div>
                    <div class="card-body">
                        ${recentSearches.slice(0, 5).map(search => `
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <a href="#" class="text-light text-decoration-none" onclick="app.performSearch('${search}'); return false;">
                                    <i class="fas fa-search me-2 text-muted"></i>${search}
                                </a>
                                <button class="btn btn-sm btn-outline-secondary" onclick="app.removeRecentSearch('${search}')" title="Remove">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Popular Topics -->
            <div class="card search-sidebar-dark">
                <div class="card-header">
                    <h6 class="text-white mb-0">
                        <i class="fas fa-fire me-2"></i>Popular Topics
                    </h6>
                </div>
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2">
                        ${popularTopics.map(topic => `
                            <button class="btn btn-outline-light btn-sm" onclick="app.performSearch('${topic}')">
                                #${topic}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderWatchPage() {
        // Get interview ID from URL hash or default to 1
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const interviewId = urlParams.get('id') || '1';

        // Get interview data (in a real app, this would come from API)
        const interview = this.getSampleInterview(interviewId);

        return `
            <div class="watch-page-dark">
                <div class="container-fluid py-4">
                    <div class="row">
                        <!-- Main Video Player -->
                        <div class="col-lg-8">
                            <div class="video-player-container mb-4">
                                <div class="video-player bg-dark rounded" style="aspect-ratio: 16/9; position: relative;">
                                    <div class="d-flex align-items-center justify-content-center h-100">
                                        <div class="text-center">
                                            <i class="fas fa-play-circle text-danger" style="font-size: 4rem;"></i>
                                            <h4 class="text-white mt-3">${interview.title}</h4>
                                            <p class="text-light">Click to play interview</p>
                                        </div>
                                    </div>
                                    <!-- Video Controls -->
                                    <div class="video-controls position-absolute bottom-0 start-0 end-0 p-3" style="background: linear-gradient(transparent, rgba(0,0,0,0.8));">
                                        <div class="d-flex align-items-center gap-3">
                                            <button class="btn btn-danger btn-sm">
                                                <i class="fas fa-play"></i>
                                            </button>
                                            <span class="text-white small">0:00 / ${interview.duration}</span>
                                            <div class="flex-grow-1">
                                                <div class="progress" style="height: 4px;">
                                                    <div class="progress-bar bg-danger" style="width: 0%"></div>
                                                </div>
                                            </div>
                                            <button class="btn btn-outline-light btn-sm">
                                                <i class="fas fa-volume-up"></i>
                                            </button>
                                            <button class="btn btn-outline-light btn-sm">
                                                <i class="fas fa-expand"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Interview Info -->
                            <div class="interview-info mb-4">
                                <div class="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h2 class="text-white mb-2">${interview.title}</h2>
                                        <div class="d-flex align-items-center gap-3 mb-2">
                                            <span class="badge bg-${interview.categoryColor}">${interview.category}</span>
                                            <span class="text-light small">
                                                <i class="fas fa-eye me-1"></i>${interview.views} views
                                            </span>
                                            <span class="text-light small">
                                                <i class="fas fa-calendar me-1"></i>${interview.publishedDate}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-outline-light btn-sm">
                                            <i class="fas fa-thumbs-up me-1"></i>${interview.likes}
                                        </button>
                                        <button class="btn btn-outline-light btn-sm">
                                            <i class="fas fa-share me-1"></i>Share
                                        </button>
                                        <button class="btn btn-outline-light btn-sm">
                                            <i class="fas fa-bookmark me-1"></i>Save
                                        </button>
                                    </div>
                                </div>

                                <!-- Creator Info -->
                                <div class="creator-info bg-dark rounded p-3 mb-4">
                                    <div class="d-flex align-items-center gap-3">
                                        <img src="${interview.creator.avatar}" alt="${interview.creator.name}"
                                             class="rounded-circle" style="width: 60px; height: 60px; object-fit: cover;">
                                        <div class="flex-grow-1">
                                            <h5 class="text-white mb-1">${interview.creator.name}</h5>
                                            <p class="text-light small mb-2">${interview.creator.subscribers} subscribers</p>
                                            <p class="text-light small mb-0">${interview.creator.bio}</p>
                                        </div>
                                        <button class="btn btn-danger">
                                            <i class="fas fa-user-plus me-1"></i>Subscribe
                                        </button>
                                    </div>
                                </div>

                                <!-- Description -->
                                <div class="description bg-dark rounded p-3">
                                    <h6 class="text-white mb-2">About this interview</h6>
                                    <p class="text-light mb-3">${interview.description}</p>
                                    <div class="tags">
                                        ${interview.tags.map(tag => `
                                            <span class="badge bg-secondary me-2 mb-2">#${tag}</span>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>

                            <!-- Comments Section -->
                            <div class="comments-section">
                                <div class="d-flex justify-content-between align-items-center mb-4">
                                    <h5 class="text-white mb-0">
                                        <i class="fas fa-comments me-2"></i>Comments (${interview.comments.length})
                                    </h5>
                                    <div class="dropdown">
                                        <button class="btn btn-outline-light btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                                            Sort by
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-dark">
                                            <li><a class="dropdown-item" href="#">Top comments</a></li>
                                            <li><a class="dropdown-item" href="#">Newest first</a></li>
                                        </ul>
                                    </div>
                                </div>

                                <!-- Add Comment -->
                                ${this.isAuthenticated ? `
                                    <div class="add-comment mb-4">
                                        <div class="d-flex gap-3">
                                            <img src="${this.currentUser?.avatar || 'https://via.placeholder.com/40x40/666666/FFFFFF?text=U'}"
                                                 alt="Your avatar" class="rounded-circle" style="width: 40px; height: 40px;">
                                            <div class="flex-grow-1">
                                                <textarea class="form-control bg-dark text-white border-secondary"
                                                          placeholder="Add a comment..." rows="3"></textarea>
                                                <div class="d-flex justify-content-end gap-2 mt-2">
                                                    <button class="btn btn-outline-secondary btn-sm">Cancel</button>
                                                    <button class="btn btn-danger btn-sm">Comment</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ` : `
                                    <div class="text-center py-4">
                                        <p class="text-light mb-3">Sign in to leave a comment</p>
                                        <button class="btn btn-danger" onclick="app.navigateTo('login')">
                                            <i class="fas fa-sign-in-alt me-1"></i>Sign In
                                        </button>
                                    </div>
                                `}

                                <!-- Comments List -->
                                <div class="comments-list">
                                    ${interview.comments.map(comment => `
                                        <div class="comment mb-4">
                                            <div class="d-flex gap-3">
                                                <img src="${comment.avatar}" alt="${comment.author}"
                                                     class="rounded-circle" style="width: 40px; height: 40px;">
                                                <div class="flex-grow-1">
                                                    <div class="d-flex align-items-center gap-2 mb-1">
                                                        <strong class="text-white">${comment.author}</strong>
                                                        <small class="text-muted">${comment.timeAgo}</small>
                                                    </div>
                                                    <p class="text-light mb-2">${comment.text}</p>
                                                    <div class="d-flex align-items-center gap-3">
                                                        <button class="btn btn-link btn-sm text-light p-0">
                                                            <i class="fas fa-thumbs-up me-1"></i>${comment.likes}
                                                        </button>
                                                        <button class="btn btn-link btn-sm text-light p-0">
                                                            <i class="fas fa-thumbs-down me-1"></i>
                                                        </button>
                                                        <button class="btn btn-link btn-sm text-light p-0">Reply</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar -->
                        <div class="col-lg-4">
                            <!-- Related Interviews -->
                            <div class="related-interviews">
                                <h5 class="text-white mb-3">
                                    <i class="fas fa-list me-2"></i>Related Interviews
                                </h5>
                                ${this.getRelatedInterviews().map(related => `
                                    <div class="related-item mb-3">
                                        <div class="row g-2">
                                            <div class="col-5">
                                                <img src="${related.thumbnail}" alt="${related.title}"
                                                     class="img-fluid rounded" style="aspect-ratio: 16/9; object-fit: cover;">
                                            </div>
                                            <div class="col-7">
                                                <h6 class="text-white mb-1" style="font-size: 0.9rem; line-height: 1.3;">
                                                    <a href="#watch?id=${related.id}" class="text-white text-decoration-none">
                                                        ${related.title}
                                                    </a>
                                                </h6>
                                                <p class="text-muted small mb-1">${related.creator}</p>
                                                <div class="d-flex justify-content-between">
                                                    <small class="text-muted">${related.views} views</small>
                                                    <small class="text-muted">${related.duration}</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderLiveStreamPage() {
        if (!this.isAuthenticated) {
            return `
                <div class="live-stream-page-dark">
                    <div class="container py-5">
                        <div class="row justify-content-center">
                            <div class="col-md-8 text-center">
                                <div class="card bg-dark border-secondary">
                                    <div class="card-body py-5">
                                        <i class="fas fa-broadcast-tower text-danger mb-4" style="font-size: 4rem;"></i>
                                        <h2 class="text-white mb-3">Live Streaming Studio</h2>
                                        <p class="text-light mb-4">Sign in to start broadcasting live interviews and connect with your audience in real-time.</p>
                                        <button class="btn btn-danger btn-lg" onclick="app.navigateTo('login')">
                                            <i class="fas fa-sign-in-alt me-2"></i>Sign In to Stream
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="live-stream-page-dark">
                <div class="container-fluid py-4">
                    <!-- Studio Header -->
                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h1 class="text-white mb-2">
                                        <i class="fas fa-broadcast-tower me-2 text-danger"></i>Live Streaming Studio
                                    </h1>
                                    <p class="text-light mb-0">Broadcast live interviews to your audience</p>
                                </div>
                                <div class="stream-status">
                                    <div class="d-flex align-items-center gap-3">
                                        <div class="status-indicator offline">
                                            <div class="status-dot"></div>
                                            <span class="text-light">Offline</span>
                                        </div>
                                        <button class="btn btn-danger" id="startStreamBtn" onclick="app.startLiveStream()">
                                            <i class="fas fa-play me-2"></i>Start Stream
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <!-- Main Streaming Area -->
                        <div class="col-lg-8">
                            <!-- Video Preview -->
                            <div class="video-preview-container mb-4">
                                <div class="video-preview bg-dark rounded position-relative" style="aspect-ratio: 16/9;">
                                    <video id="localVideo" class="w-100 h-100 rounded" autoplay muted playsinline style="object-fit: cover;"></video>

                                    <!-- Video Overlay -->
                                    <div class="video-overlay position-absolute top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center">
                                        <div class="text-center" id="videoPlaceholder">
                                            <i class="fas fa-video text-danger mb-3" style="font-size: 3rem;"></i>
                                            <h4 class="text-white mb-2">Camera Preview</h4>
                                            <p class="text-light">Click "Start Stream" to begin broadcasting</p>
                                        </div>
                                    </div>

                                    <!-- Stream Info Overlay -->
                                    <div class="stream-info position-absolute top-0 start-0 end-0 p-3" style="background: linear-gradient(rgba(0,0,0,0.8), transparent);">
                                        <div class="d-flex justify-content-between align-items-start">
                                            <div class="stream-stats">
                                                <div class="d-flex gap-3">
                                                    <span class="badge bg-danger" id="recordingIndicator" style="display: none;">
                                                        <i class="fas fa-circle me-1"></i>REC
                                                    </span>
                                                    <span class="badge bg-secondary">
                                                        <i class="fas fa-eye me-1"></i><span id="viewerCount">0</span> viewers
                                                    </span>
                                                    <span class="badge bg-secondary">
                                                        <i class="fas fa-clock me-1"></i><span id="streamDuration">00:00</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="stream-quality">
                                                <span class="badge bg-success" id="qualityIndicator">720p HD</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Stream Controls -->
                                    <div class="stream-controls position-absolute bottom-0 start-0 end-0 p-3" style="background: linear-gradient(transparent, rgba(0,0,0,0.8));">
                                        <div class="d-flex justify-content-center gap-3">
                                            <button class="btn btn-outline-light btn-sm" id="toggleCamera" onclick="app.toggleCamera()">
                                                <i class="fas fa-video"></i>
                                            </button>
                                            <button class="btn btn-outline-light btn-sm" id="toggleMicrophone" onclick="app.toggleMicrophone()">
                                                <i class="fas fa-microphone"></i>
                                            </button>
                                            <button class="btn btn-outline-light btn-sm" onclick="app.toggleScreenShare()">
                                                <i class="fas fa-desktop"></i>
                                            </button>
                                            <button class="btn btn-outline-light btn-sm" onclick="app.openStreamSettings()">
                                                <i class="fas fa-cog"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Stream Configuration -->
                            <div class="stream-config card bg-dark border-secondary mb-4">
                                <div class="card-header">
                                    <h5 class="text-white mb-0">
                                        <i class="fas fa-cog me-2"></i>Stream Configuration
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label text-white">Stream Title</label>
                                                <input type="text" class="form-control bg-dark text-white border-secondary"
                                                       id="streamTitle" placeholder="Enter your stream title">
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label text-white">Category</label>
                                                <select class="form-select bg-dark text-white border-secondary" id="streamCategory">
                                                    <option value="interview">Interview</option>
                                                    <option value="business">Business</option>
                                                    <option value="technology">Technology</option>
                                                    <option value="arts">Arts & Culture</option>
                                                    <option value="education">Education</option>
                                                    <option value="entertainment">Entertainment</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label text-white">Quality</label>
                                                <select class="form-select bg-dark text-white border-secondary" id="streamQuality">
                                                    <option value="480p">480p (Standard)</option>
                                                    <option value="720p" selected>720p (HD)</option>
                                                    <option value="1080p">1080p (Full HD)</option>
                                                </select>
                                            </div>
                                            <div class="mb-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="enableRecording" checked>
                                                    <label class="form-check-label text-white" for="enableRecording">
                                                        Record stream for later viewing
                                                    </label>
                                                </div>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="enableChat" checked>
                                                    <label class="form-check-label text-white" for="enableChat">
                                                        Enable live chat
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label text-white">Description</label>
                                        <textarea class="form-control bg-dark text-white border-secondary"
                                                  id="streamDescription" rows="3"
                                                  placeholder="Describe what your stream will be about..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar -->
                        <div class="col-lg-4">
                            <!-- Live Chat -->
                            <div class="live-chat card bg-dark border-secondary mb-4">
                                <div class="card-header">
                                    <h6 class="text-white mb-0">
                                        <i class="fas fa-comments me-2"></i>Live Chat
                                    </h6>
                                </div>
                                <div class="card-body p-0">
                                    <div class="chat-messages" style="height: 300px; overflow-y: auto;">
                                        <div class="p-3 text-center text-muted">
                                            <i class="fas fa-comments mb-2" style="font-size: 2rem;"></i>
                                            <p class="mb-0">Chat will appear here when you go live</p>
                                        </div>
                                    </div>
                                    <div class="chat-input p-3 border-top border-secondary">
                                        <div class="input-group">
                                            <input type="text" class="form-control bg-dark text-white border-secondary"
                                                   placeholder="Type a message..." disabled>
                                            <button class="btn btn-outline-danger" disabled>
                                                <i class="fas fa-paper-plane"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Stream Statistics -->
                            <div class="stream-stats card bg-dark border-secondary mb-4">
                                <div class="card-header">
                                    <h6 class="text-white mb-0">
                                        <i class="fas fa-chart-line me-2"></i>Stream Statistics
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="row text-center">
                                        <div class="col-6 mb-3">
                                            <div class="stat-item">
                                                <h4 class="text-danger mb-1" id="totalViewers">0</h4>
                                                <small class="text-muted">Total Viewers</small>
                                            </div>
                                        </div>
                                        <div class="col-6 mb-3">
                                            <div class="stat-item">
                                                <h4 class="text-danger mb-1" id="peakViewers">0</h4>
                                                <small class="text-muted">Peak Viewers</small>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="stat-item">
                                                <h4 class="text-danger mb-1" id="chatMessages">0</h4>
                                                <small class="text-muted">Chat Messages</small>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="stat-item">
                                                <h4 class="text-danger mb-1" id="streamUptime">00:00</h4>
                                                <small class="text-muted">Uptime</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Recent Streams -->
                            <div class="recent-streams card bg-dark border-secondary">
                                <div class="card-header">
                                    <h6 class="text-white mb-0">
                                        <i class="fas fa-history me-2"></i>Recent Streams
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="text-center text-muted py-3">
                                        <i class="fas fa-broadcast-tower mb-2" style="font-size: 2rem;"></i>
                                        <p class="mb-0">No previous streams</p>
                                        <small>Your streaming history will appear here</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stream Settings Modal -->
                <div class="modal fade" id="streamSettingsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content bg-dark border-secondary">
                            <div class="modal-header border-secondary">
                                <h5 class="modal-title text-white">
                                    <i class="fas fa-cog me-2"></i>Advanced Stream Settings
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6 class="text-white mb-3">Video Settings</h6>
                                        <div class="mb-3">
                                            <label class="form-label text-white">Resolution</label>
                                            <select class="form-select bg-dark text-white border-secondary">
                                                <option value="1920x1080">1920x1080 (1080p)</option>
                                                <option value="1280x720" selected>1280x720 (720p)</option>
                                                <option value="854x480">854x480 (480p)</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label text-white">Frame Rate</label>
                                            <select class="form-select bg-dark text-white border-secondary">
                                                <option value="30">30 FPS</option>
                                                <option value="60">60 FPS</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label text-white">Bitrate (kbps)</label>
                                            <input type="range" class="form-range" min="1000" max="6000" value="2500" id="bitrateSlider">
                                            <div class="d-flex justify-content-between">
                                                <small class="text-muted">1000</small>
                                                <small class="text-white" id="bitrateValue">2500</small>
                                                <small class="text-muted">6000</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <h6 class="text-white mb-3">Audio Settings</h6>
                                        <div class="mb-3">
                                            <label class="form-label text-white">Audio Quality</label>
                                            <select class="form-select bg-dark text-white border-secondary">
                                                <option value="128">128 kbps (Standard)</option>
                                                <option value="192" selected>192 kbps (High)</option>
                                                <option value="320">320 kbps (Premium)</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="noiseSuppression" checked>
                                                <label class="form-check-label text-white" for="noiseSuppression">
                                                    Noise Suppression
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="echoCancellation" checked>
                                                <label class="form-check-label text-white" for="echoCancellation">
                                                    Echo Cancellation
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer border-secondary">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger">Save Settings</button>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .status-indicator {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }

                    .status-dot {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: #6c757d;
                    }

                    .status-indicator.live .status-dot {
                        background: #dc3545;
                        animation: pulse 2s infinite;
                    }

                    .status-indicator.offline .status-dot {
                        background: #6c757d;
                    }

                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }

                    .video-overlay {
                        background: rgba(0, 0, 0, 0.7);
                        transition: opacity 0.3s ease;
                    }

                    .video-overlay.hidden {
                        opacity: 0;
                        pointer-events: none;
                    }

                    .stream-controls button:hover {
                        transform: translateY(-1px);
                    }

                    .stat-item h4 {
                        font-weight: 700;
                    }
                </style>
            </div>
        `;
    }

    getSampleInterview(id) {
        // Sample interview data - in a real app, this would come from API
        const interviews = {
            '1': {
                id: '1',
                title: 'Tech Entrepreneur Shares Startup Journey',
                description: 'Join us for an inspiring conversation with a successful tech entrepreneur who built their company from the ground up. Learn about the challenges, victories, and lessons learned along the way.',
                duration: '24:35',
                views: '12.5K',
                likes: '892',
                publishedDate: '2 days ago',
                category: 'Business',
                categoryColor: 'success',
                creator: {
                    name: 'Sarah Johnson',
                    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face',
                    subscribers: '45.2K',
                    bio: 'Business journalist and interview host specializing in entrepreneurship and innovation.'
                },
                tags: ['entrepreneurship', 'startup', 'business', 'technology', 'innovation'],
                comments: [
                    {
                        author: 'Mike Chen',
                        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
                        text: 'Amazing insights! This really motivated me to pursue my own startup idea.',
                        timeAgo: '2 hours ago',
                        likes: 24
                    },
                    {
                        author: 'Emma Davis',
                        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
                        text: 'The part about overcoming early challenges was so relatable. Thank you for sharing!',
                        timeAgo: '5 hours ago',
                        likes: 18
                    },
                    {
                        author: 'Alex Rodriguez',
                        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
                        text: 'Could you do a follow-up interview about scaling strategies?',
                        timeAgo: '1 day ago',
                        likes: 12
                    }
                ]
            },
            '2': {
                id: '2',
                title: 'Artist Reveals Creative Process Behind Latest Work',
                description: 'Dive deep into the mind of a contemporary artist as they walk us through their creative process, inspiration sources, and the story behind their latest masterpiece.',
                duration: '18:42',
                views: '8.3K',
                likes: '567',
                publishedDate: '5 days ago',
                category: 'Arts & Culture',
                categoryColor: 'warning',
                creator: {
                    name: 'David Kim',
                    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face',
                    subscribers: '28.7K',
                    bio: 'Art curator and cultural commentator exploring creativity in the modern world.'
                },
                tags: ['art', 'creativity', 'process', 'inspiration', 'culture'],
                comments: [
                    {
                        author: 'Lisa Park',
                        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face',
                        text: 'As a fellow artist, this was incredibly insightful. Thank you!',
                        timeAgo: '3 hours ago',
                        likes: 31
                    }
                ]
            }
        };

        return interviews[id] || interviews['1'];
    }

    getRelatedInterviews() {
        return [
            {
                id: '2',
                title: 'Artist Reveals Creative Process Behind Latest Work',
                creator: 'David Kim',
                thumbnail: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=200&h=112&fit=crop',
                views: '8.3K',
                duration: '18:42'
            },
            {
                id: '3',
                title: 'Chef Shares Secret Recipes and Cooking Tips',
                creator: 'Maria Garcia',
                thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=112&fit=crop',
                views: '15.7K',
                duration: '31:28'
            },
            {
                id: '4',
                title: 'Musician Discusses Latest Album and Tour',
                creator: 'James Wilson',
                thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=112&fit=crop',
                views: '22.1K',
                duration: '27:15'
            },
            {
                id: '5',
                title: 'Community Leader Talks Social Impact',
                creator: 'Angela Thompson',
                thumbnail: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=200&h=112&fit=crop',
                views: '9.8K',
                duration: '19:33'
            }
        ];
    }

    // Live Streaming Methods
    async startLiveStream() {
        try {
            const streamTitle = document.getElementById('streamTitle')?.value;
            const streamCategory = document.getElementById('streamCategory')?.value;
            const streamDescription = document.getElementById('streamDescription')?.value;
            const streamQuality = document.getElementById('streamQuality')?.value;
            const enableRecording = document.getElementById('enableRecording')?.checked;
            const enableChat = document.getElementById('enableChat')?.checked;

            if (!streamTitle) {
                this.showToast('Please enter a stream title', 'error');
                return;
            }

            // Update UI to show starting state
            const startBtn = document.getElementById('startStreamBtn');
            const statusIndicator = document.querySelector('.status-indicator');
            const videoPlaceholder = document.getElementById('videoPlaceholder');

            if (startBtn) {
                startBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Starting...';
                startBtn.disabled = true;
            }

            // Request camera and microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: streamQuality === '1080p' ? 1920 : streamQuality === '720p' ? 1280 : 854 },
                    height: { ideal: streamQuality === '1080p' ? 1080 : streamQuality === '720p' ? 720 : 480 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Display local video
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = stream;
                localVideo.style.display = 'block';
            }

            // Hide placeholder
            if (videoPlaceholder) {
                videoPlaceholder.style.display = 'none';
            }

            // Create stream on server
            const response = await fetch(`${this.apiBaseUrl}/api/streams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    title: streamTitle,
                    description: streamDescription,
                    category: streamCategory,
                    quality: streamQuality,
                    recording_enabled: enableRecording,
                    chat_enabled: enableChat
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create stream');
            }

            const streamData = await response.json();

            // Update UI to show live state
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator live';
                statusIndicator.innerHTML = '<div class="status-dot"></div><span class="text-light">Live</span>';
            }

            if (startBtn) {
                startBtn.innerHTML = '<i class="fas fa-stop me-2"></i>Stop Stream';
                startBtn.onclick = () => this.stopLiveStream();
                startBtn.disabled = false;
                startBtn.classList.remove('btn-danger');
                startBtn.classList.add('btn-outline-danger');
            }

            // Show recording indicator if enabled
            if (enableRecording) {
                const recordingIndicator = document.getElementById('recordingIndicator');
                if (recordingIndicator) {
                    recordingIndicator.style.display = 'inline-block';
                }
            }

            // Start stream timer
            this.startStreamTimer();

            // Enable chat if enabled
            if (enableChat) {
                this.enableLiveChat();
            }

            this.showToast('Live stream started successfully!', 'success');
            this.currentStream = { id: streamData.stream_id, stream };

        } catch (error) {
            console.error('Failed to start live stream:', error);
            this.showToast('Failed to start live stream: ' + error.message, 'error');

            // Reset UI
            const startBtn = document.getElementById('startStreamBtn');
            if (startBtn) {
                startBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Stream';
                startBtn.disabled = false;
            }
        }
    }

    async stopLiveStream() {
        try {
            if (!this.currentStream) {
                return;
            }

            // Stop all tracks
            if (this.currentStream.stream) {
                this.currentStream.stream.getTracks().forEach(track => track.stop());
            }

            // Update server
            const response = await fetch(`${this.apiBaseUrl}/api/streams/${this.currentStream.id}/stop`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            // Update UI
            const startBtn = document.getElementById('startStreamBtn');
            const statusIndicator = document.querySelector('.status-indicator');
            const localVideo = document.getElementById('localVideo');
            const videoPlaceholder = document.getElementById('videoPlaceholder');
            const recordingIndicator = document.getElementById('recordingIndicator');

            if (startBtn) {
                startBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Stream';
                startBtn.onclick = () => this.startLiveStream();
                startBtn.classList.remove('btn-outline-danger');
                startBtn.classList.add('btn-danger');
            }

            if (statusIndicator) {
                statusIndicator.className = 'status-indicator offline';
                statusIndicator.innerHTML = '<div class="status-dot"></div><span class="text-light">Offline</span>';
            }

            if (localVideo) {
                localVideo.srcObject = null;
                localVideo.style.display = 'none';
            }

            if (videoPlaceholder) {
                videoPlaceholder.style.display = 'block';
            }

            if (recordingIndicator) {
                recordingIndicator.style.display = 'none';
            }

            // Stop timer
            this.stopStreamTimer();

            this.showToast('Live stream stopped', 'info');
            this.currentStream = null;

        } catch (error) {
            console.error('Failed to stop live stream:', error);
            this.showToast('Failed to stop live stream: ' + error.message, 'error');
        }
    }

    toggleCamera() {
        if (!this.currentStream?.stream) {
            this.showToast('No active stream', 'error');
            return;
        }

        const videoTrack = this.currentStream.stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            const btn = document.getElementById('toggleCamera');
            if (btn) {
                btn.innerHTML = videoTrack.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
                btn.classList.toggle('btn-outline-light', videoTrack.enabled);
                btn.classList.toggle('btn-outline-danger', !videoTrack.enabled);
            }
            this.showToast(videoTrack.enabled ? 'Camera enabled' : 'Camera disabled', 'info');
        }
    }

    toggleMicrophone() {
        if (!this.currentStream?.stream) {
            this.showToast('No active stream', 'error');
            return;
        }

        const audioTrack = this.currentStream.stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const btn = document.getElementById('toggleMicrophone');
            if (btn) {
                btn.innerHTML = audioTrack.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
                btn.classList.toggle('btn-outline-light', audioTrack.enabled);
                btn.classList.toggle('btn-outline-danger', !audioTrack.enabled);
            }
            this.showToast(audioTrack.enabled ? 'Microphone enabled' : 'Microphone disabled', 'info');
        }
    }

    async toggleScreenShare() {
        try {
            if (!this.currentStream) {
                this.showToast('No active stream', 'error');
                return;
            }

            // Get screen share
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            // Replace video track
            const videoTrack = screenStream.getVideoTracks()[0];
            const sender = this.currentStream.peerConnection?.getSenders().find(s =>
                s.track && s.track.kind === 'video'
            );

            if (sender) {
                await sender.replaceTrack(videoTrack);
            }

            this.showToast('Screen sharing started', 'success');

        } catch (error) {
            console.error('Screen share failed:', error);
            this.showToast('Screen sharing failed: ' + error.message, 'error');
        }
    }

    openStreamSettings() {
        const modal = new bootstrap.Modal(document.getElementById('streamSettingsModal'));
        modal.show();
    }

    startStreamTimer() {
        this.streamStartTime = Date.now();
        this.streamTimer = setInterval(() => {
            const elapsed = Date.now() - this.streamStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            const durationElement = document.getElementById('streamDuration');
            const uptimeElement = document.getElementById('streamUptime');

            if (durationElement) durationElement.textContent = timeString;
            if (uptimeElement) uptimeElement.textContent = timeString;
        }, 1000);
    }

    stopStreamTimer() {
        if (this.streamTimer) {
            clearInterval(this.streamTimer);
            this.streamTimer = null;
        }
    }

    enableLiveChat() {
        const chatInput = document.querySelector('.chat-input input');
        const chatButton = document.querySelector('.chat-input button');

        if (chatInput) {
            chatInput.disabled = false;
            chatInput.placeholder = 'Type a message...';
        }

        if (chatButton) {
            chatButton.disabled = false;
        }
    }

    filterSearchResults(filter) {
        // Implementation for filtering search results
        this.showToast(`Filtering by: ${filter}`, 'info');
    }

    removeRecentSearch(search) {
        const recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]');
        const updatedSearches = recentSearches.filter(s => s !== search);
        localStorage.setItem('recent_searches', JSON.stringify(updatedSearches));
        this.render(); // Refresh to update the sidebar
    }

    toggleMobileSearch() {
        // Create mobile search modal
        const modalHtml = `
            <div class="modal fade" id="mobileSearchModal" tabindex="-1" aria-labelledby="mobileSearchModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-fullscreen-sm-down">
                    <div class="modal-content" style="background-color: #2a2a2a; border: none;">
                        <div class="modal-header" style="border-bottom: 1px solid #444444;">
                            <h5 class="modal-title text-white" id="mobileSearchModalLabel">
                                <i class="fas fa-search me-2 text-danger"></i>Search
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="search-container position-relative mb-4">
                                <input type="text" class="form-control search-input" id="mobileSearchInput"
                                       placeholder="Search interviews, creators, topics..."
                                       style="background-color: #3a3a3a; border: 1px solid #555555; color: #ffffff; padding-left: 40px; border-radius: 25px;"
                                       onkeyup="app.handleMobileSearchInput(event)"
                                       onfocus="app.showMobileSearchSuggestions()">
                                <i class="fas fa-search position-absolute" style="left: 12px; top: 50%; transform: translateY(-50%); color: #aaa; pointer-events: none;"></i>
                            </div>
                            <div id="mobileSearchSuggestions">
                                ${this.renderMobileSearchSuggestions()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('mobileSearchModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('mobileSearchModal'));
        modal.show();

        // Focus on search input
        setTimeout(() => {
            document.getElementById('mobileSearchInput').focus();
        }, 300);

        // Clean up when modal is hidden
        document.getElementById('mobileSearchModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    handleMobileSearchInput(event) {
        const query = event.target.value.trim();

        if (event.key === 'Enter' && query) {
            // Close modal and perform search
            const modal = bootstrap.Modal.getInstance(document.getElementById('mobileSearchModal'));
            modal.hide();
            this.performSearch(query);
            return;
        }

        if (query.length >= 2) {
            this.showMobileSearchSuggestions(query);
        } else {
            this.showMobileSearchSuggestions();
        }
    }

    showMobileSearchSuggestions(query = '') {
        const suggestionsContainer = document.getElementById('mobileSearchSuggestions');
        if (!suggestionsContainer) return;

        if (!query) {
            suggestionsContainer.innerHTML = this.renderMobileSearchSuggestions();
        } else {
            const suggestions = this.getSearchSuggestions(query);
            suggestionsContainer.innerHTML = `
                <h6 class="text-white mb-3">Suggestions</h6>
                ${suggestions.length > 0 ? suggestions.map(suggestion => `
                    <div class="search-item p-3 rounded mb-2" style="background-color: #3a3a3a; cursor: pointer;"
                         onclick="app.performMobileSearch('${suggestion.text}')">
                        <i class="fas fa-${suggestion.type === 'interview' ? 'video' : suggestion.type === 'creator' ? 'user' : 'hashtag'} me-2 text-${suggestion.type === 'interview' ? 'danger' : suggestion.type === 'creator' ? 'info' : 'warning'}"></i>
                        <span class="text-white">${suggestion.text}</span>
                        <small class="text-muted ms-2">${suggestion.type}</small>
                    </div>
                `).join('') : '<p class="text-muted">No suggestions found</p>'}
            `;
        }
    }

    renderMobileSearchSuggestions() {
        const recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]');
        const popularTopics = ['Technology', 'Business', 'Entertainment', 'Education', 'Health'];

        return `
            ${recentSearches.length > 0 ? `
                <div class="mb-4">
                    <h6 class="text-white mb-3"><i class="fas fa-clock me-2"></i>Recent Searches</h6>
                    ${recentSearches.slice(0, 5).map(search => `
                        <div class="search-item p-3 rounded mb-2" style="background-color: #3a3a3a; cursor: pointer;"
                             onclick="app.performMobileSearch('${search}')">
                            <i class="fas fa-search me-2 text-muted"></i>
                            <span class="text-white">${search}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <div>
                <h6 class="text-white mb-3"><i class="fas fa-fire me-2"></i>Popular Topics</h6>
                ${popularTopics.map(topic => `
                    <div class="search-item p-3 rounded mb-2" style="background-color: #3a3a3a; cursor: pointer;"
                         onclick="app.performMobileSearch('${topic}')">
                        <i class="fas fa-hashtag me-2 text-danger"></i>
                        <span class="text-white">${topic}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    performMobileSearch(query) {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('mobileSearchModal'));
        modal.hide();

        // Perform search
        this.performSearch(query);
    }
}

// Application class definition complete
// Initialization is handled in index.html

// Enhanced routing system for URL management and SEO
class EnhancedRouter {
    constructor() {
        this.analytics = new Map();
        this.redirects = new Map();
        this.seoData = new Map();
        this.setupDefaultRoutes();
        this.setupEventListeners();
    }

    setupDefaultRoutes() {
        // Setup redirects
        this.redirects.set('user', 'profile');
        this.redirects.set('admin-dashboard', 'admin');
        this.redirects.set('content-management', 'admin');
        this.redirects.set('security-dashboard', 'admin');

        // Setup SEO data
        this.seoData.set('home', {
            title: 'Interviews.tv - Join the Ultimate Interview Network',
            description: 'Create, share, discover, and engage with interviews from artists, musicians, politicians, business owners, and everyday people sharing their stories.',
            keywords: 'interviews, social network, video, audio, conversations, stories'
        });

        this.seoData.set('explore', {
            title: 'Explore Interviews - Interviews.tv',
            description: 'Discover amazing interviews from diverse voices and perspectives across all categories.',
            keywords: 'explore interviews, discover content, video interviews, audio interviews'
        });

        this.seoData.set('business', {
            title: 'Business Directory - Interviews.tv',
            description: 'Connect with businesses and entrepreneurs sharing their stories and insights.',
            keywords: 'business directory, entrepreneurs, business interviews, company profiles'
        });
    }

    setupEventListeners() {
        // Handle browser navigation
        window.addEventListener('popstate', (event) => {
            const path = window.location.pathname;
            const page = this.getPageFromPath(path);

            if (page && window.app) {
                window.app.currentPage = page;
                window.app.render();
                this.updateSEO(page);
            } else {
                this.show404();
            }
        });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.trackPageView(window.app?.currentPage || 'unknown');
            }
        });
    }

    navigate(page, options = {}) {
        // Check for redirects
        const redirectPage = this.redirects.get(page) || page;

        // Track navigation
        this.trackPageView(redirectPage);

        // Update SEO
        this.updateSEO(redirectPage);

        // Update URL
        if (!options.skipHistoryUpdate) {
            const url = redirectPage === 'home' ? '/' : `/${redirectPage}`;
            window.history.pushState({page: redirectPage}, '', url);
        }

        return redirectPage;
    }

    trackPageView(page) {
        const viewData = {
            page,
            timestamp: Date.now(),
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        // Store analytics
        if (!this.analytics.has(page)) {
            this.analytics.set(page, []);
        }
        this.analytics.get(page).push(viewData);

        // Send to external analytics
        if (window.gtag) {
            window.gtag('event', 'page_view', {
                page_title: document.title,
                page_location: window.location.href
            });
        }
    }

    updateSEO(page) {
        const seoData = this.seoData.get(page) || this.seoData.get('home');

        // Update title
        document.title = seoData.title;

        // Update meta tags
        this.updateMetaTag('description', seoData.description);
        this.updateMetaTag('keywords', seoData.keywords);
        this.updateMetaTag('og:title', seoData.title, 'property');
        this.updateMetaTag('og:description', seoData.description, 'property');
        this.updateMetaTag('og:url', window.location.href, 'property');
    }

    updateMetaTag(name, content, attribute = 'name') {
        let meta = document.querySelector(`meta[${attribute}="${name}"]`);

        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attribute, name);
            document.head.appendChild(meta);
        }

        meta.setAttribute('content', content);
    }

    getPageFromPath(path) {
        const pathMap = {
            '/': 'home',
            '/explore': 'explore',
            '/gallery': 'gallery',
            '/business': 'business',
            '/profile': 'profile',
            '/settings': 'settings',
            '/create': 'create',
            '/admin': 'admin',
            '/login': 'login',
            '/register': 'register'
        };

        return pathMap[path] || null;
    }

    show404() {
        if (window.app && window.app.container) {
            window.app.container.innerHTML = `
                <div class="error-page-container">
                    <div class="container py-5">
                        <div class="row justify-content-center">
                            <div class="col-lg-8 text-center">
                                <div class="error-hero mb-5">
                                    <div class="error-code">404</div>
                                    <h1 class="error-title">Page Not Found</h1>
                                    <p class="error-description">
                                        Sorry, we couldn't find the page you're looking for.
                                    </p>
                                </div>

                                <div class="error-actions">
                                    <button class="btn btn-primary me-3" onclick="window.app.navigateTo('home')">
                                        <i class="fas fa-home me-2"></i>Go Home
                                    </button>
                                    <button class="btn btn-outline-primary me-3" onclick="window.app.navigateTo('explore')">
                                        <i class="fas fa-compass me-2"></i>Explore
                                    </button>
                                    <button class="btn btn-outline-secondary" onclick="history.back()">
                                        <i class="fas fa-arrow-left me-2"></i>Go Back
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    getAnalytics(page = null) {
        if (page) {
            return this.analytics.get(page) || [];
        }
        return Object.fromEntries(this.analytics);
    }

    renderAdminInterviewsPage() {
        if (!this.isAdmin()) {
            return `
                <div class="container mt-5">
                    <div class="alert alert-danger">
                        <h4>Access Denied</h4>
                        <p>You need administrator privileges to access this page.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="container-fluid mt-4 bg-primary-dark" style="background-color: #1a1a1a !important; color: #ffffff !important; min-height: 100vh;">
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 class="text-primary-light mb-1">
                                    <i class="fas fa-video text-danger me-2"></i>Interviews Management
                                </h1>
                                <p class="text-secondary-light mb-0">Manage all interviews, moderation, and content quality</p>
                            </div>
                            <div>
                                <a href="/admin" class="btn btn-outline-secondary me-2">
                                    <i class="fas fa-arrow-left me-1"></i>Back to Admin
                                </a>
                                <button class="btn btn-danger" onclick="app.refreshInterviewsData()">
                                    <i class="fas fa-sync-alt me-2"></i>Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-12">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body text-center py-5">
                                <i class="fas fa-video fa-3x text-primary mb-3"></i>
                                <h5 class="text-white">Interviews Management Dashboard</h5>
                                <p class="text-muted">This feature is being loaded from the dedicated Interviews Management component.</p>
                                <div class="mt-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2 text-muted">Loading interviews management interface...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAdminContentPage() {
        if (!this.isAdmin()) {
            return `
                <div class="container mt-5">
                    <div class="alert alert-danger">
                        <h4>Access Denied</h4>
                        <p>You need administrator privileges to access this page.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="container-fluid mt-4 bg-primary-dark" style="background-color: #1a1a1a !important; color: #ffffff !important; min-height: 100vh;">
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 class="text-primary-light mb-1">
                                    <i class="fas fa-file-alt text-danger me-2"></i>Content Management
                                </h1>
                                <p class="text-secondary-light mb-0">Manage all content, moderation, and analytics</p>
                            </div>
                            <div>
                                <a href="/admin" class="btn btn-outline-secondary me-2">
                                    <i class="fas fa-arrow-left me-1"></i>Back to Admin
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-12">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body text-center py-5">
                                <i class="fas fa-file-alt fa-3x text-primary mb-3"></i>
                                <h5 class="text-white">Content Management Dashboard</h5>
                                <p class="text-muted">This feature is being loaded from the dedicated Content Management component.</p>
                                <div class="mt-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2 text-muted">Loading content management interface...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAdminSecurityPage() {
        if (!this.isAdmin()) {
            return `
                <div class="container mt-5">
                    <div class="alert alert-danger">
                        <h4>Access Denied</h4>
                        <p>You need administrator privileges to access this page.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="container-fluid mt-4 bg-primary-dark" style="background-color: #1a1a1a !important; color: #ffffff !important; min-height: 100vh;">
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 class="text-primary-light mb-1">
                                    <i class="fas fa-shield-alt text-danger me-2"></i>Security Dashboard
                                </h1>
                                <p class="text-secondary-light mb-0">Monitor security events and system protection</p>
                            </div>
                            <div>
                                <a href="/admin" class="btn btn-outline-secondary me-2">
                                    <i class="fas fa-arrow-left me-1"></i>Back to Admin
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-12">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body text-center py-5">
                                <i class="fas fa-shield-alt fa-3x text-primary mb-3"></i>
                                <h5 class="text-white">Security Dashboard</h5>
                                <p class="text-muted">This feature is being loaded from the dedicated Security Dashboard component.</p>
                                <div class="mt-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2 text-muted">Loading security dashboard interface...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAdminStreamsPage() {
        if (!this.isAdmin()) {
            return `
                <div class="container mt-5">
                    <div class="alert alert-danger">
                        <h4>Access Denied</h4>
                        <p>You need administrator privileges to access this page.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="container-fluid mt-4 bg-primary-dark" style="background-color: #1a1a1a !important; color: #ffffff !important; min-height: 100vh;">
                <!-- Header -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 class="text-primary-light mb-1">
                                    <i class="fas fa-broadcast-tower text-danger me-2"></i>Live Streams Management
                                </h1>
                                <p class="text-secondary-light mb-0">Monitor and manage all live streaming activities</p>
                            </div>
                            <div>
                                <button class="btn btn-danger me-2" onclick="app.refreshStreamsData()">
                                    <i class="fas fa-sync me-1"></i>Refresh
                                </button>
                                <a href="javascript:void(0)" onclick="app.navigateTo('admin')" class="btn btn-outline-secondary">
                                    <i class="fas fa-arrow-left me-1"></i>Back to Admin
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Statistics Cards -->
                <div class="row mb-4">
                    <div class="col-md-3 mb-3">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1" style="color: #cccccc; font-size: 0.875rem;">Active Streams</h6>
                                        <h3 class="mb-0" style="color: #ffffff; font-weight: 600;" id="active-streams">3</h3>
                                    </div>
                                    <div class="text-danger">
                                        <i class="fas fa-broadcast-tower fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1" style="color: #cccccc; font-size: 0.875rem;">Total Viewers</h6>
                                        <h3 class="mb-0" style="color: #ffffff; font-weight: 600;" id="total-viewers">1,247</h3>
                                    </div>
                                    <div class="text-primary">
                                        <i class="fas fa-eye fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1" style="color: #cccccc; font-size: 0.875rem;">Streams Today</h6>
                                        <h3 class="mb-0" style="color: #ffffff; font-weight: 600;" id="streams-today">12</h3>
                                    </div>
                                    <div class="text-success">
                                        <i class="fas fa-calendar-day fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1" style="color: #cccccc; font-size: 0.875rem;">Total Hours</h6>
                                        <h3 class="mb-0" style="color: #ffffff; font-weight: 600;" id="total-hours">156</h3>
                                    </div>
                                    <div class="text-warning">
                                        <i class="fas fa-clock fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Active Streams -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-header" style="background-color: #333333; border-bottom: 1px solid #444444;">
                                <h5 class="mb-0 text-white">
                                    <i class="fas fa-broadcast-tower me-2 text-danger"></i>Currently Live Streams
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-dark table-hover">
                                        <thead>
                                            <tr>
                                                <th>Stream</th>
                                                <th>Creator</th>
                                                <th>Viewers</th>
                                                <th>Duration</th>
                                                <th>Quality</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <div class="stream-thumbnail me-3" style="width: 60px; height: 40px; background: #dc3545; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                                            <i class="fas fa-play text-white"></i>
                                                        </div>
                                                        <div>
                                                            <h6 class="mb-0 text-white">Tech Entrepreneur Interview</h6>
                                                            <small class="text-muted">Business Category</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <img src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face"
                                                             class="rounded-circle me-2" style="width: 32px; height: 32px;">
                                                        <span class="text-white">Sarah Johnson</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="badge bg-primary">
                                                        <i class="fas fa-eye me-1"></i>847
                                                    </span>
                                                </td>
                                                <td class="text-white">1h 23m</td>
                                                <td>
                                                    <span class="badge bg-success">720p HD</span>
                                                </td>
                                                <td>
                                                    <span class="badge bg-danger">
                                                        <i class="fas fa-circle me-1"></i>LIVE
                                                    </span>
                                                </td>
                                                <td>
                                                    <div class="btn-group btn-group-sm">
                                                        <button class="btn btn-outline-primary" title="View Stream">
                                                            <i class="fas fa-eye"></i>
                                                        </button>
                                                        <button class="btn btn-outline-warning" title="Moderate">
                                                            <i class="fas fa-shield-alt"></i>
                                                        </button>
                                                        <button class="btn btn-outline-danger" title="End Stream">
                                                            <i class="fas fa-stop"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <div class="stream-thumbnail me-3" style="width: 60px; height: 40px; background: #28a745; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                                            <i class="fas fa-play text-white"></i>
                                                        </div>
                                                        <div>
                                                            <h6 class="mb-0 text-white">Artist Creative Process</h6>
                                                            <small class="text-muted">Arts & Culture</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&crop=face"
                                                             class="rounded-circle me-2" style="width: 32px; height: 32px;">
                                                        <span class="text-white">David Kim</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="badge bg-primary">
                                                        <i class="fas fa-eye me-1"></i>234
                                                    </span>
                                                </td>
                                                <td class="text-white">45m</td>
                                                <td>
                                                    <span class="badge bg-success">1080p</span>
                                                </td>
                                                <td>
                                                    <span class="badge bg-danger">
                                                        <i class="fas fa-circle me-1"></i>LIVE
                                                    </span>
                                                </td>
                                                <td>
                                                    <div class="btn-group btn-group-sm">
                                                        <button class="btn btn-outline-primary" title="View Stream">
                                                            <i class="fas fa-eye"></i>
                                                        </button>
                                                        <button class="btn btn-outline-warning" title="Moderate">
                                                            <i class="fas fa-shield-alt"></i>
                                                        </button>
                                                        <button class="btn btn-outline-danger" title="End Stream">
                                                            <i class="fas fa-stop"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stream History -->
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0" style="background-color: #2a2a2a;">
                            <div class="card-header" style="background-color: #333333; border-bottom: 1px solid #444444;">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0 text-white">
                                        <i class="fas fa-history me-2"></i>Recent Stream History
                                    </h5>
                                    <div class="d-flex gap-2">
                                        <select class="form-select form-select-sm bg-dark text-white border-secondary" style="width: auto;">
                                            <option>All Categories</option>
                                            <option>Business</option>
                                            <option>Technology</option>
                                            <option>Arts & Culture</option>
                                        </select>
                                        <select class="form-select form-select-sm bg-dark text-white border-secondary" style="width: auto;">
                                            <option>Last 7 days</option>
                                            <option>Last 30 days</option>
                                            <option>Last 3 months</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-dark table-hover">
                                        <thead>
                                            <tr>
                                                <th>Stream</th>
                                                <th>Creator</th>
                                                <th>Date</th>
                                                <th>Duration</th>
                                                <th>Peak Viewers</th>
                                                <th>Recording</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <div class="stream-thumbnail me-3" style="width: 60px; height: 40px; background: #6f42c1; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                                            <i class="fas fa-play text-white"></i>
                                                        </div>
                                                        <div>
                                                            <h6 class="mb-0 text-white">Music Producer Session</h6>
                                                            <small class="text-muted">Music Category</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"
                                                             class="rounded-circle me-2" style="width: 32px; height: 32px;">
                                                        <span class="text-white">Alex Rodriguez</span>
                                                    </div>
                                                </td>
                                                <td class="text-white">2 hours ago</td>
                                                <td class="text-white">2h 15m</td>
                                                <td>
                                                    <span class="badge bg-info">1,234</span>
                                                </td>
                                                <td>
                                                    <span class="badge bg-success">
                                                        <i class="fas fa-check me-1"></i>Available
                                                    </span>
                                                </td>
                                                <td>
                                                    <div class="btn-group btn-group-sm">
                                                        <button class="btn btn-outline-primary" title="View Recording">
                                                            <i class="fas fa-play"></i>
                                                        </button>
                                                        <button class="btn btn-outline-info" title="Analytics">
                                                            <i class="fas fa-chart-line"></i>
                                                        </button>
                                                        <button class="btn btn-outline-secondary" title="Download">
                                                            <i class="fas fa-download"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    refreshStreamsData() {
        this.showToast('Refreshing streams data...', 'info');
        // In a real implementation, this would fetch fresh data from the API
    }

    refreshInterviewsData() {
        // This would trigger a refresh of the interviews management data
        this.showToast('Refreshing interviews data...', 'info');
        // In a real implementation, this would call the interviews management component
    }
}

// Initialize enhanced router
window.enhancedRouter = new EnhancedRouter();
