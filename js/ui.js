/**
 * UI Event Handlers Module
 * Handles all user interface interactions and event listeners
 */

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
        'load-folder-btn': () => {
            const input = document.getElementById('local-folder-input');
            if (input) input.click();
        },
        'import-btn': () => {
            const input = document.getElementById('import-file-input');
            if (input) input.click();
        }
    };
    
    Object.entries(buttonHandlers).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    });
    
    // Range inputs
    const volumeSlider = document.getElementById('volume-slider');
    const progressBar = document.getElementById('progress-bar');
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', handleVolumeChange);
    }
    
    if (progressBar) {
        progressBar.addEventListener('input', handleSeek);
    }
    
    // File inputs
    const importFileInput = document.getElementById('import-file-input');
    if (importFileInput) {
        importFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                importState(e.target.files[0]);
            }
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
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
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
            if (tabBtn && tabBtn.dataset.tab) {
                switchTab(tabBtn.dataset.tab);
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard, { passive: false });
    
    // Initialize dark mode from saved state
    initializeDarkMode();
}

function initializeDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    if (AppState.darkMode) {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) {
            darkModeToggle.textContent = '☀️';
        }
    }
}

// Keyboard handler with throttling
function handleKeyboard(e) {
    // Don't intercept when typing in input fields (unless using modifiers)
    if (e.target.tagName === 'INPUT' && !e.ctrlKey && !e.metaKey) return;
    
    const actions = {
        // Playback controls
        'Space': () => {
            e.preventDefault();
            togglePlayPause();
        },
        'ArrowLeft': () => {
            if (e.target.tagName !== 'INPUT') {
                playPrevious();
            }
        },
        'ArrowRight': () => {
            if (e.target.tagName !== 'INPUT') {
                playNext();
            }
        },
        
        // Player functions
        'KeyS': () => {
            if (!e.ctrlKey && !e.metaKey) {
                toggleShuffle();
            }
        },
        'KeyR': () => {
            if (!e.ctrlKey && !e.metaKey) {
                toggleRepeat();
            }
        },
        'KeyM': () => {
            toggleMute();
        },
        'KeyF': () => {
            if (!e.ctrlKey && !e.metaKey) {
                toggleFavorite();
            }
        },
        'KeyZ': () => {
            if (!e.ctrlKey && !e.metaKey) {
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.focus();
            }
        },
        
        // Playlist navigation
        'ArrowUp': () => {
            if (e.target.tagName !== 'INPUT') {
                e.preventDefault();
                navigatePlaylistUp();
            }
        },
        'ArrowDown': () => {
            if (e.target.tagName !== 'INPUT') {
                e.preventDefault();
                navigatePlaylistDown();
            }
        },
        'Enter': () => {
            if (e.target.tagName !== 'INPUT') {
                e.preventDefault();
                playSelectedTrack();
            }
        },
        'Delete': () => {
            if (e.target.tagName !== 'INPUT') {
                e.preventDefault();
                deleteSelectedTrack();
            }
        },
        
        // Page navigation
        'PageDown': () => {
            e.preventDefault();
            const nextPage = document.getElementById('next-page');
            if (nextPage && !nextPage.disabled) {
                nextPage.click();
            }
        },
        'PageUp': () => {
            e.preventDefault();
            const prevPage = document.getElementById('prev-page');
            if (prevPage && !prevPage.disabled) {
                prevPage.click();
            }
        },
        'Home': () => {
            if (e.target.tagName !== 'INPUT') {
                e.preventDefault();
                selectedTrackIndex = 0;
                highlightTrack(selectedTrackIndex);
            }
        },
        'End': () => {
            if (e.target.tagName !== 'INPUT') {
                e.preventDefault();
                selectedTrackIndex = AppState.filteredPlaylist.length - 1;
                highlightTrack(selectedTrackIndex);
            }
        },
        
        // Ctrl/Cmd shortcuts
        'KeyA': () => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.select();
            }
        }
    };
    
    const action = actions[e.code];
    if (action) {
        action();
    }
}

// Playlist keyboard navigation helpers
function navigatePlaylistUp() {
    if (selectedTrackIndex > 0) {
        selectedTrackIndex--;
        highlightTrack(selectedTrackIndex);
    }
}

function navigatePlaylistDown() {
    if (AppState.filteredPlaylist.length === 0) return;
    
    if (selectedTrackIndex < AppState.filteredPlaylist.length - 1) {
        selectedTrackIndex++;
    } else {
        selectedTrackIndex = 0;
    }
    highlightTrack(selectedTrackIndex);
}

function playSelectedTrack() {
    if (selectedTrackIndex >= 0 && selectedTrackIndex < AppState.filteredPlaylist.length) {
        loadTrack(selectedTrackIndex);
    }
}

function deleteSelectedTrack() {
    if (selectedTrackIndex >= 0 && selectedTrackIndex < AppState.filteredPlaylist.length) {
        if (confirm('Remove this track from playlist?')) {
            removeTrack(selectedTrackIndex);
            
            // Adjust selection after deletion
            if (selectedTrackIndex >= AppState.filteredPlaylist.length) {
                selectedTrackIndex = AppState.filteredPlaylist.length - 1;
            }
            
            if (selectedTrackIndex >= 0) {
                highlightTrack(selectedTrackIndex);
            }
        }
    }
}

function highlightTrack(index) {
    if (index < 0 || index >= AppState.filteredPlaylist.length) return;
    
    // Remove previous highlight
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add highlight to selected track
    const items = document.querySelectorAll('[data-track-index]');
    items.forEach(item => {
        if (parseInt(item.dataset.trackIndex) === index) {
            const playlistItem = item.closest('.playlist-item');
            if (playlistItem) {
                playlistItem.classList.add('selected');
                playlistItem.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }
        }
    });
}

// Initialize selected track index
let selectedTrackIndex = -1;
