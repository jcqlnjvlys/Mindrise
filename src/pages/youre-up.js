
export function renderYoureUp(onContinue) {
  document.querySelector('#app').innerHTML = `
    <main class="youre-up-page">
      <div class="youre-up-content">
        <div class="success-mark" aria-hidden="true">
          <span>✓</span>
        </div>

        <div class="youre-up-brand"><img src="/mindrise-bird.png" alt="Mindrise bird"></div><h1>You're up!</h1>

        <p>Have a great day ahead.</p>

        <button type="button" id="continue-button" class="primary-button">
          OK
        </button>
      </div>
    </main>
  `

  document.querySelector('#continue-button').addEventListener('click', onContinue)
}
