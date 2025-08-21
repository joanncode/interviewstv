// Simple Interviews.tv Application
// This is a basic version that works without webpack

class InterviewsApp {
    constructor() {
        this.container = document.getElementById('app');
        this.currentPage = 'home';
        this.isAuthenticated = false;
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
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 1000);
        }

        // Render the application
        this.render();
        this.setupEventListeners();

        console.log('Interviews.tv application initialized successfully!');
    }

    setInitialPage() {
        const path = window.location.pathname;
        if (path === '/' || path === '') {
            this.currentPage = 'home';
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
                                <a class="nav-link ${this.currentPage === 'business' ? 'active' : ''}" href="javascript:void(0)" onclick="app.navigateTo('business'); return false;">
                                    <i class="fas fa-building me-1"></i>Business
                                </a>
                            </li>
                        </ul>
                        
                        <ul class="navbar-nav">
                            ${this.isAuthenticated ? this.renderAuthenticatedNav() : this.renderGuestNav()}
                        </ul>
                    </div>
                </div>
            </nav>
        `;
    }

    renderAuthenticatedNav() {
        return `
            <li class="nav-item">
                <a class="nav-link ${this.currentPage === 'create' ? 'active' : ''}" href="javascript:void(0)" onclick="app.navigateTo('create'); return false;">
                    <i class="fas fa-plus me-1"></i>Create
                </a>
            </li>
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="javascript:void(0)" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                    <i class="fas fa-user me-1"></i>${this.currentUser ? this.currentUser.name : 'User'}
                </a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="javascript:void(0)" onclick="app.navigateTo('profile'); return false;">
                        <i class="fas fa-user me-2"></i>My Profile
                    </a></li>
                    <li><a class="dropdown-item" href="javascript:void(0)" onclick="app.navigateTo('settings'); return false;">
                        <i class="fas fa-cog me-2"></i>Settings
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="javascript:void(0)" onclick="app.logout(); return false;">
                        <i class="fas fa-sign-out-alt me-2"></i>Logout
                    </a></li>
                </ul>
            </li>
        `;
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
            <div class="container py-5">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="mb-0">Explore Interviews</h2>
                    <div class="d-flex gap-2">
                        <select class="form-select form-select-sm" style="width: auto;">
                            <option>All Categories</option>
                            <option>Business</option>
                            <option>Technology</option>
                            <option>Arts & Culture</option>
                            <option>Music</option>
                            <option>Politics</option>
                        </select>
                        <select class="form-select form-select-sm" style="width: auto;">
                            <option>Latest</option>
                            <option>Most Popular</option>
                            <option>Most Liked</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Tech+CEO+Interview" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-primary mb-2">Technology</span>
                                <h5 class="card-title">Tech CEO on AI Revolution</h5>
                                <p class="card-text">An insightful conversation about the future of artificial intelligence and its impact on business.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-eye me-1"></i>2.1k views
                                        <i class="fas fa-heart ms-2 me-1"></i>89 likes
                                    </small>
                                    <small class="text-muted">2 days ago</small>
                                </div>
                                <button class="btn btn-primary w-100">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/000000/FFFFFF?text=Artist+Story" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-warning mb-2">Arts & Culture</span>
                                <h5 class="card-title">Local Artist's Journey</h5>
                                <p class="card-text">From street art to gallery exhibitions - a compelling story of artistic growth and community impact.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-eye me-1"></i>1.5k views
                                        <i class="fas fa-heart ms-2 me-1"></i>67 likes
                                    </small>
                                    <small class="text-muted">5 days ago</small>
                                </div>
                                <button class="btn btn-primary w-100">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/28a745/FFFFFF?text=Entrepreneur+Tips" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-success mb-2">Business</span>
                                <h5 class="card-title">Startup Success Stories</h5>
                                <p class="card-text">Three entrepreneurs share their journey from idea to successful business, including failures and lessons learned.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-eye me-1"></i>3.2k views
                                        <i class="fas fa-heart ms-2 me-1"></i>124 likes
                                    </small>
                                    <small class="text-muted">1 week ago</small>
                                </div>
                                <button class="btn btn-primary w-100">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/6f42c1/FFFFFF?text=Music+Producer" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-info mb-2">Music</span>
                                <h5 class="card-title">Behind the Beats</h5>
                                <p class="card-text">Grammy-winning producer discusses the creative process and evolution of modern music production.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-eye me-1"></i>4.7k views
                                        <i class="fas fa-heart ms-2 me-1"></i>203 likes
                                    </small>
                                    <small class="text-muted">3 days ago</small>
                                </div>
                                <button class="btn btn-primary w-100">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/dc3545/FFFFFF?text=Community+Leader" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-danger mb-2">Politics</span>
                                <h5 class="card-title">Community Leadership</h5>
                                <p class="card-text">Local community leader shares insights on grassroots organizing and creating positive change.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-eye me-1"></i>1.8k views
                                        <i class="fas fa-heart ms-2 me-1"></i>95 likes
                                    </small>
                                    <small class="text-muted">4 days ago</small>
                                </div>
                                <button class="btn btn-primary w-100">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/fd7e14/FFFFFF?text=Chef+Stories" class="card-img-top" alt="Interview">
                            <div class="card-body">
                                <span class="badge bg-secondary mb-2">Lifestyle</span>
                                <h5 class="card-title">Culinary Adventures</h5>
                                <p class="card-text">Award-winning chef talks about culinary innovation, sustainability, and the future of dining.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-eye me-1"></i>2.9k views
                                        <i class="fas fa-heart ms-2 me-1"></i>156 likes
                                    </small>
                                    <small class="text-muted">6 days ago</small>
                                </div>
                                <button class="btn btn-primary w-100">
                                    <i class="fas fa-play me-1"></i>Watch Interview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="text-center mt-4">
                    <button class="btn btn-outline-primary btn-lg">
                        <i class="fas fa-plus me-2"></i>Load More Interviews
                    </button>
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
            <div class="container py-5">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1">Business Directory</h2>
                        <p class="text-muted mb-0">Discover businesses and their stories through interviews</p>
                    </div>
                    ${this.isAuthenticated ? `
                        <button class="btn btn-primary" onclick="app.showAddBusinessModal()">
                            <i class="fas fa-plus me-1"></i>Add Your Business
                        </button>
                    ` : ''}
                </div>

                <!-- Search and Filter -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="input-group">
                            <input type="text" class="form-control" placeholder="Search businesses..." id="businessSearch">
                            <button class="btn btn-outline-secondary" onclick="app.searchBusinesses()">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <select class="form-select" id="businessCategory" onchange="app.filterBusinesses()">
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
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/007bff/ffffff?text=TechStart+Inc" class="card-img-top" alt="Business">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0">TechStart Inc</h5>
                                    <span class="badge bg-primary">Technology</span>
                                </div>
                                <p class="text-muted small mb-2">
                                    <i class="fas fa-map-marker-alt me-1"></i>San Francisco, CA
                                </p>
                                <p class="card-text">Innovative software solutions for modern businesses. Specializing in AI and machine learning applications.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-video me-1"></i>3 interviews
                                        <i class="fas fa-users ms-2 me-1"></i>245 followers
                                    </small>
                                    <div class="text-warning">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <small class="text-muted ms-1">4.8</small>
                                    </div>
                                </div>
                                <button class="btn btn-primary w-100" onclick="app.viewBusinessProfile('techstart-inc')">
                                    <i class="fas fa-eye me-1"></i>View Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/28a745/ffffff?text=Green+Eats" class="card-img-top" alt="Business">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0">Green Eats Cafe</h5>
                                    <span class="badge bg-success">Food & Beverage</span>
                                </div>
                                <p class="text-muted small mb-2">
                                    <i class="fas fa-map-marker-alt me-1"></i>Portland, OR
                                </p>
                                <p class="card-text">Organic, locally-sourced meals with a focus on sustainability and community health.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-video me-1"></i>2 interviews
                                        <i class="fas fa-users ms-2 me-1"></i>189 followers
                                    </small>
                                    <div class="text-warning">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="far fa-star"></i>
                                        <small class="text-muted ms-1">4.2</small>
                                    </div>
                                </div>
                                <button class="btn btn-primary w-100" onclick="app.viewBusinessProfile('green-eats-cafe')">
                                    <i class="fas fa-eye me-1"></i>View Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/dc3545/ffffff?text=Design+Studio" class="card-img-top" alt="Business">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0">Creative Design Studio</h5>
                                    <span class="badge bg-warning">Consulting</span>
                                </div>
                                <p class="text-muted small mb-2">
                                    <i class="fas fa-map-marker-alt me-1"></i>New York, NY
                                </p>
                                <p class="card-text">Full-service design agency helping brands tell their story through visual communication.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-video me-1"></i>5 interviews
                                        <i class="fas fa-users ms-2 me-1"></i>567 followers
                                    </small>
                                    <div class="text-warning">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <small class="text-muted ms-1">4.9</small>
                                    </div>
                                </div>
                                <button class="btn btn-primary w-100" onclick="app.viewBusinessProfile('creative-design-studio')">
                                    <i class="fas fa-eye me-1"></i>View Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/6f42c1/ffffff?text=Health+Plus" class="card-img-top" alt="Business">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0">HealthPlus Clinic</h5>
                                    <span class="badge bg-info">Healthcare</span>
                                </div>
                                <p class="text-muted small mb-2">
                                    <i class="fas fa-map-marker-alt me-1"></i>Austin, TX
                                </p>
                                <p class="card-text">Comprehensive healthcare services with a focus on preventive care and patient wellness.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-video me-1"></i>4 interviews
                                        <i class="fas fa-users ms-2 me-1"></i>423 followers
                                    </small>
                                    <div class="text-warning">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <small class="text-muted ms-1">4.7</small>
                                    </div>
                                </div>
                                <button class="btn btn-primary w-100" onclick="app.viewBusinessProfile('healthplus-clinic')">
                                    <i class="fas fa-eye me-1"></i>View Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/fd7e14/ffffff?text=EduTech" class="card-img-top" alt="Business">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0">EduTech Solutions</h5>
                                    <span class="badge bg-secondary">Education</span>
                                </div>
                                <p class="text-muted small mb-2">
                                    <i class="fas fa-map-marker-alt me-1"></i>Boston, MA
                                </p>
                                <p class="card-text">Educational technology platform revolutionizing online learning for students and professionals.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-video me-1"></i>6 interviews
                                        <i class="fas fa-users ms-2 me-1"></i>892 followers
                                    </small>
                                    <div class="text-warning">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="far fa-star"></i>
                                        <small class="text-muted ms-1">4.3</small>
                                    </div>
                                </div>
                                <button class="btn btn-primary w-100" onclick="app.viewBusinessProfile('edutech-solutions')">
                                    <i class="fas fa-eye me-1"></i>View Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="https://via.placeholder.com/300x200/20c997/ffffff?text=Local+Market" class="card-img-top" alt="Business">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0">Local Market Co</h5>
                                    <span class="badge bg-success">Retail</span>
                                </div>
                                <p class="text-muted small mb-2">
                                    <i class="fas fa-map-marker-alt me-1"></i>Denver, CO
                                </p>
                                <p class="card-text">Community marketplace supporting local artisans and sustainable products.</p>
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-video me-1"></i>2 interviews
                                        <i class="fas fa-users ms-2 me-1"></i>334 followers
                                    </small>
                                    <div class="text-warning">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <small class="text-muted ms-1">4.6</small>
                                    </div>
                                </div>
                                <button class="btn btn-primary w-100" onclick="app.viewBusinessProfile('local-market-co')">
                                    <i class="fas fa-eye me-1"></i>View Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="text-center mt-4">
                    <button class="btn btn-outline-primary btn-lg" onclick="app.loadMoreBusinesses()">
                        <i class="fas fa-plus me-2"></i>Load More Businesses
                    </button>
                </div>
            </div>
        `;
    }

    renderLoginPage() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 col-lg-4">
                        <div class="card">
                            <div class="card-body">
                                <h3 class="card-title text-center mb-4">Login</h3>
                                <form onsubmit="app.handleLogin(event)">
                                    <div class="mb-3">
                                        <label for="email" class="form-label">Email</label>
                                        <input type="email" class="form-control" id="email" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="password" class="form-label">Password</label>
                                        <input type="password" class="form-control" id="password" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">Login</button>
                                </form>
                                <div class="text-center mt-3">
                                    <a href="#" onclick="app.navigateTo('register')">Don't have an account? Register</a>
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
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 col-lg-4">
                        <div class="card">
                            <div class="card-body">
                                <h3 class="card-title text-center mb-4">Register</h3>
                                <form onsubmit="app.handleRegister(event)">
                                    <div class="mb-3">
                                        <label for="name" class="form-label">Full Name</label>
                                        <input type="text" class="form-control" id="name" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="email" class="form-label">Email</label>
                                        <input type="email" class="form-control" id="email" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="password" class="form-label">Password</label>
                                        <input type="password" class="form-control" id="password" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">Register</button>
                                </form>
                                <div class="text-center mt-3">
                                    <a href="#" onclick="app.navigateTo('login')">Already have an account? Login</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
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

        return `
            <!-- Hero Banner -->
            <div class="profile-hero-banner position-relative">
                <div class="hero-background" style="background: linear-gradient(135deg, #000000 0%, #FF0000 50%, #000000 100%); height: 300px; position: relative; overflow: hidden;">
                    <div class="hero-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4);"></div>
                    <div class="hero-pattern" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.1"><circle cx="30" cy="30" r="2"/></g></svg>'); opacity: 0.3;"></div>
                </div>

                <div class="container position-relative" style="margin-top: -150px;">
                    <div class="row">
                        <div class="col-12">
                            <div class="profile-header text-center text-white">
                                <div class="profile-avatar-container position-relative d-inline-block mb-3">
                                    <img src="${user.avatar || `https://via.placeholder.com/200x200/000000/FFFFFF?text=${user.name.charAt(0)}`}"
                                         class="border border-4 border-white shadow-lg"
                                         alt="Profile Picture">
                                    <div class="position-absolute bottom-0 end-0">
                                        <span class="badge bg-${user.role === 'admin' ? 'danger' : user.role === 'creator' ? 'warning' : 'primary'} rounded-pill px-3 py-2 fs-6">
                                            <i class="fas fa-${user.role === 'admin' ? 'crown' : user.role === 'creator' ? 'video' : 'user'} me-1"></i>
                                            ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                        </span>
                                    </div>
                                </div>

                                <h1 class="display-5 fw-bold mb-2">${user.name}</h1>
                                ${profileData.bio ? `<p class="lead mb-3">${profileData.bio}</p>` : '<p class="lead mb-3 text-white-50">Welcome to my profile on Interviews.tv</p>'}

                                <div class="profile-meta d-flex justify-content-center align-items-center flex-wrap gap-3 mb-4">
                                    ${profileData.location ? `<span class="text-white-75"><i class="fas fa-map-marker-alt me-1"></i>${profileData.location}</span>` : ''}
                                    ${profileData.company ? `<span class="text-white-75"><i class="fas fa-building me-1"></i>${profileData.company}</span>` : ''}
                                    ${profileData.website ? `<a href="${profileData.website}" target="_blank" class="text-white text-decoration-none"><i class="fas fa-globe me-1"></i>Website</a>` : ''}
                                    <span class="text-white-75"><i class="fas fa-calendar me-1"></i>Joined ${user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {month: 'long', year: 'numeric'}) : 'Recently'}</span>
                                </div>

                                <div class="profile-stats d-flex justify-content-center gap-4 mb-4">
                                    <div class="stat-item text-center">
                                        <div class="stat-number h4 fw-bold mb-0">12</div>
                                        <div class="stat-label small text-white-75">Interviews</div>
                                    </div>
                                    <div class="stat-item text-center">
                                        <div class="stat-number h4 fw-bold mb-0">245</div>
                                        <div class="stat-label small text-white-75">Followers</div>
                                    </div>
                                    <div class="stat-item text-center">
                                        <div class="stat-number h4 fw-bold mb-0">89</div>
                                        <div class="stat-label small text-white-75">Following</div>
                                    </div>
                                    <div class="stat-item text-center">
                                        <div class="stat-number h4 fw-bold mb-0">1.2k</div>
                                        <div class="stat-label small text-white-75">Views</div>
                                    </div>
                                </div>

                                <div class="profile-actions d-flex justify-content-center gap-3">
                                    <button class="btn btn-primary btn-lg px-4" onclick="app.navigateTo('settings')">
                                        <i class="fas fa-edit me-2"></i>Edit Profile
                                    </button>
                                    <button class="btn btn-outline-light btn-lg px-4" onclick="app.navigateTo('create')">
                                        <i class="fas fa-plus me-2"></i>Create Interview
                                    </button>
                                    <button class="btn btn-outline-light btn-lg" onclick="app.shareProfile()">
                                        <i class="fas fa-share me-2"></i>Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="container py-3">
                <div class="row">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">About</h6>
                            </div>
                            <div class="card-body">
                                ${profileData.bio ? `<p class="mb-3">${profileData.bio}</p>` : '<p class="text-muted mb-3">No bio available yet.</p>'}

                                <div class="profile-details">
                                    ${profileData.location ? `<div class="mb-2"><i class="fas fa-map-marker-alt me-2 text-muted"></i>${profileData.location}</div>` : ''}
                                    ${profileData.company ? `<div class="mb-2"><i class="fas fa-building me-2 text-muted"></i>${profileData.company}</div>` : ''}
                                    ${profileData.website ? `<div class="mb-2"><i class="fas fa-globe me-2 text-muted"></i><a href="${profileData.website}" target="_blank" class="text-decoration-none">${profileData.website}</a></div>` : ''}
                                    ${profileData.phone ? `<div class="mb-2"><i class="fas fa-phone me-2 text-muted"></i>${profileData.phone}</div>` : ''}
                                    <div class="mb-2"><i class="fas fa-envelope me-2 text-muted"></i>${user.email}</div>
                                    <div class="mb-0"><i class="fas fa-calendar me-2 text-muted"></i>Joined ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}</div>
                                </div>
                                <div class="d-grid gap-2">
                                    <button class="btn btn-outline-primary" onclick="app.navigateTo('settings')">
                                        <i class="fas fa-cog me-2"></i>Edit Profile
                                    </button>
                                    <button class="btn btn-primary" onclick="app.navigateTo('create')">
                                        <i class="fas fa-plus me-2"></i>Create Interview
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="card mt-4">
                            <div class="card-header">
                                <h6 class="mb-0">Profile Stats</h6>
                            </div>
                            <div class="card-body">
                                <div class="row text-center">
                                    <div class="col-4">
                                        <h5 class="text-primary">12</h5>
                                        <small class="text-muted">Interviews</small>
                                    </div>
                                    <div class="col-4">
                                        <h5 class="text-primary">245</h5>
                                        <small class="text-muted">Followers</small>
                                    </div>
                                    <div class="col-4">
                                        <h5 class="text-primary">89</h5>
                                        <small class="text-muted">Following</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">My Interviews</h5>
                                <button class="btn btn-primary btn-sm" onclick="app.navigateTo('create')">
                                    <i class="fas fa-plus me-1"></i>New Interview
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6 mb-4">
                                        <div class="card">
                                            <img src="https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Interview+1" class="card-img-top" alt="Interview">
                                            <div class="card-body">
                                                <h6 class="card-title">My First Interview</h6>
                                                <p class="card-text small text-muted">Published 2 days ago</p>
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <small class="text-muted">
                                                        <i class="fas fa-eye me-1"></i>1.2k views
                                                        <i class="fas fa-heart ms-2 me-1"></i>45 likes
                                                    </small>
                                                    <div class="btn-group btn-group-sm">
                                                        <button class="btn btn-outline-secondary">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button class="btn btn-outline-danger">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6 mb-4">
                                        <div class="card">
                                            <img src="https://via.placeholder.com/300x200/000000/FFFFFF?text=Interview+2" class="card-img-top" alt="Interview">
                                            <div class="card-body">
                                                <h6 class="card-title">Tech Industry Insights</h6>
                                                <p class="card-text small text-muted">Published 1 week ago</p>
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <small class="text-muted">
                                                        <i class="fas fa-eye me-1"></i>856 views
                                                        <i class="fas fa-heart ms-2 me-1"></i>32 likes
                                                    </small>
                                                    <div class="btn-group btn-group-sm">
                                                        <button class="btn btn-outline-secondary">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button class="btn btn-outline-danger">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="text-center">
                                    <button class="btn btn-outline-primary">
                                        <i class="fas fa-plus me-2"></i>Load More Interviews
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header">
                                <h4 class="mb-0">
                                    <i class="fas fa-video me-2"></i>Create New Interview
                                </h4>
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
                                                     onclick="document.getElementById('videoFile').click()">
                                                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                                                    <h6>Click to upload video file</h6>
                                                    <p class="text-muted mb-0">Supports MP4, MOV, AVI, WebM (Max 500MB)</p>
                                                    <input type="file" id="videoFile" accept="video/*" style="display: none;" onchange="app.handleFileUpload(this, 'video')">
                                                </div>
                                            </div>

                                            <!-- Audio Upload -->
                                            <div id="audioUpload" class="upload-section" style="display: none;">
                                                <div class="upload-area border border-2 border-dashed rounded p-4 text-center mb-3"
                                                     onclick="document.getElementById('audioFile').click()">
                                                    <i class="fas fa-microphone fa-3x text-muted mb-3"></i>
                                                    <h6>Click to upload audio file</h6>
                                                    <p class="text-muted mb-0">Supports MP3, WAV, M4A, AAC (Max 100MB)</p>
                                                    <input type="file" id="audioFile" accept="audio/*" style="display: none;" onchange="app.handleFileUpload(this, 'audio')">
                                                </div>
                                            </div>

                                            <!-- Text Interview -->
                                            <div id="textUpload" class="upload-section" style="display: none;">
                                                <div class="row mb-3">
                                                    <div class="col-md-6">
                                                        <h6>Option 1: Upload Document</h6>
                                                        <div class="upload-area border border-2 border-dashed rounded p-4 text-center mb-3"
                                                             onclick="document.getElementById('textFile').click()">
                                                            <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                                                            <h6>Click to upload document</h6>
                                                            <p class="text-muted mb-0">Supports TXT, PDF, DOC, DOCX (Max 50MB)</p>
                                                            <input type="file" id="textFile" accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                                   style="display: none;" onchange="app.handleFileUpload(this, 'text')">
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <h6>Option 2: Type Content</h6>
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
            <div class="container py-5">
                <div class="row">
                    <div class="col-md-3">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Settings</h6>
                            </div>
                            <div class="list-group list-group-flush" id="settingsNav">
                                <a href="javascript:void(0)" class="list-group-item list-group-item-action ${currentTab === 'profile' ? 'active' : ''}" onclick="app.showSettingsTab('profile'); return false;">
                                    <i class="fas fa-user me-2"></i>Profile
                                </a>
                                <a href="javascript:void(0)" class="list-group-item list-group-item-action ${currentTab === 'account' ? 'active' : ''}" onclick="app.showSettingsTab('account'); return false;">
                                    <i class="fas fa-cog me-2"></i>Account
                                </a>
                                <a href="javascript:void(0)" class="list-group-item list-group-item-action ${currentTab === 'privacy' ? 'active' : ''}" onclick="app.showSettingsTab('privacy'); return false;">
                                    <i class="fas fa-shield-alt me-2"></i>Privacy
                                </a>
                                <a href="javascript:void(0)" class="list-group-item list-group-item-action ${currentTab === 'notifications' ? 'active' : ''}" onclick="app.showSettingsTab('notifications'); return false;">
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
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Profile Settings</h5>
                </div>
                <div class="card-body">
                    <form onsubmit="app.handleUpdateProfile(event)">
                        <!-- Avatar Upload Section -->
                        <div class="text-center mb-4">
                            <div class="position-relative d-inline-block">
                                <img src="${user.avatar || `https://via.placeholder.com/150x150/000000/FFFFFF?text=${user.name.charAt(0)}`}"
                                     class="rounded-circle mb-3" alt="Profile Picture" width="150" height="150" id="avatarPreview">
                                <button type="button" class="btn btn-sm btn-primary position-absolute bottom-0 end-0 rounded-circle"
                                        onclick="document.getElementById('profileAvatar').click()" style="width: 40px; height: 40px;">
                                    <i class="fas fa-camera"></i>
                                </button>
                            </div>
                            <div>
                                <input type="file" class="d-none" id="profileAvatar" accept="image/*" onchange="app.handleAvatarUpload(this)">
                                <div class="form-text">Click the camera icon to upload a new profile picture (JPG, PNG, max 5MB)</div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profileName" class="form-label">Full Name</label>
                                    <input type="text" class="form-control" id="profileName" value="${user.name}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profileEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="profileEmail" value="${user.email}">
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="profileBio" class="form-label">Bio</label>
                            <textarea class="form-control" id="profileBio" rows="3"
                                      placeholder="Tell people about yourself...">${savedData.bio || ''}</textarea>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profileLocation" class="form-label">Location</label>
                                    <input type="text" class="form-control" id="profileLocation"
                                           placeholder="City, Country" value="${savedData.location || ''}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profileWebsite" class="form-label">Website</label>
                                    <input type="url" class="form-control" id="profileWebsite"
                                           placeholder="https://yourwebsite.com" value="${savedData.website || ''}">
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profilePhone" class="form-label">Phone</label>
                                    <input type="tel" class="form-control" id="profilePhone"
                                           placeholder="+1 (555) 123-4567" value="${savedData.phone || ''}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="profileCompany" class="form-label">Company</label>
                                    <input type="text" class="form-control" id="profileCompany"
                                           placeholder="Your company name" value="${savedData.company || ''}">
                                </div>
                            </div>
                        </div>

                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-outline-secondary" onclick="app.navigateTo('profile'); return false;">
                                <i class="fas fa-arrow-left me-1"></i>Back to Profile
                            </button>
                            <button type="submit" class="btn btn-primary">
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
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Account Settings</h5>
                </div>
                <div class="card-body">
                    <form onsubmit="app.handleUpdateAccount(event)">
                        <div class="mb-4">
                            <h6>Change Password</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="currentPassword" class="form-label">Current Password</label>
                                        <input type="password" class="form-control" id="currentPassword">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="newPassword" class="form-label">New Password</label>
                                        <input type="password" class="form-control" id="newPassword">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="confirmPassword" class="form-label">Confirm New Password</label>
                                        <input type="password" class="form-control" id="confirmPassword">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr>

                        <div class="mb-4">
                            <h6>Account Status</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Email Verification</label>
                                        <div class="d-flex align-items-center">
                                            <span class="badge bg-success me-2">Verified</span>
                                            <small class="text-muted">Your email is verified</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Account Type</label>
                                        <div class="d-flex align-items-center">
                                            <span class="badge bg-${user.role === 'admin' ? 'danger' : user.role === 'creator' ? 'warning' : 'primary'} me-2">
                                                ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                            </span>
                                            <small class="text-muted">Your current role</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr>

                        <div class="mb-4">
                            <h6 class="text-danger">Danger Zone</h6>
                            <div class="border border-danger rounded p-3">
                                <div class="mb-3">
                                    <strong>Delete Account</strong>
                                    <p class="text-muted mb-2">Once you delete your account, there is no going back. Please be certain.</p>
                                    <button type="button" class="btn btn-outline-danger" onclick="app.confirmDeleteAccount()">
                                        <i class="fas fa-trash me-1"></i>Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex justify-content-end">
                            <button type="submit" class="btn btn-primary">
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
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Privacy Settings</h5>
                </div>
                <div class="card-body">
                    <form onsubmit="app.handleUpdatePrivacy(event)">
                        <div class="mb-4">
                            <h6>Profile Visibility</h6>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="profileVisibility" id="profilePublic"
                                       value="public" ${savedPrivacy.profileVisibility !== 'private' ? 'checked' : ''}>
                                <label class="form-check-label" for="profilePublic">
                                    <strong>Public</strong> - Anyone can view your profile
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="profileVisibility" id="profilePrivate"
                                       value="private" ${savedPrivacy.profileVisibility === 'private' ? 'checked' : ''}>
                                <label class="form-check-label" for="profilePrivate">
                                    <strong>Private</strong> - Only followers can view your profile
                                </label>
                            </div>
                        </div>

                        <div class="mb-4">
                            <h6>Interview Privacy</h6>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="allowComments"
                                       ${savedPrivacy.allowComments !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="allowComments">
                                    Allow comments on my interviews
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="allowDownloads"
                                       ${savedPrivacy.allowDownloads === true ? 'checked' : ''}>
                                <label class="form-check-label" for="allowDownloads">
                                    Allow downloads of my interviews
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="showInSearch"
                                       ${savedPrivacy.showInSearch !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="showInSearch">
                                    Show my interviews in search results
                                </label>
                            </div>
                        </div>

                        <div class="mb-4">
                            <h6>Contact Preferences</h6>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="allowMessages"
                                       ${savedPrivacy.allowMessages !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="allowMessages">
                                    Allow direct messages from other users
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="allowInterviewRequests"
                                       ${savedPrivacy.allowInterviewRequests !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="allowInterviewRequests">
                                    Allow interview requests from other users
                                </label>
                            </div>
                        </div>

                        <div class="d-flex justify-content-end">
                            <button type="submit" class="btn btn-primary">
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
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Notification Settings</h5>
                </div>
                <div class="card-body">
                    <form onsubmit="app.handleUpdateNotifications(event)">
                        <div class="mb-4">
                            <h6>Email Notifications</h6>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="emailNewFollowers"
                                       ${savedNotifications.emailNewFollowers !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="emailNewFollowers">
                                    New followers
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="emailNewComments"
                                       ${savedNotifications.emailNewComments !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="emailNewComments">
                                    New comments on my interviews
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="emailInterviewRequests"
                                       ${savedNotifications.emailInterviewRequests !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="emailInterviewRequests">
                                    Interview requests
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="emailWeeklyDigest"
                                       ${savedNotifications.emailWeeklyDigest !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="emailWeeklyDigest">
                                    Weekly digest of platform activity
                                </label>
                            </div>
                        </div>

                        <div class="mb-4">
                            <h6>Push Notifications</h6>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="pushNewFollowers"
                                       ${savedNotifications.pushNewFollowers === true ? 'checked' : ''}>
                                <label class="form-check-label" for="pushNewFollowers">
                                    New followers
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="pushNewComments"
                                       ${savedNotifications.pushNewComments === true ? 'checked' : ''}>
                                <label class="form-check-label" for="pushNewComments">
                                    New comments on my interviews
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="pushInterviewRequests"
                                       ${savedNotifications.pushInterviewRequests === true ? 'checked' : ''}>
                                <label class="form-check-label" for="pushInterviewRequests">
                                    Interview requests
                                </label>
                            </div>
                        </div>

                        <div class="mb-4">
                            <h6>In-App Notifications</h6>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="inAppAll"
                                       ${savedNotifications.inAppAll !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="inAppAll">
                                    Show all in-app notifications
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="inAppSound"
                                       ${savedNotifications.inAppSound === true ? 'checked' : ''}>
                                <label class="form-check-label" for="inAppSound">
                                    Play sound for notifications
                                </label>
                            </div>
                        </div>

                        <div class="d-flex justify-content-end">
                            <button type="submit" class="btn btn-primary">
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
            <footer class="footer">
                <div class="container">
                    <div class="row">
                        <div class="col-md-6">
                            <h5 class="footer-brand">Interviews.tv</h5>
                            <p class="text-muted">Connecting stories, one interview at a time.</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Quick Links</h6>
                            <ul class="list-unstyled">
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('home')">Home</a></li>
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('explore')">Explore</a></li>
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('gallery')">Gallery</a></li>
                                <li><a href="#" class="footer-link" onclick="app.navigateTo('business')">Business</a></li>
                            </ul>
                        </div>
                    </div>
                    <hr class="my-4">
                    <div class="text-center">
                        <p class="mb-0">&copy; 2025 Interviews.tv. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        `;
    }

    navigateTo(page) {
        console.log('Navigating to:', page);
        this.currentPage = page;
        this.render();

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

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;

        try {
            // Make API call to login endpoint
            const response = await fetch('http://localhost:8001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store authentication data
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_data', JSON.stringify(data.user));

                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.navigateTo('home');
                alert(`Welcome ${data.user.name || data.user.email}! Login successful.`);
            } else {
                alert(data.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Unable to connect to server. Please ensure the API server is running on port 8001.');
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleRegister(event) {
        event.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

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
            const response = await fetch('http://localhost:8001/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert(`Welcome ${name}! Registration successful. Please check your email for verification.`);
                this.navigateTo('login');
            } else {
                alert(data.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Unable to connect to server. Please ensure the API server is running on port 8001.');
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

        return `
            <!-- Business Hero Banner -->
            <div class="business-hero-banner position-relative">
                <div class="hero-background" style="background: linear-gradient(135deg, #${categoryColor} 0%, #000000 50%, #${categoryColor} 100%); height: 350px; position: relative; overflow: hidden;">
                    <div class="hero-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5);"></div>
                    <div class="hero-pattern" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: url('data:image/svg+xml,<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.1"><rect width="2" height="2"/></g></svg>'); opacity: 0.3;"></div>
                </div>

                <div class="container position-relative" style="margin-top: -175px;">
                    <div class="row">
                        <div class="col-12">
                            <div class="business-header text-center text-white">
                                <div class="business-logo-container position-relative d-inline-block mb-3">
                                    <div class="business-logo bg-white rounded-3 shadow-lg p-4 d-inline-block" style="width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; border-radius: 1rem !important;">
                                        <div class="text-center">
                                            <i class="fas fa-${this.getIconForCategory(business.category)} fa-4x mb-2" style="color: #${categoryColor};"></i>
                                            <div class="fw-bold" style="color: #${categoryColor}; font-size: 0.9rem;">${business.name}</div>
                                        </div>
                                    </div>
                                    <div class="position-absolute bottom-0 end-0">
                                        <span class="badge bg-${this.getBadgeColorForCategory(business.category)} rounded-pill px-3 py-2 fs-6">
                                            ${business.category}
                                        </span>
                                    </div>
                                </div>

                                <h1 class="display-5 fw-bold mb-2">${business.name}</h1>
                                <p class="lead mb-3">${business.description}</p>

                                <div class="business-meta d-flex justify-content-center align-items-center flex-wrap gap-3 mb-4">
                                    <span class="text-white-75"><i class="fas fa-map-marker-alt me-1"></i>${business.location}</span>
                                    <span class="text-white-75"><i class="fas fa-calendar me-1"></i>Founded ${business.founded}</span>
                                    <span class="text-white-75"><i class="fas fa-users me-1"></i>${business.employees} employees</span>
                                    <div class="text-warning">
                                        ${this.renderStars(business.rating)}
                                        <span class="text-white ms-1">${business.rating}</span>
                                    </div>
                                </div>

                                <div class="business-stats d-flex justify-content-center gap-4 mb-4">
                                    <div class="stat-item text-center">
                                        <div class="stat-number h4 fw-bold mb-0">${business.interviews}</div>
                                        <div class="stat-label small text-white-75">Interviews</div>
                                    </div>
                                    <div class="stat-item text-center">
                                        <div class="stat-number h4 fw-bold mb-0">${business.followers}</div>
                                        <div class="stat-label small text-white-75">Followers</div>
                                    </div>
                                    <div class="stat-item text-center">
                                        <div class="stat-number h4 fw-bold mb-0">${business.rating}</div>
                                        <div class="stat-label small text-white-75">Rating</div>
                                    </div>
                                    <div class="stat-item text-center">
                                        <div class="stat-number h4 fw-bold mb-0">2.5k</div>
                                        <div class="stat-label small text-white-75">Views</div>
                                    </div>
                                </div>

                                <div class="business-actions d-flex justify-content-center gap-3">
                                    <button class="btn btn-primary btn-lg px-4" onclick="app.followBusiness('${businessId}')">
                                        <i class="fas fa-plus me-2"></i>Follow Business
                                    </button>
                                    <button class="btn btn-outline-light btn-lg px-4" onclick="app.contactBusiness('${businessId}')">
                                        <i class="fas fa-envelope me-2"></i>Contact
                                    </button>
                                    ${this.isAuthenticated ? `
                                        <button class="btn btn-outline-light btn-lg px-4" onclick="app.requestInterview('${businessId}')">
                                            <i class="fas fa-microphone me-2"></i>Interview
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-outline-light btn-lg" onclick="app.shareBusiness('${businessId}')">
                                        <i class="fas fa-share me-2"></i>Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="container py-3">
                <div class="row">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Business Information</h6>
                            </div>
                            <div class="card-body">
                                <div class="text-center mb-3">
                                    <div class="text-warning mb-2">
                                        ${this.renderStars(business.rating)}
                                        <span class="text-muted ms-1">${business.rating}</span>
                                    </div>
                                </div>
                                <div class="row text-center mb-3">
                                    <div class="col-4">
                                        <h6 class="text-primary">${business.interviews}</h6>
                                        <small class="text-muted">Interviews</small>
                                    </div>
                                    <div class="col-4">
                                        <h6 class="text-primary">${business.followers}</h6>
                                        <small class="text-muted">Followers</small>
                                    </div>
                                    <div class="col-4">
                                        <h6 class="text-primary">${business.rating}</h6>
                                        <small class="text-muted">Rating</small>
                                    </div>
                                </div>
                                <div class="d-grid gap-2">
                                    <button class="btn btn-primary" onclick="app.followBusiness('${businessId}')">
                                        <i class="fas fa-plus me-1"></i>Follow Business
                                    </button>
                                    <button class="btn btn-outline-secondary" onclick="app.contactBusiness('${businessId}')">
                                        <i class="fas fa-envelope me-1"></i>Contact
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="card mt-4">
                            <div class="card-header">
                                <h6 class="mb-0">Business Information</h6>
                            </div>
                            <div class="card-body">
                                <div class="mb-2">
                                    <strong>Founded:</strong> ${business.founded}
                                </div>
                                <div class="mb-2">
                                    <strong>Employees:</strong> ${business.employees}
                                </div>
                                <div class="mb-2">
                                    <strong>Website:</strong>
                                    <a href="${business.website}" target="_blank" class="text-decoration-none">
                                        ${business.website}
                                    </a>
                                </div>
                                <div class="mb-2">
                                    <strong>Email:</strong>
                                    <a href="mailto:${business.email}" class="text-decoration-none">
                                        ${business.email}
                                    </a>
                                </div>
                                <div class="mb-0">
                                    <strong>Phone:</strong>
                                    <a href="tel:${business.phone}" class="text-decoration-none">
                                        ${business.phone}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">About ${business.name}</h5>
                            </div>
                            <div class="card-body">
                                <p>${business.description}</p>
                                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                            </div>
                        </div>

                        <div class="card mt-4">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Interviews</h5>
                                ${this.isAuthenticated ? `
                                    <button class="btn btn-primary btn-sm" onclick="app.requestInterview('${businessId}')">
                                        <i class="fas fa-microphone me-1"></i>Request Interview
                                    </button>
                                ` : ''}
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <div class="card">
                                            <img src="https://via.placeholder.com/300x200/FF0000/FFFFFF?text=CEO+Interview" class="card-img-top" alt="Interview">
                                            <div class="card-body">
                                                <h6 class="card-title">CEO Vision & Strategy</h6>
                                                <p class="card-text small">Discussing the future of technology and innovation.</p>
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <small class="text-muted">2 days ago</small>
                                                    <button class="btn btn-sm btn-primary">Watch</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <div class="card">
                                            <img src="https://via.placeholder.com/300x200/000000/FFFFFF?text=Team+Culture" class="card-img-top" alt="Interview">
                                            <div class="card-body">
                                                <h6 class="card-title">Building Team Culture</h6>
                                                <p class="card-text small">How we create an inclusive work environment.</p>
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <small class="text-muted">1 week ago</small>
                                                    <button class="btn btn-sm btn-primary">Watch</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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
        alert('Add Business Modal\n\nIn a full implementation, this would open a modal form to add a new business to the directory.');
    }

    followBusiness(businessId) {
        alert(`Following business: ${businessId}\n\nIn a full implementation, this would add the business to your followed list and send notifications about new interviews.`);
    }

    contactBusiness(businessId) {
        alert(`Contact business: ${businessId}\n\nIn a full implementation, this would open a contact form or redirect to the business contact page.`);
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

        // Save profile data
        const profileData = {
            bio, location, website, phone, company
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
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.app = new InterviewsApp();
    app.init();
});
