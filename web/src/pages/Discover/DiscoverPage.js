import API from '../../services/api.js';
import Auth from '../../services/auth.js';

export default class DiscoverPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.users = [];
        this.searchResults = [];
        this.isLoading = false;
        this.isSearching = false;
        this.currentType = 'recommended';
        this.searchQuery = '';
        this.searchFilters = {};
    }

    async render(container) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        
        // Load initial recommendations
        await this.loadUsers('recommended');
    }

    getHTML() {
        return `
            <div class="discover-page">
                <div class="container py-4">
                    <div class="row">
                        <div class="col-md-3">
                            ${this.getSidebarHTML()}
                        </div>
                        <div class="col-md-9">
                            ${this.getMainContentHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSidebarHTML() {
        return `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Discover Users</h5>
                </div>
                <div class="card-body">
                    <!-- Search Section -->
                    <div class="mb-4">
                        <h6 class="text-muted mb-3">Search Users</h6>
                        <div class="input-group mb-3">
                            <input type="text" class="form-control" id="search-input" 
                                   placeholder="Search by name or username..." value="${this.searchQuery}">
                            <button class="btn btn-outline-primary" id="search-btn">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                        
                        <!-- Search Filters -->
                        <div class="mb-3">
                            <label for="role-filter" class="form-label small">Role</label>
                            <select class="form-select form-select-sm" id="role-filter">
                                <option value="">All Roles</option>
                                <option value="interviewer">Interviewers</option>
                                <option value="interviewee">Interviewees</option>
                                <option value="promoter">Promoters</option>
                            </select>
                        </div>
                        
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="verified-filter">
                            <label class="form-check-label small" for="verified-filter">
                                Verified users only
                            </label>
                        </div>
                        
                        <button class="btn btn-sm btn-outline-secondary w-100" id="clear-search-btn">
                            Clear Search
                        </button>
                    </div>
                    
                    <hr>
                    
                    <!-- Discovery Categories -->
                    <div>
                        <h6 class="text-muted mb-3">Browse Categories</h6>
                        <div class="list-group list-group-flush">
                            <button class="list-group-item list-group-item-action discovery-category ${this.currentType === 'recommended' ? 'active' : ''}" 
                                    data-type="recommended">
                                <i class="fas fa-star me-2"></i>Recommended
                            </button>
                            <button class="list-group-item list-group-item-action discovery-category ${this.currentType === 'popular' ? 'active' : ''}" 
                                    data-type="popular">
                                <i class="fas fa-fire me-2"></i>Popular
                            </button>
                            <button class="list-group-item list-group-item-action discovery-category ${this.currentType === 'new' ? 'active' : ''}" 
                                    data-type="new">
                                <i class="fas fa-user-plus me-2"></i>New Users
                            </button>
                            <button class="list-group-item list-group-item-action discovery-category ${this.currentType === 'active' ? 'active' : ''}" 
                                    data-type="active">
                                <i class="fas fa-bolt me-2"></i>Most Active
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getMainContentHTML() {
        return `
            <div class="main-content">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 id="content-title">${this.getContentTitle()}</h2>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-secondary btn-sm" id="grid-view-btn">
                            <i class="fas fa-th"></i>
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" id="list-view-btn">
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                </div>
                
                <div id="users-container">
                    ${this.isLoading ? this.getLoadingHTML() : this.getUsersHTML()}
                </div>
                
                ${this.users.length > 0 ? `
                    <div class="text-center mt-4">
                        <button class="btn btn-outline-primary" id="load-more-btn">
                            Load More Users
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getContentTitle() {
        if (this.searchQuery) {
            return `Search Results for "${this.searchQuery}"`;
        }
        
        switch (this.currentType) {
            case 'recommended': return 'Recommended for You';
            case 'popular': return 'Popular Users';
            case 'new': return 'New Users';
            case 'active': return 'Most Active Users';
            default: return 'Discover Users';
        }
    }

    getLoadingHTML() {
        return `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading users...</span>
                </div>
                <p class="mt-3 text-muted">Finding amazing users for you...</p>
            </div>
        `;
    }

    getUsersHTML() {
        if (this.isSearching && this.searchResults.length === 0) {
            return this.getNoResultsHTML();
        }
        
        const usersToShow = this.isSearching ? this.searchResults : this.users;
        
        if (usersToShow.length === 0) {
            return this.getEmptyStateHTML();
        }

        return `
            <div class="row" id="users-grid">
                ${usersToShow.map(user => this.getUserCardHTML(user)).join('')}
            </div>
        `;
    }

    getUserCardHTML(user) {
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 user-card">
                    <div class="card-body text-center">
                        <div class="position-relative d-inline-block mb-3">
                            <img src="${user.avatar_url || '/assets/default-avatar.png'}" 
                                 alt="${user.username}" 
                                 class="rounded-circle" 
                                 width="80" height="80"
                                 onerror="this.src='/assets/default-avatar.png'">
                            ${user.verified ? '<i class="fas fa-check-circle text-primary position-absolute bottom-0 end-0"></i>' : ''}
                        </div>
                        
                        <h6 class="card-title mb-1">
                            <a href="/profile/${user.username}" class="text-decoration-none">
                                ${user.username}
                            </a>
                        </h6>
                        
                        <p class="text-muted small mb-2">${user.role || 'User'}</p>
                        
                        ${user.bio ? `
                            <p class="card-text small text-muted mb-3">
                                ${user.bio.length > 100 ? user.bio.substring(0, 100) + '...' : user.bio}
                            </p>
                        ` : ''}
                        
                        <div class="d-flex justify-content-center gap-3 mb-3 small text-muted">
                            <div>
                                <strong>${user.follower_count || 0}</strong>
                                <div>Followers</div>
                            </div>
                            <div>
                                <strong>${user.interview_count || 0}</strong>
                                <div>Interviews</div>
                            </div>
                        </div>
                        
                        ${this.currentUser && this.currentUser.id !== user.id ? `
                            <button class="btn btn-sm ${user.is_following ? 'btn-outline-primary' : 'btn-primary'} follow-btn" 
                                    data-user-id="${user.id}" data-username="${user.username}">
                                ${user.is_following ? 'Following' : 'Follow'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getNoResultsHTML() {
        return `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No users found</h5>
                <p class="text-muted">Try adjusting your search terms or filters</p>
                <button class="btn btn-outline-primary" id="clear-search-btn">Clear Search</button>
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="text-center py-5">
                <i class="fas fa-users fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No users to show</h5>
                <p class="text-muted">Check back later for new users to discover!</p>
            </div>
        `;
    }

    setupEventListeners(container) {
        // Search functionality
        const searchInput = container.querySelector('#search-input');
        const searchBtn = container.querySelector('#search-btn');
        const clearSearchBtn = container.querySelectorAll('#clear-search-btn');

        searchBtn.addEventListener('click', () => this.handleSearch());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        clearSearchBtn.forEach(btn => {
            btn.addEventListener('click', () => this.clearSearch());
        });

        // Filter changes
        const roleFilter = container.querySelector('#role-filter');
        const verifiedFilter = container.querySelector('#verified-filter');

        roleFilter.addEventListener('change', () => this.handleSearch());
        verifiedFilter.addEventListener('change', () => this.handleSearch());

        // Discovery categories
        const categoryBtns = container.querySelectorAll('.discovery-category');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.switchCategory(type);
            });
        });

        // Follow buttons
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('follow-btn')) {
                this.handleFollowToggle(e.target);
            }
        });

        // Load more button
        const loadMoreBtn = container.querySelector('#load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreUsers());
        }
    }

    async handleSearch() {
        const searchInput = document.getElementById('search-input');
        const roleFilter = document.getElementById('role-filter');
        const verifiedFilter = document.getElementById('verified-filter');

        this.searchQuery = searchInput.value.trim();
        this.searchFilters = {
            role: roleFilter.value,
            verified: verifiedFilter.checked ? 1 : null
        };

        if (this.searchQuery || this.searchFilters.role || this.searchFilters.verified) {
            await this.performSearch();
        } else {
            this.clearSearch();
        }
    }

    async performSearch() {
        try {
            this.isSearching = true;
            this.updateUsersContainer();

            const params = {
                q: this.searchQuery,
                ...this.searchFilters,
                limit: 20
            };

            const response = await API.searchUsers(params);

            if (response.success) {
                this.searchResults = response.data.items || [];
                this.updateUsersContainer();
                this.updateContentTitle();
            }

        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    clearSearch() {
        this.searchQuery = '';
        this.searchFilters = {};
        this.searchResults = [];
        this.isSearching = false;

        // Clear form
        document.getElementById('search-input').value = '';
        document.getElementById('role-filter').value = '';
        document.getElementById('verified-filter').checked = false;

        this.updateUsersContainer();
        this.updateContentTitle();
    }

    async switchCategory(type) {
        if (this.currentType === type) return;

        this.currentType = type;
        this.clearSearch();

        // Update active state
        document.querySelectorAll('.discovery-category').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        await this.loadUsers(type);
    }

    async loadUsers(type) {
        try {
            this.isLoading = true;
            this.updateUsersContainer();

            const response = await API.discoverUsers({ type, limit: 20 });

            if (response.success) {
                this.users = response.data || [];
                this.updateUsersContainer();
                this.updateContentTitle();
            }

        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadMoreUsers() {
        // Implementation for pagination
        console.log('Load more users - to be implemented');
    }

    async handleFollowToggle(button) {
        if (!this.currentUser) {
            window.location.href = '/login';
            return;
        }

        try {
            const userId = button.dataset.userId;
            const username = button.dataset.username;
            const isFollowing = button.textContent.trim() === 'Following';

            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            let response;
            if (isFollowing) {
                response = await Auth.unfollowUser(username);
            } else {
                response = await Auth.followUser(username);
            }

            if (response.success) {
                // Update button state
                button.textContent = isFollowing ? 'Follow' : 'Following';
                button.className = `btn btn-sm ${isFollowing ? 'btn-primary' : 'btn-outline-primary'} follow-btn`;

                // Update user data
                const userLists = [this.users, this.searchResults];
                userLists.forEach(list => {
                    const user = list.find(u => u.id == userId);
                    if (user) {
                        user.is_following = !isFollowing;
                        user.follower_count = response.data.follower_count || user.follower_count;
                    }
                });
            }

        } catch (error) {
            console.error('Follow toggle failed:', error);
        } finally {
            button.disabled = false;
        }
    }

    updateUsersContainer() {
        const container = document.getElementById('users-container');
        if (container) {
            container.innerHTML = this.isLoading ? this.getLoadingHTML() : this.getUsersHTML();
        }
    }

    updateContentTitle() {
        const titleElement = document.getElementById('content-title');
        if (titleElement) {
            titleElement.textContent = this.getContentTitle();
        }
    }
}
