/**
 * State Management Module
 */

const AppState = {
    currentPlaylist: [],
    filteredPlaylist: [],
    favorites: [],
    recentlyPlayed: [],
    currentTrackIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 0,
    currentTab: 'all',
    darkMode: false,
    volume: 100,
    workerUrl: 'https://audio-player-proxy.shubhamdocument45.workers.dev',
    apiKey: '662fab96d5fda8e2f31f4122bc712feb80e98fa4131f96c6f780166a746d688f',
    folderStructure: null,
    currentFolder: null,
    currentPath: [],
    currentFolderMode: null,
    currentFolderName: ''
};

const SUPPORTED_FORMATS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus', '.wma'];

// Track ID with cache
const trackIdCache = new Map();

function getTrackId(track) {
    if (!trackIdCache.has(track)) {
        trackIdCache.set(track, track.fileId || track.name);
    }
    return trackIdCache.get(track);
}

setInterval(() => {
    if (trackIdCache.size > 1000) trackIdCache.clear();
}, 60000);

function addToRecentlyPlayed(track) {
    const trackId = getTrackId(track);
    AppState.recentlyPlayed = AppState.recentlyPlayed.filter(id => id !== trackId);
    AppState.recentlyPlayed.unshift(trackId);
    AppState.recentlyPlayed = AppState.recentlyPlayed.slice(0, 50);
}

// Debounced save
let saveTimeout = null;

function savePlaylistState() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            const state = {
                timestamp: Date.now(),
                currentFolderMode: AppState.currentFolderMode,
                currentFolderName: AppState.currentFolderName,
                currentTrackIndex: AppState.currentTrackIndex,
                drivePlaylist: AppState.currentPlaylist.filter(t => t.fileId).map(t => ({
                    name: t.name,
                    fileId: t.fileId,
                    source: t.source,
                    size: t.size
                })),
                localPlaylist: AppState.currentPlaylist.filter(t => !t.fileId).length > 0 ? {
                    folderName: AppState.currentFolderName,
                    fileNames: AppState.currentPlaylist.filter(t => !t.fileId).map(t => t.name),
                    count: AppState.currentPlaylist.filter(t => !t.fileId).length
                } : null,
                currentPath: AppState.currentPath
            };
            localStorage.setItem('audioPlayerPlaylist', JSON.stringify(state));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded');
                const minimalState = {
                    timestamp: Date.now(),
                    currentFolderMode: AppState.currentFolderMode,
                    currentFolderName: AppState.currentFolderName,
                    drivePlaylist: AppState.currentPlaylist.filter(t => t.fileId).slice(0, 100)
                };
                localStorage.setItem('audioPlayerPlaylist', JSON.stringify(minimalState));
            }
        }
    }, 500);
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

function exportState() {
    const state = {
        version: '2.2',
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
    const volumeSlider = document.getElementById('volume-slider');
    const audioPlayer = document.getElementById('audio-player');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
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

function initializeAppsScriptUrl() {
    // No longer needed
}

