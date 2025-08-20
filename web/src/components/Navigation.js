import Auth from '../services/auth.js';
import Router from '../utils/router.js';
import SearchBox from './SearchBox.js';

class Navigation {
    constructor() {
        this.user = Auth.getCurrentUser();
        this.searchBox = null;
    }

    render(container) {
        container.innerHTML = this.getNavigationHTML();
        this.setupEventListeners(container);
        this.initializeSearchBox(container);
    }

    getNavigationHTML() {
        const isAuthenticated = Auth.isAuthenticated();
        const user = this.user;

        return `
            <nav class="navbar navbar-expand-lg navbar-dark">
                <div class="container">
                    <a class="navbar-brand" href="/">
                        Interviews<span class="brand-accent">.tv</span>
                    </a>
                    
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav me-auto">
                            <li class="nav-item">
                                <a class="nav-link" href="/interviews">Interviews</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/gallery">Gallery</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/explore">Explore</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/trending">Trending</a>
                            </li>
                            <li class="nav-item dropdown">
                                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                    Discover
                                </a>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="/interviews">Interviews</a></li>
                                    <li><a class="dropdown-item" href="/events">Events</a></li>
                                    <li><a class="dropdown-item" href="/business">Businesses</a></li>
                                    <li><a class="dropdown-item" href="/communities">Communities</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item" href="/categories">Categories</a></li>
                                </ul>
                            </li>
                            ${isAuthenticated ? `
                                <li class="nav-item">
                                    <a class="nav-link" href="/create">Create</a>
                                </li>
                            ` : ''}
                        </ul>

                        <div class="navbar-nav mx-auto" style="max-width: 400px;">
                            <div id="nav-search-container" class="w-100"></div>
                        </div>

                        <ul class="navbar-nav">
                            ${isAuthenticated ? this.getAuthenticatedNav(user) : this.getGuestNav()}
                        </ul>
                    </div>
                </div>
            </nav>
        `;
    }

    getAuthenticatedNav(user) {
        return `

            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown">
                    <img src="${user?.avatar_url || '/assets/default-avatar.png'}" 
                         alt="${user?.username || 'User'}" 
                         class="rounded-circle me-2" 
                         width="32" height="32"
                         onerror="this.src='/assets/default-avatar.png'">
                    ${user?.username || 'User'}
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/profile/${user?.username}">
                        <i class="fas fa-user me-2"></i>My Profile
                    </a></li>
                    <li><a class="dropdown-item" href="/my-interviews">
                        <i class="fas fa-video me-2"></i>My Interviews
                    </a></li>
                    <li><a class="dropdown-item" href="/settings">
                        <i class="fas fa-cog me-2"></i>Settings
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="logout-btn">
                        <i class="fas fa-sign-out-alt me-2"></i>Logout
                    </a></li>
                </ul>
            </li>
        `;
    }

    getGuestNav() {
        return `
            <li class="nav-item">
                <form class="d-flex me-3" role="search">
                    <input class="form-control" type="search" placeholder="Search..." id="navbar-search">
                    <button class="btn btn-outline-light ms-2" type="submit">
                        <i class="fas fa-search"></i>
                    </button>
                </form>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/login">Login</a>
            </li>
            <li class="nav-item">
                <a class="btn btn-primary ms-2" href="/register">Sign Up</a>
            </li>
        `;
    }

    setupEventListeners(container) {
        // Handle logout
        const logoutBtn = container.querySelector('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Handle search
        const searchForm = container.querySelector('form[role="search"]');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = container.querySelector('#navbar-search').value.trim();
                if (query) {
                    Router.navigate(`/search?q=${encodeURIComponent(query)}`);
                }
            });
        }

        // Handle navigation clicks
        const navLinks = container.querySelectorAll('a[href^="/"]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                Router.navigate(href);
            });
        });

        // Update active nav item
        this.updateActiveNavItem(container);
    }

    updateActiveNavItem(container) {
        const currentPath = window.location.pathname;
        const navLinks = container.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            
            if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
                link.classList.add('active');
            }
        });
    }

    async handleLogout() {
        try {
            // Show loading state
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging out...';
                logoutBtn.classList.add('disabled');
            }

            await Auth.logout();
            Router.navigate('/');
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if API call fails
            Auth.clearToken();
            Router.navigate('/');
        }
    }

    initializeSearchBox(container) {
        const searchContainer = container.querySelector('#nav-search-container');

        if (searchContainer) {
            this.searchBox = new SearchBox(searchContainer, {
                placeholder: 'Search...',
                showSuggestions: true,
                showFilters: false,
                autoFocus: false
            });

            this.searchBox.render();
        }
    }
}

export default Navigation;
