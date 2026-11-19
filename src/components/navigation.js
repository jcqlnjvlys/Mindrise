const navigationItems = [
  { id: 'alarms', label: 'Alarms', icon: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M5 3 3 5M19 3l2 2M9 21h6"/>' },
  { id: 'routines', label: 'Routines', icon: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="m8 9 1.5 1.5L12 8M14 10h2m-8 5 1.5 1.5L12 14m2 2h2"/>' },
  { id: 'tracker', label: 'Tracker', icon: '<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/><path d="M16 6h4v4"/>' },
  { id: 'sleep', label: 'Unwind', icon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5 8.5 8.5 0 1 0 19.5 14.5Z"/><path d="m17 3 .5 1.5L19 5l-1.5.5L17 7l-.5-1.5L15 5l1.5-.5Z"/>' }
]

export function renderBottomNav(activePage) {
  return `<nav class="bottom-nav" aria-label="Main navigation">${navigationItems.map(item => `
    <button class="nav-item ${activePage === item.id ? 'active' : ''}" data-page="${item.id}" type="button" aria-label="${item.label}" aria-current="${activePage === item.id ? 'page' : 'false'}">
      <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg></span>
      <span class="nav-label">${item.label}</span>
    </button>`).join('')}</nav>`
}

export function attachBottomNavEvents(onNavigate) {
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => onNavigate(button.dataset.page)))
}
