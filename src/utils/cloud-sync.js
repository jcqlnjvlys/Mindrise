
import { db } from '../firebase.js'
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'

let unsubscribe = null
let saveTimer = null
let activeUid = null
let applyingRemoteData = false
let pendingSave = false
let lastKnownDataSignature = null

let latestQueuedData = null
let saveRevision = 0
let saveInProgress = false

const DEFAULT_DATA = {
  alarms: [],
  routines: [],
  sleepRecords: [],
  sleepGoalMinutes: 450,
  selectedSound: null,
  soundLoop: true,
  pendingSleepTime: null
}

function normalizeData(data = {}) {
  return {
    ...DEFAULT_DATA,
    ...(data && typeof data === 'object' ? data : {}),
    alarms: Array.isArray(data?.alarms) ? data.alarms : [],
    routines: Array.isArray(data?.routines) ? data.routines : [],
    sleepRecords: Array.isArray(data?.sleepRecords)
      ? data.sleepRecords
      : []
  }
}

function sortForSignature(value) {
  if (Array.isArray(value)) {
    return value.map(sortForSignature)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .filter(key => key !== 'updatedAt')
      .sort()
      .reduce((result, key) => {
        result[key] = sortForSignature(value[key])
        return result
      }, {})
  }

  return value
}

function getDataSignature(data = {}) {
  return JSON.stringify(sortForSignature(normalizeData(data)))
}

function clearSaveTimer() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
}

function scheduleSave(delay = 500) {
  clearSaveTimer()

  if (!activeUid || !latestQueuedData) return

  saveTimer = setTimeout(() => {
    saveTimer = null
    void runQueuedSave()
  }, delay)
}

async function runQueuedSave() {
  if (!activeUid || !latestQueuedData) return

  if (saveInProgress) {
    return
  }

  const uid = activeUid
  const revisionAtStart = saveRevision
  const dataToSave = normalizeData(latestQueuedData)
  const signature = getDataSignature(dataToSave)

  saveInProgress = true

  try {
    if (activeUid !== uid) return

    /*
     * Set the signature before writing so Firestore's own snapshot
     * for this save is recognized as an already-applied update.
     */
    lastKnownDataSignature = signature

    await setDoc(
      doc(db, 'users', uid),
      {
        ...dataToSave,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )

  } catch (error) {
    console.error('Could not save Mindrise data to the cloud:', error)

    if (activeUid === uid) {
      lastKnownDataSignature = null
    }

  } finally {
    saveInProgress = false

    if (activeUid !== uid) return

    if (saveRevision !== revisionAtStart) {
      /*
       * New local changes arrived while this write was in progress.
       * Save the newest complete snapshot next.
       */
      scheduleSave(0)
    } else {
      pendingSave = false
    }
  }
}

export async function startCloudSync(
  uid,
  { getLocalData, setLocalData }
) {
  stopCloudSync()

  if (!uid) return

  activeUid = uid

  const userRef = doc(db, 'users', uid)

  try {
    const snapshot = await getDoc(userRef)

    if (activeUid !== uid) return

    if (snapshot.exists()) {
      const cloudData = normalizeData(snapshot.data())

      lastKnownDataSignature = getDataSignature(cloudData)

      setLocalData(cloudData)

    } else {
      const localData = normalizeData(getLocalData())

      lastKnownDataSignature = getDataSignature(localData)

      await setDoc(
        userRef,
        {
          ...localData,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )
    }

    if (activeUid !== uid) return

    unsubscribe = onSnapshot(
      userRef,
      snapshot => {
        if (!snapshot.exists() || activeUid !== uid) return

        const remoteData = normalizeData(snapshot.data())
        const remoteSignature = getDataSignature(remoteData)

        if (remoteSignature === lastKnownDataSignature) return

        /*
         * While a local write is waiting or running, do not replace
         * the current local state with an older remote snapshot.
         * The newest local snapshot will be written when the queue
         * finishes.
         */
        if (pendingSave || saveInProgress) return

        lastKnownDataSignature = remoteSignature

        applyingRemoteData = true

        try {
          setLocalData(remoteData)
        } finally {
          applyingRemoteData = false
        }
      },
      error => {
        console.error('Mindrise cloud sync listener error:', error)
      }
    )

  } catch (error) {
    console.error('Could not initialize Mindrise cloud sync:', error)
    throw error
  }
}

export function queueCloudSave(data) {
  if (!activeUid || applyingRemoteData) return

  latestQueuedData = normalizeData(data)
  saveRevision++
  pendingSave = true

  scheduleSave(500)
}

export function stopCloudSync() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }

  clearSaveTimer()

  activeUid = null
  pendingSave = false
  applyingRemoteData = false
  lastKnownDataSignature = null

  latestQueuedData = null
  saveRevision = 0
  saveInProgress = false
}