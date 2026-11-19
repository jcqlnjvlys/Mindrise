import { Capacitor, registerPlugin } from '@capacitor/core'

const MindriseAlarm = registerPlugin('MindriseAlarm')

let alarmAudio = null
let nativePlaybackActive = false

export function renderAlarmRinging(alarm, onTurnOff, useNativeAudio = false) {
  stopAlarmAudio()

  nativePlaybackActive = Boolean(
    useNativeAudio && Capacitor.getPlatform() === 'android'
  )

  if (!nativePlaybackActive) {
    const soundFile = alarm.sound || 'alarm-synth-verb-hit.wav'

    alarmAudio = new Audio(
      `/alarm-sounds/${encodeURIComponent(soundFile)}`
    )

    alarmAudio.loop = true
    alarmAudio.volume = 1

    alarmAudio.play().catch(error => {
      console.error('Alarm playback failed:', error)
    })
  }

  document.querySelector('#app').innerHTML = `
    <main class="ringing-page">
      <div class="ringing-content">
        <div class="ringing-brand"><img src="/mindrise-bird.png" alt="Mindrise bird"><span>Mindrise</span></div>

        <div class="ringing-clock-icon" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="23"/><path d="M32 20v15l10 6M15 8 8 15M49 8l7 7"/></svg></div>

        <p class="ringing-label">Your alarm is ringing</p>

        <h1>${escapeHTML(alarm.time)}</h1>

        <p class="ringing-alarm-name">
          ${escapeHTML(alarm.name || 'Time to wake up')}
        </p>

        <button type="button" id="turn-off-button" class="primary-button">
          Turn Off
        </button>
      </div>
    </main>
  `

  document.querySelector('#turn-off-button').addEventListener('click', () => {
    onTurnOff()
  })
}

export function stopAlarmAudio() {
  if (alarmAudio) {
    alarmAudio.pause()
    alarmAudio.currentTime = 0
    alarmAudio = null
  }

  if (nativePlaybackActive) {
    nativePlaybackActive = false

    MindriseAlarm.stopRinging().catch(error => {
      console.error('Could not stop native alarm playback:', error)
    })
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}