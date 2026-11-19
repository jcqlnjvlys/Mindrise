
export function renderAbout(onBack) {
  document.querySelector('#app').innerHTML = `
    <main class="about-page">
      <header class="form-header">
        <button type="button" class="back-button" id="about-back">
          ←
        </button>
        <h1>About Mindrise</h1>
      </header>

      <section class="about-brand">
        <h2>Mindrise</h2>
        <p>Your everyday companion for better mornings.</p>
      </section>

      <section class="about-section">
        <h2>About the App</h2>
        <p>
          Mindrise is an alarm and sleep habits management system
          designed to help users build more consistent morning
          routines and become more aware of their sleep habits.
        </p>
      </section>

      <section class="about-section">
        <h2>Alarms and Wake-up Challenges</h2>
        <p>
          Create and manage alarms, choose repeat days, and select
          alarm sounds. When an alarm rings, complete three
          consecutive challenges before confirming that you are awake.
        </p>
      </section>

      <section class="about-section">
        <h2>Morning Routines</h2>
        <p>
          Create a personal checklist of morning activities.
          Track completed tasks and view your routine progress.
        </p>
      </section>

      <section class="about-section">
        <h2>Sleep Tracker</h2>
        <p>
          Record your sleep time, monitor sleep duration, compare
          your records with your sleep goal, and check in with your
          wake-up mood.
        </p>
      </section>

      <section class="about-section">
        <h2>Sleep Sounds</h2>
        <p>
          Explore calming sounds that can be played while preparing
          for rest.
        </p>
      </section>

      <section class="about-section">
        <h2>Privacy and Data</h2>
        <p>
          Mindrise is designed to store personal app records locally
          on the device. Your alarms, routines, and sleep records
          should remain available without an internet connection.
        </p>
      </section>

      <p class="about-version">Mindrise · Project Version 1.0</p>
    </main>
  `

  document.querySelector('#about-back').addEventListener('click', onBack)
}
