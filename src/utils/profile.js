
import { auth, db } from '../firebase.js'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'

const PROFILE_PHOTO_PREFIX = 'mindrise-profile-photo-'
const PROFILE_PHOTO_REMOVED = '__mindrise_profile_photo_removed__'
const KNOWN_ACCOUNTS_KEY = 'mindrise-known-accounts'
const MAX_PROFILE_PHOTO_BYTES = 700 * 1024

function accountId(user) {
  return user?.uid || user?.email?.toLowerCase() || 'guest'
}

function profilePhotoKey(user) {
  return `${PROFILE_PHOTO_PREFIX}${accountId(user)}`
}

function profileRef(user) {
  return doc(db, 'userProfiles', user.uid)
}

function getLocalPhoto(user) {
  try {
    return localStorage.getItem(profilePhotoKey(user))
  } catch (error) {
    console.warn('Could not read the local profile photo:', error)
    return null
  }
}

export function getProfilePhoto(user) {
  if (!user) return null

  const localPhoto = getLocalPhoto(user)

  if (localPhoto === PROFILE_PHOTO_REMOVED) return null

  if (localPhoto?.startsWith('data:image/')) return localPhoto

  return user.photoURL || null
}

function compressProfilePhoto(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 256

        canvas.width = size
        canvas.height = size

        const context = canvas.getContext('2d')

        if (!context) {
          reject(new Error('Could not prepare the profile photo.'))
          return
        }

        context.drawImage(image, 0, 0, size, size)

        let quality = 0.72
        let compressed = canvas.toDataURL('image/jpeg', quality)

        while (
          compressed.length * 0.75 > MAX_PROFILE_PHOTO_BYTES &&
          quality > 0.35
        ) {
          quality -= 0.08
          compressed = canvas.toDataURL('image/jpeg', quality)
        }

        const estimatedBytes = Math.ceil(
          (compressed.length - 'data:image/jpeg;base64,'.length) * 0.75
        )

        if (estimatedBytes > MAX_PROFILE_PHOTO_BYTES) {
          reject(new Error('The profile photo is too large to sync.'))
          return
        }

        resolve(compressed)
      } catch (error) {
        reject(error)
      }
    }

    image.onerror = () => {
      reject(new Error('Could not read the profile photo.'))
    }

    image.src = dataUrl
  })
}

export async function loadProfilePhoto(user) {
  if (!user?.uid) return null

  try {
    const snapshot = await getDoc(profileRef(user))

    if (!snapshot.exists()) return null

    const photoData = snapshot.data()?.photoData

    if (typeof photoData === 'string' && photoData.startsWith('data:image/')) {
      localStorage.setItem(profilePhotoKey(user), photoData)
      return photoData
    }

    if (photoData === null) {
      localStorage.removeItem(profilePhotoKey(user))
      return null
    }

    return null
  } catch (error) {
    console.error('Could not load the cloud profile photo:', error)
    return null
  }
}

export async function saveProfilePhoto(user, dataUrl) {
  if (
    !user?.uid ||
    typeof dataUrl !== 'string' ||
    !dataUrl.startsWith('data:image/')
  ) {
    return {
      url: null,
      synced: false
    }
  }

  try {
    const compressedPhoto = await compressProfilePhoto(dataUrl)

    await setDoc(
      profileRef(user),
      {
        photoData: compressedPhoto,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )

    await updateProfile(user, { photoURL: null })

    localStorage.setItem(
      profilePhotoKey(user),
      compressedPhoto
    )

    rememberAccount(user)

    return {
      url: compressedPhoto,
      synced: true
    }
  } catch (error) {
    console.error('Could not sync profile photo to Firestore:', error)

    try {
      localStorage.setItem(profilePhotoKey(user), dataUrl)
    } catch (storageError) {
      console.warn(
        'Could not save the local profile photo:',
        storageError
      )
    }

    return {
      url: dataUrl,
      synced: false
    }
  }
}

export async function removeProfilePhoto(user) {
  if (!user?.uid) {
    return {
      synced: false,
      authUpdated: false,
      cloudUpdated: false
    }
  }

  let cloudUpdated = false
  let authUpdated = false

  try {
    await setDoc(
      profileRef(user),
      {
        photoData: null,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )

    cloudUpdated = true
  } catch (error) {
    console.error('Could not remove the cloud profile photo:', error)
  }

  try {
    await updateProfile(user, { photoURL: null })
    authUpdated = true
  } catch (error) {
    console.error('Could not clear the Firebase profile photo URL:', error)
  }

  try {
    if (cloudUpdated) {
      localStorage.removeItem(profilePhotoKey(user))
    } else {
      localStorage.setItem(
        profilePhotoKey(user),
        PROFILE_PHOTO_REMOVED
      )
    }
  } catch (error) {
    console.warn('Could not clear the local profile photo:', error)
  }

  rememberAccount(user)

  return {
    synced: cloudUpdated && authUpdated,
    authUpdated,
    cloudUpdated
  }
}

export function getKnownAccounts() {
  try {
    const value = JSON.parse(
      localStorage.getItem(KNOWN_ACCOUNTS_KEY) || '[]'
    )

    return Array.isArray(value)
      ? value.filter(
          account => account && typeof account.email === 'string'
        )
      : []
  } catch (error) {
    console.warn('Could not read saved accounts:', error)
    return []
  }
}

export function rememberAccount(user) {
  if (!user?.email) return

  try {
    const accounts = getKnownAccounts()
    const email = user.email.trim().toLowerCase()

    const updated = accounts.filter(
      account => account.email.toLowerCase() !== email
    )

    updated.unshift({
      uid: user.uid || '',
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || ''
    })

    localStorage.setItem(
      KNOWN_ACCOUNTS_KEY,
      JSON.stringify(updated.slice(0, 8))
    )
  } catch (error) {
    console.warn('Could not remember this account:', error)
  }
}

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}

export function applyAppearance() {
  if (typeof document === 'undefined') return

  let theme = 'light'

  try {
    const userId = auth.currentUser?.uid || 'guest'

    theme =
      localStorage.getItem(`mindrise-appearance-${userId}`) ||
      'light'
  } catch (error) {
    console.warn(
      'Could not read the appearance preference:',
      error
    )
  }

  document.documentElement.dataset.theme =
    theme === 'dark' ? 'dark' : 'light'
}
