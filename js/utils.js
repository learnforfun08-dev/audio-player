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
    if (!statusMessage) return;
    
    statusMessage.innerHTML = message;
    statusMessage.className = `mt-4 p-3 text-sm rounded-lg ${isError ? 'text-red-800 bg-red-100 border border-red-300' : 'text-blue-800 bg-blue-100 border border-blue-300'}`;
    statusMessage.classList.remove('hidden');
    setTimeout(() => statusMessage.classList.add('hidden'), 8000);
}

// Dark Mode Toggle
function toggleDarkMode() {
    AppState.darkMode = !AppState.darkMode;
    document.body.classList.toggle('dark-mode');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.textContent = AppState.darkMode ? '☀️' : '🌙';
    }
}

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

// Batch DOM updates
function batchDOMUpdates(callback) {
    requestAnimationFrame(callback);
}

/**
 * Retry Logic & Error Handling
 */

// Exponential backoff retry
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            
            // Retry on 5xx errors
            if (response.status >= 500) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            // Don't retry on abort or client errors
            if (error.name === 'AbortError' || 
                error.message.includes('401') || 
                error.message.includes('403')) {
                throw error;
            }
            
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, i) * 1000;
            console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
            
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

// Global error boundary
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Don't show toast for every error, only critical ones
    if (event.error?.message?.includes('fetch')) {
        showToast('Network error - Check your connection', 5000);
    }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Network status monitoring
let wasOnline = navigator.onLine;

window.addEventListener('online', () => {
    if (!wasOnline) {
        showToast('Connection restored! 🎉');
        wasOnline = true;
    }
});

window.addEventListener('offline', () => {
    showToast('No internet connection ⚠️', 10000);
    wasOnline = false;
});

// Graceful degradation for Drive player
function handleDrivePlayerError(track) {
    console.warn('Drive player failed, attempting fallback');
    
    // Try direct download URL as fallback
    const fallbackUrl = `https://drive.google.com/uc?export=download&id=${track.fileId}`;
    
    const audioPlayer = document.getElementById('audio-player');
    if (audioPlayer) {
        audioPlayer.src = fallbackUrl;
        audioPlayer.play().catch(err => {
            showToast('Unable to play this track', 3000);
            console.error('Fallback also failed:', err);
        });
    }
}
