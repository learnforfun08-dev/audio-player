/**
 * Playlist Management Module - FIXED PAGINATION
 */

const ITEMS_PER_PAGE = 50;
let currentPage = 0;

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
    
    currentPage = 0;
    filterPlaylist();
}

function filterPlaylist(query = '') {
    currentPage = 0;
    
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
    
    if (!playlistContainer || !trackCountSpan) return;
    
    trackCountSpan.textContent = AppState.filteredPlaylist.length;
    
    if (AppState.filteredPlaylist.length === 0) {
        playlistContainer.innerHTML = '';
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
    
    if (emptyPlaylist) emptyPlaylist.style.display = 'none';

    const totalItems = AppState.filteredPlaylist.length;
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    const visibleItems = AppState.filteredPlaylist.slice(startIndex, endIndex);

    const fragment = document.createDocumentFragment();
    
    visibleItems.forEach((track, index) => {
        const actualIndex = startIndex + index; // This is the index in filteredPlaylist
        const itemDiv = document.createElement('div');
        itemDiv.className = 'playlist-item p-3 rounded-lg flex items-center justify-between';
        
        const isCurrent = AppState.currentPlaylist.indexOf(track) === AppState.currentTrackIndex;
        if (isCurrent) itemDiv.classList.add('active');
        
        const isFav = AppState.favorites.includes(getTrackId(track));
        
        itemDiv.innerHTML = `
            <div class="truncate pr-4 flex-1 cursor-pointer" data-track-index="${actualIndex}">
                <span class="text-sm font-mono text-gray-500">${actualIndex + 1}.</span>
                <span class="ml-2 text-gray-700">${track.name}</span>
                ${track.fileId ? '<span class="ml-2 text-xs">☁️</span>' : ''}
                ${isFav ? '<span class="ml-2 text-xs">❤️</span>' : ''}
            </div>
            <button class="text-red-500 hover:text-red-700 text-sm px-2" data-index="${actualIndex}">✕</button>
        `;
        
        fragment.appendChild(itemDiv);
    });

    playlistContainer.innerHTML = '';
    playlistContainer.appendChild(fragment);

    if (totalItems > ITEMS_PER_PAGE) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'flex justify-center gap-2 mt-3 text-sm';
        paginationDiv.innerHTML = `
            <button id="prev-page" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" ${currentPage === 0 ? 'disabled' : ''}>← Prev</button>
            <span class="px-3 py-1">Page ${currentPage + 1} of ${Math.ceil(totalItems / ITEMS_PER_PAGE)}</span>
            <button id="next-page" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" ${endIndex >= totalItems ? 'disabled' : ''}>Next →</button>
        `;
        playlistContainer.appendChild(paginationDiv);
        
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                renderPlaylist();
            }
        });
        
        document.getElementById('next-page')?.addEventListener('click', () => {
            if (endIndex < totalItems) {
                currentPage++;
                renderPlaylist();
            }
        });
    }
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
        clearPlaylistState();
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
    
    savePlaylistState();
    
    event.target.value = '';
}

