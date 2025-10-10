/**
 * State Management Module
 * Manages all application state in memory
 */

const AppState = {
    currentPlaylist: [],
    filteredPlaylist: [],
    favorites: [],
    recentlyPlayed: [],
    currentTrackIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 0, // 0: off, 1: all, 2: one
    currentTab: 'all',
    darkMode: false,
    volume: 100,
	workerUrl: 'https://audio-player-proxy.shubhamdocument45.workers.dev', // Your worker URL
    apiKey: '03d2ca64-4423-4d38-9865-a9730a91ef68-1760081409459', // Same as worker
    //appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwq4uqQu2vixLsw5bg94QCT8jATCBuiepLnkBw2Gv-Mblx2V7XZp78XSbrAq76Wu962Fg/exec', // Hardcoded default URL
    folderStructure: null,
    currentFolder: null,
    currentPath: [],
    currentFolderMode: null,
    currentFolderName: ''
};

const SUPPORTED_FORMATS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus', '.wma'];

// Export/Import State Functions
function exportState() {
    const state = {
        version: '2.2',
        appsScriptUrl: AppState.appsScriptUrl,
        volume: AppState.volume,
        darkMode: AppState.darkMode,
        favorites: AppState.favorites,
        recentlyPlayed: AppState.recentlyPlayed,
        currentFolderMode: AppState.currentFolderMode,
        currentFolderName: AppState.currentFolderName,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio-player-state-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('State exported');
}

function importState(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const state = JSON.parse(e.target.result);
            
            if (state.version) {
                AppState.appsScriptUrl = state.appsScriptUrl || '';
                AppState.volume = state.volume || 100;
                AppState.darkMode = state.darkMode || false;
                AppState.favorites = state.favorites || [];
                AppState.recentlyPlayed = state.recentlyPlayed || [];
                AppState.currentFolderMode = state.currentFolderMode || null;
                AppState.currentFolderName = state.currentFolderName || '';
                
                applyImportedState();
                showToast('State imported successfully');
            } else {
                showMessage('Invalid state file format', true);
            }
        } catch (error) {
            showMessage('Error importing: ' + error.message, true);
        }
    };
    reader.readAsText(file);
}

function applyImportedState() {
    const appsScriptUrlInput = document.getElementById('apps-script-url-input');
    const volumeSlider = document.getElementById('volume-slider');
    const audioPlayer = document.getElementById('audio-player');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    if (appsScriptUrlInput) appsScriptUrlInput.value = AppState.appsScriptUrl;
    if (volumeSlider) volumeSlider.value = AppState.volume;
    if (audioPlayer) audioPlayer.volume = AppState.volume / 100;
    
    if (AppState.darkMode && darkModeToggle) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }
    
    if (AppState.currentFolderMode) {
        updateFolderBadge();
    }
}

// Initialize URL field on page load
function initializeAppsScriptUrl() {
    const appsScriptUrlInput = document.getElementById('apps-script-url-input');
    if (appsScriptUrlInput && !appsScriptUrlInput.value) {
        appsScriptUrlInput.value = AppState.appsScriptUrl;
    }
}

// Track ID Management
function getTrackId(track) {
    return track.fileId || track.name;
}

function addToRecentlyPlayed(track) {
    const trackId = getTrackId(track);
    AppState.recentlyPlayed = AppState.recentlyPlayed.filter(id => id !== trackId);
    AppState.recentlyPlayed.unshift(trackId);
    AppState.recentlyPlayed = AppState.recentlyPlayed.slice(0, 50);
}

// Persistence Functions
function savePlaylistState() {
    try {
        const state = {
            timestamp: Date.now(),
            currentFolderMode: AppState.currentFolderMode,
            currentFolderName: AppState.currentFolderName,
            currentTrackIndex: AppState.currentTrackIndex,
            // For Drive files - save full playlist
            drivePlaylist: AppState.currentPlaylist.filter(t => t.fileId).map(t => ({
                name: t.name,
                fileId: t.fileId,
                source: t.source,
                size: t.size
            })),
            // For local files - save metadata only
            localPlaylist: AppState.currentPlaylist.filter(t => !t.fileId).length > 0 ? {
                folderName: AppState.currentFolderName,
                fileNames: AppState.currentPlaylist.filter(t => !t.fileId).map(t => t.name),
                count: AppState.currentPlaylist.filter(t => !t.fileId).length
            } : null,
            currentPath: AppState.currentPath
        };
        localStorage.setItem('audioPlayerPlaylist', JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save playlist:', error);
    }
}

function loadPlaylistState() {
    try {
        const saved = localStorage.getItem('audioPlayerPlaylist');
        if (!saved) return false;
        
        const state = JSON.parse(saved);
        const dayOld = Date.now() - state.timestamp > 24 * 60 * 60 * 1000;
        
        if (dayOld) {
            localStorage.removeItem('audioPlayerPlaylist');
            return false;
        }
        
        // Restore Drive files
        if (state.drivePlaylist && state.drivePlaylist.length > 0) {
            AppState.currentPlaylist = state.drivePlaylist;
            AppState.filteredPlaylist = [...state.drivePlaylist];
            AppState.currentFolderMode = state.currentFolderMode;
            AppState.currentFolderName = state.currentFolderName;
            AppState.currentTrackIndex = state.currentTrackIndex;
            AppState.currentPath = state.currentPath || [];
            
            updateFolderBadge();
            renderPlaylist();
            showToast(`Restored ${state.drivePlaylist.length} Drive tracks`);
            return true;
        }
        
        // Show prompt for local files
        if (state.localPlaylist) {
            showMessage(`📁 Last session: "${state.localPlaylist.folderName}" (${state.localPlaylist.count} tracks). Please re-select the folder to continue.`, false);
            return false;
        }
        
        return false;
    } catch (error) {
        console.error('Failed to load playlist:', error);
        return false;
    }
}

function clearPlaylistState() {
    localStorage.removeItem('audioPlayerPlaylist');
}
