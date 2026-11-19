
export function renderConfirmation(onAwake, onExpired, expiresAt = null) {
  const DURATION = 100000

  let interval = null
  let finished = false

  // Reuse the original deadline when restoring the confirmation screen.
  // Only create a new 100-second countdown when there is no saved deadline.
  const deadline = Number.isFinite(expiresAt)
    ? expiresAt
    : Date.now() + DURATION

  document.querySelector('#app').innerHTML = `
    <main class="confirmation-page confirmation-modal-backdrop">
      <section class="confirmation-content app-modal" role="dialog" aria-modal="true" aria-labelledby="awake-title">
        <div class="challenge-brand">
          <img src="/mindrise-bird.png" alt="Mindrise bird">
          <span>Mindrise</span>
        </div>

        <h1 id="awake-title">Are you awake?</h1>

        <p class="confirmation-description">
          Confirm that you're ready to start your day.
        </p>

        <div class="countdown-circle" id="countdown-circle">
          <span id="countdown-number">100</span>
          <small>seconds</small>
        </div>

        <button type="button" id="awake-button" class="primary-button">
          I'm Awake
        </button>
      </section>
    </main>
  `

  const number = document.querySelector('#countdown-number')
  const circle = document.querySelector('#countdown-circle')
  const button = document.querySelector('#awake-button')

  function stopCountdown() {
    if (interval !== null) {
      clearInterval(interval)
      interval = null
    }
  }

  function updateCountdown() {
    if (finished) return

    const remainingMilliseconds = Math.max(0, deadline - Date.now())
    const remaining = Math.ceil(remainingMilliseconds / 1000)

    number.textContent = remaining

    const progress = Math.min(1, remainingMilliseconds / DURATION)
    circle.style.setProperty('--progress', progress)

    if (remainingMilliseconds <= 0) {
      finished = true
      stopCountdown()
      button.disabled = true
      onExpired()
    }
  }

  // Check immediately so an expired saved deadline doesn't restart the timer.
  updateCountdown()

  if (!finished) {
    interval = setInterval(updateCountdown, 250)
  }

  button.addEventListener('click', () => {
    if (finished) return

    finished = true
    stopCountdown()
    button.disabled = true

    onAwake()
  })

  return stopCountdown
}
