import Auth from '../../services/auth.js';
import Router from '../../utils/router.js';

class ForbiddenPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
    }

    async render(container, props = {}) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
    }

    getHTML() {
        const isLoggedIn = !!this.currentUser;
        
        return `
            <div class="error-page-container">
                <div class="container py-5">
                    <div class="row justify-content-center">
                        <div class="col-lg-8 text-center">
                            <!-- 403 Hero Section -->
                            <div class="error-hero mb-5">
                                <div class="error-code">403</div>
                                <h1 class="error-title">Access Forbidden</h1>
                                <p class="error-description">
                                    ${isLoggedIn 
                                        ? "You don't have permission to access this resource."
                                        : "You need to be logged in to access this page."
                                    }
                                </p>
                            </div>

                            <!-- Action Buttons -->
                            <div class="error-actions mb-5">
                                <div class="row g-3 justify-content-center">
                                    ${!isLoggedIn ? `
                                        <div class="col-md-3">
                                            <a href="/login" class="btn btn-primary w-100">
                                                <i class="fas fa-sign-in-alt mb-2 d-block"></i>
                                                Login
                                            </a>
                                        </div>
                                        <div class="col-md-3">
                                            <a href="/register" class="btn btn-outline-primary w-100">
                                                <i class="fas fa-user-plus mb-2 d-block"></i>
                                                Sign Up
                                            </a>
                                        </div>
                                    ` : `
                                        <div class="col-md-3">
                                            <a href="/profile/${this.currentUser.username}" class="btn btn-primary w-100">
                                                <i class="fas fa-user mb-2 d-block"></i>
                                                My Profile
                                            </a>
                                        </div>
                                        <div class="col-md-3">
                                            <a href="/settings" class="btn btn-outline-primary w-100">
                                                <i class="fas fa-cog mb-2 d-block"></i>
                                                Settings
                                            </a>
                                        </div>
                                    `}
                                    <div class="col-md-3">
                                        <a href="/" class="btn btn-outline-secondary w-100">
                                            <i class="fas fa-home mb-2 d-block"></i>
                                            Go Home
                                        </a>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-outline-secondary w-100" onclick="history.back()">
                                            <i class="fas fa-arrow-left mb-2 d-block"></i>
                                            Go Back
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Help Section -->
                            <div class="error-help">
                                <div class="card">
                                    <div class="card-body">
                                        <h5 class="card-title">Need Help?</h5>
                                        <p class="card-text">
                                            If you believe you should have access to this content, please contact support.
                                        </p>
                                        <a href="/contact" class="btn btn-outline-primary">
                                            <i class="fas fa-envelope me-2"></i>Contact Support
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .error-page-container {
                    min-height: 80vh;
                    display: flex;
                    align-items: center;
                }

                .error-code {
                    font-size: 8rem;
                    font-weight: 900;
                    color: var(--warning-color, #ffc107);
                    line-height: 1;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }

                .error-title {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                }

                .error-description {
                    font-size: 1.1rem;
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                }

                .error-actions .btn {
                    padding: 1rem;
                    border-radius: 0.5rem;
                    transition: all 0.2s ease;
                }

                .error-actions .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(255, 193, 7, 0.2);
                }

                .card {
                    background-color: var(--card-background);
                    border-color: var(--card-border);
                    color: var(--text-primary);
                }

                @media (max-width: 768px) {
                    .error-code {
                        font-size: 5rem;
                    }
                    
                    .error-title {
                        font-size: 2rem;
                    }
                    
                    .error-actions .btn {
                        margin-bottom: 0.5rem;
                    }
                }
            </style>
        `;
    }

    setupEventListeners(container) {
        // Any additional event listeners can be added here
    }
}

export default ForbiddenPage;
