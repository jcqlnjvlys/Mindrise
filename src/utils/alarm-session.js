
const SESSION_PREFIX = 'mindrise-active-alarm-'

function getSessionKey(userId) {
  return userId ? `${SESSION_PREFIX}${userId}` : null
}

export function saveAlarmSession(userId, session) {
  const key = getSessionKey(userId)

  if (!key) return false

  try {
    localStorage.setItem(key, JSON.stringify(session))
    return true
  } catch (error) {
    console.error('Could not save active alarm session:', error)
    return false
  }
}

export function loadAlarmSession(userId) {
  const key = getSessionKey(userId)

  if (!key) return null

  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.error('Could not restore active alarm session:', error)
    return null
  }
}

export function clearAlarmSession(userId) {
  const key = getSessionKey(userId)

  if (!key) return

  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Could not clear active alarm session:', error)
  }
}
