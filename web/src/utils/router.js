// Import page components
import HomePage from '../pages/Home/HomePage.js';
import LoginPage from '../pages/Auth/LoginPage.js';
import RegisterPage from '../pages/Auth/RegisterPage.js';
import EmailVerificationPage from '../pages/Auth/EmailVerificationPage.js';
import ContentManagementPage from '../pages/Admin/ContentManagementPage.js';
import SecurityDashboardPage from '../pages/Admin/SecurityDashboardPage.js';
import InterviewsManagementPage from '../pages/Admin/InterviewsManagementPage.js';
import NotFoundPage from '../pages/Error/NotFoundPage.js';
import ForbiddenPage from '../pages/Error/ForbiddenPage.js';
import ServerErrorPage from '../pages/Error/ServerErrorPage.js';
import ExplorePage from '../pages/Explore/ExplorePage.js';
import ProfilePage from '../pages/Profile/ProfilePage.js';
import EditProfilePage from '../pages/Profile/EditProfilePage.js';
import InterviewListPage from '../pages/Interview/InterviewListPage.js';
import InterviewViewPage from '../pages/Interview/InterviewViewPage.js';
import InterviewCreatePage from '../pages/Interview/InterviewCreatePage.js';
import InterviewEditPage from '../pages/Interview/InterviewEditPage.js';
import InterviewManagePage from '../pages/Interview/InterviewManagePage.js';
import InterviewDiscoveryPage from '../pages/Interview/InterviewDiscoveryPage.js';
import GalleryListPage from '../pages/Gallery/GalleryListPage.js';
import GalleryViewPage from '../pages/Gallery/GalleryViewPage.js';
import GalleryCreatePage from '../pages/Gallery/GalleryCreatePage.js';
import GalleryEditPage from '../pages/Gallery/GalleryEditPage.js';
import PersonalFeedPage from '../pages/Feed/PersonalFeedPage.js';
import DiscoveryPage from '../pages/Discovery/DiscoveryPage.js';
import BusinessDirectoryPage from '../pages/Business/BusinessDirectoryPage.js';
import BusinessProfilePage from '../pages/Business/BusinessProfilePage.js';
import BusinessCreatePage from '../pages/Business/BusinessCreatePage.js';
import BusinessManagePage from '../pages/Business/BusinessManagePage.js';
import EventsDirectoryPage from '../pages/Events/EventsDirectoryPage.js';
import EventProfilePage from '../pages/Events/EventProfilePage.js';
import EventCreatePage from '../pages/Events/EventCreatePage.js';
import SearchResultsPage from '../pages/Search/SearchResultsPage.js';
import DiscoverPage from '../pages/Discover/DiscoverPage.js';
import NotificationsPage from '../pages/Notifications/NotificationsPage.js';
import ActivityFeedPage from '../pages/Feed/ActivityFeedPage.js';
import NotFoundPage from '../pages/NotFound/NotFoundPage.js';

class Router {
    constructor() {
        this.routes = [];
        this.currentPage = null;
        this.currentRoute = null;
        this.isNavigating = false;
        this.beforeNavigateCallbacks = [];
        this.afterNavigateCallbacks = [];
        this.notFoundHandler = null;
        this.errorHandler = null;
        this.routeCache = new Map();
        this.routeAnalytics = new Map();
        this.preloadedComponents = new Map();
        this.setupRoutes();
        this.setupErrorHandlers();
    }

    setupRoutes() {
        // Define all routes
        this.routes = [
            { path: '/', component: HomePage, title: 'Home - Interviews.tv' },
            { path: '/feed', component: PersonalFeedPage, title: 'Your Feed - Interviews.tv', requireAuth: true },
            { path: '/login', component: LoginPage, title: 'Login - Interviews.tv' },
            { path: '/register', component: RegisterPage, title: 'Sign Up - Interviews.tv' },
            { path: '/verify-email', component: EmailVerificationPage, title: 'Verify Email - Interviews.tv' },
            { path: '/admin/content', component: ContentManagementPage, title: 'Content Management - Interviews.tv', requiresAuth: true },
            { path: '/admin/interviews', component: InterviewsManagementPage, title: 'Interviews Management - Interviews.tv', requiresAuth: true },
            { path: '/admin/security', component: SecurityDashboardPage, title: 'Security Dashboard - Interviews.tv', requiresAuth: true },

            // Error pages
            { path: '/404', component: NotFoundPage, title: 'Page Not Found - Interviews.tv' },
            { path: '/403', component: ForbiddenPage, title: 'Access Forbidden - Interviews.tv' },
            { path: '/500', component: ServerErrorPage, title: 'Server Error - Interviews.tv' },
            { path: '/explore', component: DiscoveryPage, title: 'Discover - Interviews.tv' },
            { path: '/discover', component: DiscoveryPage, title: 'Discover - Interviews.tv' },
            { path: '/trending', component: ExplorePage, title: 'Trending - Interviews.tv', props: { filter: 'trending' } },
            { path: '/categories', component: ExplorePage, title: 'Categories - Interviews.tv', props: { filter: 'categories' } },
            { path: '/interviews', component: InterviewListPage, title: 'Interviews - Interviews.tv' },
            { path: '/interviews/discover', component: InterviewDiscoveryPage, title: 'Discover Interviews - Interviews.tv' },
            { path: '/interviews/create', component: InterviewCreatePage, title: 'Create Interview - Interviews.tv', requireAuth: true },
            { path: '/interviews/manage', component: InterviewManagePage, title: 'Manage Interviews - Interviews.tv', requireAuth: true },
            { path: '/interviews/:id', component: InterviewViewPage, title: 'Interview - Interviews.tv' },
            { path: '/interviews/:id/edit', component: InterviewEditPage, title: 'Edit Interview - Interviews.tv', requireAuth: true },
            { path: '/gallery', component: GalleryListPage, title: 'Galleries - Interviews.tv' },
            { path: '/gallery/create', component: GalleryCreatePage, title: 'Create Gallery - Interviews.tv', requireAuth: true },
            { path: '/gallery/:id', component: GalleryViewPage, title: 'Gallery - Interviews.tv' },
            { path: '/gallery/:id/edit', component: GalleryEditPage, title: 'Edit Gallery - Interviews.tv', requireAuth: true },
            { path: '/business', component: BusinessDirectoryPage, title: 'Business Directory - Interviews.tv' },
            { path: '/business/create', component: BusinessCreatePage, title: 'Add Business - Interviews.tv', requireAuth: true },
            { path: '/business/:id/manage', component: BusinessManagePage, title: 'Manage Business - Interviews.tv', requireAuth: true },
            { path: '/business/:id', component: BusinessProfilePage, title: 'Business Profile - Interviews.tv' },
            { path: '/events', component: EventsDirectoryPage, title: 'Events Directory - Interviews.tv' },
            { path: '/events/create', component: EventCreatePage, title: 'Create Event - Interviews.tv', requireAuth: true },
            { path: '/events/:id', component: EventProfilePage, title: 'Event - Interviews.tv' },
            { path: '/search', component: SearchResultsPage, title: 'Search - Interviews.tv' },
            { path: '/discover', component: DiscoverPage, title: 'Discover Users - Interviews.tv' },
            { path: '/notifications', component: NotificationsPage, title: 'Notifications - Interviews.tv', requireAuth: true },
            { path: '/feed', component: ActivityFeedPage, title: 'Activity Feed - Interviews.tv' },
            { path: '/profile/:username', component: ProfilePage, title: 'Profile - Interviews.tv' },
            { path: '/profile/:username/edit', component: EditProfilePage, title: 'Edit Profile - Interviews.tv', requireAuth: true }
        ];
    }

    setupErrorHandlers() {
        // Set up global error handlers
        this.notFoundHandler = () => {
            this.navigateToError('404');
        };

        this.errorHandler = (error) => {
            console.error('Router error:', error);
            this.navigateToError('500', { error });
        };

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.errorHandler(event.reason);
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('JavaScript error:', event.error);
            this.errorHandler(event.error);
        });
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

    // Enhanced routing methods

    /**
     * Navigate to error page
     */
    navigateToError(errorType, data = {}) {
        const errorPages = {
            '404': NotFoundPage,
            '403': ForbiddenPage,
            '500': ServerErrorPage
        };

        const ErrorPageClass = errorPages[errorType] || NotFoundPage;
        const container = document.getElementById('main-content') || document.getElementById('app');

        if (container) {
            const errorPage = new ErrorPageClass();
            errorPage.render(container, data);
        }

        // Update URL for error pages
        if (window.location.pathname !== `/${errorType}`) {
            window.history.replaceState({}, '', `/${errorType}`);
        }
    }

    /**
     * Normalize path (remove trailing slashes, etc.)
     */
    normalizePath(path) {
        // Remove trailing slash except for root
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        // Ensure path starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        return path;
    }

    /**
     * Check for URL redirects
     */
    checkRedirects(path) {
        const redirects = {
            '/user': '/profile',
            '/admin/dashboard': '/admin',
            '/admin/content-management': '/admin/content',
            '/admin/security-dashboard': '/admin/security'
        };

        return redirects[path] || null;
    }

    /**
     * Check if user has required role
     */
    hasRequiredRole(user, requiredRole) {
        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(user.role);
        }
        return user.role === requiredRole;
    }

    /**
     * Update page meta tags
     */
    updatePageMeta(route, path) {
        // Update title
        if (route.title) {
            document.title = route.title;
        }

        // Update meta description
        if (route.description) {
            this.updateMetaTag('description', route.description);
        }

        // Update Open Graph tags
        if (route.ogTitle) {
            this.updateMetaTag('og:title', route.ogTitle, 'property');
        }
        if (route.ogDescription) {
            this.updateMetaTag('og:description', route.ogDescription, 'property');
        }
        if (route.ogImage) {
            this.updateMetaTag('og:image', route.ogImage, 'property');
        }

        // Update canonical URL
        this.updateCanonicalUrl(path);
    }

    /**
     * Update meta tag
     */
    updateMetaTag(name, content, attribute = 'name') {
        let meta = document.querySelector(`meta[${attribute}="${name}"]`);

        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attribute, name);
            document.head.appendChild(meta);
        }

        meta.setAttribute('content', content);
    }

    /**
     * Update canonical URL
     */
    updateCanonicalUrl(path) {
        let canonical = document.querySelector('link[rel="canonical"]');

        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }

        canonical.setAttribute('href', window.location.origin + path);
    }

    /**
     * Get cache key for route
     */
    getCacheKey(path, params) {
        return path + JSON.stringify(params);
    }

    /**
     * Record route analytics
     */
    recordRouteAnalytics(path, status, loadTime, error = null) {
        const analytics = {
            path,
            status,
            loadTime,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            referrer: document.referrer
        };

        if (error) {
            analytics.error = {
                message: error.message,
                stack: error.stack
            };
        }

        // Store in analytics map
        if (!this.routeAnalytics.has(path)) {
            this.routeAnalytics.set(path, []);
        }

        this.routeAnalytics.get(path).push(analytics);

        // Send to analytics service if available
        if (window.gtag) {
            window.gtag('event', 'page_view', {
                page_path: path,
                page_title: document.title,
                custom_map: {
                    load_time: loadTime,
                    status: status
                }
            });
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('Route Analytics:', analytics);
        }
    }

    /**
     * Preload related routes
     */
    async preloadRelatedRoutes(currentRoute) {
        // Define related routes based on current route
        const relatedRoutes = this.getRelatedRoutes(currentRoute);

        for (const routePath of relatedRoutes) {
            if (!this.preloadedComponents.has(routePath)) {
                try {
                    const route = this.findRoute(routePath);
                    if (route && route.component) {
                        // Preload component
                        const component = new route.component();
                        this.preloadedComponents.set(routePath, component);
                    }
                } catch (error) {
                    console.warn('Failed to preload route:', routePath, error);
                }
            }
        }
    }

    /**
     * Get related routes for preloading
     */
    getRelatedRoutes(currentRoute) {
        const relatedRoutes = [];

        // Add common navigation routes
        if (currentRoute.path !== '/') {
            relatedRoutes.push('/');
        }

        if (currentRoute.path !== '/explore') {
            relatedRoutes.push('/explore');
        }

        // Add contextual routes based on current route
        if (currentRoute.path.startsWith('/profile/')) {
            relatedRoutes.push('/settings');
        }

        if (currentRoute.path.startsWith('/interviews/')) {
            relatedRoutes.push('/interviews');
        }

        return relatedRoutes;
    }

    /**
     * Get route analytics
     */
    getRouteAnalytics(path = null) {
        if (path) {
            return this.routeAnalytics.get(path) || [];
        }

        return Object.fromEntries(this.routeAnalytics);
    }

    /**
     * Clear route cache
     */
    clearCache(path = null) {
        if (path) {
            // Clear specific route cache
            for (const [key] of this.routeCache) {
                if (key.startsWith(path)) {
                    this.routeCache.delete(key);
                }
            }
        } else {
            // Clear all cache
            this.routeCache.clear();
        }
    }

    /**
     * Add navigation callbacks
     */
    beforeNavigate(callback) {
        this.beforeNavigateCallbacks.push(callback);
    }

    afterNavigate(callback) {
        this.afterNavigateCallbacks.push(callback);
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
