function init() {
    // Wait for DOM
    if (!document.getElementById('dark-mode-toggle')) {
        setTimeout(init, 50);
        return;
    }
    
    initializeAppsScriptUrl();
    setupEventListeners();
    
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
