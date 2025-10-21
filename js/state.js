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

/**
 * ADD to js/state.js - Local Analytics (No External Tracking)
 */

const Analytics = {
    stats: {
        tracksPlayed: 0,
        totalPlaytime: 0,
        mostPlayedTracks: {},
        sessionsCount: 0,
        lastSession: null
    },
    
    init() {
        const saved = localStorage.getItem('playerAnalytics');
        if (saved) {
            this.stats = {...this.stats, ...JSON.parse(saved)};
        }
        this.stats.sessionsCount++;
        this.stats.lastSession = new Date().toISOString();
        this.save();
    },
    
    trackPlayed(trackId, duration) {
        this.stats.tracksPlayed++;
        this.stats.totalPlaytime += duration;
        
        if (!this.stats.mostPlayedTracks[trackId]) {
            this.stats.mostPlayedTracks[trackId] = 0;
        }
        this.stats.mostPlayedTracks[trackId]++;
        
        this.save();
    },
    
    save() {
        localStorage.setItem('playerAnalytics', JSON.stringify(this.stats));
    },
    
    getReport() {
        const topTracks = Object.entries(this.stats.mostPlayedTracks)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        return {
            totalTracks: this.stats.tracksPlayed,
            totalHours: (this.stats.totalPlaytime / 3600).toFixed(1),
            sessions: this.stats.sessionsCount,
            topTracks: topTracks.map(([id, plays]) => ({
                track: AppState.currentPlaylist.find(t => getTrackId(t) === id)?.name || id,
                plays
            }))
        };
    },
    
    clear() {
        this.stats = {
            tracksPlayed: 0,
            totalPlaytime: 0,
            mostPlayedTracks: {},
            sessionsCount: 0,
            lastSession: null
        };
        localStorage.removeItem('playerAnalytics');
    }
};

// Initialize analytics
Analytics.init();

// UPDATE handleTrackEnd() in player.js to track playback:
// Add before playNext(): 
// const track = AppState.currentPlaylist[AppState.currentTrackIndex];
// Analytics.trackPlayed(getTrackId(track), audioPlayer.duration);

// ADD button to show stats (in HTML):
// <button onclick="showAnalyticsReport()">📊 Stats</button>

function showAnalyticsReport() {
    const report = Analytics.getReport();
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 class="text-2xl font-bold mb-4">📊 Your Music Stats</h3>
            <div class="space-y-3">
                <p class="text-lg">🎵 Tracks Played: <strong>${report.totalTracks}</strong></p>
                <p class="text-lg">⏱️ Total Time: <strong>${report.totalHours} hours</strong></p>
                <p class="text-lg">📅 Sessions: <strong>${report.sessions}</strong></p>
                
                <div class="mt-4">
                    <h4 class="font-bold mb-2">🏆 Top Tracks:</h4>
                    <ol class="text-sm space-y-1">
                        ${report.topTracks.map((t, i) => 
                            `<li>${i+1}. ${t.track} <span class="text-gray-500">(${t.plays} plays)</span></li>`
                        ).join('')}
                    </ol>
                </div>
            </div>
            
            <div class="flex gap-2 mt-6">
                <button onclick="Analytics.clear(); this.closest('.fixed').remove(); showToast('Stats cleared');" 
                        class="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700">
                    Clear Stats
                </button>
                <button onclick="this.closest('.fixed').remove();" 
                        class="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function initializeAppsScriptUrl() {
    // No longer needed
}


