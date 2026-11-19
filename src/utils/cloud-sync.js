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
let syncGeneration = 0

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
  if (!activeUid || !latestQueuedData || saveInProgress) {
    return
  }

  const uid = activeUid
  const generationAtStart = syncGeneration
  const revisionAtStart = saveRevision

  const dataToSave = normalizeData(latestQueuedData)
  const signature = getDataSignature(dataToSave)

  saveInProgress = true

  let saveSucceeded = false

  try {
    if (
      activeUid !== uid ||
      syncGeneration !== generationAtStart
    ) {
      return
    }

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

    saveSucceeded = true

  } catch (error) {
    console.error(
      'Could not save Mindrise data to the cloud:',
      error
    )

    if (
      activeUid === uid &&
      syncGeneration === generationAtStart
    ) {
      lastKnownDataSignature = null
    }

  } finally {
    /*
     * An old operation must not modify the state of a newer
     * synchronization session.
     */
    if (syncGeneration !== generationAtStart) {
      return
    }

    saveInProgress = false

    if (activeUid !== uid) return

    const hasNewerRevision =
      saveRevision !== revisionAtStart

    if (hasNewerRevision) {
      /*
       * New local changes arrived while this write was running.
       * Save the newest complete snapshot immediately.
       */
      pendingSave = true
      scheduleSave(0)

    } else if (saveSucceeded) {
      /*
       * The latest queued revision was successfully saved.
       */
      pendingSave = false

    } else {
      /*
       * The write failed. Keep the pending state and retry
       * automatically rather than silently dropping the save.
       */
      pendingSave = true
      scheduleSave(3000)
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

  const generationAtStart = syncGeneration
  const userRef = doc(db, 'users', uid)

  try {
    const snapshot = await getDoc(userRef)

    if (
      activeUid !== uid ||
      syncGeneration !== generationAtStart
    ) {
      return
    }

    if (snapshot.exists()) {
      const cloudData = normalizeData(snapshot.data())
      const cloudSignature = getDataSignature(cloudData)

      /*
       * If local changes were queued while initialization was
       * waiting for Firestore, preserve them instead of replacing
       * them with the cloud snapshot.
       */
      if (pendingSave && latestQueuedData) {
        scheduleSave(0)

      } else {
        lastKnownDataSignature = cloudSignature

        applyingRemoteData = true

        try {
          setLocalData(cloudData)
        } finally {
          applyingRemoteData = false
        }
      }

    } else {
      /*
       * If a local save was already queued during initialization,
       * use that newest snapshot instead of an older local copy.
       */
      const localData = normalizeData(
        pendingSave && latestQueuedData
          ? latestQueuedData
          : getLocalData()
      )

      const localSignature = getDataSignature(localData)

      lastKnownDataSignature = localSignature

      await setDoc(
        userRef,
        {
          ...localData,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )

      if (
        activeUid !== uid ||
        syncGeneration !== generationAtStart
      ) {
        return
      }

      /*
       * If newer local changes arrived while the initial
       * document was being created, queue them as well.
       */
      if (pendingSave) {
        scheduleSave(0)
      }
    }

    if (
      activeUid !== uid ||
      syncGeneration !== generationAtStart
    ) {
      return
    }

    unsubscribe = onSnapshot(
      userRef,
      snapshot => {
        if (
          !snapshot.exists() ||
          activeUid !== uid ||
          syncGeneration !== generationAtStart
        ) {
          return
        }

        const remoteData = normalizeData(snapshot.data())
        const remoteSignature = getDataSignature(remoteData)

        /*
         * Ignore snapshots representing data already applied
         * or written by this session.
         */
        if (remoteSignature === lastKnownDataSignature) {
          return
        }

        /*
         * Do not replace local data while a local save is
         * queued or actively being written.
         */
        if (pendingSave || saveInProgress) {
          return
        }

        lastKnownDataSignature = remoteSignature

        applyingRemoteData = true

        try {
          setLocalData(remoteData)
        } finally {
          applyingRemoteData = false
        }
      },
      error => {
        console.error(
          'Mindrise cloud sync listener error:',
          error
        )
      }
    )

  } catch (error) {
    console.error(
      'Could not initialize Mindrise cloud sync:',
      error
    )

    if (
      activeUid === uid &&
      syncGeneration === generationAtStart
    ) {
      pendingSave = Boolean(latestQueuedData)
    }

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
  /*
   * Invalidate any async save or initialization belonging
   * to the previous synchronization session.
   */
  syncGeneration++

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