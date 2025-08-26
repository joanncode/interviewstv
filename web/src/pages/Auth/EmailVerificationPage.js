import API from '../../services/api.js';
import Router from '../../utils/router.js';

class EmailVerificationPage {
    constructor() {
        this.isLoading = false;
    }

    async render(container, props = {}) {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            await this.verifyEmail(token, container);
        } else {
            this.renderVerificationForm(container);
        }
    }

    async verifyEmail(token, container) {
        container.innerHTML = this.getLoadingHTML();
        
        try {
            const response = await API.post('/api/auth/verify-email', { token });
            
            if (response.success) {
                container.innerHTML = this.getSuccessHTML();
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    Router.navigate('/login');
                }, 3000);
            } else {
                container.innerHTML = this.getErrorHTML(response.message || 'Invalid or expired verification token');
            }
        } catch (error) {
            console.error('Email verification error:', error);
            container.innerHTML = this.getErrorHTML('Failed to verify email. Please try again.');
        }
    }

    renderVerificationForm(container) {
        container.innerHTML = this.getFormHTML();
        this.setupEventListeners(container);
    }

    getLoadingHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 col-lg-5">
                        <div class="card shadow">
                            <div class="card-body p-4 text-center">
                                <div class="spinner-border text-primary mb-3" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <h3>Verifying your email...</h3>
                                <p class="text-muted">Please wait while we verify your email address.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSuccessHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 col-lg-5">
                        <div class="card shadow">
                            <div class="card-body p-4 text-center">
                                <div class="text-success mb-3">
                                    <i class="fas fa-check-circle fa-4x"></i>
                                </div>
                                <h3 class="text-success">Email Verified!</h3>
                                <p class="text-muted mb-4">
                                    Your email address has been successfully verified. 
                                    You can now log in to your account.
                                </p>
                                <p class="text-muted">
                                    <small>Redirecting to login page in 3 seconds...</small>
                                </p>
                                <a href="/login" class="btn btn-primary">
                                    Go to Login
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getErrorHTML(message) {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 col-lg-5">
                        <div class="card shadow">
                            <div class="card-body p-4 text-center">
                                <div class="text-danger mb-3">
                                    <i class="fas fa-exclamation-triangle fa-4x"></i>
                                </div>
                                <h3 class="text-danger">Verification Failed</h3>
                                <p class="text-muted mb-4">${message}</p>
                                <div class="d-grid gap-2">
                                    <button type="button" class="btn btn-primary" id="resend-btn">
                                        Resend Verification Email
                                    </button>
                                    <a href="/login" class="btn btn-outline-secondary">
                                        Back to Login
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFormHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 col-lg-5">
                        <div class="card shadow">
                            <div class="card-body p-4">
                                <div class="text-center mb-4">
                                    <h2>Verify Your Email</h2>
                                    <p class="text-muted">
                                        Enter your email address to receive a verification link
                                    </p>
                                </div>
                                
                                <div id="alert-container"></div>
                                
                                <form id="verification-form">
                                    <div class="mb-3">
                                        <label for="email" class="form-label">Email Address</label>
                                        <input type="email" 
                                               class="form-control" 
                                               id="email" 
                                               name="email" 
                                               required 
                                               placeholder="Enter your email address">
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <div class="d-grid">
                                        <button type="submit" class="btn btn-primary" id="submit-btn">
                                            <span class="btn-text">Send Verification Email</span>
                                            <span class="btn-spinner d-none">
                                                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Sending...
                                            </span>
                                        </button>
                                    </div>
                                </form>
                                
                                <div class="text-center mt-3">
                                    <a href="/login" class="text-decoration-none">
                                        Back to Login
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners(container) {
        const form = container.querySelector('#verification-form');
        const resendBtn = container.querySelector('#resend-btn');
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        if (resendBtn) {
            resendBtn.addEventListener('click', () => this.showResendForm(container));
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isLoading) return;
        
        const form = event.target;
        const submitBtn = form.querySelector('#submit-btn');
        const formData = new FormData(form);
        
        try {
            this.isLoading = true;
            this.setLoadingState(submitBtn, true);
            this.clearErrors(form);
            
            const response = await API.post('/api/auth/resend-verification', {
                email: formData.get('email')
            });
            
            if (response.success) {
                this.showAlert('success', 'Verification email sent! Please check your inbox.');
                form.reset();
            } else {
                this.showAlert('danger', response.message || 'Failed to send verification email');
            }
            
        } catch (error) {
            console.error('Resend verification error:', error);
            this.showAlert('danger', 'An error occurred. Please try again.');
        } finally {
            this.isLoading = false;
            this.setLoadingState(submitBtn, false);
        }
    }

    showResendForm(container) {
        this.renderVerificationForm(container);
    }

    setLoadingState(button, loading) {
        const btnText = button.querySelector('.btn-text');
        const btnSpinner = button.querySelector('.btn-spinner');
        
        if (loading) {
            btnText.classList.add('d-none');
            btnSpinner.classList.remove('d-none');
            button.disabled = true;
        } else {
            btnText.classList.remove('d-none');
            btnSpinner.classList.add('d-none');
            button.disabled = false;
        }
    }

    clearErrors(form) {
        const errorElements = form.querySelectorAll('.is-invalid');
        errorElements.forEach(element => {
            element.classList.remove('is-invalid');
        });
    }

    showAlert(type, message) {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}

export default EmailVerificationPage;
