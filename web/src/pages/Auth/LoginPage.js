import Auth from '../../services/auth.js';
import Router from '../../utils/router.js';

class LoginPage {
    constructor() {
        this.isLoading = false;
    }

    async render(container, props = {}) {
        container.innerHTML = this.getHTML();
        this.setupEventListeners(container);
        
        // Check if user is already authenticated
        if (Auth.isAuthenticated()) {
            Router.navigate('/explore');
        }
    }

    getHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 col-lg-4">
                        <div class="card shadow">
                            <div class="card-body p-4">
                                <div class="text-center mb-4">
                                    <h2>Welcome Back</h2>
                                    <p class="text-muted">Sign in to your account</p>
                                </div>
                                
                                <div id="alert-container"></div>
                                
                                <form id="login-form">
                                    <div class="mb-3">
                                        <label for="email" class="form-label">Email Address</label>
                                        <input type="email" 
                                               class="form-control" 
                                               id="email" 
                                               name="email" 
                                               required 
                                               autocomplete="email">
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="password" class="form-label">Password</label>
                                        <input type="password" 
                                               class="form-control" 
                                               id="password" 
                                               name="password" 
                                               required 
                                               autocomplete="current-password">
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <div class="mb-3 form-check">
                                        <input type="checkbox" class="form-check-input" id="remember">
                                        <label class="form-check-label" for="remember">
                                            Remember me
                                        </label>
                                    </div>
                                    
                                    <button type="submit" 
                                            class="btn btn-primary w-100" 
                                            id="login-btn">
                                        Sign In
                                    </button>
                                </form>
                                
                                <div class="text-center mt-4">
                                    <p class="mb-2">
                                        <a href="/forgot-password" class="text-decoration-none">
                                            Forgot your password?
                                        </a>
                                    </p>
                                    <p class="mb-0">
                                        Don't have an account? 
                                        <a href="/register" class="text-decoration-none fw-bold">
                                            Sign up
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners(container) {
        const form = container.querySelector('#login-form');
        const submitBtn = container.querySelector('#login-btn');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(form, submitBtn);
        });

        // Clear validation errors on input
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }

    async handleLogin(form, submitBtn) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.setLoadingState(submitBtn, true);
            this.clearErrors(form);

            const formData = new FormData(form);
            const email = formData.get('email');
            const password = formData.get('password');

            // Basic client-side validation
            if (!email || !password) {
                this.showAlert('error', 'Please fill in all fields');
                return;
            }

            if (!this.isValidEmail(email)) {
                this.showFieldError('email', 'Please enter a valid email address');
                return;
            }

            // Attempt login
            const response = await Auth.login(email, password);

            if (response.success) {
                this.showAlert('success', 'Login successful! Redirecting...');
                
                // Redirect after short delay
                setTimeout(() => {
                    const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/explore';
                    Router.navigate(redirectUrl);
                }, 1000);
            } else {
                this.handleLoginError(response);
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('error', error.message || 'Login failed. Please try again.');
        } finally {
            this.isLoading = false;
            this.setLoadingState(submitBtn, false);
        }
    }

    handleLoginError(response) {
        if (response.errors) {
            // Show field-specific errors
            Object.keys(response.errors).forEach(field => {
                this.showFieldError(field, response.errors[field]);
            });
        } else {
            const message = response.message || 'Login failed';

            // Check if this is an email verification error
            if (message.includes('verify your email') || message.includes('verification')) {
                this.showEmailVerificationError(message);
            } else {
                // Show general error
                this.showAlert('error', message);
            }
        }
    }

    showEmailVerificationError(message) {
        const container = document.getElementById('alert-container');

        container.innerHTML = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <strong>Email Verification Required</strong><br>
                ${message}
                <div class="mt-2">
                    <a href="/verify-email" class="btn btn-sm btn-outline-primary">
                        Resend Verification Email
                    </a>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    setLoadingState(button, loading) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Signing In...
            `;
        } else {
            button.disabled = false;
            button.innerHTML = 'Sign In';
        }
    }

    showAlert(type, message) {
        const container = document.getElementById('alert-container');
        const alertClass = type === 'error' ? 'alert-danger' : 'alert-success';
        
        container.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // Auto-dismiss success alerts
        if (type === 'success') {
            setTimeout(() => {
                const alert = container.querySelector('.alert');
                if (alert) {
                    alert.remove();
                }
            }, 3000);
        }
    }

    showFieldError(fieldName, message) {
        const field = document.getElementById(fieldName);
        if (field) {
            field.classList.add('is-invalid');
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = message;
            }
        }
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = '';
        }
    }

    clearErrors(form) {
        // Clear alert
        const alertContainer = document.getElementById('alert-container');
        alertContainer.innerHTML = '';

        // Clear field errors
        const invalidFields = form.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => {
            this.clearFieldError(field);
        });
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

export default LoginPage;
