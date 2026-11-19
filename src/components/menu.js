import { auth } from '../firebase.js'
import { getProfilePhoto, escapeHTML } from '../utils/profile.js'

export function renderMenu() {
  const user = auth.currentUser
  const photo = getProfilePhoto(user) || user?.photoURL || ''
  const initial = (user?.displayName || user?.email || 'U').trim().charAt(0).toUpperCase()

  return `<div class="menu-container"><button type="button" class="menu-trigger" id="profile-menu-trigger" aria-label="Open profile menu">${photo ? `<img class="menu-avatar-image" src="${escapeHTML(photo)}" alt="Profile">` : `<span class="menu-avatar-initial">${escapeHTML(initial)}</span>`}</button></div>`
}

export function attachMenuEvents(onProfile) {
  document.querySelector('#profile-menu-trigger')?.addEventListener('click', () => onProfile?.())
}
