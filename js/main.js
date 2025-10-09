function init() {
    // Initialize URL first (before event listeners)
    initializeAppsScriptUrl();
    
    setupEventListeners();
    
    // Try to restore previous session
    const restored = loadPlaylistState();
    
    if (!restored) {
        showToast('Browse Drive folders or load local folder to start');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}