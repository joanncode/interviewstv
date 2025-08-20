import Auth from '../../services/auth.js';
import Router from '../../utils/router.js';

class RegisterPage {
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
                    <div class="col-md-6 col-lg-5">
                        <div class="card shadow">
                            <div class="card-body p-4">
                                <div class="text-center mb-4">
                                    <h2>Join Interviews.tv</h2>
                                    <p class="text-muted">Create your account to get started</p>
                                </div>
                                
                                <div id="alert-container"></div>
                                
                                <form id="register-form">
                                    <div class="mb-3">
                                        <label for="username" class="form-label">Username</label>
                                        <input type="text" 
                                               class="form-control" 
                                               id="username" 
                                               name="username" 
                                               required 
                                               autocomplete="username"
                                               placeholder="Choose a unique username">
                                        <div class="form-text">3-30 characters, letters, numbers, underscores, and hyphens only</div>
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="email" class="form-label">Email Address</label>
                                        <input type="email" 
                                               class="form-control" 
                                               id="email" 
                                               name="email" 
                                               required 
                                               autocomplete="email"
                                               placeholder="your@email.com">
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="password" class="form-label">Password</label>
                                        <input type="password" 
                                               class="form-control" 
                                               id="password" 
                                               name="password" 
                                               required 
                                               autocomplete="new-password"
                                               placeholder="Create a strong password">
                                        <div class="form-text">At least 8 characters with uppercase, lowercase, and number</div>
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="role" class="form-label">I am a...</label>
                                        <select class="form-select" id="role" name="role" required>
                                            <option value="">Select your role</option>
                                            <option value="user">General User</option>
                                            <option value="interviewer">Interviewer</option>
                                            <option value="interviewee">Interviewee</option>
                                            <option value="promoter">Event Promoter</option>
                                        </select>
                                        <div class="form-text">You can change this later in your profile</div>
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="bio" class="form-label">Bio (Optional)</label>
                                        <textarea class="form-control" 
                                                  id="bio" 
                                                  name="bio" 
                                                  rows="3" 
                                                  placeholder="Tell us a bit about yourself..."></textarea>
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <div class="mb-3 form-check">
                                        <input type="checkbox" class="form-check-input" id="terms" required>
                                        <label class="form-check-label" for="terms">
                                            I agree to the <a href="/terms" target="_blank">Terms of Service</a> 
                                            and <a href="/privacy" target="_blank">Privacy Policy</a>
                                        </label>
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <button type="submit" 
                                            class="btn btn-primary w-100" 
                                            id="register-btn">
                                        Create Account
                                    </button>
                                </form>
                                
                                <div class="text-center mt-4">
                                    <p class="mb-0">
                                        Already have an account? 
                                        <a href="/login" class="text-decoration-none fw-bold">
                                            Sign in
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
        const form = container.querySelector('#register-form');
        const submitBtn = container.querySelector('#register-btn');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister(form, submitBtn);
        });

        // Clear validation errors on input
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });

        // Real-time username validation
        const usernameField = container.querySelector('#username');
        usernameField.addEventListener('blur', () => {
            this.validateUsername(usernameField.value);
        });

        // Real-time password validation
        const passwordField = container.querySelector('#password');
        passwordField.addEventListener('input', () => {
            this.validatePassword(passwordField.value);
        });
    }

    async handleRegister(form, submitBtn) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.setLoadingState(submitBtn, true);
            this.clearErrors(form);

            const formData = new FormData(form);
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: formData.get('role'),
                bio: formData.get('bio') || null
            };

            // Client-side validation
            if (!this.validateForm(userData)) {
                return;
            }

            // Attempt registration
            const response = await Auth.register(userData);

            if (response.success) {
                this.showAlert('success', 'Account created successfully! Please check your email to verify your account.');
                
                // Redirect to login after delay
                setTimeout(() => {
                    Router.navigate('/login');
                }, 3000);
            } else {
                this.handleRegistrationError(response);
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showAlert('error', error.message || 'Registration failed. Please try again.');
        } finally {
            this.isLoading = false;
            this.setLoadingState(submitBtn, false);
        }
    }

    validateForm(userData) {
        let isValid = true;

        // Username validation
        if (!this.validateUsername(userData.username)) {
            isValid = false;
        }

        // Email validation
        if (!this.isValidEmail(userData.email)) {
            this.showFieldError('email', 'Please enter a valid email address');
            isValid = false;
        }

        // Password validation
        if (!this.validatePassword(userData.password)) {
            isValid = false;
        }

        // Role validation
        if (!userData.role) {
            this.showFieldError('role', 'Please select your role');
            isValid = false;
        }

        // Terms validation
        const termsCheckbox = document.getElementById('terms');
        if (!termsCheckbox.checked) {
            this.showFieldError('terms', 'You must agree to the terms and conditions');
            isValid = false;
        }

        return isValid;
    }

    validateUsername(username) {
        if (!username) {
            this.showFieldError('username', 'Username is required');
            return false;
        }

        if (username.length < 3 || username.length > 30) {
            this.showFieldError('username', 'Username must be 3-30 characters long');
            return false;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            this.showFieldError('username', 'Username can only contain letters, numbers, underscores, and hyphens');
            return false;
        }

        return true;
    }

    validatePassword(password) {
        if (!password) {
            this.showFieldError('password', 'Password is required');
            return false;
        }

        const errors = [];

        if (password.length < 8) {
            errors.push('at least 8 characters');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('one number');
        }

        if (errors.length > 0) {
            this.showFieldError('password', `Password must contain ${errors.join(', ')}`);
            return false;
        }

        return true;
    }

    handleRegistrationError(response) {
        if (response.errors) {
            // Show field-specific errors
            Object.keys(response.errors).forEach(field => {
                this.showFieldError(field, response.errors[field]);
            });
        } else {
            // Show general error
            this.showAlert('error', response.message || 'Registration failed');
        }
    }

    setLoadingState(button, loading) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Creating Account...
            `;
        } else {
            button.disabled = false;
            button.innerHTML = 'Create Account';
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

export default RegisterPage;
