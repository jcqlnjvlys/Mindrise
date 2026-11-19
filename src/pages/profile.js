
import {
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth'

import { auth } from '../firebase.js'
import { showToast, showDialog } from '../utils/ui.js'
import { renderSignup } from './auth.js'

import {
  getProfilePhoto,
  loadProfilePhoto,
  saveProfilePhoto,
  removeProfilePhoto,
  rememberAccount,
  getKnownAccounts,
  escapeHTML
} from '../utils/profile.js'

function cameraIconMarkup() {
  return `
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8a2 2 0 0 1 2-2h3l1.5-2h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/>
      <circle cx="12" cy="13" r="3.5"/>
    </svg>
  `
}

function renderAvatar(user, sizeClass = '') {
  const photo = getProfilePhoto(user)

  if (photo) {
    return `
      <img
        src="${escapeHTML(photo)}"
        alt="Profile photo"
        class="${sizeClass}"
      >
    `
  }

  const initial = escapeHTML(
    (user.displayName || user.email || '?')
      .charAt(0)
      .toUpperCase()
  )

  return `
    <span class="profile-avatar-initial">
      ${initial}
    </span>
  `
}

function refreshMenuAvatar(user) {
  const photo = getProfilePhoto(user)

  const initial = escapeHTML(
    (user.displayName || user.email || 'U')
      .trim()
      .charAt(0)
      .toUpperCase()
  )

  document.querySelectorAll('#profile-menu-trigger').forEach(button => {
    button.innerHTML = photo
      ? `
        <img
          class="menu-avatar-image"
          src="${escapeHTML(photo)}"
          alt="Profile"
        >
      `
      : `
        <span class="menu-avatar-initial">
          ${initial}
        </span>
      `
  })
}

function showPhotoOptions(user, callbacks) {
  document.querySelector('#profile-photo-options')?.remove()

  const hasPhoto = Boolean(getProfilePhoto(user))

  const backdrop = document.createElement('div')
  backdrop.id = 'profile-photo-options'
  backdrop.className = 'profile-dialog-backdrop'

  backdrop.innerHTML = `
    <style>
      #profile-photo-options .profile-dialog {
        width: min(100% - 32px, 430px);
      }

      #profile-photo-options .profile-photo-options-actions {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        margin-top: 24px;
        width: 100%;
      }

      #profile-photo-options .photo-option-button {
        width: 100%;
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-sizing: border-box;
      }

      #profile-photo-options .photo-option-button svg {
        flex-shrink: 0;
      }

      #profile-photo-options .photo-option-remove {
        margin-top: 5px;
        color: #c34d5b;
        border-color: rgba(195, 77, 91, 0.28);
      }

      #profile-photo-options .photo-option-remove:hover {
        background: rgba(195, 77, 91, 0.08);
      }

      #profile-photo-options .profile-dialog-message {
        margin-top: 12px;
      }
    </style>

    <section
      class="profile-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-options-title"
    >
      <button
        type="button"
        class="modal-close"
        data-photo-options-close
        aria-label="Close"
      >×</button>

      <span class="page-eyebrow">PROFILE PHOTO</span>

      <h2 id="photo-options-title">Profile Photo</h2>

      <p>
        Choose how you would like to update your profile photo.
      </p>

      <div class="profile-photo-options-actions">
        <button
          type="button"
          class="primary-button photo-option-button"
          id="photo-options-upload"
        >
          <svg
            viewBox="0 0 24 24"
            width="19"
            height="19"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 16V4m-5 5 5-5 5 5"/>
            <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>
          </svg>
          ${hasPhoto ? 'Upload a New Photo' : 'Upload Photo'}
        </button>

        <button
          type="button"
          class="secondary-button photo-option-button"
          id="photo-options-camera"
        >
          ${cameraIconMarkup()}
          Take Photo
        </button>

        ${
          hasPhoto
            ? `
              <button
                type="button"
                class="secondary-button photo-option-button photo-option-remove"
                id="photo-options-remove"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18"/>
                  <path d="M8 6V4h8v2"/>
                  <path d="m19 6-1 14H6L5 6"/>
                  <path d="M10 11v5M14 11v5"/>
                </svg>
                Remove Photo
              </button>
            `
            : ''
        }
      </div>

      <p
        class="profile-dialog-message"
        id="photo-options-message"
        aria-live="polite"
      ></p>
    </section>
  `

  document.body.appendChild(backdrop)

  const close = () => backdrop.remove()

  backdrop.querySelectorAll('[data-photo-options-close]').forEach(button => {
    button.addEventListener('click', close)
  })

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close()
  })

  backdrop.querySelector('.profile-dialog').addEventListener(
    'click',
    event => event.stopPropagation()
  )

  backdrop.querySelector('#photo-options-upload').addEventListener(
    'click',
    () => {
      close()
      choosePhoto(user, callbacks)
    }
  )

  backdrop.querySelector('#photo-options-camera').addEventListener(
    'click',
    () => {
      close()
      openCameraCapture(user, callbacks)
    }
  )

  const removeButton = backdrop.querySelector('#photo-options-remove')

  if (removeButton) {
    removeButton.addEventListener('click', async () => {
      const message = backdrop.querySelector('#photo-options-message')

      removeButton.disabled = true
      removeButton.textContent = 'Removing...'

      try {
        const result = await removeProfilePhoto(user)

        close()

        renderProfile(user, callbacks)
        refreshMenuAvatar(user)

        if (result.synced) {
          showToast('Profile photo removed successfully.')
        } else {
          showToast(
            'Photo removed locally, but cloud cleanup could not be completed.',
            'error'
          )
        }
      } catch (error) {
        console.error('Profile photo removal error:', error)

        message.textContent =
          'Unable to remove the profile photo. Please try again.'

        removeButton.disabled = false
        removeButton.textContent = 'Remove Photo'
      }
    })
  }

  backdrop.querySelector('#photo-options-upload').focus()
}

function choosePhoto(user, callbacks) {
  const picker = document.createElement('input')

  picker.type = 'file'
  picker.accept = 'image/*'

  picker.addEventListener('change', () => {
    const file = picker.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image.', 'error')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const image = new Image()

      image.onload = () => openPhotoCropper(user, image, callbacks)

      image.onerror = () => {
        showToast('Unable to open this image.', 'error')
      }

      image.src = reader.result
    }

    reader.onerror = () => {
      showToast('Unable to read this image.', 'error')
    }

    reader.readAsDataURL(file)
  })

  picker.click()
}

function openCameraCapture(user, callbacks) {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast(
      'Camera access is not available in this browser. Try using HTTPS or a supported browser.',
      'error'
    )
    return
  }

  document.querySelector('#profile-photo-camera')?.remove()

  const backdrop = document.createElement('div')
  backdrop.id = 'profile-photo-camera'
  backdrop.className = 'profile-dialog-backdrop'

  backdrop.innerHTML = `
    <style>
      #profile-photo-camera .profile-dialog {
        width: min(100% - 32px, 480px);
      }

      #profile-photo-camera .camera-preview-wrapper {
        position: relative;
        width: 100%;
        aspect-ratio: 4 / 3;
        margin: 22px 0 10px;
        overflow: hidden;
        border-radius: 18px;
        background: #101b2b;
      }

      #profile-photo-camera .camera-preview {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      #profile-photo-camera .camera-status {
        min-height: 22px;
        margin: 10px 0;
        text-align: center;
        font-size: 13px;
      }

      #profile-photo-camera .camera-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 13px;
        margin-top: 18px;
        width: 100%;
      }

      #profile-photo-camera .camera-actions button {
        box-sizing: border-box;
        width: 100%;
      }

      #profile-photo-camera .camera-switch-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: auto !important;
        min-width: 155px;
        min-height: 42px;
        padding: 10px 17px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        background: rgba(62, 142, 208, 0.08);
        border: 1px solid rgba(62, 142, 208, 0.22);
        color: var(--text);
        transition:
          background 0.2s ease,
          border-color 0.2s ease,
          transform 0.2s ease;
      }

      #profile-photo-camera .camera-switch-button:hover:not(:disabled) {
        background: rgba(62, 142, 208, 0.14);
        border-color: rgba(62, 142, 208, 0.4);
        transform: translateY(-1px);
      }

      #profile-photo-camera .camera-switch-button:active:not(:disabled) {
        transform: scale(0.97);
      }

      #profile-photo-camera .camera-switch-button svg {
        flex-shrink: 0;
        width: 17px;
        height: 17px;
      }

      #profile-photo-camera .camera-capture-button {
        min-height: 52px;
        border-radius: 15px;
      }

      #profile-photo-camera .camera-capture-button:disabled,
      #profile-photo-camera .camera-switch-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
      }

      @media (max-width: 380px) {
        #profile-photo-camera .camera-switch-button {
          min-width: 145px;
          min-height: 40px;
        }
      }
    </style>

    <section
      class="profile-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-photo-title"
    >
      <button
        type="button"
        class="modal-close"
        id="camera-dialog-close"
        aria-label="Close camera"
      >×</button>

      <span class="page-eyebrow">PROFILE PHOTO</span>

      <h2 id="camera-photo-title">Take a Photo</h2>

      <p>
        Position yourself in the camera preview, then capture your photo.
      </p>

      <div class="camera-preview-wrapper">
        <video
          id="profile-camera-video"
          class="camera-preview"
          autoplay
          muted
          playsinline
        ></video>
      </div>

      <p
        class="camera-status profile-dialog-message"
        id="camera-photo-status"
        role="status"
        aria-live="polite"
      >
        Requesting camera access...
      </p>

      <div class="camera-actions">
        <button
          type="button"
          class="secondary-button camera-switch-button"
          id="camera-switch"
          disabled
        >
          <svg
            viewBox="0 0 24 24"
            width="19"
            height="19"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 7h-4l-2-2H8L6 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
            <circle cx="12" cy="13" r="3"/>
            <path d="M18 3l2 2-2 2"/>
          </svg>
          Switch Camera
        </button>

        <button
          type="button"
          class="primary-button camera-capture-button"
          id="camera-capture"
          disabled
        >
          Capture Photo
        </button>
      </div>
    </section>
  `

  document.body.appendChild(backdrop)

  const video = backdrop.querySelector('#profile-camera-video')
  const status = backdrop.querySelector('#camera-photo-status')
  const switchButton = backdrop.querySelector('#camera-switch')
  const captureButton = backdrop.querySelector('#camera-capture')

  let stream = null
  let currentFacingMode = 'user'
  let currentDeviceId = null
  let closed = false
  let switching = false

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }

    video.srcObject = null
  }

  const close = () => {
    closed = true
    stopCamera()
    backdrop.remove()
  }

  const getCameraErrorMessage = error => {
    if (
      error?.name === 'NotAllowedError' ||
      error?.name === 'PermissionDeniedError'
    ) {
      return 'Camera permission was denied. Allow camera access in your browser or device settings, then try again.'
    }

    if (
      error?.name === 'NotFoundError' ||
      error?.name === 'DevicesNotFoundError'
    ) {
      return 'No camera was found on this device.'
    }

    if (
      error?.name === 'NotReadableError' ||
      error?.name === 'TrackStartError'
    ) {
      return 'Your camera may already be in use by another app. Close the other app and try again.'
    }

    if (error?.name === 'OverconstrainedError') {
      return 'The selected camera is not available. Try switching cameras.'
    }

    if (error?.name === 'SecurityError') {
      return 'Camera access requires a secure connection. Open Mindrise using HTTPS or localhost.'
    }

    return 'Unable to start the camera. Please check your camera permissions and try again.'
  }

  const startCamera = async (facingMode = 'user', deviceId = null) => {
    if (closed || switching) return

    switching = true
    switchButton.disabled = true
    captureButton.disabled = true
    status.textContent = 'Starting camera...'

    stopCamera()

    try {
      const videoConstraints = deviceId
        ? {
            deviceId: { exact: deviceId }
          }
        : {
            facingMode: { ideal: facingMode }
          }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      })

      if (closed) {
        newStream.getTracks().forEach(track => track.stop())
        switching = false
        return
      }

      stream = newStream

      const videoTrack = stream.getVideoTracks()[0]

      currentDeviceId = videoTrack?.getSettings()?.deviceId || null
      currentFacingMode =
        videoTrack?.getSettings()?.facingMode || facingMode

      video.srcObject = stream

      await video.play()

      if (closed) {
        stopCamera()
        switching = false
        return
      }

      status.textContent =
        'Camera ready. Position yourself and capture your photo.'

      captureButton.disabled = false
      switchButton.disabled = false
    } catch (error) {
      console.error('Profile camera error:', error)

      if (!closed) {
        status.textContent = getCameraErrorMessage(error)
        captureButton.disabled = true
        switchButton.disabled = false
      }
    } finally {
      switching = false
    }
  }

  const switchCamera = async () => {
    if (closed || switching || !stream) return

    switchButton.disabled = true
    captureButton.disabled = true

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()

      const cameras = devices.filter(
        device => device.kind === 'videoinput'
      )

      if (cameras.length > 1 && currentDeviceId) {
        const currentIndex = cameras.findIndex(
          camera => camera.deviceId === currentDeviceId
        )

        const nextIndex =
          currentIndex < 0
            ? 0
            : (currentIndex + 1) % cameras.length

        const nextCamera = cameras[nextIndex]

        await startCamera(currentFacingMode, nextCamera.deviceId)
      } else if (cameras.length > 1) {
        await startCamera(
          currentFacingMode === 'user' ? 'environment' : 'user'
        )
      } else {
        const nextFacingMode =
          currentFacingMode === 'environment'
            ? 'user'
            : 'environment'

        await startCamera(nextFacingMode)
      }
    } catch (error) {
      console.error('Could not switch profile camera:', error)

      status.textContent =
        'Unable to switch cameras. Please try again.'

      switchButton.disabled = false
      captureButton.disabled = !stream
    }
  }

  backdrop.querySelector('#camera-dialog-close')
    .addEventListener('click', close)

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close()
  })

  backdrop.querySelector('.profile-dialog').addEventListener(
    'click',
    event => event.stopPropagation()
  )

  switchButton.addEventListener('click', switchCamera)

  captureButton.addEventListener('click', () => {
    if (
      closed ||
      !stream ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      status.textContent =
        'The camera is not ready yet. Please wait a moment.'

      return
    }

    captureButton.disabled = true
    switchButton.disabled = true
    status.textContent = 'Preparing your photo...'

    try {
      const canvas = document.createElement('canvas')

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Unable to prepare the camera photo.')
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      )

      const photoData = canvas.toDataURL('image/jpeg', 0.92)

      close()

      const image = new Image()

      image.onload = () => {
        openPhotoCropper(user, image, callbacks)
      }

      image.onerror = () => {
        showToast('Unable to open the captured photo.', 'error')
      }

      image.src = photoData
    } catch (error) {
      console.error('Could not capture profile photo:', error)

      status.textContent =
        'Unable to capture the photo. Please try again.'

      captureButton.disabled = false
      switchButton.disabled = false
    }
  })

  void startCamera('user')

  switchButton.focus()
}

function openPhotoCropper(user, image, callbacks) {
  document.querySelector('#profile-photo-cropper')?.remove()

  const backdrop = document.createElement('div')

  backdrop.id = 'profile-photo-cropper'
  backdrop.className = 'profile-dialog-backdrop'

  backdrop.innerHTML = `
    <section
      class="profile-dialog photo-crop-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-crop-title"
    >
      <button
        type="button"
        class="modal-close"
        data-crop-close
        aria-label="Close"
      >×</button>

      <span class="page-eyebrow">PROFILE PHOTO</span>

      <h2 id="photo-crop-title">Adjust your photo</h2>

      <p>
        Move the photo and zoom in or out to choose what appears
        inside your profile circle.
      </p>

      <div class="photo-crop-stage">
        <div class="photo-crop-circle" id="photo-crop-circle">
          <img
            class="photo-crop-image"
            id="photo-crop-image"
            alt="Circular profile photo preview"
            draggable="false"
          >
        </div>
      </div>

      <div class="photo-crop-controls">
        <label class="photo-crop-zoom-control">
          <span>Zoom</span>
          <input
            type="range"
            id="photo-crop-zoom"
            min="1"
            max="3.5"
            step="0.01"
            value="1"
          >
        </label>
      </div>

      <p
        class="profile-dialog-message"
        id="photo-crop-message"
        aria-live="polite"
      ></p>

      <div class="profile-dialog-actions">
        <button
          type="button"
          class="primary-button"
          id="photo-crop-save"
        >
          Save Photo
        </button>
      </div>
    </section>
  `

  document.body.appendChild(backdrop)

  const circle = backdrop.querySelector('#photo-crop-circle')
  const preview = backdrop.querySelector('#photo-crop-image')
  const zoomInput = backdrop.querySelector('#photo-crop-zoom')
  const saveButton = backdrop.querySelector('#photo-crop-save')
  const message = backdrop.querySelector('#photo-crop-message')

  preview.src = image.src

  const viewportSize = circle.clientWidth || 260

  const baseScale =
    viewportSize / Math.min(
      image.naturalWidth,
      image.naturalHeight
    )

  const baseWidth = image.naturalWidth * baseScale
  const baseHeight = image.naturalHeight * baseScale

  preview.style.width = `${baseWidth}px`
  preview.style.height = `${baseHeight}px`

  let offsetX = 0
  let offsetY = 0
  let dragging = false
  let pointerX = 0
  let pointerY = 0
  let startX = 0
  let startY = 0

  const getLimits = () => {
    const zoom = Number(zoomInput.value)

    return {
      x: Math.max(
        0,
        (baseWidth * zoom - viewportSize) / 2
      ),
      y: Math.max(
        0,
        (baseHeight * zoom - viewportSize) / 2
      )
    }
  }

  const clampOffsets = () => {
    const limits = getLimits()

    offsetX = Math.max(
      -limits.x,
      Math.min(limits.x, offsetX)
    )

    offsetY = Math.max(
      -limits.y,
      Math.min(limits.y, offsetY)
    )
  }

  const updatePreview = () => {
    clampOffsets()

    const zoom = Number(zoomInput.value)

    preview.style.transform =
      `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${zoom})`
  }

  const close = () => backdrop.remove()

  backdrop.querySelectorAll('[data-crop-close]').forEach(button => {
    button.addEventListener('click', close)
  })

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close()
  })

  backdrop.querySelector('.photo-crop-dialog').addEventListener(
    'click',
    event => event.stopPropagation()
  )

  zoomInput.addEventListener('input', updatePreview)

  circle.addEventListener('pointerdown', event => {
    dragging = true

    pointerX = event.clientX
    pointerY = event.clientY

    startX = offsetX
    startY = offsetY

    circle.classList.add('is-dragging')
    circle.setPointerCapture(event.pointerId)
  })

  circle.addEventListener('pointermove', event => {
    if (!dragging) return

    offsetX = startX + event.clientX - pointerX
    offsetY = startY + event.clientY - pointerY

    updatePreview()
  })

  const stopDragging = () => {
    dragging = false
    circle.classList.remove('is-dragging')
  }

  circle.addEventListener('pointerup', stopDragging)
  circle.addEventListener('pointercancel', stopDragging)
  circle.addEventListener('lostpointercapture', stopDragging)

  saveButton.addEventListener('click', async () => {
    const zoom = Number(zoomInput.value)

    saveButton.disabled = true
    saveButton.textContent = 'Saving…'

    const cropSize =
      Math.min(image.naturalWidth, image.naturalHeight) / zoom

    const sourceOffsetX = offsetX / (baseScale * zoom)
    const sourceOffsetY = offsetY / (baseScale * zoom)

    const centerX = image.naturalWidth / 2 - sourceOffsetX
    const centerY = image.naturalHeight / 2 - sourceOffsetY

    const sourceX = Math.max(
      0,
      Math.min(
        image.naturalWidth - cropSize,
        centerX - cropSize / 2
      )
    )

    const sourceY = Math.max(
      0,
      Math.min(
        image.naturalHeight - cropSize,
        centerY - cropSize / 2
      )
    )

    const canvas = document.createElement('canvas')

    canvas.width = 512
    canvas.height = 512

    const context = canvas.getContext('2d')

    if (!context) {
      message.textContent =
        'Unable to prepare this photo. Please try again.'

      saveButton.disabled = false
      saveButton.textContent = 'Save Photo'
      return
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      cropSize,
      cropSize,
      0,
      0,
      canvas.width,
      canvas.height
    )

    try {
      const photo = canvas.toDataURL('image/jpeg', 0.86)

      const photoResult = await saveProfilePhoto(user, photo)

      close()

      renderProfile(user, callbacks)
      refreshMenuAvatar(user)

      if (photoResult.synced) {
        showToast('Profile photo updated and synced.')
      } else {
        showToast(
          'Photo saved on this device, but cloud sync failed. Please try again.',
          'error'
        )
      }
    } catch (error) {
      console.error('Profile photo save error:', error)

      message.textContent =
        'Unable to save this photo. Please try again.'

      saveButton.disabled = false
      saveButton.textContent = 'Save Photo'
    }
  })

  updatePreview()

  backdrop.querySelector('[data-crop-close]').focus()
}

function editName(user, callbacks) {
  showDialog({
    title: 'Edit Profile Name',
    description: 'Choose the name shown on your Mindrise profile.',
    confirmText: 'Save Changes',
    hideCloseButton: true,

    content: `
      <label for="mindrise-display-name">Display name</label>
      <input
        id="mindrise-display-name"
        type="text"
        maxlength="40"
        value="${escapeHTML(user.displayName || '')}"
        required
        autocomplete="name"
      >
    `,

    onConfirm: async (form, message) => {
      const name = form
        .querySelector('#mindrise-display-name')
        .value
        .trim()

      if (!name) {
        message.textContent = 'Please enter a valid name.'
        return false
      }

      try {
        await updateProfile(user, { displayName: name })

        rememberAccount(user)
        renderProfile(user, callbacks)
        refreshMenuAvatar(user)

        showToast('Profile name updated.')
      } catch (error) {
        console.error(error)

        message.textContent =
          'Unable to update your name. Please try again.'

        return false
      }
    }
  })
}

function passwordField(id, label, autocomplete) {
  return `
    <label for="${id}">${label}</label>

    <div class="password-field">
      <input
        type="password"
        id="${id}"
        autocomplete="${autocomplete}"
        required
      >

      <button
        type="button"
        class="password-toggle"
        data-password-toggle="${id}"
        aria-label="Show ${label.toLowerCase()}"
      >
        Show
      </button>
    </div>
  `
}

function changePassword(user) {
  if (!user.email) {
    showToast('Unable to verify your account email.', 'error')
    return
  }

  if (
    !user.providerData.some(
      provider => provider.providerId === 'password'
    )
  ) {
    showToast(
      'This account does not use email and password sign-in.',
      'error'
    )
    return
  }

  document.querySelector('#change-password-dialog')?.remove()

  const backdrop = document.createElement('div')

  backdrop.id = 'change-password-dialog'
  backdrop.className = 'profile-dialog-backdrop'

  backdrop.innerHTML = `
    <section
      class="profile-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <span class="page-eyebrow">ACCOUNT SECURITY</span>

      <h2 id="change-password-title">Change Password</h2>

      <p>
        Enter your current password, then choose a new one.
      </p>

      <form id="change-password-form" class="profile-password-form">
        ${passwordField(
          'current-password',
          'Current password',
          'current-password'
        )}

        ${passwordField(
          'new-password',
          'New password',
          'new-password'
        )}

        ${passwordField(
          'confirm-password',
          'Confirm new password',
          'new-password'
        )}

        <p
          class="profile-dialog-message"
          id="password-dialog-message"
          aria-live="polite"
        ></p>

        <div class="profile-dialog-actions">
          <button
            type="button"
            class="secondary-button"
            id="password-dialog-cancel"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="primary-button"
            id="password-dialog-save"
          >
            Save Password
          </button>
        </div>
      </form>
    </section>
  `

  document.body.appendChild(backdrop)

  const close = () => backdrop.remove()

  backdrop.querySelector('#password-dialog-cancel')
    .addEventListener('click', close)

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close()
  })

  backdrop.querySelector('.profile-dialog').addEventListener(
    'click',
    event => event.stopPropagation()
  )

  backdrop.querySelectorAll('[data-password-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const input = backdrop.querySelector(
        `#${button.dataset.passwordToggle}`
      )

      const showing = input.type === 'text'

      input.type = showing ? 'password' : 'text'

      button.textContent = showing ? 'Show' : 'Hide'

      button.setAttribute(
        'aria-label',
        `${showing ? 'Show' : 'Hide'} password`
      )
    })
  })

  backdrop.querySelector('#change-password-form')
    .addEventListener('submit', async event => {
      event.preventDefault()

      const currentPassword =
        backdrop.querySelector('#current-password').value

      const newPassword =
        backdrop.querySelector('#new-password').value

      const confirmation =
        backdrop.querySelector('#confirm-password').value

      const message =
        backdrop.querySelector('#password-dialog-message')

      const button =
        backdrop.querySelector('#password-dialog-save')

      message.textContent = ''

      if (!currentPassword) {
        message.textContent = 'Enter your current password.'
        return
      }

      if (newPassword.length < 6) {
        message.textContent =
          'Your new password must contain at least 6 characters.'
        return
      }

      if (newPassword !== confirmation) {
        message.textContent =
          'Your new passwords do not match.'
        return
      }

      if (newPassword === currentPassword) {
        message.textContent =
          'Choose a password different from your current one.'
        return
      }

      button.disabled = true
      button.textContent = 'Saving...'

      try {
        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword
        )

        await reauthenticateWithCredential(user, credential)
        await updatePassword(user, newPassword)

        message.classList.add('success')

        message.textContent =
          'Your password has been changed successfully.'

        backdrop.querySelector('#change-password-form').reset()

        button.textContent = 'Saved'

        window.setTimeout(close, 1300)
      } catch (error) {
        console.error(error)

        if (
          error.code === 'auth/wrong-password' ||
          error.code === 'auth/invalid-credential' ||
          error.code === 'auth/invalid-login-credentials'
        ) {
          message.textContent =
            'Your current password is incorrect.'
        } else if (error.code === 'auth/weak-password') {
          message.textContent =
            'Please choose a stronger password.'
        } else if (error.code === 'auth/too-many-requests') {
          message.textContent =
            'Too many attempts. Please try again later.'
        } else {
          message.textContent =
            'Unable to change your password. Please try again.'
        }

        button.disabled = false
        button.textContent = 'Save Password'
      }
    })

  backdrop.querySelector('#current-password').focus()
}

function showAccountSwitcher(user, callbacks) {
  const accounts = getKnownAccounts()

  const accountRows = accounts.map(account => `
    <button
      type="button"
      class="account-switch-item"
      data-account-email="${escapeHTML(account.email)}"
    >
      <span class="account-switch-avatar">
        ${escapeHTML(
          (account.displayName || account.email)
            .charAt(0)
            .toUpperCase()
        )}
      </span>

      <span class="account-switch-details">
        <strong>
          ${escapeHTML(account.displayName || 'Mindrise account')}
        </strong>

        <small>${escapeHTML(account.email)}</small>
      </span>

      <span class="profile-chevron">&#8250;</span>
    </button>
  `).join('')

  document.querySelector('#app').innerHTML = `
    <main class="profile-page page-shell">
      <header class="page-header profile-header">
        <button
          type="button"
          class="back-button"
          id="switch-back"
        >
          &#8592;
        </button>

        <h1>Switch Account</h1>
      </header>

      <section class="account-switch-section">
        <h2>Previously used accounts</h2>

        <p>
          Select an account and enter its password to switch.
        </p>

        <div class="account-switch-list">
          ${
            accountRows ||
            '<p class="account-empty">No saved accounts yet.</p>'
          }
        </div>

        <h2>Log in to another account</h2>

        <form id="switch-account-form" class="switch-account-form">
          <label for="switch-email">Email address</label>

          <input
            type="email"
            id="switch-email"
            placeholder="Enter your email"
            autocomplete="username"
            required
          >

          <label for="switch-password">Password</label>

          <div class="password-field">
            <input
              type="password"
              id="switch-password"
              placeholder="Enter your password"
              autocomplete="current-password"
              required
            >

            <button
              type="button"
              class="password-toggle"
              id="switch-password-toggle"
              aria-label="Show password"
              aria-pressed="false"
            >
              Show
            </button>
          </div>

          <p class="signup-prompt" style="text-align:right;margin:0 0 4px">
            <button type="button" id="switch-forgot-password">
              Forgot Password?
            </button>
          </p>

          <button
            type="submit"
            class="primary-button"
            id="switch-submit"
          >
            Log in
          </button>

          <p
            id="switch-message"
            class="message"
            aria-live="polite"
          ></p>
        </form>

        <p class="signup-prompt">
          Don't have an account?
          <button type="button" id="switch-signup">Sign up</button>
        </p>

        <button
          type="button"
          class="secondary-button switch-cancel"
          id="switch-cancel"
        >
          Cancel
        </button>
      </section>
    </main>
  `

  const emailInput = document.querySelector('#switch-email')
  const passwordInput = document.querySelector('#switch-password')
  const message = document.querySelector('#switch-message')

  document.querySelectorAll('.account-switch-item').forEach(button => {
    button.addEventListener('click', () => {
      emailInput.value = button.dataset.accountEmail
      passwordInput.focus()
    })
  })

  const returnToProfile = () => {
    renderProfile(user, callbacks)
  }

  document.querySelector('#switch-back')
    .addEventListener('click', returnToProfile)

  document.querySelector('#switch-cancel')
    .addEventListener('click', returnToProfile)

  document.querySelector('#switch-password-toggle')
    .addEventListener('click', buttonEvent => {
      const button = buttonEvent.currentTarget
      const showing = passwordInput.type === 'text'

      passwordInput.type = showing ? 'password' : 'text'
      button.textContent = showing ? 'Show' : 'Hide'

      button.setAttribute(
        'aria-label',
        showing ? 'Show password' : 'Hide password'
      )

      button.setAttribute('aria-pressed', String(!showing))
    })

  document.querySelector('#switch-forgot-password')
    .addEventListener('click', async event => {
      const button = event.currentTarget
      const email = emailInput.value.trim()

      message.textContent = ''
      message.style.color = ''

      if (!email) {
        message.textContent =
          'Please enter your email address first.'

        emailInput.focus()
        return
      }

      if (!emailInput.checkValidity()) {
        message.textContent =
          'Please enter a valid email address.'

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

        const messages = {
          'auth/invalid-email':
            'Please enter a valid email address.',
          'auth/user-not-found':
            'No account was found with that email.',
          'auth/too-many-requests':
            'Too many attempts. Please try again later.',
          'auth/network-request-failed':
            'Connection failed. Please check your internet.'
        }

        message.textContent =
          messages[error.code] ||
          'Unable to send the password reset email. Please try again.'
      } finally {
        button.disabled = false
        button.textContent = 'Forgot Password?'
      }
    })

  document.querySelector('#switch-signup')
    .addEventListener('click', () => {
      renderSignup({
        onRegister: () => {
          // The existing auth-state listener in main.js
          // handles the newly registered account.
        },

        onLogin: () => {
          showAccountSwitcher(user, callbacks)
        }
      })
    })

  document.querySelector('#switch-account-form')
    .addEventListener('submit', async event => {
      event.preventDefault()

      const email = emailInput.value.trim()
      const password = passwordInput.value

      message.textContent = ''
      message.style.color = ''

      const button =
        document.querySelector('#switch-submit')

      button.disabled = true
      button.textContent = 'Logging in...'

      try {
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        )

        // The existing onAuthStateChanged listener in main.js
        // handles the newly signed-in account.
      } catch (error) {
        console.error(error)

        message.textContent =
          error.code === 'auth/invalid-credential' ||
          error.code === 'auth/wrong-password'
            ? 'Incorrect email or password.'
            : error.code === 'auth/user-not-found'
              ? 'No account was found with that email.'
              : error.code === 'auth/too-many-requests'
                ? 'Too many attempts. Please try again later.'
                : 'Unable to switch accounts. Please try again.'

        button.disabled = false
        button.textContent = 'Log in'
      }
    })
}

export function renderProfile(user, callbacks = {}) {
  if (!user) return

  const app = document.querySelector('#app')

  rememberAccount(user)

  const name = user.displayName || 'Your Name'
  const email = user.email || ''

  app.innerHTML = `
    <main class="profile-page page-shell">
      <header class="page-header profile-header">
        <button
          type="button"
          class="back-button"
          id="profile-back"
          aria-label="Go back"
        >
          &#8592;
        </button>

        <h1>My Profile</h1>
      </header>

      <section class="profile-identity">
        <button
          type="button"
          class="profile-avatar"
          id="change-photo"
          aria-label="Manage profile photo"
        >
          ${renderAvatar(user, 'profile-avatar-image')}

          <span class="profile-avatar-edit" aria-hidden="true">
            ${cameraIconMarkup()}
          </span>
        </button>

        <h2>${escapeHTML(name)}</h2>

        <p>${escapeHTML(email)}</p>
      </section>

      <section class="profile-actions">
        <button
          type="button"
          class="profile-action"
          id="edit-profile"
        >
          <span class="profile-action-icon">✏️</span>

          <span>
            <strong>Edit Profile</strong>
            <small>Update your profile name</small>
          </span>

          <span class="profile-chevron">&#8250;</span>
        </button>

        <button
          type="button"
          class="profile-action"
          id="change-password"
        >
          <span class="profile-action-icon">&#128274;</span>

          <span>
            <strong>Change Password</strong>
            <small>Update your account password</small>
          </span>

          <span class="profile-chevron">&#8250;</span>
        </button>
      </section>

      <section class="profile-menu">
        <button
          type="button"
          class="profile-menu-item"
          id="add-account"
        >
          <span>Add Another Account / Switch Account</span>
          <span class="profile-chevron">&#8250;</span>
        </button>

        <button
          type="button"
          class="profile-menu-item"
          id="profile-logout"
        >
          <span>Log Out</span>
          <span class="profile-chevron">&#8250;</span>
        </button>

        <button
          type="button"
          class="profile-menu-item profile-delete"
          id="delete-account"
        >
          <span>Delete Account</span>
          <span class="profile-chevron">&#8250;</span>
        </button>

        <button
          type="button"
          class="profile-menu-item"
          id="profile-settings"
        >
          <span>Settings</span>
          <span class="profile-chevron">&#8250;</span>
        </button>

        <button
          type="button"
          class="profile-menu-item"
          id="profile-about"
        >
          <span>About Mindrise</span>
          <span class="profile-chevron">&#8250;</span>
        </button>
      </section>
    </main>
  `

  document.querySelector('#profile-back')
    .addEventListener('click', () => callbacks.onBack?.())

  document.querySelector('#change-photo')
    .addEventListener('click', () => {
      showPhotoOptions(user, callbacks)
    })

  document.querySelector('#edit-profile')
    .addEventListener('click', () => {
      editName(user, callbacks)
    })

  document.querySelector('#change-password')
    .addEventListener('click', () => {
      changePassword(user)
    })

  document.querySelector('#add-account')
    .addEventListener('click', () => {
      showAccountSwitcher(user, callbacks)
    })

  document.querySelector('#delete-account')
    .addEventListener('click', () => {
      callbacks.onDeleteAccount?.()
    })

  document.querySelector('#profile-settings')
    .addEventListener('click', () => {
      callbacks.onSettings?.()
    })

  document.querySelector('#profile-about')
    .addEventListener('click', () => {
      callbacks.onAbout?.()
    })

  document.querySelector('#profile-logout')
    .addEventListener('click', () => {
      callbacks.onLogout?.()
    })

  void loadProfilePhoto(user).then(photo => {
    if (!photo || auth.currentUser?.uid !== user.uid) return

    const avatarButton = document.querySelector('#change-photo')

    if (avatarButton) {
      const editIcon = avatarButton.querySelector('.profile-avatar-edit')

      avatarButton.innerHTML = `
        ${renderAvatar(user, 'profile-avatar-image')}

        ${editIcon ? editIcon.outerHTML : `
          <span class="profile-avatar-edit" aria-hidden="true">
            ${cameraIconMarkup()}
          </span>
        `}
      `
    }

    refreshMenuAvatar(user)
  })
}
