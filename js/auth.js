/**
 * Client Authentication Module - Worker-Based
 */

(function() {
    'use strict';

    const WORKER_URL = 'https://audio-player-proxy.shubhamdocument45.workers.dev';

    function checkAuth() {
        const session = localStorage.getItem('audioPlayerSession');
        
        if (!session) {
            redirectToLogin();
            return false;
        }

        try {
            const sessionData = JSON.parse(session);
            const now = Date.now();

            if (now >= sessionData.expiresAt) {
                logout();
                return false;
            }

            showUserInfo(sessionData);
            
            // Add token to all fetch requests
            interceptFetch(sessionData.token);
            
            return true;
        } catch (e) {
            logout();
            return false;
        }
    }

    function interceptFetch(token) {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            if (args[0].includes(WORKER_URL)) {
                const options = args[1] || {};
                options.headers = options.headers || {};
                options.headers['Authorization'] = `Bearer ${token}`;
                args[1] = options;
            }
            return originalFetch.apply(this, args);
        };
    }

    function redirectToLogin() {
        window.location.href = 'login.html';
    }

    function logout() {
        localStorage.removeItem('audioPlayerSession');
        redirectToLogin();
    }

    function showUserInfo(sessionData) {
        const header = document.querySelector('.bg-gradient-to-r');
        if (header && !document.getElementById('user-info')) {
            const userInfo = document.createElement('div');
            userInfo.id = 'user-info';
            userInfo.className = 'absolute top-2 right-2 flex items-center gap-2 text-white text-sm';
            userInfo.innerHTML = `
                <span class="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    👤 ${sessionData.username}
                </span>
                <button onclick="window.authLogout()" class="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full transition" title="Logout">
                    🚪
                </button>
            `;
            header.appendChild(userInfo);
        }
    }

    let inactivityTimer;
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            alert('Session expired due to inactivity');
            logout();
        }, 30 * 60 * 1000);
    }

    function setupActivityMonitor() {
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetInactivityTimer, { passive: true });
        });
        resetInactivityTimer();
    }

    window.authLogout = logout;
    window.getCurrentUser = () => {
        const session = localStorage.getItem('audioPlayerSession');
        return session ? JSON.parse(session) : null;
    };

    if (checkAuth()) {
        setupActivityMonitor();
        console.log('✅ Authentication successful');
    }
})();
