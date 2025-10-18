function setupEventListeners() {
    // Use event delegation for playlist items
    document.getElementById('playlist-container').addEventListener('click', (e) => {
        const playlistItem = e.target.closest('.playlist-item');
        if (!playlistItem) return;
        
        const trackDiv = e.target.closest('.cursor-pointer');
        const removeBtn = e.target.closest('button[data-index]');
        
        if (trackDiv) {
            const index = Array.from(playlistItem.parentNode.children).indexOf(playlistItem);
            loadTrack(index);
        } else if (removeBtn) {
            e.stopPropagation();
            removeTrack(parseInt(removeBtn.dataset.index));
        }
    });
    
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
        'load-folder-btn': () => document.getElementById('local-folder-input').click(),
        'import-btn': () => document.getElementById('import-file-input').click()
    };
    
    Object.entries(buttonHandlers).forEach(([id, handler]) => {
        document.getElementById(id)?.addEventListener('click', handler);
    });
    
    // Range inputs
    document.getElementById('volume-slider').addEventListener('input', handleVolumeChange);
    document.getElementById('progress-bar').addEventListener('input', handleSeek);
    
    // File inputs
    document.getElementById('import-file-input').addEventListener('change', (e) => {
        if (e.target.files[0]) importState(e.target.files[0]);
        e.target.value = '';
    });
    
    document.getElementById('local-folder-input').addEventListener('change', handleLocalFiles);
    
    // Debounced search
    const debouncedSearch = debounce((value) => filterPlaylist(value), 300);
    document.getElementById('search-input').addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
    
    // Audio player events with passive listeners
    const audioPlayer = document.getElementById('audio-player');
    audioPlayer.addEventListener('timeupdate', updateProgress, { passive: true });
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('ended', handleTrackEnd);
    
    // Tab switching with delegation
    document.querySelector('.flex.gap-2.mt-4').addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn) switchTab(tabBtn.dataset.tab);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard, { passive: false });
}
