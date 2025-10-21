/**
 * Main Initialization
 */

function init() {
    // Check if all required functions are loaded
    const requiredFunctions = [
        'setupEventListeners',
        'loadPlaylistState',
        'showToast'
    ];
    
    const missingFunctions = requiredFunctions.filter(fn => typeof window[fn] === 'undefined');
    
    if (missingFunctions.length > 0) {
        console.log('Waiting for modules to load...', missingFunctions);
        setTimeout(init, 50);
        return;
    }
    
    // Check if DOM is ready
    if (!document.getElementById('dark-mode-toggle')) {
        setTimeout(init, 50);
        return;
    }
    
    console.log('Initializing Audio Player...');
    
    // Setup event listeners
    setupEventListeners();
    
    // Try to restore previous session
    const restored = loadPlaylistState();
    
    if (!restored) {
        showToast('Browse Drive folders or load local folder to start');
    }
    
    console.log('Audio Player initialized successfully');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
