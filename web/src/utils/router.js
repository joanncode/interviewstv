// Import page components
import HomePage from '../pages/Home/HomePage.js';
import LoginPage from '../pages/Auth/LoginPage.js';
import RegisterPage from '../pages/Auth/RegisterPage.js';
import ExplorePage from '../pages/Explore/ExplorePage.js';
import NotFoundPage from '../pages/NotFound/NotFoundPage.js';

class Router {
    constructor() {
        this.routes = [];
        this.currentPage = null;
        this.setupRoutes();
    }

    setupRoutes() {
        // Define all routes
        this.routes = [
            { path: '/', component: HomePage, title: 'Home - Interviews.tv' },
            { path: '/login', component: LoginPage, title: 'Login - Interviews.tv' },
            { path: '/register', component: RegisterPage, title: 'Sign Up - Interviews.tv' },
            { path: '/explore', component: ExplorePage, title: 'Explore - Interviews.tv' },
            { path: '/trending', component: ExplorePage, title: 'Trending - Interviews.tv', props: { filter: 'trending' } },
            { path: '/categories', component: ExplorePage, title: 'Categories - Interviews.tv', props: { filter: 'categories' } }
        ];
    }

    init() {
        // Handle initial route
        this.handleRoute(window.location.pathname + window.location.search);
    }

    navigate(path) {
        // Update browser history
        window.history.pushState({}, '', path);
        
        // Handle the route
        this.handleRoute(path);
    }

    async handleRoute(path) {
        // Parse path and query parameters
        const [pathname, search] = path.split('?');
        const queryParams = this.parseQueryParams(search);
        
        // Find matching route
        const route = this.findRoute(pathname);
        
        if (!route) {
            this.renderNotFound();
            return;
        }

        // Check authentication requirements
        if (route.requireAuth && !this.isAuthenticated()) {
            this.navigate('/login?redirect=' + encodeURIComponent(path));
            return;
        }

        // Extract route parameters
        const params = this.extractParams(route.path, pathname);
        
        try {
            // Update page title
            document.title = route.title;
            
            // Render the page
            await this.renderPage(route, params, queryParams);
            
        } catch (error) {
            console.error('Route handling error:', error);
            this.renderError();
        }
    }

    findRoute(pathname) {
        return this.routes.find(route => {
            const pattern = this.pathToRegex(route.path);
            return pattern.test(pathname);
        });
    }

    pathToRegex(path) {
        // Convert path pattern to regex
        const pattern = path
            .replace(/\//g, '\\/')
            .replace(/:\w+/g, '([^/]+)');
        
        return new RegExp(`^${pattern}$`);
    }

    extractParams(routePath, actualPath) {
        const routeParts = routePath.split('/');
        const actualParts = actualPath.split('/');
        const params = {};

        routeParts.forEach((part, index) => {
            if (part.startsWith(':')) {
                const paramName = part.slice(1);
                params[paramName] = actualParts[index];
            }
        });

        return params;
    }

    parseQueryParams(search) {
        if (!search) return {};
        
        const params = {};
        const pairs = search.split('&');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });
        
        return params;
    }

    async renderPage(route, params, queryParams) {
        const container = document.getElementById('main-content');
        
        // Show loading state
        container.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;

        try {
            // Create page instance
            const PageComponent = route.component;
            const page = new PageComponent();
            
            // Render the page
            const props = { ...route.props, params, queryParams };
            await page.render(container, props);
            
            this.currentPage = page;
            
        } catch (error) {
            console.error('Page rendering error:', error);
            this.renderError(container);
        }
    }

    renderNotFound() {
        const container = document.getElementById('main-content');
        const notFoundPage = new NotFoundPage();
        notFoundPage.render(container);
        document.title = '404 - Page Not Found - Interviews.tv';
    }

    renderError(container = null) {
        if (!container) {
            container = document.getElementById('main-content');
        }
        
        container.innerHTML = `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 text-center">
                        <h1 class="display-4 text-danger">Oops!</h1>
                        <p class="lead">Something went wrong. Please try again.</p>
                        <a href="/" class="btn btn-primary">Go Home</a>
                    </div>
                </div>
            </div>
        `;
        document.title = 'Error - Interviews.tv';
    }

    isAuthenticated() {
        // Import Auth service dynamically to avoid circular dependency
        return localStorage.getItem('auth_token') !== null;
    }

    getCurrentPage() {
        return this.currentPage;
    }

    // Utility method to build URLs with query parameters
    buildUrl(path, params = {}) {
        const url = new URL(path, window.location.origin);
        
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.set(key, params[key]);
            }
        });
        
        return url.pathname + url.search;
    }
}

export default new Router();
