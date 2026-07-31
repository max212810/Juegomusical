const DURATIONS = [1, 2, 4, 7, 11, 16];
const MAX_ATTEMPTS = 6;

let allSongs = [];
let targetSong = null;
let currentAttempt = 0;
let player = null;
let isPlayerReady = false;
let checkInterval = null;
let selectedSongFromList = null;

const playBtn = document.getElementById('play-btn');
const skipBtn = document.getElementById('skip-btn');
const submitBtn = document.getElementById('submit-btn');
const restartBtn = document.getElementById('restart-btn');
const songInput = document.getElementById('song-input');
const suggestionsList = document.getElementById('suggestions');
const progressBar = document.getElementById('progress-bar');
const videoOverlay = document.getElementById('video-overlay');
const searchSection = document.getElementById('search-section');
const gameOverScreen = document.getElementById('game-over-screen');
const gameResultTitle = document.getElementById('game-result-title');
const revealedSongText = document.getElementById('revealed-song');
const youtubeLink = document.getElementById('youtube-link');

// 1. Cargar el archivo songs.json
async function loadSongsData() {
  try {
    const response = await fetch('songs.json');
    if (!response.ok) throw new Error("No se pudo cargar songs.json");
    allSongs = await response.json();
    
    if (isPlayerReady) {
      initGame();
    }
  } catch (error) {
    console.error('Error al cargar songs.json:', error);
    playBtn.innerText = '❌ Error al cargar canciones';
  }
}

loadSongsData();

// 2. Evento API de YouTube
window.onYouTubeIframeAPIReady = function() {
  player = new YT.Player('youtube-player', {
    height: '100%',
    width: '100%',
    videoId: 'fHI8X4OX7dE',
    playerVars: {
      'autoplay': 0,
      'controls': 0,
      'playsinline': 1,
      'origin': window.location.origin
    },
    events: {
      'onReady': onPlayerReady,
      'onError': onPlayerError
    }
  });
};

// 3. Cargar la API de YouTube dinámicamente
const ytScript = document.createElement('script');
ytScript.src = "https://www.youtube.com/iframe_api";
const firstScript = document.getElementsByTagName('script')[0];
firstScript.parentNode.insertBefore(ytScript, firstScript);

function onPlayerReady() {
  isPlayerReady = true;
  if (allSongs.length > 0) {
    initGame();
  }
}

function onPlayerError(e) {
  console.warn("Error en YouTube:", e.data);
  if (e.data === 101 || e.data === 150) {
    alert("Esta canción está protegida. Presiona 'Jugar de nuevo' para cambiar de canción.");
  }
}

// 4. Inicializar / Reiniciar Juego
function initGame() {
  currentAttempt = 0;
  selectedSongFromList = null;
  songInput.value = '';
  suggestionsList.innerHTML = '';
  
  videoOverlay.classList.remove('revealed');
  
  targetSong = allSongs[Math.floor(Math.random() * allSongs.length)];
  
  if (player && isPlayerReady) {
    player.cueVideoById({
      videoId: targetSong.youtubeId,
      startSeconds: targetSong.startTime || 0
    });
  }

  resetUI();
}

function resetUI() {
  playBtn.disabled = false;
  playBtn.removeAttribute('disabled');
  playBtn.innerHTML = `▶ Reproducir (<span id="current-duration">${DURATIONS[0]}s</span>)`;
  progressBar.style.width = '0%';
  searchSection.classList.remove('hidden');
  gameOverScreen.classList.add('hidden');

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const box = document.getElementById(`attempt-${i}`);
    box.className = 'attempt-box';
    box.innerText = `${DURATIONS[i]}s`;
  }
}

// 5. Reproducción de Audio
playBtn.addEventListener('click', playSnippet);

function playSnippet() {
  if (!isPlayerReady || !player) return;

  if (typeof player.unMute === 'function') {
    player.unMute();
    player.setVolume(100);
  }

  const start = targetSong.startTime || 0;
  const maxDuration = DURATIONS[currentAttempt];

  player.seekTo(start, true);
  player.playVideo();

  progressBar.style.width = '0%';
  clearInterval(checkInterval);

  checkInterval = setInterval(() => {
    const currentTime = player.getCurrentTime();
    const elapsedTime = currentTime - start;

    const percentage = Math.min((elapsedTime / maxDuration) * 100, 100);
    progressBar.style.width = `${percentage}%`;

    if (elapsedTime >= maxDuration) {
      player.pauseVideo();
      clearInterval(checkInterval);
      progressBar.style.width = '0%';
    }
  }, 50);
}

// 6. Búsqueda y Autocompletado
songInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  suggestionsList.innerHTML = '';

  if (!query) return;

  const matches = allSongs.filter(song => 
    song.title.toLowerCase().includes(query) || 
    song.artist.toLowerCase().includes(query)
  );

  matches.forEach(song => {
    const li = document.createElement('li');
    li.innerText = `${song.artist} - ${song.title}`;
    li.addEventListener('click', () => {
      songInput.value = `${song.artist} - ${song.title}`;
      selectedSongFromList = song;
      suggestionsList.innerHTML = '';
    });
    suggestionsList.appendChild(li);
  });
});

document.addEventListener('click', (e) => {
  if (!songInput.contains(e.target)) {
    suggestionsList.innerHTML = '';
  }
});

// 7. Enviar respuesta y Saltar
submitBtn.addEventListener('click', handleGuess);
skipBtn.addEventListener('click', handleSkip);

function handleGuess() {
  if (currentAttempt >= MAX_ATTEMPTS) return;

  const userText = songInput.value.trim().toLowerCase();
  const currentBox = document.getElementById(`attempt-${currentAttempt}`);

  if (!userText) return;

  const isCorrect = selectedSongFromList?.id === targetSong.id || 
    userText === `${targetSong.artist} - ${targetSong.title}`.toLowerCase() ||
    userText === targetSong.title.toLowerCase();

  if (isCorrect) {
    currentBox.innerText = `✔ ${targetSong.artist} - ${targetSong.title}`;
    currentBox.classList.add('correct');
    endGame(true);
  } else {
    currentBox.innerText = `✖ ${songInput.value}`;
    currentBox.classList.add('wrong');
    nextAttempt();
  }

  songInput.value = '';
  selectedSongFromList = null;
}

function handleSkip() {
  if (currentAttempt >= MAX_ATTEMPTS) return;

  const currentBox = document.getElementById(`attempt-${currentAttempt}`);
  currentBox.innerText = `SKIP (+${DURATIONS[currentAttempt]}s)`;
  currentBox.classList.add('skipped');

  nextAttempt();
}

function nextAttempt() {
  currentAttempt++;

  if (currentAttempt < MAX_ATTEMPTS) {
    const durationSpan = document.getElementById('current-duration');
    if (durationSpan) durationSpan.innerText = `${DURATIONS[currentAttempt]}s`;
  } else {
    endGame(false);
  }
}

// 8. Fin del Juego (Revela la carátula)
function endGame(hasWon) {
  clearInterval(checkInterval);
  player.pauseVideo();

  // Revela la pantalla del vídeo de YouTube quitando la capa
  videoOverlay.classList.add('revealed');

  searchSection.classList.add('hidden');
  gameOverScreen.classList.remove('hidden');

  if (hasWon) {
    gameResultTitle.innerText = "🎉 ¡Felicidades! ¡Adivinaste!";
    gameResultTitle.style.color = "var(--primary-color)";
  } else {
    gameResultTitle.innerText = "❌ Juego Terminado";
    gameResultTitle.style.color = "var(--danger-color)";
  }

  revealedSongText.innerText = `La canción era: ${targetSong.artist} - ${targetSong.title}`;

  const youtubeUrl = `https://www.youtube.com/watch?v=${targetSong.youtubeId}`;
  youtubeLink.setAttribute('href', youtubeUrl);
}

restartBtn.addEventListener('click', initGame);
