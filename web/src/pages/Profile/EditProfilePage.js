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
                                    ${this.getPrivacySection()}
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

    getPrivacySection() {
        return `
            <div class="mb-4">
                <h5 class="card-title">Privacy Settings</h5>
                <p class="text-muted mb-3">Control who can see your profile and content</p>

                <div class="mb-3">
                    <label for="profile_visibility" class="form-label">Profile Visibility</label>
                    <select class="form-select" id="profile_visibility" name="profile_visibility">
                        <option value="public" ${this.user.profile_visibility === 'public' ? 'selected' : ''}>
                            Public - Anyone can view your profile
                        </option>
                        <option value="followers" ${this.user.profile_visibility === 'followers' ? 'selected' : ''}>
                            Followers Only - Only people you follow back can view your profile
                        </option>
                        <option value="private" ${this.user.profile_visibility === 'private' ? 'selected' : ''}>
                            Private - Only you can view your profile
                        </option>
                    </select>
                    <div class="form-text">Who can see your basic profile information</div>
                    <div class="invalid-feedback"></div>
                </div>

                <div class="mb-3">
                    <label for="interview_visibility" class="form-label">Interview Visibility</label>
                    <select class="form-select" id="interview_visibility" name="interview_visibility">
                        <option value="public" ${this.user.interview_visibility === 'public' ? 'selected' : ''}>
                            Public - Anyone can view your interviews
                        </option>
                        <option value="followers" ${this.user.interview_visibility === 'followers' ? 'selected' : ''}>
                            Followers Only - Only people you follow back can view your interviews
                        </option>
                        <option value="private" ${this.user.interview_visibility === 'private' ? 'selected' : ''}>
                            Private - Only you can view your interviews
                        </option>
                    </select>
                    <div class="form-text">Who can see your interview content</div>
                    <div class="invalid-feedback"></div>
                </div>

                <div class="mb-3">
                    <label for="activity_visibility" class="form-label">Activity Visibility</label>
                    <select class="form-select" id="activity_visibility" name="activity_visibility">
                        <option value="public" ${this.user.activity_visibility === 'public' ? 'selected' : ''}>
                            Public - Anyone can see your activity
                        </option>
                        <option value="followers" ${this.user.activity_visibility === 'followers' ? 'selected' : ''}>
                            Followers Only - Only people you follow back can see your activity
                        </option>
                        <option value="private" ${this.user.activity_visibility === 'private' ? 'selected' : ''}>
                            Private - Only you can see your activity
                        </option>
                    </select>
                    <div class="form-text">Who can see your likes, comments, and other activity</div>
                    <div class="invalid-feedback"></div>
                </div>

                <div class="alert alert-info">
                    <h6 class="alert-heading">Privacy Information</h6>
                    <ul class="mb-0 small">
                        <li><strong>Public:</strong> Visible to everyone, including non-registered users</li>
                        <li><strong>Followers Only:</strong> Visible only to users who follow you and you follow back</li>
                        <li><strong>Private:</strong> Visible only to you</li>
                    </ul>
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
                role: formData.get('role'),
                profile_visibility: formData.get('profile_visibility'),
                interview_visibility: formData.get('interview_visibility'),
                activity_visibility: formData.get('activity_visibility')
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

    async handleRemoveAvatar() {
        if (!confirm('Are you sure you want to remove your profile picture?')) {
            return;
        }

        try {
            const response = await Auth.removeAvatar();

            if (response.success) {
                // Update preview to default avatar
                const preview = document.getElementById('avatar-preview');
                preview.src = '/assets/default-avatar.png';

                this.user.avatar_url = null;
                this.showAlert('success', 'Profile picture removed successfully!');
            }

        } catch (error) {
            console.error('Avatar removal error:', error);
            this.showAlert('error', 'Failed to remove profile picture');
        }
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
        const modalHtml = `
            <div class="modal fade" id="changePasswordModal" tabindex="-1" aria-labelledby="changePasswordModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="changePasswordModalLabel">Change Password</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="password-alert-container"></div>
                            <form id="change-password-form">
                                <div class="mb-3">
                                    <label for="current_password" class="form-label">Current Password</label>
                                    <input type="password" class="form-control" id="current_password" name="current_password" required>
                                    <div class="invalid-feedback"></div>
                                </div>
                                <div class="mb-3">
                                    <label for="new_password" class="form-label">New Password</label>
                                    <input type="password" class="form-control" id="new_password" name="new_password" required minlength="8">
                                    <div class="form-text">Password must be at least 8 characters long</div>
                                    <div class="invalid-feedback"></div>
                                </div>
                                <div class="mb-3">
                                    <label for="confirm_password" class="form-label">Confirm New Password</label>
                                    <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
                                    <div class="invalid-feedback"></div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="save-password-btn">Change Password</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('changePasswordModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Initialize Bootstrap modal
        const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));

        // Set up event listeners
        this.setupPasswordModalListeners(modal);

        // Show modal
        modal.show();
    }

    showDeleteAccountModal() {
        const modalHtml = `
            <div class="modal fade" id="deleteAccountModal" tabindex="-1" aria-labelledby="deleteAccountModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title" id="deleteAccountModalLabel">
                                <i class="fas fa-exclamation-triangle me-2"></i>Delete Account
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="delete-alert-container"></div>

                            <div class="alert alert-danger">
                                <h6 class="alert-heading">⚠️ Warning: This action cannot be undone!</h6>
                                <p class="mb-0">Deleting your account will permanently remove:</p>
                                <ul class="mt-2 mb-0">
                                    <li>Your profile and all personal information</li>
                                    <li>All your interviews and media content</li>
                                    <li>Your comments and likes</li>
                                    <li>Your follower/following relationships</li>
                                    <li>Any communities or events you created</li>
                                </ul>
                            </div>

                            <form id="delete-account-form">
                                <div class="mb-3">
                                    <label for="delete_password" class="form-label">Enter your password to confirm:</label>
                                    <input type="password" class="form-control" id="delete_password" name="password" required>
                                    <div class="invalid-feedback"></div>
                                </div>

                                <div class="mb-3">
                                    <label for="delete_confirmation" class="form-label">
                                        Type <strong>DELETE</strong> to confirm:
                                    </label>
                                    <input type="text" class="form-control" id="delete_confirmation" name="confirmation" required placeholder="Type DELETE here">
                                    <div class="invalid-feedback"></div>
                                </div>

                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" id="delete_understand" required>
                                    <label class="form-check-label" for="delete_understand">
                                        I understand that this action is permanent and cannot be undone
                                    </label>
                                    <div class="invalid-feedback"></div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirm-delete-btn" disabled>
                                <i class="fas fa-trash me-2"></i>Delete My Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('deleteAccountModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Initialize Bootstrap modal
        const modal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));

        // Set up event listeners
        this.setupDeleteModalListeners(modal);

        // Show modal
        modal.show();
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

    setupPasswordModalListeners(modal) {
        const form = document.getElementById('change-password-form');
        const saveBtn = document.getElementById('save-password-btn');
        const newPasswordField = document.getElementById('new_password');
        const confirmPasswordField = document.getElementById('confirm_password');

        // Form submission
        saveBtn.addEventListener('click', () => this.handlePasswordChange(form, saveBtn, modal));

        // Real-time password confirmation validation
        const validatePasswordMatch = () => {
            if (confirmPasswordField.value && newPasswordField.value !== confirmPasswordField.value) {
                confirmPasswordField.classList.add('is-invalid');
                confirmPasswordField.parentNode.querySelector('.invalid-feedback').textContent = 'Passwords do not match';
            } else {
                confirmPasswordField.classList.remove('is-invalid');
                confirmPasswordField.parentNode.querySelector('.invalid-feedback').textContent = '';
            }
        };

        newPasswordField.addEventListener('input', validatePasswordMatch);
        confirmPasswordField.addEventListener('input', validatePasswordMatch);

        // Clear errors on input
        form.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('is-invalid');
                input.parentNode.querySelector('.invalid-feedback').textContent = '';
                this.clearPasswordAlert();
            });
        });

        // Clean up modal on hide
        modal._element.addEventListener('hidden.bs.modal', () => {
            modal._element.remove();
        });
    }

    async handlePasswordChange(form, saveBtn, modal) {
        try {
            this.setPasswordLoadingState(saveBtn, true);
            this.clearPasswordErrors();

            const formData = new FormData(form);
            const passwordData = {
                current_password: formData.get('current_password'),
                new_password: formData.get('new_password'),
                confirm_password: formData.get('confirm_password')
            };

            // Client-side validation
            if (passwordData.new_password !== passwordData.confirm_password) {
                this.showPasswordFieldError('confirm_password', 'Passwords do not match');
                return;
            }

            if (passwordData.new_password.length < 8) {
                this.showPasswordFieldError('new_password', 'Password must be at least 8 characters long');
                return;
            }

            const response = await Auth.changePassword(passwordData);

            if (response.success) {
                this.showPasswordAlert('success', 'Password changed successfully!');

                // Close modal after a short delay
                setTimeout(() => {
                    modal.hide();
                    this.showAlert('success', 'Password changed successfully!');
                }, 1500);
            } else {
                this.handlePasswordChangeError(response);
            }

        } catch (error) {
            console.error('Password change error:', error);
            this.showPasswordAlert('error', error.message || 'Failed to change password');
        } finally {
            this.setPasswordLoadingState(saveBtn, false);
        }
    }

    setPasswordLoadingState(button, loading) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Changing...
            `;
        } else {
            button.disabled = false;
            button.innerHTML = 'Change Password';
        }
    }

    showPasswordAlert(type, message) {
        const container = document.getElementById('password-alert-container');
        const alertClass = type === 'error' ? 'alert-danger' : `alert-${type}`;

        container.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    clearPasswordAlert() {
        const container = document.getElementById('password-alert-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    showPasswordFieldError(fieldName, message) {
        const field = document.getElementById(fieldName);
        if (field) {
            field.classList.add('is-invalid');
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = message;
            }
        }
    }

    clearPasswordErrors() {
        this.clearPasswordAlert();

        const invalidFields = document.querySelectorAll('#change-password-form .is-invalid');
        invalidFields.forEach(field => {
            field.classList.remove('is-invalid');
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = '';
            }
        });
    }

    handlePasswordChangeError(response) {
        if (response.errors) {
            // Show field-specific errors
            Object.keys(response.errors).forEach(field => {
                this.showPasswordFieldError(field, response.errors[field]);
            });
        } else {
            // Show general error
            this.showPasswordAlert('error', response.message || 'Failed to change password');
        }
    }

    setupDeleteModalListeners(modal) {
        const form = document.getElementById('delete-account-form');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        const passwordField = document.getElementById('delete_password');
        const confirmationField = document.getElementById('delete_confirmation');
        const understandCheckbox = document.getElementById('delete_understand');

        // Enable/disable confirm button based on form validity
        const validateDeleteForm = () => {
            const isValid = passwordField.value.length > 0 &&
                           confirmationField.value === 'DELETE' &&
                           understandCheckbox.checked;

            confirmBtn.disabled = !isValid;

            // Update confirmation field styling
            if (confirmationField.value && confirmationField.value !== 'DELETE') {
                confirmationField.classList.add('is-invalid');
                confirmationField.parentNode.querySelector('.invalid-feedback').textContent = 'Please type "DELETE" exactly';
            } else {
                confirmationField.classList.remove('is-invalid');
                confirmationField.parentNode.querySelector('.invalid-feedback').textContent = '';
            }
        };

        // Form validation listeners
        passwordField.addEventListener('input', validateDeleteForm);
        confirmationField.addEventListener('input', validateDeleteForm);
        understandCheckbox.addEventListener('change', validateDeleteForm);

        // Confirm delete button
        confirmBtn.addEventListener('click', () => this.handleAccountDeletion(form, confirmBtn, modal));

        // Clear errors on input
        form.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('is-invalid');
                const feedback = input.parentNode.querySelector('.invalid-feedback');
                if (feedback) {
                    feedback.textContent = '';
                }
                this.clearDeleteAlert();
            });
        });

        // Clean up modal on hide
        modal._element.addEventListener('hidden.bs.modal', () => {
            modal._element.remove();
        });
    }

    async handleAccountDeletion(form, confirmBtn, modal) {
        // Final confirmation
        if (!confirm('Are you absolutely sure you want to delete your account? This action cannot be undone!')) {
            return;
        }

        try {
            this.setDeleteLoadingState(confirmBtn, true);
            this.clearDeleteErrors();

            const formData = new FormData(form);
            const deleteData = {
                password: formData.get('password'),
                confirmation: formData.get('confirmation')
            };

            const response = await Auth.deleteAccount(deleteData);

            if (response.success) {
                this.showDeleteAlert('success', 'Account deleted successfully. You will be redirected shortly...');

                // Redirect to home page after a delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                this.handleDeleteError(response);
            }

        } catch (error) {
            console.error('Account deletion error:', error);
            this.showDeleteAlert('error', error.message || 'Failed to delete account');
        } finally {
            this.setDeleteLoadingState(confirmBtn, false);
        }
    }

    setDeleteLoadingState(button, loading) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Deleting Account...
            `;
        } else {
            button.innerHTML = '<i class="fas fa-trash me-2"></i>Delete My Account';
            // Don't re-enable button - form validation will handle it
        }
    }

    showDeleteAlert(type, message) {
        const container = document.getElementById('delete-alert-container');
        const alertClass = type === 'error' ? 'alert-danger' : `alert-${type}`;

        container.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    clearDeleteAlert() {
        const container = document.getElementById('delete-alert-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    clearDeleteErrors() {
        this.clearDeleteAlert();

        const invalidFields = document.querySelectorAll('#delete-account-form .is-invalid');
        invalidFields.forEach(field => {
            field.classList.remove('is-invalid');
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = '';
            }
        });
    }

    handleDeleteError(response) {
        if (response.errors) {
            // Show field-specific errors
            Object.keys(response.errors).forEach(field => {
                this.showDeleteFieldError(field, response.errors[field]);
            });
        } else {
            // Show general error
            this.showDeleteAlert('error', response.message || 'Failed to delete account');
        }
    }

    showDeleteFieldError(fieldName, message) {
        const field = document.getElementById(`delete_${fieldName}`);
        if (field) {
            field.classList.add('is-invalid');
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = message;
            }
        }
    }
}

export default EditProfilePage;
