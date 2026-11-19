import { auth } from '../firebase.js'
const LEGACY_STORAGE_KEY = 'mindrise-data'
const defaultData = { alarms: [], routines: [], sleepRecords: [], sleepGoalMinutes: 450, selectedSound: null, soundLoop: true, pendingSleepTime: null }
function getStorageKey(userId = auth.currentUser?.uid) { return userId ? `mindrise-data-${userId}` : LEGACY_STORAGE_KEY }
export function loadData() {
  try {
    const userId = auth.currentUser?.uid, key = getStorageKey(userId)
    let saved = localStorage.getItem(key)
    if (userId && !saved) { const legacy = localStorage.getItem(LEGACY_STORAGE_KEY); if (legacy) { localStorage.setItem(key, legacy); localStorage.removeItem(LEGACY_STORAGE_KEY); saved = legacy } }
    if (!saved) return structuredClone(defaultData)
    const parsed = JSON.parse(saved)
    return { ...structuredClone(defaultData), ...parsed, alarms: Array.isArray(parsed.alarms) ? parsed.alarms : [], routines: Array.isArray(parsed.routines) ? parsed.routines : [], sleepRecords: Array.isArray(parsed.sleepRecords) ? parsed.sleepRecords : [] }
  } catch (error) { console.error('Could not load Mindrise data:', error); return structuredClone(defaultData) }
}
export function saveData(data) { try { localStorage.setItem(getStorageKey(), JSON.stringify(data)); return true } catch (error) { console.error('Could not save Mindrise data:', error); return false } }
export function updateData(updates) { const updated = { ...loadData(), ...updates }; saveData(updated); return updated }
export function clearUserData(userId) { if (!userId) return; try { localStorage.removeItem(getStorageKey(userId)) } catch (error) { console.error('Could not clear account data:', error) } }
