/**
 * Folder Browser Module - Phase 1 Security
 * Sends required auth parameters
 */

function openFolderBrowser() {
    document.getElementById('folder-browser-modal').classList.remove('hidden');
    AppState.currentPath = [];
    AppState.currentFolder = null;
    updateBreadcrumb();
}

function closeFolderBrowser() {
    document.getElementById('folder-browser-modal').classList.add('hidden');
    AppState.folderStructure = null;
}

async function browseDriveFolders(forceRefresh = false) {
    const folderList = document.getElementById('folder-list');
    const browseBtn = document.getElementById('drive-browse-btn');
    
    browseBtn.disabled = true;
    browseBtn.innerHTML = '<div class="loading-spinner inline-block mr-2"></div>Loading...';
    
    const loadingMsg = forceRefresh ? 
        '<p class="text-sm text-gray-600">Rebuilding folder structure...</p>' :
        '<p class="text-sm text-gray-600">Loading folder structure...</p>';
    
    folderList.innerHTML = `<div class="text-center py-8">
        <div class="loading-spinner mx-auto mb-3"></div>
        ${loadingMsg}
        <p class="text-xs text-gray-500 mt-2">${forceRefresh ? 'This may take 2-3 minutes' : 'Should be quick if cached'}</p>
    </div>`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes
        
        const url = `${AppState.workerUrl}?mode=folders${forceRefresh ? '&refresh=true' : ''}`;
        
        // SECURITY: Send required headers
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': AppState.apiKey,
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            credentials: 'omit' // Don't send cookies
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Handle different error codes
            if (response.status === 401) {
                throw new Error('Invalid API key - Check configuration');
            }
            if (response.status === 403) {
                throw new Error('Access forbidden - Origin not allowed');
            }
            if (response.status === 429) {
                throw new Error('Rate limit exceeded - Please wait a moment');
            }
            
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(data.error || 'Failed to load folders');
        }
        
        if (!data.folders) {
            throw new Error('Invalid response format');
        }
        
        AppState.folderStructure = data.folders;
        AppState.currentFolder = data.folders;
        AppState.currentPath = [data.folders.name];
        
        renderFolderView();
        
        const cacheStatus = response.headers.get('X-Cache-Status');
        const msg = forceRefresh ? 'Folder structure rebuilt' : 
                    cacheStatus === 'HIT' ? 'Loaded from cache ⚡' : 'Loaded & cached';
        showToast(msg);
        
    } catch (error) {
        console.error('Browse error:', error);
        
        let errorMsg = error.message;
        let retryBtn = true;
        
        // User-friendly error messages
        if (error.name === 'AbortError') {
            errorMsg = 'Request timeout - Folder is very large';
        } else if (errorMsg.includes('Failed to fetch')) {
            errorMsg = 'Network error - Check your internet connection';
        } else if (errorMsg.includes('Origin not allowed')) {
            errorMsg = 'Access denied - Contact administrator';
            retryBtn = false;
        }
        
        folderList.innerHTML = `<div class="text-center py-8 text-red-600">
            <p class="font-medium mb-2">⚠️ ${errorMsg}</p>
            ${retryBtn ? '<button onclick="browseDriveFolders()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Retry</button>' : ''}
        </div>`;
        
    } finally {
        browseBtn.disabled = false;
        browseBtn.textContent = '☁️ Load Folder Structure';
    }
}

function renderFolderView() {
    if (!AppState.currentFolder) return;

    const folders = Object.entries(AppState.currentFolder.folders || {});
    const files = AppState.currentFolder.files || [];
    const folderList = document.getElementById('folder-list');
    
    updateBreadcrumb();
    updateFolderStats(folders.length, files.length);

    const fragment = document.createDocumentFragment();

    if (AppState.currentPath.length > 1) {
        const backDiv = document.createElement('div');
        backDiv.className = 'folder-item p-3 rounded-lg cursor-pointer mb-2 border border-gray-300';
        backDiv.innerHTML = '<span class="text-xl">⬆️</span> <span class="ml-2 font-medium">.. (Go Back)</span>';
        backDiv.addEventListener('click', navigateBack);
        fragment.appendChild(backDiv);
    }

    folders.forEach(([name, folderData]) => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-item p-3 rounded-lg mb-2 border border-gray-300 flex justify-between items-center';
        
        folderDiv.innerHTML = `
            <div class="flex items-center flex-1 min-w-0 mr-3 cursor-pointer" data-folder-name="${name}">
                <span class="text-xl">📁</span>
                <span class="ml-2 font-medium truncate">${name}</span>
                <span class="ml-2 text-xs text-gray-500">(${folderData.audioCount} files)</span>
            </div>
            <button class="load-folder-btn px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700" data-folder-name="${name}">
                Play Folder
            </button>
        `;
        
        folderDiv.querySelector('[data-folder-name]').addEventListener('click', () => {
            navigateToFolder(name, folderData);
        });
        
        folderDiv.querySelector('.load-folder-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            loadFolderOnly(name, folderData);
        });
        
        fragment.appendChild(folderDiv);
    });

    folderList.innerHTML = '';
    
    if (folders.length === 0 && files.length === 0) {
        folderList.innerHTML = '<p class="text-gray-500 text-center py-8">This folder is empty</p>';
    } else {
        folderList.appendChild(fragment);
    }
}

function navigateToFolder(name, folderData) {
    AppState.currentFolder = folderData;
    AppState.currentPath.push(name);
    renderFolderView();
}

function navigateBack() {
    AppState.currentPath.pop();
    let folder = AppState.folderStructure;
    
    for (let i = 1; i < AppState.currentPath.length; i++) {
        folder = folder.folders[AppState.currentPath[i]];
    }
    
    AppState.currentFolder = folder;
    renderFolderView();
}

function loadFolderOnly(folderName, folderData) {
    const tracks = folderData.files || [];
    
    if (tracks.length === 0) {
        showToast('No audio files in this folder');
        return;
    }
    
    AppState.currentPlaylist = tracks.map(t => ({...t}));
    AppState.currentFolderMode = folderName;
    AppState.currentFolderName = folderName;
    AppState.currentTab = 'all';
    AppState.currentTrackIndex = -1;
    
    filterPlaylist('');
    updateFolderBadge();
    closeFolderBrowser();
    
    savePlaylistState();
    
    showToast(`Loaded ${tracks.length} tracks from "${folderName}"`);
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('current-path');
    breadcrumb.textContent = AppState.currentPath.length > 0 ? 
        AppState.currentPath.join(' / ') : '/';
}

function updateFolderStats(folderCount, fileCount) {
    const folderStats = document.getElementById('folder-stats');
    folderStats.textContent = `${folderCount} folder${folderCount !== 1 ? 's' : ''}, ${fileCount} audio file${fileCount !== 1 ? 's' : ''}`;
}

function updateFolderBadge() {
    const currentFolderBadge = document.getElementById('current-folder-badge');
    const folderNameDisplay = document.getElementById('folder-name-display');
    
    if (AppState.currentFolderMode) {
        currentFolderBadge.classList.remove('hidden');
        folderNameDisplay.textContent = AppState.currentFolderName;
    } else {
        currentFolderBadge.classList.add('hidden');
    }
}

function clearFolderMode() {
    AppState.currentFolderMode = null;
    AppState.currentFolderName = '';
    AppState.currentPlaylist = [];
    updateFolderBadge();
    filterPlaylist();
    showToast('Folder mode cleared');
}

try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes
        
        const url = `${AppState.workerUrl}?mode=folders${forceRefresh ? '&refresh=true' : ''}`;
        
        // SECURITY: Send required headers with retry logic
        const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: {
                'X-API-Key': AppState.apiKey,
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            credentials: 'omit'
        });
        
        clearTimeout(timeoutId);
