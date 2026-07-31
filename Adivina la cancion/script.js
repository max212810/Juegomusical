// Configuración de tiempos para cada intento (en segundos)
const DURATIONS = [1, 2, 4, 7, 11, 16];
const MAX_ATTEMPTS = 6;

// Variables de Estado
let allSongs = [];
let targetSong = null;
let currentAttempt = 0;
let player = null;
let isPlayerReady = false;
let checkInterval = null;
let selectedSongFromList = null;

// Referencias del DOM
const playBtn = document.getElementById('play-btn');
const skipBtn = document.getElementById('skip-btn');
const submitBtn = document.getElementById('submit-btn');
const restartBtn = document.getElementById('restart-btn');
const songInput = document.getElementById('song-input');
const suggestionsList = document.getElementById('suggestions');
const progressBar = document.getElementById('progress-bar');
const currentDurationSpan = document.getElementById('current-duration');
const searchSection = document.getElementById('search-section');
const gameOverScreen = document.getElementById('game-over-screen');
const gameResultTitle = document.getElementById('game-result-title');
const revealedSongText = document.getElementById('revealed-song');
const youtubeLink = document.getElementById('youtube-link');

// 1. Cargar la API de YouTube Iframe
function onYouTubeIframeAPIReady() {
  player = new YT.Player('youtube-player', {
    height: '1',
    width: '1',
    playerVars: {
      'autoplay': 0,
      'controls': 0,
      'disablekb': 1
    },
    events: {
      'onReady': onPlayerReady
    }
  });
}

function onPlayerReady() {
  isPlayerReady = true;
  loadSongsData();
}

// 2. Cargar archivo JSON de canciones
async function loadSongsData() {
  try {
    const response = await fetch('songs.json');
    allSongs = await response.json();
    initGame();
  } catch (error) {
    console.error('Error al cargar songs.json:', error);
  }
}

// 3. Inicializar / Reiniciar Juego
function initGame() {
  // Resetear Variables
  currentAttempt = 0;
  selectedSongFromList = null;
  songInput.value = '';
  suggestionsList.innerHTML = '';
  
  // Seleccionar una canción aleatoria de la lista
  targetSong = allSongs[Math.floor(Math.random() * allSongs.length)];
  
  // Cargar el vídeo en YouTube pero en pausa
  if (player && isPlayerReady) {
    player.cueVideoById({
      videoId: targetSong.youtubeId,
      startSeconds: targetSong.startTime || 0
    });
  }

  // Resetear UI
  resetUI();
}

function resetUI() {
  currentDurationSpan.innerText = `${DURATIONS[0]}s`;
  progressBar.style.width = '0%';
  playBtn.disabled = false;
  searchSection.classList.remove('hidden');
  gameOverScreen.classList.add('hidden');

  // Limpiar cajas de intentos
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const box = document.getElementById(`attempt-${i}`);
    box.className = 'attempt-box';
    box.innerText = `${DURATIONS[i]}s`;
  }
}

// 4. Lógica de Reproducción de Audio
playBtn.addEventListener('click', playSnippet);

function playSnippet() {
  if (!isPlayerReady || !player) return;

  const start = targetSong.startTime || 0;
  const maxDuration = DURATIONS[currentAttempt];

  player.seekTo(start, true);
  player.playVideo();

  // Resetear barra de progreso
  progressBar.style.width = '0%';

  clearInterval(checkInterval);

  // Intervalo para detener el audio exactamente a la duración requerida
  checkInterval = setInterval(() => {
    const currentTime = player.getCurrentTime();
    const elapsedTime = currentTime - start;

    // Actualizar animación de la barra
    const percentage = Math.min((elapsedTime / maxDuration) * 100, 100);
    progressBar.style.width = `${percentage}%`;

    // Si llega al límite de tiempo del intento actual, pausar
    if (elapsedTime >= maxDuration) {
      player.pauseVideo();
      clearInterval(checkInterval);
      progressBar.style.width = '0%';
    }
  }, 50);
}

// 5. Autocompletado e Input
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

// Ocultar sugerencias si se hace clic fuera
document.addEventListener('click', (e) => {
  if (!songInput.contains(e.target)) {
    suggestionsList.innerHTML = '';
  }
});

// 6. Botones de Enviar y Saltar
submitBtn.addEventListener('click', handleGuess);
skipBtn.addEventListener('click', handleSkip);

function handleGuess() {
  if (currentAttempt >= MAX_ATTEMPTS) return;

  const userText = songInput.value.trim().toLowerCase();
  const currentBox = document.getElementById(`attempt-${currentAttempt}`);

  if (!userText) return;

  // Comprobar si eligió la opción correcta
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
    currentDurationSpan.innerText = `${DURATIONS[currentAttempt]}s`;
  } else {
    endGame(false); // Perdió
  }
}

// 7. Fin del Juego y Redirección a YouTube
function endGame(hasWon) {
  clearInterval(checkInterval);
  player.pauseVideo();

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

  // Configurar enlace para redirigir a YouTube
  const youtubeUrl = `https://www.youtube.com/watch?v=${targetSong.youtubeId}`;
  youtubeLink.setAttribute('href', youtubeUrl);
}

restartBtn.addEventListener('click', initGame);