function setupEventListeners() {
    // Player controls
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
    document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);
    document.getElementById('next-btn').addEventListener('click', playNext);
    document.getElementById('prev-btn').addEventListener('click', playPrevious);
    document.getElementById('shuffle-btn').addEventListener('click', toggleShuffle);
    document.getElementById('repeat-btn').addEventListener('click', toggleRepeat);
    document.getElementById('volume-slider').addEventListener('input', handleVolumeChange);
    document.getElementById('volume-btn').addEventListener('click', toggleMute);
    document.getElementById('progress-bar').addEventListener('input', handleSeek);
    
    // State management
    document.getElementById('export-btn').addEventListener('click', exportState);
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file-input').click();
    });
    document.getElementById('import-file-input').addEventListener('change', (e) => {
        if (e.target.files[0]) importState(e.target.files[0]);
        e.target.value = '';
    });
    
    // File loading
    document.getElementById('load-folder-btn').addEventListener('click', () => {
        document.getElementById('local-folder-input').click();
    });
    document.getElementById('local-folder-input').addEventListener('change', handleLocalFiles);
    document.getElementById('clear-playlist-btn').addEventListener('click', clearPlaylist);
    document.getElementById('sort-btn').addEventListener('click', sortPlaylist);
    
    // Search with debounce
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => filterPlaylist(e.target.value), 300);
    });
    
    // Favorites
    document.getElementById('favorite-btn').addEventListener('click', toggleFavorite);
    document.getElementById('clear-folder-mode').addEventListener('click', clearFolderMode);
    
    // Folder browser
    document.getElementById('browse-folders-btn').addEventListener('click', openFolderBrowser);
    document.getElementById('close-browser-btn').addEventListener('click', closeFolderBrowser);
    document.getElementById('drive-browse-btn').addEventListener('click', browseDriveFolders);
    document.getElementById('refresh-cache-btn').addEventListener('click', () => browseDriveFolders(true));
    
    // Audio player events
    const audioPlayer = document.getElementById('audio-player');
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('ended', handleTrackEnd);
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Apps Script URL input
    document.getElementById('apps-script-url-input').addEventListener('input', (e) => {
        AppState.appsScriptUrl = e.target.value;
    });

}
