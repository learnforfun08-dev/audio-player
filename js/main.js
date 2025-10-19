/**
 * Main Initialization
 */

function init() {
    // Wait for DOM
    if (!document.getElementById('dark-mode-toggle')) {
        setTimeout(init, 50);
        return;
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Try to restore previous session
    const restored = loadPlaylistState();
    
    if (!restored) {
        showToast('Browse Drive folders or load local folder to start');
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
