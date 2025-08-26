class ServerErrorPage {
    constructor() {
        this.errorId = this.generateErrorId();
    }

    async render(container, props = {}) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        this.reportError(props.error);
    }

    getHTML() {
        return `
            <div class="error-page-container">
                <div class="container py-5">
                    <div class="row justify-content-center">
                        <div class="col-lg-8 text-center">
                            <!-- 500 Hero Section -->
                            <div class="error-hero mb-5">
                                <div class="error-code">500</div>
                                <h1 class="error-title">Server Error</h1>
                                <p class="error-description">
                                    Something went wrong on our end. We're working to fix it.
                                    <br>
                                    <small class="text-muted">Error ID: ${this.errorId}</small>
                                </p>
                            </div>

                            <!-- Status Updates -->
                            <div class="error-status mb-5">
                                <div class="card">
                                    <div class="card-body">
                                        <h5 class="card-title">
                                            <i class="fas fa-tools me-2"></i>What we're doing
                                        </h5>
                                        <div class="status-list">
                                            <div class="status-item">
                                                <i class="fas fa-check-circle text-success me-2"></i>
                                                Error detected and logged
                                            </div>
                                            <div class="status-item">
                                                <i class="fas fa-sync-alt fa-spin text-primary me-2"></i>
                                                Technical team notified
                                            </div>
                                            <div class="status-item">
                                                <i class="fas fa-clock text-muted me-2"></i>
                                                Working on a fix
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="error-actions mb-5">
                                <div class="row g-3 justify-content-center">
                                    <div class="col-md-3">
                                        <button class="btn btn-primary w-100" id="retry-btn">
                                            <i class="fas fa-redo mb-2 d-block"></i>
                                            Try Again
                                        </button>
                                    </div>
                                    <div class="col-md-3">
                                        <a href="/" class="btn btn-outline-primary w-100">
                                            <i class="fas fa-home mb-2 d-block"></i>
                                            Go Home
                                        </a>
                                    </div>
                                    <div class="col-md-3">
                                        <a href="/status" class="btn btn-outline-secondary w-100">
                                            <i class="fas fa-heartbeat mb-2 d-block"></i>
                                            System Status
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

                            <!-- Alternative Actions -->
                            <div class="error-alternatives mb-5">
                                <h5 class="mb-3">While we fix this, you can:</h5>
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <div class="card h-100">
                                            <div class="card-body text-center">
                                                <i class="fas fa-video fa-2x text-primary mb-3"></i>
                                                <h6 class="card-title">Browse Interviews</h6>
                                                <p class="card-text small">Explore our interview library</p>
                                                <a href="/interviews" class="btn btn-sm btn-outline-primary">Browse</a>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card h-100">
                                            <div class="card-body text-center">
                                                <i class="fas fa-search fa-2x text-primary mb-3"></i>
                                                <h6 class="card-title">Search Content</h6>
                                                <p class="card-text small">Find what you're looking for</p>
                                                <a href="/search" class="btn btn-sm btn-outline-primary">Search</a>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card h-100">
                                            <div class="card-body text-center">
                                                <i class="fas fa-compass fa-2x text-primary mb-3"></i>
                                                <h6 class="card-title">Discover</h6>
                                                <p class="card-text small">Find new content and people</p>
                                                <a href="/discover" class="btn btn-sm btn-outline-primary">Discover</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Help Section -->
                            <div class="error-help">
                                <div class="card">
                                    <div class="card-body">
                                        <h5 class="card-title">Still having issues?</h5>
                                        <p class="card-text">
                                            If the problem persists, please contact our support team with the error ID above.
                                        </p>
                                        <div class="btn-group">
                                            <a href="/contact" class="btn btn-outline-primary">
                                                <i class="fas fa-envelope me-2"></i>Contact Support
                                            </a>
                                            <button class="btn btn-outline-secondary" id="copy-error-id">
                                                <i class="fas fa-copy me-2"></i>Copy Error ID
                                            </button>
                                        </div>
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
                    color: var(--danger-color, #dc3545);
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

                .status-list {
                    text-align: left;
                }

                .status-item {
                    padding: 0.5rem 0;
                    border-bottom: 1px solid var(--border-color);
                }

                .status-item:last-child {
                    border-bottom: none;
                }

                .error-actions .btn {
                    padding: 1rem;
                    border-radius: 0.5rem;
                    transition: all 0.2s ease;
                }

                .error-actions .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(220, 53, 69, 0.2);
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
        // Retry button
        const retryBtn = container.querySelector('#retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }

        // Copy error ID button
        const copyErrorBtn = container.querySelector('#copy-error-id');
        if (copyErrorBtn) {
            copyErrorBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(this.errorId).then(() => {
                    copyErrorBtn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
                    setTimeout(() => {
                        copyErrorBtn.innerHTML = '<i class="fas fa-copy me-2"></i>Copy Error ID';
                    }, 2000);
                });
            });
        }
    }

    generateErrorId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `ERR-${timestamp}-${random}`.toUpperCase();
    }

    reportError(error) {
        try {
            const errorData = {
                error_id: this.errorId,
                message: error?.message || 'Unknown server error',
                stack: error?.stack || null,
                url: window.location.href,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };

            fetch('/api/errors/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(errorData)
            }).catch(() => {
                // Silently fail - error reporting shouldn't break the error page
                console.error('Failed to report server error');
            });
        } catch (reportError) {
            console.error('Failed to report server error:', reportError);
        }
    }
}

export default ServerErrorPage;
