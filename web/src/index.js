// Import Bootstrap CSS and JS
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Import Font Awesome
import '@fortawesome/fontawesome-free/css/all.min.css';

// Import custom styles
import './styles/main.scss';

// Import core modules
import App from './App.js';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Remove loading screen if it exists
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // Initialize main app
    App.init();
    
    console.log('Interviews.tv application initialized');
});
