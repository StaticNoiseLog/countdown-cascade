const SOUND_URLS = {
  bell: 'resources/DingiDong.ogg',
  digital: 'resources/dishL.wav',
  chime: 'resources/DingiDong.ogg' // Using ding sound as fallback for chime
};

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffers = {};

// Preload all sounds
async function preloadSounds() {
  for (const [key, url] of Object.entries(SOUND_URLS)) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      audioBuffers[key] = await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error(`Failed to load sound: ${url}`, error);
    }
  }
}
preloadSounds();

let timers = JSON.parse(localStorage.getItem('timers') || '[]');

function createTimer(name, hours, minutes, seconds, sound) {
  return {
    id: crypto.randomUUID(),
    name,
    totalSeconds: hours * 3600 + minutes * 60 + seconds,
    remainingSeconds: hours * 3600 + minutes * 60 + seconds,
    sound,
    isRunning: false,
    nextTimerId: null
  };
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function saveTimers() {
  localStorage.setItem('timers', JSON.stringify(timers));
}

function findTimerById(id) {
  return timers.find(t => t.id === id);
}

function resetTimerAndDownstream(startTimer) {
  let current = startTimer;
  while (current) {
    if (current.reset) {
      current.reset();
    }
    const nextId = current.nextTimerId;
    current = nextId ? findTimerById(nextId) : null;
  }
}

function updateProgressIndicator(timerElement, timer) {
  // Calculate progress percentage based on elapsed time
  const elapsedSeconds = timer.totalSeconds - timer.remainingSeconds;
  const progressPercentage = ((elapsedSeconds + 1) / timer.totalSeconds) * 100;
  timerElement.style.setProperty('--progress-width', `${progressPercentage}%`);
}

function playSound(sound) {
  return new Promise((resolve) => {
    if (!audioBuffers[sound]) {
      console.warn(`Sound not loaded: ${sound}`);
      resolve();
      return;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[sound];
    source.connect(audioContext.destination);
    source.onended = resolve;
    
    // Resume context if suspended (browser policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => source.start(0));
    } else {
      source.start(0);
    }
  });
}

function createTimerElement(timer) {
  const timerElement = document.createElement('div');
  timerElement.className = 'timer-item';
  timerElement.draggable = true;
  timerElement.dataset.timerId = timer.id;
  const audio = new Audio(SOUND_URLS[timer.sound]);
  audio.preload = 'auto';

  const updateDisplay = () => {
    if (timer.isRunning && timer.remainingSeconds > 0) {
      timer.remainingSeconds--;
      updateProgressIndicator(timerElement, timer);

      if (timer.remainingSeconds === 0) {
        timerElement.style.setProperty('--progress-width', '100%');
        timer.isRunning = false;
        
        // Play sound in background without waiting
        playSound(timer.sound);
        
        // Immediately start next timer if it exists
        if (timer.nextTimerId) {
          const nextTimer = findTimerById(timer.nextTimerId);
          if (nextTimer && nextTimer.start) {
            console.log(`Chaining: Starting timer ${nextTimer.name}`);
            // Small timeout to ensure UI updates before starting next timer
            setTimeout(() => nextTimer.start(), 50);
          }
        }
        
        saveTimers();
      }
    }
    displayElement.textContent = formatTime(timer.remainingSeconds);
    displayElement.classList.toggle('active', timer.isRunning);
  };

  let intervalId = null;

  const startTimer = () => {
    timer.isRunning = true;
    intervalId = setInterval(updateDisplay, 1000);
    startButton.style.display = 'none';
    pauseButton.style.display = 'block';
    displayElement.classList.add('active');
    timerElement.classList.add('running');
    updateProgressIndicator(timerElement, timer);
    saveTimers();
  };

  const pauseTimer = () => {
    timer.isRunning = false;
    clearInterval(intervalId);
    startButton.style.display = 'block';
    pauseButton.style.display = 'none';
    displayElement.classList.remove('active');
    timerElement.classList.remove('running');
    saveTimers();
  };

  const resetTimer = () => {
    timer.isRunning = false;
    timer.remainingSeconds = timer.totalSeconds;
    clearInterval(intervalId);
    startButton.style.display = 'block';
    pauseButton.style.display = 'none';
    displayElement.classList.remove('active');
    timerElement.classList.remove('running');
    timerElement.style.setProperty('--progress-width', '0%');
    displayElement.textContent = formatTime(timer.remainingSeconds);
    saveTimers();
  };
  timer.start = startTimer; // Attach start function to timer object
  timer.pause = pauseTimer; // Attach pause function to timer object
  timer.reset = resetTimer; // Attach reset function to timer object

  const nameElement = document.createElement('div');
  nameElement.className = 'timer-name';
  nameElement.textContent = timer.name;

  const displayElement = document.createElement('div');
  displayElement.className = 'timer-display';
  displayElement.textContent = formatTime(timer.remainingSeconds);
  if (timer.isRunning) {
    displayElement.classList.add('active');
  }

  // Add chain indicator
  const chainIndicator = document.createElement('div');
  chainIndicator.className = 'chain-indicator';
  if (timer.nextTimerId) {
    const nextTimer = findTimerById(timer.nextTimerId);
    chainIndicator.textContent = `→ ${nextTimer ? nextTimer.name : 'Unknown'}`;
  }

  const startButton = document.createElement('button');
  startButton.className = 'btn-start';
  startButton.textContent = '▶';
  startButton.onclick = startTimer;

  const pauseButton = document.createElement('button');
  pauseButton.className = 'btn-pause';
  pauseButton.textContent = '⏸';
  pauseButton.onclick = pauseTimer;
  pauseButton.style.display = 'none';

  const resetButton = document.createElement('button');
  resetButton.className = 'btn-reset';
  resetButton.textContent = '↺';
  resetButton.onclick = () => resetTimerAndDownstream(timer); // Reset this timer and downstream timers

  const chainButton = document.createElement('button');
  chainButton.className = 'btn-chain';
  chainButton.textContent = '🔗';
  chainButton.title = 'Chain to next timer';
  chainButton.onclick = () => {
    const otherTimers = timers.filter(t => t.id !== timer.id);
    if (otherTimers.length === 0) {
      alert('No other timers available to chain to!');
      return;
    }

    const select = document.createElement('select');
    select.className = 'chain-select';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'None';
    select.appendChild(defaultOption);

    otherTimers.forEach(t => {
      const option = document.createElement('option');
      option.value = t.id;
      option.textContent = t.name;
      if (t.id === timer.nextTimerId) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.onchange = (e) => {
      const selectedId = e.target.value;
      timer.nextTimerId = selectedId || null;
      chainIndicator.textContent = selectedId ? `→ ${findTimerById(selectedId).name}` : '';
      saveTimers();
      select.replaceWith(chainButton);
    };

    chainButton.replaceWith(select);
    select.focus();
  };

  const deleteButton = document.createElement('button');
  deleteButton.className = 'btn-delete';
  deleteButton.textContent = '×';
  deleteButton.onclick = () => {
    clearInterval(intervalId);
    // Remove references to this timer from other timers
    timers.forEach(t => {
      if (t.nextTimerId === timer.id) {
        t.nextTimerId = null;
        // Find and update the chain indicator for timers that referenced this timer
        const timerElement = document.querySelector(`[data-timer-id="${t.id}"]`);
        if (timerElement) {
          const chainIndicator = timerElement.querySelector('.chain-indicator');
          if (chainIndicator) {
            chainIndicator.textContent = '';
          }
        }
      }
    });
    timers = timers.filter(t => t.id !== timer.id);
    timerElement.remove();
    saveTimers();
    updateEmptyState();
  };

  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'timer-controls';
  controlsDiv.appendChild(startButton);
  controlsDiv.appendChild(pauseButton);
  controlsDiv.appendChild(resetButton);
  controlsDiv.appendChild(chainButton);
  controlsDiv.appendChild(deleteButton);

  const infoDiv = document.createElement('div');
  infoDiv.className = 'timer-info';
  infoDiv.appendChild(nameElement);
  infoDiv.appendChild(chainIndicator);
  infoDiv.appendChild(controlsDiv);

  timerElement.appendChild(infoDiv);
  timerElement.appendChild(displayElement);

  if (timer.isRunning) {
    startTimer();
  }

  return timerElement;
}

function updateEmptyState() {
  const timerList = document.getElementById('timerList');
  if (timers.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No timers yet. Create one to get started!';
    timerList.appendChild(emptyState);
  } else {
    const emptyState = timerList.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }
  }
}

// Initialize drag and drop
let draggedTimer = null;

document.getElementById('timerList').addEventListener('dragstart', (e) => {
  draggedTimer = e.target;
  e.target.style.opacity = '0.5';
});

document.getElementById('timerList').addEventListener('dragend', (e) => {
  e.target.style.opacity = '';
});

document.getElementById('timerList').addEventListener('dragover', (e) => {
  e.preventDefault();
  const timerItem = e.target.closest('.timer-item');
  if (timerItem && timerItem !== draggedTimer) {
    const rect = timerItem.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (e.clientY < midpoint) {
      timerItem.parentNode.insertBefore(draggedTimer, timerItem);
    } else {
      timerItem.parentNode.insertBefore(draggedTimer, timerItem.nextSibling);
    }
    // Update timers array to match new DOM order
    const timerElements = document.querySelectorAll('.timer-item');
    timers = Array.from(timerElements).map(el =>
    timers.find(t => t.id === el.dataset.timerId)
    );
    saveTimers();
  }
});

// Initialize form handling
document.getElementById('timerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('timerName').value;
  const hours = parseInt(document.getElementById('hours').value) || 0;
  const minutes = parseInt(document.getElementById('minutes').value) || 0;
  const seconds = parseInt(document.getElementById('seconds').value) || 0;
  const sound = document.getElementById('sound').value;

  const timer = createTimer(name, hours, minutes, seconds, sound);
  timers.push(timer);
  const timerElement = createTimerElement(timer);
  document.getElementById('timerList').appendChild(timerElement);
  saveTimers();
  updateEmptyState();

  // Reset form
  e.target.reset();
});

// Initialize existing timers
timers.forEach(timer => {
  document.getElementById('timerList').appendChild(createTimerElement(timer));
});
updateEmptyState();