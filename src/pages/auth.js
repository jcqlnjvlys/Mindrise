
import { auth } from '../firebase.js'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth'

// --------------------------------------------------
// MINDRISE HUMMINGBIRD LOGO
// --------------------------------------------------

const logo = `<img class="hummingbird" src="/mindrise-bird.png" alt="Mindrise bird">`

// --------------------------------------------------
// PASSWORD VISIBILITY
// --------------------------------------------------

const eyeIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
`

const eyeOffIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3 3l18 18"/>
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/>
    <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a13.6 13.6 0 0 1-3.1 4.1"/>
    <path d="M6.2 6.2C3.6 8 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3"/>
  </svg>
`

function passwordField(id, placeholder, autocomplete) {
  return `
    <div class="password-field">
      <input
        id="${id}"
        type="password"
        placeholder="${placeholder}"
        autocomplete="${autocomplete}"
        required
      >

      <button
        type="button"
        class="password-toggle"
        data-toggle-password="${id}"
        aria-label="Show password"
        aria-pressed="false"
      >
        ${eyeIcon}
      </button>
    </div>
  `
}

function attachPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(
        button.dataset.togglePassword
      )

      if (!input) return

      const showing = input.type === 'text'

      input.type = showing ? 'password' : 'text'
      button.innerHTML = showing ? eyeIcon : eyeOffIcon

      button.setAttribute(
        'aria-label',
        showing ? 'Show password' : 'Hide password'
      )

      button.setAttribute('aria-pressed', String(!showing))
    })
  })
}

// --------------------------------------------------
// FIREBASE ERROR MESSAGES
// --------------------------------------------------

function getAuthError(error) {
  const messages = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account was found with that email.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Your password must contain at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Connection failed. Please check your internet.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
    'auth/account-exists-with-different-credential':
      'An account already exists with this email using another sign-in method.',
    'auth/popup-closed-by-user':
      'The sign-in window was closed before authentication finished.',
    'auth/popup-blocked':
      'Your browser blocked the sign-in window. Please allow popups and try again.',
    'auth/cancelled-popup-request':
      'The sign-in request was cancelled. Please try again.',
    'auth/credential-already-in-use':
      'This account is already connected to another Mindrise account.'
  }

  return messages[error.code] || error.message || 'Something went wrong. Please try again.'
}

// --------------------------------------------------
// GOOGLE AND FACEBOOK AUTHENTICATION
// --------------------------------------------------

function getSocialError(error) {
  const code = error?.code || ''

  if (
    code.includes('cancel') ||
    code.includes('popup-closed') ||
    error?.message?.toLowerCase().includes('cancel')
  ) {
    return 'Sign-in was cancelled.'
  }

  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account with this email already exists using another sign-in method.'
  }

  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in provider is not enabled in Firebase.'
  }

  if (
    code === 'auth/network-request-failed' ||
    code === 'NETWORK_ERROR'
  ) {
    return 'Connection failed. Please check your internet and try again.'
  }

  console.error('Social authentication error:', error)

  return getAuthError(error)
}

async function signInWithSocialProvider(providerName) {
  const isNative = Capacitor.isNativePlatform()

  if (isNative) {
    let result
    let credential

    if (providerName === 'Google') {
      result = await FirebaseAuthentication.signInWithGoogle()

      const idToken = result.credential?.idToken

      if (!idToken) {
        throw new Error('Google did not return an ID token. Please try again.')
      }

      credential = GoogleAuthProvider.credential(idToken)
    } else if (providerName === 'Facebook') {
      result = await FirebaseAuthentication.signInWithFacebook()

      const accessToken = result.credential?.accessToken

      if (!accessToken) {
        throw new Error('Facebook did not return an access token. Please try again.')
      }

      credential = FacebookAuthProvider.credential(accessToken)
    } else {
      throw new Error('Unsupported sign-in provider.')
    }

    return await signInWithCredential(auth, credential)
  }

  // Browser authentication

  const provider = providerName === 'Google'
    ? new GoogleAuthProvider()
    : new FacebookAuthProvider()

  provider.setCustomParameters(
    providerName === 'Google'
      ? { prompt: 'select_account' }
      : {}
  )

  return await signInWithPopup(auth, provider)
}

function attachSocialButtons(messageElement, mode) {
  document.querySelectorAll('[data-provider]').forEach(button => {
    button.addEventListener('click', async () => {
      const providerName = button.dataset.provider
      const originalText = button.textContent

      messageElement.textContent = ''
      messageElement.style.color = ''

      const buttons = document.querySelectorAll('[data-provider]')

      buttons.forEach(item => {
        item.disabled = true
      })

      button.textContent = `Connecting to ${providerName}...`

      try {
        const credential = await signInWithSocialProvider(providerName)

        if (!credential?.user) {
          throw new Error('Authentication did not return a user. Please try again.')
        }

        // Firebase's auth-state listener handles navigation.
        // The successful user is now signed in on the JS layer.
      } catch (error) {
        console.error(`${providerName} ${mode} error:`, error)

        messageElement.textContent = getSocialError(error)
      } finally {
        buttons.forEach(item => {
          item.disabled = false
        })

        button.textContent = originalText
      }
    })
  })
}

// --------------------------------------------------
// BRAND HEADER
// --------------------------------------------------

function renderBrand() {
  return `
    <header class="brand">
      <div class="brand-logo">
        ${logo}
      </div>

      <h1>Mindrise</h1>
    </header>
  `
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

export function renderLogin({ onLogin, onSignup }) {
  document.querySelector('#app').innerHTML = `
    <main class="auth-page auth-login">

      ${renderBrand()}

      <section class="auth-card">
        <div class="auth-heading">
          <h2>Welcome back</h2>
          <p>Let's make tomorrow a better morning.</p>
        </div>

        <form id="login-form">
          <label for="email">Email address</label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            autocomplete="email"
            required
          >

          <label for="password">Password</label>

          ${passwordField(
            'password',
            'Enter your password',
            'current-password'
          )}

          <p class="signup-prompt" style="text-align:right;margin:0 0 4px">
            <button type="button" id="forgot-password">
              Forgot Password?
            </button>
          </p>

          <button
            class="primary-button"
            id="login-button"
            type="submit"
          >
            Log in
          </button>
        </form>

        <div class="auth-divider">
          <span>or continue with</span>
        </div>

        <div class="social-buttons">
          <button type="button" class="social-button" data-provider="Google">
            Google
          </button>

          <button type="button" class="social-button" data-provider="Facebook">
            Facebook
          </button>
        </div>

        <p class="signup-prompt">
          Don't have an account?
          <button type="button" id="show-signup">Sign up</button>
        </p>

        <p id="message" class="message" aria-live="polite"></p>
      </section>

    </main>
  `

  attachPasswordToggles()

  document.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault()

    const email = document.querySelector('#email').value.trim()
    const password = document.querySelector('#password').value
    const message = document.querySelector('#message')
    const button = document.querySelector('#login-button')

    message.textContent = ''
    button.disabled = true
    button.textContent = 'Logging in...'

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )

      onLogin(credential.user)
    } catch (error) {
      message.textContent = getAuthError(error)
    } finally {
      button.disabled = false
      button.textContent = 'Log in'
    }
  })

  document.querySelector('#forgot-password').addEventListener('click', async () => {
    const emailInput = document.querySelector('#email')
    const message = document.querySelector('#message')
    const button = document.querySelector('#forgot-password')
    const email = emailInput.value.trim()

    message.textContent = ''
    message.style.color = ''

    if (!email) {
      message.textContent = 'Please enter your email address first.'
      emailInput.focus()
      return
    }

    if (!emailInput.checkValidity()) {
      message.textContent = 'Please enter a valid email address.'
      emailInput.focus()
      return
    }

    button.disabled = true
    button.textContent = 'Sending...'

    try {
      await sendPasswordResetEmail(auth, email)

      message.style.color = '#27845f'
      message.textContent =
        'If an account exists for this email, a password reset link has been sent. Please check your inbox.'
    } catch (error) {
      console.error('Password reset email error:', error)
      message.style.color = ''
      message.textContent = getAuthError(error)
    } finally {
      button.disabled = false
      button.textContent = 'Forgot Password?'
    }
  })

  document.querySelector('#show-signup').addEventListener('click', onSignup)

  attachSocialButtons(
    document.querySelector('#message'),
    'login'
  )
}

// --------------------------------------------------
// PASSWORD RESET PAGE
// --------------------------------------------------

export async function renderPasswordReset(oobCode, onBackToLogin) {
  const app = document.querySelector('#app')

  app.innerHTML = `
    <main class="auth-page auth-reset">

      ${renderBrand()}

      <section class="auth-card">
        <div class="auth-heading">
          <h2>Reset your password</h2>
          <p>Checking your password reset link...</p>
        </div>

        <p id="reset-message" class="message" aria-live="polite">
          Please wait.
        </p>

      </section>

    </main>
  `

  let email

  try {
    email = await verifyPasswordResetCode(auth, oobCode)
  } catch (error) {
    console.error('Password reset link verification failed:', error)

    app.querySelector('.auth-card').innerHTML = `
      <div class="auth-heading">
        <h2>Reset link unavailable</h2>
        <p>This password reset link may have expired or already been used.</p>
      </div>

      <p class="message">
        Please return to Mindrise and request a new password reset link.
      </p>

      <button type="button" class="primary-button" id="reset-back-login">
        Back to Login
      </button>
    `

    document.querySelector('#reset-back-login').addEventListener(
      'click',
      onBackToLogin
    )

    return
  }

  app.querySelector('.auth-card').innerHTML = `
    <div class="auth-heading">
      <h2>Create a new password</h2>
      <p>Choose a new password for your Mindrise account.</p>
    </div>

    <p style="font-size:12px;text-align:center;margin-bottom:20px">
      Resetting password for <strong>${escapeHTML(email)}</strong>
    </p>

    <form id="reset-password-form">
      <label for="new-password">New password</label>

      ${passwordField(
        'new-password',
        'Enter your new password',
        'new-password'
      )}

      <label for="confirm-new-password">Confirm new password</label>

      ${passwordField(
        'confirm-new-password',
        'Confirm your new password',
        'new-password'
      )}

      <button
        class="primary-button"
        id="reset-password-button"
        type="submit"
      >
        Reset Password
      </button>
    </form>

    <p id="reset-message" class="message" aria-live="polite"></p>

    <p class="signup-prompt">
      <button type="button" id="reset-back-login">Back to Login</button>
    </p>
  `

  attachPasswordToggles()

  document.querySelector('#reset-back-login').addEventListener(
    'click',
    onBackToLogin
  )

  document.querySelector('#reset-password-form').addEventListener(
    'submit',
    async event => {
      event.preventDefault()

      const password = document.querySelector('#new-password').value
      const confirmation = document.querySelector('#confirm-new-password').value
      const message = document.querySelector('#reset-message')
      const button = document.querySelector('#reset-password-button')

      message.textContent = ''
      message.style.color = ''

      if (password.length < 6) {
        message.textContent =
          'Your password must contain at least 6 characters.'
        return
      }

      if (password !== confirmation) {
        message.textContent =
          'Your passwords do not match. Please try again.'
        return
      }

      button.disabled = true
      button.textContent = 'Updating password...'

      try {
        await confirmPasswordReset(auth, oobCode, password)

        app.querySelector('.auth-card').innerHTML = `
          <div class="auth-heading">
            <h2>Password updated!</h2>
            <p>Your Mindrise password has been changed successfully.</p>
          </div>

          <p style="color:#27845f;text-align:center;font-size:13px">
            You can now log in using your new password.
          </p>

          <button type="button" class="primary-button" id="reset-back-login">
            Return to Login
          </button>
        `

        document.querySelector('#reset-back-login').addEventListener(
          'click',
          onBackToLogin
        )
      } catch (error) {
        console.error('Password update failed:', error)

        const messages = {
          'auth/expired-action-code':
            'This reset link has expired. Please request a new one.',
          'auth/invalid-action-code':
            'This reset link is invalid or has already been used. Please request a new one.',
          'auth/weak-password':
            'Your password must contain at least 6 characters.',
          'auth/user-disabled':
            'This account is currently disabled.',
          'auth/user-not-found':
            'The account associated with this link could not be found.',
          'auth/network-request-failed':
            'Connection failed. Please check your internet and try again.'
        }

        message.textContent =
          messages[error.code] || 'Unable to update your password. Please try again.'

        button.disabled = false
        button.textContent = 'Reset Password'
      }
    }
  )
}

// --------------------------------------------------
// HTML SAFETY
// --------------------------------------------------

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}

// --------------------------------------------------
// SIGN UP
// --------------------------------------------------

export function renderSignup({ onRegister, onLogin }) {
  document.querySelector('#app').innerHTML = `
    <main class="auth-page auth-signup">

      ${renderBrand()}

      <section class="auth-card">
        <div class="auth-heading">
          <h2>Create your account</h2>
          <p>Create a little more room for better mornings.</p>
        </div>

        <form id="signup-form">
          <label for="name">Full name</label>

          <input
            id="name"
            type="text"
            placeholder="Enter your name"
            autocomplete="name"
            required
          >

          <label for="signup-email">Email address</label>

          <input
            id="signup-email"
            type="email"
            placeholder="Enter your email"
            autocomplete="email"
            required
          >

          <label for="signup-password">Password</label>

          ${passwordField(
            'signup-password',
            'Create a password',
            'new-password'
          )}

          <label for="confirm-password">Confirm password</label>

          ${passwordField(
            'confirm-password',
            'Confirm your password',
            'new-password'
          )}

          <button
            class="primary-button"
            id="signup-button"
            type="submit"
          >
            Create account
          </button>
        </form>

        <div class="auth-divider">
          <span>or sign up with</span>
        </div>

        <div class="social-buttons">
          <button type="button" class="social-button" data-provider="Google">
            Google
          </button>

          <button type="button" class="social-button" data-provider="Facebook">
            Facebook
          </button>
        </div>

        <p class="signup-prompt">
          Already have an account?
          <button type="button" id="show-login">Log in</button>
        </p>

        <p id="message" class="message" aria-live="polite"></p>
      </section>

    </main>
  `

  attachPasswordToggles()

  document.querySelector('#signup-form').addEventListener('submit', async event => {
    event.preventDefault()

    const name = document.querySelector('#name').value.trim()
    const email = document.querySelector('#signup-email').value.trim()
    const password = document.querySelector('#signup-password').value
    const confirmation = document.querySelector('#confirm-password').value
    const message = document.querySelector('#message')
    const button = document.querySelector('#signup-button')

    message.textContent = ''

    if (password.length < 6) {
      message.textContent = 'Your password must contain at least 6 characters.'
      return
    }

    if (password !== confirmation) {
      message.textContent = 'Your passwords do not match. Please try again.'
      return
    }

    button.disabled = true
    button.textContent = 'Creating account...'

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )

      await updateProfile(credential.user, {
        displayName: name
      })

      onRegister(credential.user)
    } catch (error) {
      message.textContent = getAuthError(error)
    } finally {
      button.disabled = false
      button.textContent = 'Create account'
    }
  })

  document.querySelector('#show-login').addEventListener('click', onLogin)

  attachSocialButtons(
    document.querySelector('#message'),
    'registration'
  )
}
