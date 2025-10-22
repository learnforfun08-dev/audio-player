/**
 * Authentication Module
 * Protects the audio player from unauthorized access
 */

(function() {
    'use strict';

    // Check authentication immediately
    function checkAuth() {
        const session = localStorage.getItem('audioPlayerSession');
        
        if (!session) {
            redirectToLogin();
            return false;
        }

        try {
            const sessionData = JSON.parse(session);
            const now = Date.now();

            // Check if session expired
            if (now >= sessionData.expiresAt) {
                console.log('Session expired');
                logout();
                return false;
            }

            // Session valid - show user info
            showUserInfo(sessionData);
            return true;
        } catch (e) {
            console.error('Invalid session data:', e);
            logout();
            return false;
        }
    }

    // Redirect to login page
    function redirectToLogin() {
        window.location.href = 'login.html';
    }

    // Logout function
    function logout() {
        localStorage.removeItem('audioPlayerSession');
        redirectToLogin();
    }

    // Show user info in header
    function showUserInfo(sessionData) {
        // Add logout button to header
        const header = document.querySelector('.bg-gradient-to-r');
        if (header) {
            const userInfo = document.createElement('div');
            userInfo.className = 'absolute top-2 right-2 flex items-center gap-2 text-white text-sm';
            userInfo.innerHTML = `
                <span class="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    👤 ${sessionData.username}
                </span>
                <button onclick="window.authLogout()" class="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full transition" title="Logout">
                    🚪 Logout
                </button>
            `;
            header.appendChild(userInfo);
        }
    }

    // Session activity monitor (auto-logout on inactivity)
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            alert('Session expired due to inactivity');
            logout();
        }, INACTIVITY_TIMEOUT);
    }

    // Monitor user activity
    function setupActivityMonitor() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            document.addEventListener(event, resetInactivityTimer, { passive: true });
        });
        resetInactivityTimer();
    }

    // Get current user
    function getCurrentUser() {
        const session = localStorage.getItem('audioPlayerSession');
        if (!session) return null;
        
        try {
            return JSON.parse(session);
        } catch {
            return null;
        }
    }

    // Check if user has specific role
    function hasRole(role) {
        const user = getCurrentUser();
        return user && user.role === role;
    }

    // Export functions to global scope
    window.authLogout = logout;
    window.getCurrentUser = getCurrentUser;
    window.hasRole = hasRole;

    // Run auth check immediately
    if (checkAuth()) {
        setupActivityMonitor();
        console.log('✅ Authentication successful');
    }

    // Periodic session validation (every 5 minutes)
    setInterval(() => {
        const session = localStorage.getItem('audioPlayerSession');
        if (!session) {
            logout();
            return;
        }

        try {
            const sessionData = JSON.parse(session);
            if (Date.now() >= sessionData.expiresAt) {
                alert('Your session has expired. Please login again.');
                logout();
            }
        } catch {
            logout();
        }
    }, 5 * 60 * 1000);

})();
