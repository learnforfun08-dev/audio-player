/**
 * Player Controls Module
 * Handles all audio playback functionality
 */

// Optimized loadTrack with minimal reflows
function loadTrack(index) {
    if (index < 0 || index >= AppState.filteredPlaylist.length) return;
    
    AppState.currentTrackIndex = AppState.currentPlaylist.indexOf(AppState.filteredPlaylist[index]);
    const track = AppState.filteredPlaylist[index];
    
    // Batch DOM updates
    requestAnimationFrame(() => {
        const elements = {
            title: document.getElementById('current-track-title'),
            metadata: document.getElementById('track-metadata'),
            tag: document.getElementById('file-source-tag'),
            audioPlayer: document.getElementById('audio-player'),
            driveContainer: document.getElementById('drive-player-container'),
            driveFrame: document.getElementById('drive-player-frame'),
            progressBar: document.getElementById('progress-bar'),
            playPauseBtn: document.getElementById('play-pause-btn')
        };
        
        elements.title.textContent = track.name;
        
        let metadata = [];
        if (track.size) metadata.push(`Size: ${track.size}`);
        if (track.duration) metadata.push(`Duration: ${formatTime(track.duration)}`);
        elements.metadata.textContent = metadata.join(' • ');
        
        elements.tag.textContent = track.source;
        elements.tag.className = `text-xs font-medium px-3 py-1 rounded-full ${
            track.source === 'Apps Script API' ? 
            'bg-emerald-100 text-emerald-700' : 
            'bg-indigo-100 text-indigo-700'
        }`;
        
        updateFavoriteButton(track);
        scrollToCurrentTrack();
        addToRecentlyPlayed(track);

        // Update active state
        document.querySelectorAll('.playlist-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });

        if (track.fileId) {
            elements.audioPlayer.classList.add('hidden');
            elements.driveContainer.classList.remove('hidden');
            elements.driveFrame.src = `https://drive.google.com/file/d/${track.fileId}/preview`;
            elements.progressBar.disabled = true;
            AppState.isPlaying = true;
            elements.playPauseBtn.textContent = '⏸️';
        } else {
            elements.driveContainer.classList.add('hidden');
            elements.audioPlayer.classList.remove('hidden');
            elements.audioPlayer.src = track.url;
            elements.progressBar.disabled = false;
            
            elements.audioPlayer.play().then(() => {
                AppState.isPlaying = true;
                elements.playPauseBtn.textContent = '⏸️';
            }).catch(err => {
                console.error('Playback failed:', err);
                AppState.isPlaying = false;
                elements.playPauseBtn.textContent = '▶️';
                showToast('Playback failed', 2000);
            });
        }
        scrollToCurrentTrack();
        savePlaylistState();
    });
}

// Play/Pause Toggle
function togglePlayPause() {
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    
    if (AppState.currentTrackIndex === -1 && AppState.filteredPlaylist.length > 0) {
        loadTrack(0);
        return;
    }
    
    const track = AppState.currentPlaylist[AppState.currentTrackIndex];
    if (track && !track.fileId) {
        if (AppState.isPlaying) {
            audioPlayer.pause();
            AppState.isPlaying = false;
            playPauseBtn.textContent = '▶️';
        } else {
            audioPlayer.play().then(() => {
                AppState.isPlaying = true;
                playPauseBtn.textContent = '⏸️';
            });
        }
    }
}

// Play Next Track
function playNext() {
    if (AppState.filteredPlaylist.length === 0) return;
    
    if (AppState.repeatMode === 2) {
        loadTrack(AppState.filteredPlaylist.indexOf(AppState.currentPlaylist[AppState.currentTrackIndex]));
        return;
    }
    
    let nextIndex;
    if (AppState.isShuffle) {
        const currentFilteredIndex = AppState.filteredPlaylist.indexOf(AppState.currentPlaylist[AppState.currentTrackIndex]);
        do {
            nextIndex = Math.floor(Math.random() * AppState.filteredPlaylist.length);
        } while (nextIndex === currentFilteredIndex && AppState.filteredPlaylist.length > 1);
    } else {
        const currentFilteredIndex = AppState.filteredPlaylist.indexOf(AppState.currentPlaylist[AppState.currentTrackIndex]);
        nextIndex = (currentFilteredIndex + 1) % AppState.filteredPlaylist.length;
    }
    
    loadTrack(nextIndex);
}

// Play Previous Track
function playPrevious() {
    const audioPlayer = document.getElementById('audio-player');
    
    if (AppState.filteredPlaylist.length === 0) return;
    
    if (audioPlayer.currentTime > 3) {
        audioPlayer.currentTime = 0;
    } else {
        const currentFilteredIndex = AppState.filteredPlaylist.indexOf(AppState.currentPlaylist[AppState.currentTrackIndex]);
        let prevIndex = (currentFilteredIndex - 1 + AppState.filteredPlaylist.length) % AppState.filteredPlaylist.length;
        loadTrack(prevIndex);
    }
}

// Shuffle Toggle
function toggleShuffle() {
    const shuffleBtn = document.getElementById('shuffle-btn');
    AppState.isShuffle = !AppState.isShuffle;
    shuffleBtn.style.color = AppState.isShuffle ? '#3b82f6' : '';
    shuffleBtn.style.fontWeight = AppState.isShuffle ? 'bold' : '';
    showToast(AppState.isShuffle ? 'Shuffle On' : 'Shuffle Off');
}

// Repeat Toggle
function toggleRepeat() {
    const repeatBtn = document.getElementById('repeat-btn');
    AppState.repeatMode = (AppState.repeatMode + 1) % 3;
    const modes = ['🔁', '🔂', '🔂'];
    const titles = ['Repeat Off', 'Repeat All', 'Repeat One'];
    repeatBtn.textContent = modes[AppState.repeatMode];
    repeatBtn.title = titles[AppState.repeatMode];
    repeatBtn.style.color = AppState.repeatMode > 0 ? '#3b82f6' : '';
    repeatBtn.style.fontWeight = AppState.repeatMode > 0 ? 'bold' : '';
    showToast(titles[AppState.repeatMode]);
}

// Volume Control
function handleVolumeChange(e) {
    const audioPlayer = document.getElementById('audio-player');
    AppState.volume = e.target.value;
    audioPlayer.volume = e.target.value / 100;
    updateVolumeIcon(e.target.value);
}

function toggleMute() {
    const audioPlayer = document.getElementById('audio-player');
    const volumeSlider = document.getElementById('volume-slider');
    
    if (audioPlayer.volume > 0) {
        audioPlayer.dataset.prevVolume = audioPlayer.volume;
        audioPlayer.volume = 0;
        volumeSlider.value = 0;
        updateVolumeIcon(0);
    } else {
        const prevVol = audioPlayer.dataset.prevVolume || 1;
        audioPlayer.volume = prevVol;
        volumeSlider.value = prevVol * 100;
        AppState.volume = prevVol * 100;
        updateVolumeIcon(prevVol * 100);
    }
}

function updateVolumeIcon(value) {
    const volumeBtn = document.getElementById('volume-btn');
    if (value == 0) volumeBtn.textContent = '🔇';
    else if (value < 50) volumeBtn.textContent = '🔉';
    else volumeBtn.textContent = '🔊';
}

let rafId = null;

function updateProgress() {
    if (rafId) return;
    
    rafId = requestAnimationFrame(() => {
        const audioPlayer = document.getElementById('audio-player');
        const progressBar = document.getElementById('progress-bar');
        const currentTimeSpan = document.getElementById('current-time');
        
        if (!progressBar.disabled && audioPlayer.duration) {
            progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
        }
        rafId = null;
    });
}

function updateDuration() {
    const audioPlayer = document.getElementById('audio-player');
    const durationSpan = document.getElementById('duration');
    const progressBar = document.getElementById('progress-bar');
    
    durationSpan.textContent = formatTime(audioPlayer.duration);
    progressBar.max = 100;
}

function handleSeek(e) {
    const audioPlayer = document.getElementById('audio-player');
    const seekTime = (e.target.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
}

// Track End Handler
function handleTrackEnd() {
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    
    // Track analytics
    if (AppState.currentTrackIndex !== -1 && audioPlayer.duration) {
        const track = AppState.currentPlaylist[AppState.currentTrackIndex];
        Analytics.trackPlayed(getTrackId(track), audioPlayer.duration);
    }
    
    if (AppState.repeatMode === 1 || AppState.isShuffle) {
        playNext();
    } else {
        const currentFilteredIndex = AppState.filteredPlaylist.indexOf(AppState.currentPlaylist[AppState.currentTrackIndex]);
        if (currentFilteredIndex < AppState.filteredPlaylist.length - 1) {
            playNext();
        } else {
            AppState.isPlaying = false;
            if (playPauseBtn) playPauseBtn.textContent = '▶️';
        }
    }
}

// Favorites
function toggleFavorite() {
    if (AppState.currentTrackIndex === -1) return;
    
    const track = AppState.currentPlaylist[AppState.currentTrackIndex];
    const trackId = getTrackId(track);
    const index = AppState.favorites.indexOf(trackId);
    
    if (index > -1) {
        AppState.favorites.splice(index, 1);
        showToast('Removed from favorites');
    } else {
        AppState.favorites.push(trackId);
        showToast('Added to favorites');
    }
    
    updateFavoriteButton(track);
    
    if (AppState.currentTab === 'favorites') {
        filterPlaylist();
    }
}

function updateFavoriteButton(track) {
    const favoriteBtn = document.getElementById('favorite-btn');
    const isFav = AppState.favorites.includes(getTrackId(track));
    favoriteBtn.textContent = isFav ? '❤️' : '🤍';
    favoriteBtn.classList.toggle('active', isFav);

}


