/**
 * Folder Browser Module
 * Handles Drive folder browsing and navigation
 */

// Open Folder Browser
function openFolderBrowser() {
    document.getElementById('folder-browser-modal').classList.remove('hidden');
    AppState.currentPath = [];
    AppState.currentFolder = null;
    updateBreadcrumb();
}

// Close Folder Browser
function closeFolderBrowser() {
    document.getElementById('folder-browser-modal').classList.add('hidden');
    AppState.folderStructure = null;
}

// Browse Drive Folders
async function browseDriveFolders() {
    const folderList = document.getElementById('folder-list');
    const browseBtn = document.getElementById('drive-browse-btn');
    
    browseBtn.disabled = true;
    browseBtn.textContent = 'Loading...';
    
    folderList.innerHTML = '<div class="text-center py-8"><div class="loading-spinner mx-auto"></div></div>';

    try {
        // Use worker with API key
        const response = await fetch(AppState.workerUrl + '?mode=folders', {
            method: 'GET',
            headers: {
                'X-API-Key': AppState.apiKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication failed - Invalid API key');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded - Please wait');
            } else if (response.status === 403) {
                throw new Error('Access forbidden - Check configuration');
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(data.error || 'Failed to load folders');
        }
        
        AppState.folderStructure = data.folders;
        AppState.currentFolder = data.folders;
        AppState.currentPath = [data.folders.name];
        
        renderFolderView();
        showToast('Folder structure loaded');
        
    } catch (error) {
        console.error('Browse error:', error);
        folderList.innerHTML = `<div class="text-center py-8 text-red-600">
            <p class="font-medium">Error: ${error.message}</p>
            <button onclick="browseDriveFolders()" class="mt-4 text-blue-600 underline">Retry</button>
        </div>`;
    } finally {
        browseBtn.disabled = false;
        browseBtn.textContent = '☁️ Load Folder Structure';
    }
}

// Render Folder View
function renderFolderView() {
    if (!AppState.currentFolder) return;

    const folders = Object.entries(AppState.currentFolder.folders || {});
    const files = AppState.currentFolder.files || [];
    const folderList = document.getElementById('folder-list');
    
    updateBreadcrumb();
    updateFolderStats(folders.length, files.length);

    const fragment = document.createDocumentFragment();

    // Back button
    if (AppState.currentPath.length > 1) {
        const backDiv = document.createElement('div');
        backDiv.className = 'folder-item p-3 rounded-lg cursor-pointer mb-2 border border-gray-300';
        backDiv.innerHTML = '<span class="text-xl">⬆️</span> <span class="ml-2 font-medium">.. (Go Back)</span>';
        backDiv.addEventListener('click', navigateBack);
        fragment.appendChild(backDiv);
    }

    // Render folders
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

// Navigate to Folder
function navigateToFolder(name, folderData) {
    AppState.currentFolder = folderData;
    AppState.currentPath.push(name);
    renderFolderView();
}

// Navigate Back
function navigateBack() {
    AppState.currentPath.pop();
    let folder = AppState.folderStructure;
    
    for (let i = 1; i < AppState.currentPath.length; i++) {
        folder = folder.folders[AppState.currentPath[i]];
    }
    
    AppState.currentFolder = folder;
    renderFolderView();
}

// Load Folder Only
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

// Update Breadcrumb
function updateBreadcrumb() {
    const breadcrumb = document.getElementById('current-path');
    breadcrumb.textContent = AppState.currentPath.length > 0 ? 
        AppState.currentPath.join(' / ') : '/';
}

// Update Folder Stats
function updateFolderStats(folderCount, fileCount) {
    const folderStats = document.getElementById('folder-stats');
    folderStats.textContent = `${folderCount} folder${folderCount !== 1 ? 's' : ''}, ${fileCount} audio file${fileCount !== 1 ? 's' : ''}`;
}

// Update Folder Badge
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

// Clear Folder Mode
function clearFolderMode() {
    AppState.currentFolderMode = null;
    AppState.currentFolderName = '';
    AppState.currentPlaylist = [];
    updateFolderBadge();
    filterPlaylist();
    showToast('Folder mode cleared');
}
