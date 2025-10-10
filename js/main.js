function init() {
    // Check if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeAppsScriptUrl();
            setupEventListeners();
            loadPlaylistState();
        });
    } else {
        initializeAppsScriptUrl();
        setupEventListeners();
        const restored = loadPlaylistState();
        
        if (!restored) {
            showToast('Browse Drive folders or load local folder to start');
        }
    }
}

init();
