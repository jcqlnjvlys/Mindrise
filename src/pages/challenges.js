const QUOTE_HISTORY_KEY = 'mindrise_quote_history_v1'
const QUOTE_COOLDOWN = 20

const quoteTexts = [
  'Small steps taken consistently can lead to meaningful changes over time.',
  'Every morning offers another opportunity to learn, improve, and begin again.',
  'Progress does not require perfection, only the willingness to keep moving forward.',
  'You do not need to have everything figured out to take the next step.',
  'A fresh start can begin with one small decision.',
  'Consistency turns ordinary efforts into meaningful progress.',
  'Give yourself credit for the effort you put in today.',
  'Your future is shaped by the choices you make in the present.',
  'Every challenge is an opportunity to discover what you can do.',
  'The best time to begin again is whenever you are ready.',
  'Keep going, even when progress feels slower than expected.',
  'A little determination can carry you further than you think.',
  'Make today count through the things you choose to do.',
  'You are allowed to grow at your own pace.',
  'Good things take time, patience, and steady effort.',
  'The way forward becomes clearer when you keep moving.',
  'Your effort matters, even when nobody else notices it.',
  'One productive moment can change the direction of your day.',
  'Be patient with the process and committed to the goal.',
  'You can make today meaningful without making it perfect.',
  'Every new day gives you another chance to make progress.',
  'Focus on what you can do, then take that first step.',
  'A positive change can begin with a simple action.',
  'You have made it through difficult days before. Keep moving.',
  'The smallest improvements are still improvements.',
  'Your goals deserve your patience as much as your effort.',
  'Start where you are and work with what you have.',
  'A determined mind can turn a difficult beginning into progress.',
  'Do something today that your future self will appreciate.',
  'You do not have to move quickly to move forward.',
  'Make room for new opportunities by showing up today.',
  'Every effort adds something to the person you are becoming.',
  'A setback does not erase the progress you have already made.',
  'Let your actions today support the plans you have for tomorrow.',
  'You can always choose to approach the next moment differently.',
  'The strength to continue is built one decision at a time.',
  'Give today a chance to surprise you.',
  'Small beginnings can lead to remarkable destinations.',
  'Your progress is worth celebrating, even when it happens quietly.',
  'A focused start can make the rest of the day feel lighter.',
  'Choose progress over waiting for the perfect moment.',
  'You are capable of learning your way through unfamiliar things.',
  'Each day is another chance to practice becoming better.',
  'Keep your attention on the next step, not the entire staircase.',
  'The effort you make today can become tomorrow’s confidence.',
  'There is value in trying again with a little more experience.',
  'Let your goals guide you, but let patience support you.',
  'You can build a better routine one morning at a time.',
  'Do not underestimate what steady effort can accomplish.',
  'A new day is an invitation to make a different choice.',
  'Take pride in showing up, especially when it takes effort.',
  'You are still making progress on the days that feel ordinary.',
  'Turn your intentions into actions, one step at a time.',
  'There is always something useful you can do with today.',
  'Your next chapter can begin with the decision to get up.',
  'Stay curious, stay willing, and keep learning.',
  'A meaningful day is built through meaningful moments.',
  'Give yourself the chance to become more than yesterday.',
  'The first step does not need to be impressive. It just needs to happen.',
  'Keep building a life that reflects what matters to you.'
]

const mathChallenges = (() => {
  const items = []

  for (let a = 12; a <= 29; a++) {
    for (let b = 3; b <= 9; b++) {
      items.push({
        type: 'math',
        question: `What is ${a} × ${b}?`,
        answer: String(a * b)
      })
    }
  }

  for (let a = 35; a <= 95; a += 5) {
    for (let b = 12; b <= 38; b += 2) {
      items.push({
        type: 'math',
        question: `What is ${a} + ${b}?`,
        answer: String(a + b)
      })

      if (a > b) {
        items.push({
          type: 'math',
          question: `What is ${a} − ${b}?`,
          answer: String(a - b)
        })
      }
    }
  }

  for (let divisor = 3; divisor <= 12; divisor++) {
    for (let quotient = 4; quotient <= 14; quotient++) {
      items.push({
        type: 'math',
        question: `What is ${divisor * quotient} ÷ ${divisor}?`,
        answer: String(quotient)
      })
    }
  }

  return items.map((item, index) => ({
    ...item,
    id: String(index)
  }))
})()

function readQuoteHistory() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(QUOTE_HISTORY_KEY)
    )

    if (
      saved &&
      typeof saved.alarmCount === 'number' &&
      saved.used &&
      typeof saved.used === 'object'
    ) {
      return {
        alarmCount: saved.alarmCount,
        used: saved.used,
        mathUsed:
          saved.mathUsed &&
          typeof saved.mathUsed === 'object'
            ? saved.mathUsed
            : {}
      }
    }
  } catch (error) {
    console.warn('Could not read quote history:', error)
  }

  return {
    alarmCount: 0,
    used: {},
    mathUsed: {}
  }
}

function saveQuoteHistory(history) {
  try {
    localStorage.setItem(
      QUOTE_HISTORY_KEY,
      JSON.stringify(history)
    )
  } catch (error) {
    console.warn('Could not save quote history:', error)
  }
}

function shuffle(items) {
  const shuffled = [...items]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i]
    ]
  }

  return shuffled
}

function getAllQuoteChallenges() {
  return quoteTexts.map((question, index) => ({
    type: 'quote',
    prompt: 'Retype the following quote exactly:',
    question,
    id: String(index)
  }))
}

function getQuoteChallenges(alarmNumber) {
  const history = readQuoteHistory()

  const available = getAllQuoteChallenges().filter(
    challenge => {
      const lastUsed = history.used[challenge.id]

      return (
        lastUsed === undefined ||
        alarmNumber - lastUsed >= QUOTE_COOLDOWN
      )
    }
  )

  return shuffle(
    available.length
      ? available
      : getAllQuoteChallenges()
  )
}

function getAllMathChallenges() {
  return mathChallenges.map(item => ({ ...item }))
}

function getAnotherChallenge(
  currentChallenge,
  shownQuestions
) {
  const history = readQuoteHistory()
  const alarmNumber = history.alarmCount

  if (currentChallenge.type === 'quote') {
    const available = getAllQuoteChallenges().filter(
      challenge => {
        const lastUsed = history.used[challenge.id]

        return (
          !shownQuestions.has(challenge.question) &&
          (
            lastUsed === undefined ||
            alarmNumber - lastUsed >= QUOTE_COOLDOWN
          )
        )
      }
    )

    const fallback = getAllQuoteChallenges().filter(
      challenge =>
        !shownQuestions.has(challenge.question)
    )

    const candidates = available.length
      ? available
      : fallback

    if (!candidates.length) return null

    const nextChallenge = shuffle(candidates)[0]

    history.used[nextChallenge.id] = alarmNumber

    saveQuoteHistory(history)

    return { ...nextChallenge }
  }

  const available = getAllMathChallenges().filter(
    challenge => {
      const lastUsed =
        history.mathUsed[challenge.id] ??
        -QUOTE_COOLDOWN

      return (
        !shownQuestions.has(challenge.question) &&
        alarmNumber - lastUsed >= QUOTE_COOLDOWN
      )
    }
  )

  const fallback = getAllMathChallenges().filter(
    challenge =>
      !shownQuestions.has(challenge.question)
  )

  const candidates = available.length
    ? available
    : fallback

  if (!candidates.length) return null

  const nextChallenge = shuffle(candidates)[0]

  history.mathUsed[nextChallenge.id] = alarmNumber

  saveQuoteHistory(history)

  return { ...nextChallenge }
}

export function createChallengeSequence() {
  const history = readQuoteHistory()

  history.alarmCount += 1

  const alarmNumber = history.alarmCount

  const quoteCandidates =
    getQuoteChallenges(alarmNumber)

  const mathCandidates = shuffle(
    getAllMathChallenges().filter(challenge => {
      const lastUsed =
        history.mathUsed[challenge.id] ??
        -QUOTE_COOLDOWN

      return (
        alarmNumber - lastUsed >= QUOTE_COOLDOWN
      )
    })
  )

  const sequence = []
  const usedQuoteIds = new Set()
  const usedMathIds = new Set()

  for (let i = 0; i < 3; i++) {
    const useQuote = Math.random() < 0.5

    if (useQuote) {
      const nextQuote = quoteCandidates.find(
        quote => !usedQuoteIds.has(quote.id)
      )

      if (nextQuote) {
        sequence.push({ ...nextQuote })

        usedQuoteIds.add(nextQuote.id)
        history.used[nextQuote.id] = alarmNumber

        continue
      }
    }

    const nextMath =
      mathCandidates.find(
        item => !usedMathIds.has(item.id)
      ) ||
      shuffle(
        getAllMathChallenges().filter(
          item => !usedMathIds.has(item.id)
        )
      )[0]

    if (!nextMath) {
      const nextQuote = quoteCandidates.find(
        quote => !usedQuoteIds.has(quote.id)
      )

      if (nextQuote) {
        sequence.push({ ...nextQuote })

        usedQuoteIds.add(nextQuote.id)
        history.used[nextQuote.id] = alarmNumber

        continue
      }

      break
    }

    sequence.push({ ...nextMath })

    usedMathIds.add(nextMath.id)
    history.mathUsed[nextMath.id] = alarmNumber
  }

  saveQuoteHistory(history)

  return sequence
}

function normalizeQuoteAnswer(value) {
  return String(value)
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

function isCorrectMathAnswer(value, expected) {
  const answer = String(value).trim()

  if (!answer) return false

  const numericAnswer = Number(answer)
  const numericExpected = Number(expected)

  return (
    Number.isFinite(numericAnswer) &&
    Number.isFinite(numericExpected) &&
    numericAnswer === numericExpected
  )
}

export function renderChallenge(
  challenge,
  round,
  onAnswer
) {
  const isQuote = challenge.type === 'quote'

  const shownQuestions = new Set([
    challenge.question
  ])

  document.querySelector('#app').innerHTML = `
    <main class="challenge-page">
      <div class="challenge-content">
        <p class="challenge-brand">
          <img src="/mindrise-bird.png" alt="Mindrise bird">
          <span>Mindrise</span>
        </p>

        <p class="challenge-progress">
          Wake-up challenge ${round} of 3
        </p>

        <h1>Time to focus</h1>

        <p class="challenge-instruction">
          ${
            isQuote
              ? 'Retype the quote below exactly as shown.'
              : 'Enter the correct answer to continue.'
          }
        </p>

        <div id="challenge-question">
          ${
            isQuote
              ? `
                <div class="quote-card">
                  <p>${escapeHTML(challenge.question)}</p>
                </div>

                <textarea
                  id="quote-answer"
                  placeholder="Type the complete quote here..."
                  rows="5"
                  spellcheck="false"
                  autocomplete="off"
                ></textarea>
              `
              : `
                <div class="math-card">
                  <h2>${escapeHTML(challenge.question)}</h2>

                  <input
                    type="number"
                    id="math-answer"
                    placeholder="Enter your answer"
                    inputmode="numeric"
                    autocomplete="off"
                  >
                </div>
              `
          }
        </div>

        <p
          id="challenge-message"
          class="challenge-message"
          aria-live="polite"
        ></p>

        <button
          type="button"
          id="submit-challenge"
          class="primary-button"
        >
          Submit Answer
        </button>

        <button
          type="button"
          id="another-challenge"
          class="secondary-button"
          style="width:100%;margin-top:10px"
        >
          Get Another Challenge
        </button>
      </div>
    </main>
  `

  let currentChallenge = { ...challenge }
  let currentIsQuote = isQuote
  let answerInput = null
  let isSubmitting = false

  const questionContainer =
    document.querySelector('#challenge-question')

  const submitButton =
    document.querySelector('#submit-challenge')

  const anotherButton =
    document.querySelector('#another-challenge')

  const message =
    document.querySelector('#challenge-message')

  function attachQuoteRestrictions() {
    if (!currentIsQuote) return

    const quoteCard =
      questionContainer.querySelector('.quote-card')

    if (!quoteCard) return

    ;[
      'copy',
      'cut',
      'contextmenu',
      'dragstart'
    ].forEach(eventName => {
      quoteCard.addEventListener(
        eventName,
        event => event.preventDefault()
      )
    })

    quoteCard.addEventListener(
      'keydown',
      event => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'c'
        ) {
          event.preventDefault()
        }
      }
    )
  }

  function updateAnswerInput() {
    answerInput = questionContainer.querySelector(
      currentIsQuote
        ? '#quote-answer'
        : '#math-answer'
    )

    attachQuoteRestrictions()

    if (answerInput) {
      answerInput.focus()
    }
  }

  function renderQuestion() {
    isSubmitting = false

    submitButton.disabled = false
    anotherButton.disabled = false

    questionContainer.innerHTML =
      currentIsQuote
        ? `
          <div class="quote-card">
            <p>${escapeHTML(currentChallenge.question)}</p>
          </div>

          <textarea
            id="quote-answer"
            placeholder="Type the complete quote here..."
            rows="5"
            spellcheck="false"
            autocomplete="off"
          ></textarea>
        `
        : `
          <div class="math-card">
            <h2>${escapeHTML(currentChallenge.question)}</h2>

            <input
              type="number"
              id="math-answer"
              placeholder="Enter your answer"
              inputmode="numeric"
              autocomplete="off"
            >
          </div>
        `

    updateAnswerInput()
  }

  function submitAnswer() {
    if (
      isSubmitting ||
      !answerInput ||
      answerInput.disabled
    ) {
      return
    }

    const answer = answerInput.value

    const correct = currentIsQuote
      ? normalizeQuoteAnswer(answer) ===
        normalizeQuoteAnswer(
          currentChallenge.question
        )
      : isCorrectMathAnswer(
          answer,
          currentChallenge.answer
        )

    if (!correct) {
      message.textContent =
        'Incorrect answer. Please try again.'

      answerInput.value = ''
      answerInput.focus()

      return
    }

    isSubmitting = true

    message.textContent = 'Correct!'

    submitButton.disabled = true
    anotherButton.disabled = true
    answerInput.disabled = true

    onAnswer()
  }

  function requestAnotherChallenge() {
    if (isSubmitting) return

    anotherButton.disabled = true

    const nextChallenge = getAnotherChallenge(
      currentChallenge,
      shownQuestions
    )

    if (!nextChallenge) {
      message.textContent =
        'No other challenges are available right now.'

      anotherButton.disabled = false

      return
    }

    currentChallenge = { ...nextChallenge }

    currentIsQuote =
      nextChallenge.type === 'quote'

    shownQuestions.add(
      nextChallenge.question
    )

    message.textContent = ''

    renderQuestion()
  }

  submitButton.addEventListener(
    'click',
    submitAnswer
  )

  anotherButton.addEventListener(
    'click',
    requestAnotherChallenge
  )

  questionContainer.addEventListener(
    'keydown',
    event => {
      if (
        event.target !== answerInput ||
        event.key !== 'Enter' ||
        (currentIsQuote && event.shiftKey)
      ) {
        return
      }

      event.preventDefault()

      submitAnswer()
    }
  )

  updateAnswerInput()
}

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]
  )
}