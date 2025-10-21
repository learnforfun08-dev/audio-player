function setupEventListeners() {
    // Use event delegation for playlist items
    const playlistContainer = document.getElementById('playlist-container');
    if (playlistContainer) {
        playlistContainer.addEventListener('click', (e) => {
            const trackDiv = e.target.closest('[data-track-index]');
            const removeBtn = e.target.closest('button[data-index]');
            
            if (trackDiv) {
                const index = parseInt(trackDiv.dataset.trackIndex);
                loadTrack(index);
            } else if (removeBtn) {
                e.stopPropagation();
                removeTrack(parseInt(removeBtn.dataset.index));
            }
        });
    }
    
    // Batch similar event listeners
    const buttonHandlers = {
        'dark-mode-toggle': toggleDarkMode,
        'play-pause-btn': togglePlayPause,
        'next-btn': playNext,
        'prev-btn': playPrevious,
        'shuffle-btn': toggleShuffle,
        'repeat-btn': toggleRepeat,
        'volume-btn': toggleMute,
        'favorite-btn': toggleFavorite,
        'export-btn': exportState,
        'clear-playlist-btn': clearPlaylist,
        'sort-btn': sortPlaylist,
        'browse-folders-btn': openFolderBrowser,
        'close-browser-btn': closeFolderBrowser,
        'drive-browse-btn': () => browseDriveFolders(),
        'refresh-cache-btn': () => browseDriveFolders(true),
        'clear-folder-mode': clearFolderMode,
        'load-folder-btn': () => document.getElementById('local-folder-input')?.click(),
        'import-btn': () => document.getElementById('import-file-input')?.click()
    };
    
    Object.entries(buttonHandlers).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener('click', handler);
    });
    
    // Range inputs
    const volumeSlider = document.getElementById('volume-slider');
    const progressBar = document.getElementById('progress-bar');
    if (volumeSlider) volumeSlider.addEventListener('input', handleVolumeChange);
    if (progressBar) progressBar.addEventListener('input', handleSeek);
    
    // File inputs
    const importFileInput = document.getElementById('import-file-input');
    if (importFileInput) {
        importFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) importState(e.target.files[0]);
            e.target.value = '';
        });
    }
    
    const localFolderInput = document.getElementById('local-folder-input');
    if (localFolderInput) {
        localFolderInput.addEventListener('change', handleLocalFiles);
    }
    
    // Debounced search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const debouncedSearch = debounce((value) => filterPlaylist(value), 300);
        searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
    }
    
    // Audio player events with passive listeners
    const audioPlayer = document.getElementById('audio-player');
    if (audioPlayer) {
        audioPlayer.addEventListener('timeupdate', updateProgress, { passive: true });
        audioPlayer.addEventListener('loadedmetadata', updateDuration);
        audioPlayer.addEventListener('ended', handleTrackEnd);
    }
    
    // Tab switching with delegation
    const tabContainer = document.querySelector('.flex.gap-2.mt-4');
    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) switchTab(tabBtn.dataset.tab);
        });
    }
    
    // Keyboard shortcuts - use the function from utils.js
    document.addEventListener('keydown', handleKeyboard, { passive: false });
}
