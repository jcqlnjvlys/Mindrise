
import { renderBottomNav, attachBottomNavEvents } from '../components/navigation.js'
import { renderMenu, attachMenuEvents } from '../components/menu.js'

const alarmSoundNames = {
  'alarm-synth-verb-hit.wav': 'Synth Alarm',
  'atari-alarm-climber.wav': 'Atari Climber',
  'broken-cord-alarm.wav': 'Broken Cord Alarm',
  'burglar_alarm.wav': 'Burglar Alarm',
  'Car_Alarm_Big.wav': 'Car Alarm - Loud',
  'Car_Alarm_Chirp.wav': 'Car Alarm - Chirp',
  'Car_Alarm_Oscillating.wav': 'Car Alarm - Oscillating',
  'Car_Alarm_Small.wav': 'Car Alarm - Short',
  'cheesy-siren-blast.wav': 'Siren Blast',
  'crackle-alarm.wav': 'Crackle Alarm',
  'ding_dong.wav': 'Ding Dong',
  'lofi-communications.wav': 'Lo-fi Communications',
  'mechanical-air-raid-alarm.wav': 'Mechanical Air Raid',
  'nice-long-air-raid-siren.wav': 'Long Air Raid Siren',
  'nice-round-siren.wav': 'Round Siren',
  'oscillating-flyby.wav': 'Oscillating Flyby',
  'phasing-police-siren.wav': 'Phasing Police Siren',
  'police_siren.wav': 'Police Siren',
  'pumpy_pulse.wav': 'Pumpy Pulse',
  'rave-alarm.wav': 'Rave Alarm',
  'ringmod-alarm-fadein.wav': 'Ringing Fade In',
  'sickly-analog-warning-siren.wav': 'Analog Warning Siren',
  'space-hospital-alarm.wav': 'Space Hospital Alarm',
  'squeaky-clown-horn.wav': 'Clown Horn',
  'star-trek-bridge.wav': 'Bridge Alert',
  'submarine-alarm.wav': 'Submarine Alarm',
  'two_tone_siren.wav': 'Two-Tone Siren',
  'verby-climbing-buzz-alert.wav': 'Climbing Buzz Alert',
  'vidgame-gliss-down.wav': 'Video Game Gliss',
  'wobbly-pulse-upndown.wav': 'Wobbly Pulse'
}

function getAlarmSoundName(filename) {
  return alarmSoundNames[filename] || 'Alarm Sound'
}

export function renderAlarms(data, onNavigate, onAddAlarm, onEditAlarm, onDeleteAlarm, onToggleAlarm, onProfile) {
  const alarmCards = data.alarms.length
    ? data.alarms.map(alarm => `
        <article class="alarm-card ${alarm.enabled ? '' : 'alarm-disabled'}">
          <div class="alarm-information">
            <h2>${escapeHTML(alarm.time)}</h2>
            <p class="alarm-name">${escapeHTML(alarm.name || 'Alarm')}</p>
            <p class="alarm-days">
              ${alarm.repeat.length
                ? alarm.repeat.map(day => escapeHTML(day)).join(' · ')
                : 'Does not repeat'}
            </p>
            ${alarm.sound ? `<p class="alarm-sound">${escapeHTML(getAlarmSoundName(alarm.sound))}</p>` : ''}
          </div>

          <div class="alarm-actions">
            <label class="switch">
              <input
                type="checkbox"
                class="alarm-toggle"
                data-id="${alarm.id}"
                ${alarm.enabled ? 'checked' : ''}
                aria-label="Toggle alarm"
              >
              <span class="switch-slider"></span>
            </label>

            <button
              type="button"
              class="alarm-edit"
              data-id="${alarm.id}"
            >Edit</button>

            <button
              type="button"
              class="alarm-delete"
              data-id="${alarm.id}"
            >Delete</button>
          </div>
        </article>
      `).join('')
    : '<p class="empty-alarms">No alarms here.</p>'

  document.querySelector('#app').innerHTML = `
    <main class="main-page">
      <header class="page-header">
        <div>
          <h1>Alarms</h1>
          <p>Manage your wake-up times.</p>
        </div>
        ${renderMenu()}
      </header>

      <section class="alarm-list">
        ${alarmCards}
      </section>

      <button type="button" class="add-alarm-button" id="add-alarm">
        <span>+</span> Add Alarm
      </button>

      ${renderBottomNav('alarms')}
    </main>
  `

  attachBottomNavEvents(onNavigate)
  attachMenuEvents(onProfile)

  document.querySelector('#add-alarm').addEventListener('click', onAddAlarm)

  document.querySelectorAll('.alarm-edit').forEach(button => {
    button.addEventListener('click', () => {
      onEditAlarm(button.dataset.id)
    })
  })

  document.querySelectorAll('.alarm-delete').forEach(button => {
    button.addEventListener('click', () => {
      onDeleteAlarm(button.dataset.id)
    })
  })

  document.querySelectorAll('.alarm-toggle').forEach(input => {
    input.addEventListener('change', () => {
      onToggleAlarm(input.dataset.id, input.checked)
    })
  })
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
