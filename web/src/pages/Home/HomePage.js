import Auth from '../../services/auth.js';

class HomePage {
    constructor() {
        this.interviews = [];
        this.loading = false;
    }

    async render(container, props = {}) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
    }

    getHTML() {
        const isAuthenticated = Auth.isAuthenticated();
        
        return `
            <div class="homepage">
                ${this.getHeroSection(isAuthenticated)}
                ${this.getFeaturesSection()}
                ${this.getCallToActionSection(isAuthenticated)}
            </div>
        `;
    }

    getHeroSection(isAuthenticated) {
        return `
            <section class="hero">
                <div class="container">
                    <div class="row align-items-center">
                        <div class="col-lg-6">
                            <h1 class="hero-title">
                                Join the Ultimate <span class="accent">Interview</span> Network
                            </h1>
                            <p class="hero-subtitle">
                                Create, share, discover, and engage with interviews from artists, musicians, 
                                politicians, business owners, and everyday people sharing their stories.
                            </p>
                            <div class="hero-actions">
                                ${isAuthenticated ? `
                                    <a href="/explore" class="btn btn-primary btn-lg me-3">Explore Interviews</a>
                                    <a href="/create" class="btn btn-outline-light btn-lg">Create Interview</a>
                                ` : `
                                    <a href="/register" class="btn btn-primary btn-lg me-3">Get Started</a>
                                    <a href="/explore" class="btn btn-outline-light btn-lg">Explore</a>
                                `}
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="hero-image text-center">
                                <div class="hero-placeholder bg-light rounded shadow-lg d-flex align-items-center justify-content-center" style="height: 400px;">
                                    <div class="text-center">
                                        <i class="fas fa-video fa-5x text-primary mb-3"></i>
                                        <h4>Interview Platform</h4>
                                        <p class="text-muted">Connect through meaningful conversations</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    getFeaturesSection() {
        return `
            <section class="py-5">
                <div class="container">
                    <div class="row text-center mb-5">
                        <div class="col-lg-8 mx-auto">
                            <h2 class="display-5 fw-bold">Connect with Stories</h2>
                            <p class="lead text-muted">
                                Discover meaningful conversations and share your own story with the world
                            </p>
                        </div>
                    </div>
                    
                    <div class="row g-4">
                        <div class="col-md-4">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body text-center p-4">
                                    <div class="feature-icon mb-3">
                                        <i class="fas fa-video fa-3x text-primary"></i>
                                    </div>
                                    <h5 class="card-title">Create & Share</h5>
                                    <p class="card-text">
                                        Record video, audio, or text interviews and share them with your audience. 
                                        Build your personal brand through authentic conversations.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body text-center p-4">
                                    <div class="feature-icon mb-3">
                                        <i class="fas fa-search fa-3x text-primary"></i>
                                    </div>
                                    <h5 class="card-title">Discover</h5>
                                    <p class="card-text">
                                        Explore interviews by category, trending topics, or search for specific 
                                        people and subjects that interest you most.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body text-center p-4">
                                    <div class="feature-icon mb-3">
                                        <i class="fas fa-users fa-3x text-primary"></i>
                                    </div>
                                    <h5 class="card-title">Connect</h5>
                                    <p class="card-text">
                                        Follow your favorite interviewers and interviewees, join communities, 
                                        and engage with content through likes and comments.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    getCallToActionSection(isAuthenticated) {
        if (isAuthenticated) return '';
        
        return `
            <section class="py-5 bg-light">
                <div class="container">
                    <div class="row justify-content-center text-center">
                        <div class="col-lg-8">
                            <h2 class="display-6 fw-bold mb-4">Ready to Share Your Story?</h2>
                            <p class="lead mb-4">
                                Join thousands of creators who are building meaningful connections 
                                through authentic interviews and conversations.
                            </p>
                            <a href="/register" class="btn btn-primary btn-lg">Sign Up Now</a>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    setupEventListeners(container) {
        // Handle CTA button clicks
        const ctaButtons = container.querySelectorAll('a[href^="/"]');
        ctaButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const href = button.getAttribute('href');
                // Router will be handled by the global navigation handler
                window.history.pushState({}, '', href);
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
        });
    }
}

export default HomePage;
