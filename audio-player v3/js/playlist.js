/**
 * Playlist Management Module
 * Handles playlist filtering, rendering, and manipulation
 */

function switchTab(tab) {
    AppState.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    const titles = {
        all: 'All Tracks',
        favorites: 'Favorites',
        recent: 'Recently Played'
    };
    const tabTitle = document.getElementById('tab-title');
    if (tabTitle) tabTitle.textContent = titles[tab];
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    filterPlaylist();
}

function filterPlaylist(query = '') {
    let filtered = [...AppState.currentPlaylist];
    
    if (AppState.currentTab === 'favorites') {
        filtered = filtered.filter(track => AppState.favorites.includes(getTrackId(track)));
    } else if (AppState.currentTab === 'recent') {
        filtered = filtered.sort((a, b) => {
            const aIndex = AppState.recentlyPlayed.indexOf(getTrackId(a));
            const bIndex = AppState.recentlyPlayed.indexOf(getTrackId(b));
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        }).slice(0, 50);
    }
    
    if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(track => 
            track.name.toLowerCase().includes(lowerQuery)
        );
    }
    
    AppState.filteredPlaylist = filtered;
    renderPlaylist();
    
    const searchResultsCount = document.getElementById('search-results-count');
    if (searchResultsCount) {
        if (query) {
            searchResultsCount.textContent = `Found ${filtered.length} track${filtered.length !== 1 ? 's' : ''}`;
            searchResultsCount.classList.remove('hidden');
        } else {
            searchResultsCount.classList.add('hidden');
        }
    }
}

function renderPlaylist() {
    const playlistContainer = document.getElementById('playlist-container');
    const trackCountSpan = document.getElementById('track-count');
    const emptyPlaylist = document.getElementById('empty-playlist');
    
    if (!playlistContainer || !trackCountSpan) {
        return;
    }
    
    playlistContainer.innerHTML = '';
    trackCountSpan.textContent = AppState.filteredPlaylist.length;
    
    if (AppState.filteredPlaylist.length === 0) {
        if (emptyPlaylist) {
            emptyPlaylist.style.display = 'block';
            const messages = {
                all: 'Browse folders to load music',
                favorites: 'No favorites yet',
                recent: 'No recently played tracks'
            };
            emptyPlaylist.textContent = messages[AppState.currentTab] || 'No tracks';
        }
        return;
    }
    
    if (emptyPlaylist) {
        emptyPlaylist.style.display = 'none';
    }

    AppState.filteredPlaylist.forEach((track, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'playlist-item p-3 rounded-lg flex items-center justify-between';
        
        const isCurrent = AppState.currentPlaylist.indexOf(track) === AppState.currentTrackIndex;
        if (isCurrent) itemDiv.classList.add('active');
        
        const trackDiv = document.createElement('div');
        trackDiv.className = 'truncate pr-4 flex-1 cursor-pointer';
        
        const isFav = AppState.favorites.includes(getTrackId(track));
        
        trackDiv.innerHTML = `
            <span class="text-sm font-mono text-gray-500">${index + 1}.</span>
            <span class="ml-2 text-gray-700">${track.name}</span>
            ${track.fileId ? '<span class="ml-2 text-xs">☁️</span>' : ''}
            ${isFav ? '<span class="ml-2 text-xs">❤️</span>' : ''}
        `;
        trackDiv.addEventListener('click', () => loadTrack(index));
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-red-500 hover:text-red-700 text-sm px-2';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Remove';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTrack(index);
        });
        
        itemDiv.appendChild(trackDiv);
        itemDiv.appendChild(removeBtn);
        playlistContainer.appendChild(itemDiv);
    });
}

function removeTrack(index) {
    const track = AppState.filteredPlaylist[index];
    const wasPlaying = AppState.currentPlaylist.indexOf(track) === AppState.currentTrackIndex;
    AppState.currentPlaylist.splice(AppState.currentPlaylist.indexOf(track), 1);
    filterPlaylist();
    
    if (wasPlaying && AppState.filteredPlaylist.length > 0) {
        loadTrack(Math.min(index, AppState.filteredPlaylist.length - 1));
    }
}

function clearPlaylist() {
    if (confirm('Clear entire playlist?')) {
        const audioPlayer = document.getElementById('audio-player');
        const playPauseBtn = document.getElementById('play-pause-btn');
        
        AppState.currentPlaylist = [];
        AppState.filteredPlaylist = [];
        AppState.currentTrackIndex = -1;
        AppState.currentFolderMode = null;
        AppState.currentFolderName = '';
        if (audioPlayer) audioPlayer.pause();
        AppState.isPlaying = false;
        if (playPauseBtn) playPauseBtn.textContent = '▶️';
        updateFolderBadge();
        renderPlaylist();
        clearPlaylistState(); // ADD THIS
        showToast('Playlist cleared');
    }
}

function sortPlaylist() {
    AppState.currentPlaylist.sort((a, b) => a.name.localeCompare(b.name));
    filterPlaylist();
    showToast('Sorted A-Z');
}

function handleLocalFiles(event) {
    const files = Array.from(event.target.files).filter(f => 
        SUPPORTED_FORMATS.some(ext => f.name.toLowerCase().endsWith(ext))
    );
    
    if (files.length === 0) {
        showMessage("No supported audio files found", true);
        event.target.value = '';
        return;
    }
    
    const folderName = files[0].webkitRelativePath?.split('/')[0] || 'Local';
    
    AppState.currentPlaylist = files.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file),
        source: 'Local Folder',
        size: formatBytes(file.size),
        sizeBytes: file.size
    }));
    
    AppState.currentFolderMode = folderName;
    AppState.currentFolderName = folderName;
    AppState.currentTab = 'all';
    AppState.currentTrackIndex = -1;
    
    filterPlaylist('');
    updateFolderBadge();
    showToast(`Loaded ${AppState.currentPlaylist.length} tracks from "${folderName}"`);
    
    savePlaylistState(); // ADD THIS
    
    event.target.value = '';
}