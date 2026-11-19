
import { renderBottomNav, attachBottomNavEvents } from '../components/navigation.js'
import { renderMenu, attachMenuEvents } from '../components/menu.js'

const sounds = [
  { id: 'campfire', name: 'Campfire', description: 'Soft crackling fire', file: 'campfire.wav' },
  { id: 'cave', name: 'Cave', description: 'Atmospheric cave ambience', file: 'cave.wav' },
  { id: 'city-night', name: 'City Night', description: 'Quiet nighttime city ambience', file: 'city-night.wav' },
  { id: 'desert-wind', name: 'Desert Wind', description: 'Open, airy desert wind', file: 'desert-wind.wav' },
  { id: 'dungeon', name: 'Dungeon', description: 'Deep atmospheric ambience', file: 'dungeon.wav' },
  { id: 'forest', name: 'Forest', description: 'Peaceful forest atmosphere', file: 'forest.wav' },
  { id: 'night', name: 'Night', description: 'Calm nighttime ambience', file: 'night.wav' },
  { id: 'ocean', name: 'Ocean', description: 'Gentle ocean waves', file: 'ocean.wav' },
  { id: 'rain-roof', name: 'Rain on Roof', description: 'Rain falling softly on a roof', file: 'rain-roof.wav' },
  { id: 'rain', name: 'Rain', description: 'Gentle rainfall', file: 'rain.wav' },
  { id: 'river', name: 'River', description: 'Flowing river water', file: 'river.wav' },
  { id: 'wind', name: 'Wind', description: 'Gentle blowing wind', file: 'wind.wav' }
]

let audio = null
let selectedSound = null
let isPlaying = false
let loopEnabled = true
let nativeMediaBridge = null
let nativeMediaListener = null
let listenerSetupId = 0
let playbackGeneration = 0

function syncNativeSleepMedia() {
  if (!nativeMediaBridge || !audio || !selectedSound) return

  const sound = sounds.find(item => item.id === selectedSound)
  if (!sound) return

  Promise.resolve(
    nativeMediaBridge.updateSleepMedia({
      title: sound.name,
      playing: isPlaying
    })
  ).catch(error => {
    console.warn('Could not update Sleep Sounds notification:', error)
  })
}

function stopNativeSleepMedia() {
  if (!nativeMediaBridge) return

  Promise.resolve(nativeMediaBridge.stopSleepMedia()).catch(error => {
    console.warn('Could not stop Sleep Sounds notification:', error)
  })
}

function updateMediaPlaybackState() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }

  syncNativeSleepMedia()
}

function updateMediaMetadata(sound) {
  if (!('mediaSession' in navigator) || !('MediaMetadata' in window)) return

  navigator.mediaSession.metadata = new MediaMetadata({
    title: sound.name,
    artist: 'Mindrise Sleep Sounds',
    album: 'Mindrise'
  })

  updateMediaPlaybackState()
}

function removeNativeMediaListener() {
  listenerSetupId++

  if (nativeMediaListener) {
    nativeMediaListener.remove()
    nativeMediaListener = null
  }
}

export function stopSleepAudio() {
  /*
   * Invalidate any pending play() promise or audio event from the
   * previous playback session before stopping the current audio.
   */
  playbackGeneration++

  const previousAudio = audio
  audio = null

  if (previousAudio) {
    previousAudio.pause()

    try {
      previousAudio.currentTime = 0
    } catch (error) {
      // The audio may not have loaded enough to seek.
    }

    previousAudio.src = ''
    previousAudio.load()
  }

  isPlaying = false
  updateMediaPlaybackState()

  stopNativeSleepMedia()
  removeNativeMediaListener()

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = null

    ;['play', 'pause', 'nexttrack', 'previoustrack'].forEach(action => {
      try {
        navigator.mediaSession.setActionHandler(action, null)
      } catch (error) {
        // Ignore unsupported media actions.
      }
    })
  }
}

export function renderSleep(
  data,
  onNavigate,
  onProfile,
  onSoundChange,
  mediaBridge
) {
  selectedSound = data.selectedSound || null
  loopEnabled = data.soundLoop !== false
  nativeMediaBridge = mediaBridge || null

  const currentListenerSetupId = ++listenerSetupId

  if (nativeMediaListener) {
    nativeMediaListener.remove()
    nativeMediaListener = null
  }

  if (nativeMediaBridge?.addListener) {
    nativeMediaBridge.addListener('sleepMediaControl', event => {
      if (currentListenerSetupId !== listenerSetupId) return

      if (event.control === 'previous') {
        changeSound(-1)
      } else if (event.control === 'next') {
        changeSound(1)
      } else if (event.control === 'play') {
        if (audio) {
          void resumeSound()
        } else {
          const sound = sounds.find(item => item.id === selectedSound)
          if (sound) void playSound(sound)
        }
      } else if (event.control === 'pause') {
        pauseSound()
      } else if (event.control === 'stop') {
        stopSleepAudio()
      }
    }).then(listener => {
      if (currentListenerSetupId === listenerSetupId) {
        nativeMediaListener = listener
      } else {
        listener.remove()
      }
    }).catch(error => {
      console.warn('Could not register Sleep Sounds controls:', error)
    })
  }

  const selected = sounds.find(sound => sound.id === selectedSound)

  document.querySelector('#app').innerHTML = `
    <main class="main-page sleep-page midnight-page">

      <header class="page-header sleep-page-header">
        <div class="page-heading">
          <span class="page-eyebrow">REST & RESET</span>
          <h1>Sleep Sounds</h1>
          <p class="tracker-subtitle">
            Find a little calm before bedtime.
          </p>
        </div>
        ${renderMenu()}
      </header>

      <section class="sleep-intro">
        <div class="sleep-intro-content">
          <span class="sleep-intro-eyebrow">YOUR MOMENT OF CALM</span>
          <h2>Settle in and unwind.</h2>
          <p>Let the little things fade away. Choose a sound and make room for rest.</p>
        </div>
        <div class="sleep-intro-decoration" aria-hidden="true">
          <svg viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="43" stroke="currentColor" stroke-opacity=".15"/>
            <circle cx="60" cy="60" r="32" stroke="currentColor" stroke-opacity=".2"/>
            <path d="M70 24C47 27 34 49 41 70C48 91 72 99 91 86C73 89 57 76 55 59C53 43 59 31 70 24Z" fill="currentColor" fill-opacity=".8"/>
            <path d="M87 26L89 32L95 34L89 36L87 42L85 36L79 34L85 32L87 26Z" fill="currentColor"/>
            <circle cx="31" cy="36" r="2" fill="currentColor"/>
            <circle cx="97" cy="65" r="2" fill="currentColor"/>
          </svg>
        </div>
      </section>

      <section class="sleep-sounds-section">
        <div class="section-heading">
          <div>
            <span class="section-eyebrow">EXPLORE SOUNDS</span>
            <h2>Choose your atmosphere</h2>
          </div>
          <span class="sound-count">${sounds.length} sounds</span>
        </div>

        <div class="sound-grid">
          ${sounds.map(sound => `
            <button
              type="button"
              class="sound-card ${selectedSound === sound.id ? 'selected' : ''}"
              data-sound="${sound.id}"
              aria-pressed="${selectedSound === sound.id}"
            >
              <span class="sound-card-icon" aria-hidden="true">
                ${getSoundIcon(sound.id)}
              </span>
              <span class="sound-card-text">
                <strong>${sound.name}</strong>
                <span>${sound.description}</span>
              </span>
              <span class="sound-card-indicator" aria-hidden="true">
                <span></span>
              </span>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="sound-player ${selected ? 'has-selection' : ''}" id="sound-player">
        <div class="sound-player-top">
          <div class="sound-player-information">
            <span class="player-eyebrow">
              <span class="player-status-dot"></span>
              NOW PLAYING
            </span>
            <h2 id="playing-name">${selected ? selected.name : 'Choose a sound'}</h2>
            <p id="playing-description">
              ${selected ? selected.description : 'Select an atmosphere above to begin.'}
            </p>
          </div>

          <div class="sound-player-art" aria-hidden="true">
            ${getSoundIcon(selectedSound || 'forest')}
          </div>
        </div>

        <div class="sound-player-controls">
          <button
            type="button"
            id="play-pause"
            class="play-pause-button"
            ${selected ? '' : 'disabled'}
          >
            <span class="play-button-icon" aria-hidden="true">
              ${isPlaying
                ? '<svg viewBox="0 0 24 24"><path d="M8 5H11V19H8Z M14 5H17V19H14Z" fill="currentColor"/></svg>'
                : '<svg viewBox="0 0 24 24"><path d="M8 5L19 12L8 19V5Z" fill="currentColor"/></svg>'}
            </span>
            <span>${isPlaying ? 'Pause sound' : 'Play sound'}</span>
          </button>

          <label class="loop-control">
            <input type="checkbox" id="loop-toggle" ${loopEnabled ? 'checked' : ''}>
            <span class="loop-control-track" aria-hidden="true"></span>
            <span class="loop-control-label">Loop continuously</span>
          </label>
        </div>

        <p id="sound-message" class="tracker-message sound-message" aria-live="polite"></p>
      </section>

      ${renderBottomNav('sleep')}
    </main>
  `

  attachBottomNavEvents(page => {
    stopSleepAudio()
    onNavigate(page)
  })

  attachMenuEvents(onProfile)

  document.querySelectorAll('.sound-card').forEach(button => {
    button.addEventListener('click', () => {
      const sound = sounds.find(item => item.id === button.dataset.sound)
      if (!sound) return

      if (selectedSound === sound.id && audio) {
        if (isPlaying) {
          pauseSound()
        } else {
          if (audio.ended) {
            try {
              audio.currentTime = 0
            } catch (error) {
              // Ignore seek errors before the audio is ready.
            }
          }

          void resumeSound()
        }
      } else {
        void playSound(sound)
      }

      onSoundChange(sound.id, loopEnabled)
      updatePlayer(sound)
    })
  })

  document.querySelector('#play-pause').addEventListener('click', async () => {
    if (!selectedSound) return

    if (isPlaying) {
      pauseSound()
      return
    }

    if (audio) {
      await resumeSound()
      return
    }

    const sound = sounds.find(item => item.id === selectedSound)
    if (sound) await playSound(sound)
  })

  document.querySelector('#loop-toggle').addEventListener('change', event => {
    loopEnabled = event.target.checked

    if (audio) {
      audio.loop = loopEnabled
    }

    onSoundChange(selectedSound, loopEnabled)
  })

  function pauseSound() {
    const currentAudio = audio

    if (!currentAudio) return

    currentAudio.pause()

    if (audio === currentAudio) {
      isPlaying = false
      updatePlayButton()
      updateMediaPlaybackState()
    }
  }

  async function resumeSound() {
    const currentAudio = audio
    const currentGeneration = playbackGeneration

    if (!currentAudio) return

    try {
      await currentAudio.play()

      if (
        currentGeneration !== playbackGeneration ||
        audio !== currentAudio
      ) {
        return
      }

      isPlaying = true
      updatePlayButton()
      updateMediaPlaybackState()
      clearSoundMessage()

    } catch (error) {
      if (
        currentGeneration !== playbackGeneration ||
        audio !== currentAudio
      ) {
        return
      }

      showSoundError(currentAudio)
    }
  }

  async function playSound(sound) {
    /*
     * Every new selection gets its own generation. Any delayed event
     * or play() promise belonging to an older selection is ignored.
     */
    const currentGeneration = ++playbackGeneration

    const previousAudio = audio
    audio = null

    if (previousAudio) {
      previousAudio.pause()

      try {
        previousAudio.currentTime = 0
      } catch (error) {
        // Ignore seek errors before the audio is ready.
      }

      previousAudio.src = ''
      previousAudio.load()
    }

    selectedSound = sound.id
    isPlaying = false

    const newAudio = new Audio(`/sounds/${sound.file}`)

    audio = newAudio
    newAudio.loop = loopEnabled
    newAudio.preload = 'auto'

    const isCurrentPlayback = () =>
      currentGeneration === playbackGeneration &&
      audio === newAudio

    updateMediaMetadata(sound)
    updatePlayer(sound)
    clearSoundMessage()

    newAudio.addEventListener('play', () => {
      if (!isCurrentPlayback()) return

      isPlaying = true
      updatePlayButton()
      updateMediaPlaybackState()
    })

    newAudio.addEventListener('pause', () => {
      if (!isCurrentPlayback()) return

      isPlaying = false
      updatePlayButton()
      updateMediaPlaybackState()
    })

    newAudio.addEventListener('ended', () => {
      if (!isCurrentPlayback()) return

      isPlaying = false
      updatePlayButton()
      updateMediaPlaybackState()
    })

    newAudio.addEventListener('error', () => {
      if (!isCurrentPlayback()) return

      showSoundError(newAudio)
    })

    try {
      await newAudio.play()

      if (!isCurrentPlayback()) return

      isPlaying = true
      updatePlayButton()
      updateMediaPlaybackState()
      clearSoundMessage()

    } catch (error) {
      if (!isCurrentPlayback()) return

      showSoundError(newAudio)
    }
  }

  function updatePlayer(sound) {
    const name = document.querySelector('#playing-name')
    const description = document.querySelector('#playing-description')
    const playerArt = document.querySelector('.sound-player-art')
    const player = document.querySelector('#sound-player')
    const playButton = document.querySelector('#play-pause')

    if (name) name.textContent = sound.name
    if (description) description.textContent = sound.description

    if (playerArt) {
      playerArt.innerHTML = getSoundIcon(sound.id)
    }

    document.querySelectorAll('.sound-card').forEach(button => {
      const active = button.dataset.sound === sound.id
      button.classList.toggle('selected', active)
      button.setAttribute('aria-pressed', String(active))
    })

    player?.classList.add('has-selection')

    if (playButton) {
      playButton.disabled = false
    }

    updatePlayButton()
  }

  function updatePlayButton() {
    const button = document.querySelector('#play-pause')

    if (!button) return

    button.innerHTML = `
      <span class="play-button-icon" aria-hidden="true">
        ${isPlaying
          ? '<svg viewBox="0 0 24 24"><path d="M8 5H11V19H8Z M14 5H17V19H14Z" fill="currentColor"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M8 5L19 12L8 19V5Z" fill="currentColor"/></svg>'}
      </span>
      <span>${isPlaying ? 'Pause sound' : 'Play sound'}</span>
    `
  }

  function clearSoundMessage() {
    const message = document.querySelector('#sound-message')
    if (message) message.textContent = ''
  }

  function showSoundError(failedAudio = audio) {
    if (failedAudio !== audio) return

    isPlaying = false
    updatePlayButton()
    updateMediaPlaybackState()

    const message = document.querySelector('#sound-message')

    if (message) {
      message.textContent =
        'Unable to play this sound. Please check that the WAV file is inside public/sounds.'
    }
  }

  function changeSound(direction) {
    const currentIndex = sounds.findIndex(sound => sound.id === selectedSound)
    const nextIndex = (currentIndex + direction + sounds.length) % sounds.length
    const nextSound = sounds[nextIndex]

    void playSound(nextSound)
    onSoundChange(nextSound.id, loopEnabled)
    updatePlayer(nextSound)
  }

  if ('mediaSession' in navigator) {
    const handlers = {
      play: () => {
        if (audio) {
          void resumeSound()
        } else {
          const sound = sounds.find(item => item.id === selectedSound)
          if (sound) void playSound(sound)
        }
      },
      pause: () => pauseSound(),
      nexttrack: () => changeSound(1),
      previoustrack: () => changeSound(-1)
    }

    Object.entries(handlers).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch (error) {
        // Some browsers do not support every media action.
      }
    })

    if (selected) {
      updateMediaMetadata(selected)
    }
  }
}

function getSoundIcon(id) {
  const icons = {
    campfire: `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M24 5C28 14 18 18 22 26C17 23 16 19 17 15C10 23 11 31 16 37C21 44 33 42 36 34C40 25 31 14 24 5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M24 27C29 32 29 36 25 39C21 40 18 37 19 34C20 31 22 29 24 27Z" stroke="currentColor" stroke-width="2"/>
      </svg>
    `,
    cave: `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M5 39C8 24 13 11 24 8C35 11 40 24 43 39H5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M15 39C17 30 19 24 24 22C29 24 31 30 33 39" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    'city-night': `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M6 41V22H16V41M16 41V13H29V41M29 41V25H42V41H6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M11 27H12M11 33H12M21 19H24M21 25H24M21 31H24M34 31H37M34 36H37" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M34 7C29 8 28 14 32 17C35 19 39 17 40 14C36 15 33 12 34 7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
    'desert-wind': `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M5 17H31C36 17 37 10 32 9C29 8 27 10 27 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 25H39C44 25 44 32 39 33C36 34 34 32 34 30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 39C17 31 28 31 41 39" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    dungeon: `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M8 41V17C8 8 16 5 24 5C32 5 40 8 40 17V41H8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M16 41V24C16 18 19 15 24 15C29 15 32 18 32 24V41" stroke="currentColor" stroke-width="2"/>
        <path d="M21 29H27M24 26V32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    forest: `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M24 5L11 24H18L10 35H38L30 24H37L24 5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M24 35V44" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    night: `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M30 7C18 9 13 21 18 32C23 42 36 42 42 34C30 37 21 27 23 17C24 12 26 9 30 7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 8V14M7 11H13M37 7V11M35 9H39" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    ocean: `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M5 17C10 12 15 12 20 17C25 22 30 22 35 17C38 14 41 14 44 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 25C9 20 14 20 19 25C24 30 29 30 34 25C38 21 42 21 45 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 33C10 28 15 28 20 33C25 38 30 38 35 33C38 30 41 30 44 32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    'rain-roof': `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M5 23L24 8L43 23M11 20V38H37V20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 29L15 34M25 29L23 34M33 29L31 34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    rain: `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M13 27H34C39 27 41 23 39 19C38 16 35 15 32 16C30 8 19 7 15 14C10 13 6 17 7 22C8 25 10 27 13 27Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 32L14 37M25 32L23 37M34 32L32 37" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    river: `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M8 5C17 13 31 15 40 8M8 18C17 26 31 28 40 21M8 31C17 39 31 41 40 34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12C11 15 15 15 20 14M28 27C34 29 38 28 43 26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    wind: `
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M5 17H32C37 17 38 10 33 9C30 8 28 10 28 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 24H39C44 24 44 31 39 32C36 33 34 31 34 29" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 31H20C25 31 25 38 20 39C17 40 15 38 15 36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `
  }

  return icons[id] || icons.forest
}