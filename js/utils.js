/**
 * Utility Functions Module
 * Common helper functions used throughout the app
 */

// Time Formatting
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// File Size Formatting
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Toast Notifications
function showToast(message, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), duration);
}

// Status Messages
function showMessage(message, isError = false) {
    const statusMessage = document.getElementById('status-message');
    statusMessage.innerHTML = message;
    statusMessage.className = `mt-4 p-3 text-sm rounded-lg ${isError ? 'text-red-800 bg-red-100 border border-red-300' : 'text-blue-800 bg-blue-100 border border-blue-300'}`;
    statusMessage.classList.remove('hidden');
    setTimeout(() => statusMessage.classList.add('hidden'), 8000);
}

// Dark Mode Toggle
function toggleDarkMode() {
    AppState.darkMode = !AppState.darkMode;
    document.body.classList.toggle('dark-mode');
    document.getElementById('dark-mode-toggle').textContent = AppState.darkMode ? '☀️' : '🌙';
}

// Keyboard Shortcuts Handler
function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowLeft':
            playPrevious();
            break;
        case 'ArrowRight':
            playNext();
            break;
        case 'KeyS':
            toggleShuffle();
            break;
        case 'KeyR':
            toggleRepeat();
            break;
        case 'KeyM':
            toggleMute();
            break;
        case 'KeyF':
            toggleFavorite();
            break;
    }

}

// Add to js/utils.js

// Generic debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle for high-frequency events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Optimized keyboard handler with throttle
const handleKeyboard = throttle(function(e) {
    if (e.target.tagName === 'INPUT') return;
    
    const actions = {
        'Space': () => { e.preventDefault(); togglePlayPause(); },
        'ArrowLeft': playPrevious,
        'ArrowRight': playNext,
        'KeyS': toggleShuffle,
        'KeyR': toggleRepeat,
        'KeyM': toggleMute,
        'KeyF': toggleFavorite,
        'KeyZ': () => document.getElementById('search-input').focus()
    };
    
    actions[e.code]?.();
}, 100);

// Batch DOM updates
function batchDOMUpdates(callback) {
    requestAnimationFrame(callback);
}
