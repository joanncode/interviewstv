import Auth from '../../services/auth.js';
import API from '../../services/api.js';
import Router from '../../utils/router.js';

class EditProfilePage {
    constructor() {
        this.user = null;
        this.currentUser = Auth.getCurrentUser();
        this.isLoading = false;
        this.hasChanges = false;
    }

    async render(container, props = {}) {
        const username = props.params?.username;
        
        // Check authentication
        if (!this.currentUser) {
            Router.navigate('/login');
            return;
        }

        // Check if user can edit this profile
        if (this.currentUser.username !== username) {
            Router.navigate('/profile/' + username);
            return;
        }

        container.innerHTML = this.getLoadingHTML();
        
        try {
            await this.loadUserData(username);
            container.innerHTML = this.getHTML();
            this.setupEventListeners(container);
        } catch (error) {
            console.error('Failed to load profile for editing:', error);
            container.innerHTML = this.getErrorHTML();
        }
    }

    async loadUserData(username) {
        const response = await API.getUser(username);
        
        if (!response.success) {
            throw new Error(response.message || 'User not found');
        }
        
        this.user = response.data;
    }

    getLoadingHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-12 text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading profile settings...</p>
                    </div>
                </div>
            </div>
        `;
    }

    getErrorHTML() {
        return `
            <div class="container py-5">
                <div class="row justify-content-center">
                    <div class="col-md-6 text-center">
                        <h1 class="display-4 text-danger">Error</h1>
                        <p class="lead">Failed to load profile settings.</p>
                        <a href="/profile/${this.currentUser.username}" class="btn btn-primary">Back to Profile</a>
                    </div>
                </div>
            </div>
        `;
    }

    getHTML() {
        return `
            <div class="container py-4">
                <div class="row justify-content-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center mb-4">
                            <a href="/profile/${this.user.username}" class="btn btn-outline-secondary me-3">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="mb-0">Edit Profile</h1>
                        </div>

                        <div id="alert-container"></div>

                        <div class="card">
                            <div class="card-body">
                                <form id="edit-profile-form">
                                    ${this.getAvatarSection()}
                                    ${this.getBasicInfoSection()}
                                    ${this.getAccountSection()}
                                    ${this.getFormActions()}
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getAvatarSection() {
        return `
            <div class="mb-4">
                <h5 class="card-title">Profile Picture</h5>
                <div class="d-flex align-items-center">
                    <div class="position-relative me-4">
                        <img src="${this.user.avatar_url || '/assets/default-avatar.png'}" 
                             alt="Profile Picture" 
                             class="rounded-circle" 
                             width="100" height="100"
                             id="avatar-preview"
                             onerror="this.src='/assets/default-avatar.png'">
                        <button type="button" 
                                class="btn btn-sm btn-primary position-absolute bottom-0 end-0 rounded-circle" 
                                id="change-avatar-btn"
                                title="Change Avatar">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    <div>
                        <p class="text-muted mb-2">Upload a new profile picture</p>
                        <input type="file" 
                               id="avatar-upload" 
                               class="d-none" 
                               accept="image/*">
                        <button type="button" 
                                class="btn btn-outline-danger btn-sm" 
                                id="remove-avatar-btn">
                            Remove Picture
                        </button>
                    </div>
                </div>
            </div>
            <hr>
        `;
    }

    getBasicInfoSection() {
        return `
            <div class="mb-4">
                <h5 class="card-title">Basic Information</h5>
                
                <div class="mb-3">
                    <label for="username" class="form-label">Username</label>
                    <input type="text" 
                           class="form-control" 
                           id="username" 
                           name="username" 
                           value="${this.user.username}"
                           required>
                    <div class="form-text">Your unique username for your profile URL</div>
                    <div class="invalid-feedback"></div>
                </div>

                <div class="mb-3">
                    <label for="email" class="form-label">Email Address</label>
                    <input type="email" 
                           class="form-control" 
                           id="email" 
                           name="email" 
                           value="${this.user.email}"
                           required>
                    <div class="form-text">Used for login and notifications</div>
                    <div class="invalid-feedback"></div>
                </div>

                <div class="mb-3">
                    <label for="bio" class="form-label">Bio</label>
                    <textarea class="form-control" 
                              id="bio" 
                              name="bio" 
                              rows="4" 
                              maxlength="500"
                              placeholder="Tell people about yourself...">${this.user.bio || ''}</textarea>
                    <div class="form-text">
                        <span id="bio-count">0</span>/500 characters
                    </div>
                    <div class="invalid-feedback"></div>
                </div>

                <div class="mb-3">
                    <label for="role" class="form-label">Role</label>
                    <select class="form-select" id="role" name="role">
                        <option value="user" ${this.user.role === 'user' ? 'selected' : ''}>General User</option>
                        <option value="interviewer" ${this.user.role === 'interviewer' ? 'selected' : ''}>Interviewer</option>
                        <option value="interviewee" ${this.user.role === 'interviewee' ? 'selected' : ''}>Interviewee</option>
                        <option value="promoter" ${this.user.role === 'promoter' ? 'selected' : ''}>Event Promoter</option>
                    </select>
                    <div class="form-text">Your primary role on the platform</div>
                    <div class="invalid-feedback"></div>
                </div>
            </div>
            <hr>
        `;
    }

    getAccountSection() {
        return `
            <div class="mb-4">
                <h5 class="card-title">Account Settings</h5>
                
                <div class="mb-3">
                    <label class="form-label">Account Status</label>
                    <div class="d-flex align-items-center">
                        <span class="badge ${this.user.verified ? 'bg-success' : 'bg-warning'} me-2">
                            <i class="fas ${this.user.verified ? 'fa-check-circle' : 'fa-clock'} me-1"></i>
                            ${this.user.verified ? 'Verified' : 'Pending Verification'}
                        </span>
                        ${!this.user.verified ? `
                            <button type="button" class="btn btn-sm btn-outline-primary" id="resend-verification">
                                Resend Verification Email
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">Member Since</label>
                    <p class="form-control-plaintext">${new Date(this.user.created_at).toLocaleDateString()}</p>
                </div>

                <div class="mb-3">
                    <button type="button" class="btn btn-outline-warning" id="change-password-btn">
                        <i class="fas fa-key me-2"></i>Change Password
                    </button>
                </div>
            </div>
            <hr>
        `;
    }

    getFormActions() {
        return `
            <div class="d-flex justify-content-between">
                <button type="button" class="btn btn-outline-danger" id="delete-account-btn">
                    <i class="fas fa-trash me-2"></i>Delete Account
                </button>
                <div>
                    <a href="/profile/${this.user.username}" class="btn btn-secondary me-2">Cancel</a>
                    <button type="submit" class="btn btn-primary" id="save-btn">
                        <i class="fas fa-save me-2"></i>Save Changes
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners(container) {
        const form = container.querySelector('#edit-profile-form');
        const saveBtn = container.querySelector('#save-btn');
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSave(form, saveBtn);
        });

        // Track changes
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.hasChanges = true;
                this.updateSaveButton();
                this.clearFieldError(input);
            });
        });

        // Bio character count
        const bioField = container.querySelector('#bio');
        const bioCount = container.querySelector('#bio-count');
        
        const updateBioCount = () => {
            bioCount.textContent = bioField.value.length;
        };
        
        bioField.addEventListener('input', updateBioCount);
        updateBioCount(); // Initial count

        // Avatar upload
        const changeAvatarBtn = container.querySelector('#change-avatar-btn');
        const avatarUpload = container.querySelector('#avatar-upload');
        const removeAvatarBtn = container.querySelector('#remove-avatar-btn');
        
        changeAvatarBtn.addEventListener('click', () => avatarUpload.click());
        avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
        removeAvatarBtn.addEventListener('click', () => this.handleRemoveAvatar());

        // Other buttons
        const resendBtn = container.querySelector('#resend-verification');
        if (resendBtn) {
            resendBtn.addEventListener('click', () => this.handleResendVerification());
        }

        const changePasswordBtn = container.querySelector('#change-password-btn');
        changePasswordBtn.addEventListener('click', () => this.showChangePasswordModal());

        const deleteAccountBtn = container.querySelector('#delete-account-btn');
        deleteAccountBtn.addEventListener('click', () => this.showDeleteAccountModal());

        // Warn about unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    async handleSave(form, saveBtn) {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.setLoadingState(saveBtn, true);
            this.clearErrors();

            const formData = new FormData(form);
            const updateData = {
                username: formData.get('username'),
                email: formData.get('email'),
                bio: formData.get('bio'),
                role: formData.get('role')
            };

            const response = await Auth.updateProfile(updateData);

            if (response.success) {
                this.hasChanges = false;
                this.showAlert('success', 'Profile updated successfully!');
                
                // Update user data
                this.user = { ...this.user, ...response.data };
                
                // Redirect if username changed
                if (updateData.username !== this.currentUser.username) {
                    setTimeout(() => {
                        Router.navigate('/profile/' + updateData.username);
                    }, 1500);
                }
            } else {
                this.handleSaveError(response);
            }

        } catch (error) {
            console.error('Save error:', error);
            this.showAlert('error', error.message || 'Failed to save changes');
        } finally {
            this.isLoading = false;
            this.setLoadingState(saveBtn, false);
        }
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const response = await Auth.uploadAvatar(file);
            
            if (response.success) {
                // Update preview
                const preview = document.getElementById('avatar-preview');
                preview.src = response.data.url;
                
                this.user.avatar_url = response.data.url;
                this.showAlert('success', 'Avatar updated successfully!');
            }

        } catch (error) {
            console.error('Avatar upload error:', error);
            this.showAlert('error', 'Failed to upload avatar');
        }
    }

    handleRemoveAvatar() {
        // TODO: Implement avatar removal
        this.showAlert('info', 'Avatar removal will be implemented soon');
    }

    async handleResendVerification() {
        try {
            const response = await Auth.resendVerification(this.user.email);
            
            if (response.success) {
                this.showAlert('success', 'Verification email sent!');
            }

        } catch (error) {
            console.error('Resend verification error:', error);
            this.showAlert('error', 'Failed to send verification email');
        }
    }

    showChangePasswordModal() {
        // TODO: Implement change password modal
        this.showAlert('info', 'Change password feature will be implemented soon');
    }

    showDeleteAccountModal() {
        // TODO: Implement delete account modal
        this.showAlert('warning', 'Account deletion feature will be implemented soon');
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.disabled = !this.hasChanges;
        }
    }

    setLoadingState(button, loading) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Saving...
            `;
        } else {
            button.disabled = !this.hasChanges;
            button.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
        }
    }

    showAlert(type, message) {
        const container = document.getElementById('alert-container');
        const alertClass = type === 'error' ? 'alert-danger' : `alert-${type}`;
        
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

    handleSaveError(response) {
        if (response.errors) {
            // Show field-specific errors
            Object.keys(response.errors).forEach(field => {
                this.showFieldError(field, response.errors[field]);
            });
        } else {
            // Show general error
            this.showAlert('error', response.message || 'Failed to save changes');
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

    clearErrors() {
        // Clear alert
        const alertContainer = document.getElementById('alert-container');
        alertContainer.innerHTML = '';

        // Clear field errors
        const invalidFields = document.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => {
            this.clearFieldError(field);
        });
    }
}

export default EditProfilePage;
