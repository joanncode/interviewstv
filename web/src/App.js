import Router from './utils/router.js';
import Auth from './services/auth.js';
import Navigation from './components/Navigation.js';

class App {
    constructor() {
        this.container = document.getElementById('app');
        this.currentPage = null;
        this.navigation = new Navigation();
    }

    init() {
        this.render();
        this.setupEventListeners();
        
        // Initialize authentication
        Auth.init();
        
        // Start token refresh if authenticated
        if (Auth.isAuthenticated()) {
            Auth.startTokenRefresh();
        }
        
        // Initialize router
        Router.init();
    }

    render() {
        this.container.innerHTML = `
            <div class="d-flex flex-column min-vh-100">
                <div id="navigation"></div>
                <main id="main-content" class="flex-grow-1">
                    <!-- Page content will be rendered here -->
                </main>
                <footer id="footer"></footer>
            </div>
        `;

        // Render navigation
        this.navigation.render(document.getElementById('navigation'));

        // Render footer
        this.renderFooter();
    }

    renderFooter() {
        const footer = document.getElementById('footer');
        footer.innerHTML = `
            <footer class="footer mt-5">
                <div class="container">
                    <div class="row">
                        <div class="col-md-4 mb-4">
                            <h5 class="footer-brand">Interviews.tv</h5>
                            <p class="text-muted">Join the Ultimate Interview Network. Create, share, discover, and engage with interviews.</p>
                        </div>
                        <div class="col-md-2 mb-4">
                            <h6>Platform</h6>
                            <ul class="list-unstyled">
                                <li><a href="/explore" class="footer-link">Explore</a></li>
                                <li><a href="/trending" class="footer-link">Trending</a></li>
                                <li><a href="/categories" class="footer-link">Categories</a></li>
                                <li><a href="/create" class="footer-link">Create</a></li>
                            </ul>
                        </div>
                        <div class="col-md-2 mb-4">
                            <h6>Community</h6>
                            <ul class="list-unstyled">
                                <li><a href="/events" class="footer-link">Events</a></li>
                                <li><a href="/business" class="footer-link">Businesses</a></li>
                                <li><a href="/communities" class="footer-link">Communities</a></li>
                            </ul>
                        </div>
                        <div class="col-md-2 mb-4">
                            <h6>Support</h6>
                            <ul class="list-unstyled">
                                <li><a href="/help" class="footer-link">Help Center</a></li>
                                <li><a href="/about" class="footer-link">About</a></li>
                                <li><a href="/contact" class="footer-link">Contact</a></li>
                            </ul>
                        </div>
                        <div class="col-md-2 mb-4">
                            <h6>Legal</h6>
                            <ul class="list-unstyled">
                                <li><a href="/terms" class="footer-link">Terms</a></li>
                                <li><a href="/privacy" class="footer-link">Privacy</a></li>
                                <li><a href="/cookies" class="footer-link">Cookies</a></li>
                            </ul>
                        </div>
                    </div>
                    <hr class="my-4" style="border-color: var(--gray-700);">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <p class="text-muted mb-0">&copy; 2025 Interviews.tv. All rights reserved.</p>
                        </div>
                        <div class="col-md-6 text-md-end">
                            <p class="text-muted mb-0">Made with ❤️ for meaningful conversations</p>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }

    setupEventListeners() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            Router.handleRoute(window.location.pathname);
        });

        // Handle auth state changes
        document.addEventListener('authStateChanged', (e) => {
            const { authenticated, user } = e.detail;
            
            // Update navigation
            this.navigation.user = user;
            this.navigation.render(document.getElementById('navigation'));
            
            // Start/stop token refresh
            if (authenticated) {
                Auth.startTokenRefresh();
            }
        });

        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showGlobalError('An unexpected error occurred. Please refresh the page.');
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showGlobalError('A network error occurred. Please check your connection.');
        });

        // Handle network status
        window.addEventListener('online', () => {
            this.hideGlobalError();
        });

        window.addEventListener('offline', () => {
            this.showGlobalError('You are currently offline. Some features may not work.');
        });
    }

    showGlobalError(message) {
        // Remove existing error
        this.hideGlobalError();
        
        const errorBar = document.createElement('div');
        errorBar.id = 'global-error';
        errorBar.className = 'alert alert-danger alert-dismissible fade show position-fixed w-100';
        errorBar.style.cssText = 'top: 0; left: 0; z-index: 9999; border-radius: 0; margin: 0;';
        errorBar.innerHTML = `
            <div class="container">
                <div class="d-flex align-items-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <span>${message}</span>
                    <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.parentElement.remove()"></button>
                </div>
            </div>
        `;
        
        document.body.insertBefore(errorBar, document.body.firstChild);
    }

    hideGlobalError() {
        const errorBar = document.getElementById('global-error');
        if (errorBar) {
            errorBar.remove();
        }
    }

    setCurrentPage(page) {
        this.currentPage = page;
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

export default new App();
