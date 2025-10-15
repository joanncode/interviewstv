import { getGlobalI18n } from '../composables/useI18n.js';

/**
 * Language Switcher Component
 * Provides a dropdown interface for changing the application language
 */
class LanguageSwitcher {
    constructor() {
        this.i18n = getGlobalI18n();
        this.isOpen = false;
        this.container = null;
    }

    /**
     * Render the language switcher
     */
    render(container) {
        this.container = container;
        container.innerHTML = this.getHTML();
        this.setupEventListeners();
        this.updateCurrentLanguage();
    }

    /**
     * Get the HTML for the language switcher
     */
    getHTML() {
        const currentLocale = this.i18n.locale.value;
        const currentLocaleInfo = this.i18n.getLocaleInfo(currentLocale);
        
        return `
            <div class="language-switcher dropdown">
                <button class="btn btn-outline-light btn-sm dropdown-toggle" 
                        type="button" 
                        id="languageDropdown" 
                        data-bs-toggle="dropdown" 
                        aria-expanded="false"
                        title="Change Language">
                    <span class="flag-icon">${currentLocaleInfo.flag}</span>
                    <span class="language-code d-none d-md-inline ms-1">${currentLocale.toUpperCase()}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end language-menu" aria-labelledby="languageDropdown">
                    <li class="dropdown-header">
                        <i class="fas fa-globe me-2"></i>
                        ${this.i18n.t('common.labels.language')}
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    ${this.renderLanguageOptions()}
                </ul>
            </div>
        `;
    }

    /**
     * Render language options
     */
    renderLanguageOptions() {
        return this.i18n.availableLocales.value.map(locale => {
            const isActive = locale.code === this.i18n.locale.value;
            const activeClass = isActive ? 'active' : '';
            
            return `
                <li>
                    <a class="dropdown-item language-option ${activeClass}" 
                       href="#" 
                       data-locale="${locale.code}"
                       ${isActive ? 'aria-current="true"' : ''}>
                        <span class="flag-icon me-2">${locale.flag}</span>
                        <span class="language-name">${locale.nativeName}</span>
                        <span class="language-english-name text-muted ms-1">(${locale.name})</span>
                        ${isActive ? '<i class="fas fa-check ms-auto text-success"></i>' : ''}
                    </a>
                </li>
            `;
        }).join('');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.container) return;

        // Handle language selection
        this.container.addEventListener('click', (e) => {
            const languageOption = e.target.closest('.language-option');
            if (languageOption) {
                e.preventDefault();
                const locale = languageOption.dataset.locale;
                this.changeLanguage(locale);
            }
        });

        // Listen for locale changes from other sources
        this.i18n.locale.value && this.setupLocaleWatcher();
    }

    /**
     * Setup locale watcher (if using reactive framework)
     */
    setupLocaleWatcher() {
        // For Vue.js reactive system
        if (typeof this.i18n.locale.value !== 'undefined') {
            // Watch for locale changes and update UI
            const originalLocale = this.i18n.locale.value;
            setInterval(() => {
                if (this.i18n.locale.value !== originalLocale) {
                    this.updateCurrentLanguage();
                }
            }, 100);
        }
    }

    /**
     * Change the application language
     */
    async changeLanguage(locale) {
        if (locale === this.i18n.locale.value) {
            return; // Already selected
        }

        try {
            // Show loading state
            this.showLoadingState();

            // Change locale
            const success = await this.i18n.setLocale(locale);
            
            if (success) {
                // Update UI
                this.updateCurrentLanguage();
                
                // Trigger custom event for other components to update
                this.dispatchLanguageChangeEvent(locale);
                
                // Show success message
                this.showSuccessMessage(locale);
                
                // Reload page to apply translations everywhere
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                this.showErrorMessage();
            }
        } catch (error) {
            console.error('Failed to change language:', error);
            this.showErrorMessage();
        }
    }

    /**
     * Update the current language display
     */
    updateCurrentLanguage() {
        if (!this.container) return;

        const currentLocale = this.i18n.locale.value;
        const currentLocaleInfo = this.i18n.getLocaleInfo(currentLocale);
        
        // Update button
        const button = this.container.querySelector('#languageDropdown');
        if (button) {
            const flagIcon = button.querySelector('.flag-icon');
            const languageCode = button.querySelector('.language-code');
            
            if (flagIcon) flagIcon.textContent = currentLocaleInfo.flag;
            if (languageCode) languageCode.textContent = currentLocale.toUpperCase();
        }

        // Update dropdown options
        const dropdown = this.container.querySelector('.language-menu');
        if (dropdown) {
            dropdown.innerHTML = `
                <li class="dropdown-header">
                    <i class="fas fa-globe me-2"></i>
                    ${this.i18n.t('common.labels.language')}
                </li>
                <li><hr class="dropdown-divider"></li>
                ${this.renderLanguageOptions()}
            `;
        }

        // Update document direction for RTL languages
        document.documentElement.dir = this.i18n.isRTL(currentLocale) ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLocale;
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const button = this.container?.querySelector('#languageDropdown');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span class="d-none d-md-inline ms-1">Loading...</span>';
        }
    }

    /**
     * Show success message
     */
    showSuccessMessage(locale) {
        const localeInfo = this.i18n.getLocaleInfo(locale);
        
        // Create toast notification
        this.showToast(
            'success',
            `${localeInfo.flag} Language changed to ${localeInfo.nativeName}`,
            'The page will reload to apply all translations.'
        );
    }

    /**
     * Show error message
     */
    showErrorMessage() {
        this.showToast(
            'error',
            'Failed to change language',
            'Please try again or refresh the page.'
        );
    }

    /**
     * Show toast notification
     */
    showToast(type, title, message) {
        // Create toast element
        const toastId = `toast-${Date.now()}`;
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <strong>${title}</strong><br>
                        <small>${message}</small>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        // Add to toast container or create one
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);

        // Show toast
        const toastElement = document.getElementById(toastId);
        if (toastElement && window.bootstrap) {
            const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
            toast.show();

            // Remove from DOM after hiding
            toastElement.addEventListener('hidden.bs.toast', () => {
                toastElement.remove();
            });
        }
    }

    /**
     * Dispatch language change event
     */
    dispatchLanguageChangeEvent(locale) {
        const event = new CustomEvent('languageChanged', {
            detail: { 
                locale,
                localeInfo: this.i18n.getLocaleInfo(locale)
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get current locale
     */
    getCurrentLocale() {
        return this.i18n.locale.value;
    }

    /**
     * Check if locale is RTL
     */
    isRTL(locale = null) {
        return this.i18n.isRTL(locale || this.i18n.locale.value);
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container = null;
        }
    }
}

export default LanguageSwitcher;
