// theme.js - Premium Dark/Light Theme Controller for FMPG

(function () {
    // Determine the user's saved preference, or default to system preference
    const savedTheme = localStorage.getItem('fmpg-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    // Set the initial theme attribute immediately to avoid flash
    document.documentElement.setAttribute('data-theme', initialTheme);
    
    // Once the DOM content has loaded, we setup interactive toggles
    document.addEventListener('DOMContentLoaded', () => {
        setupThemeToggles();
    });

    window.addEventListener('storage', (e) => {
        if (e.key === 'fmpg-theme') {
            applyTheme(e.newValue || 'light');
        }
    });

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('fmpg-theme', theme);
        
        // Sync toggles visually
        const toggles = document.querySelectorAll('.theme-toggle-btn');
        toggles.forEach(btn => {
            if (theme === 'dark') {
                btn.classList.add('is-dark');
            } else {
                btn.classList.remove('is-dark');
            }
        });

        // Dispatch a custom theme changed event for dynamic components (e.g. charts)
        window.dispatchEvent(new CustomEvent('fmpgThemeChanged', { detail: { theme } }));
    }

    function setupThemeToggles() {
        const themeBtnContainer = document.querySelectorAll('.theme-toggle-btn');
        
        // Ensure buttons match the active theme initially
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        themeBtnContainer.forEach(btn => {
            if (currentTheme === 'dark') {
                btn.classList.add('is-dark');
            } else {
                btn.classList.remove('is-dark');
            }
            
            // Add click listener
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const nowTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                applyTheme(nowTheme);
            });
        });
    }

    // Expose toggler function globally
    window.toggleFmpgTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(targetTheme);
    };
})();
