
import { Capacitor } from '@capacitor/core'
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence
} from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDlwhjbNPZuI7GUKd3uour1cmecddm-6YM',
  authDomain: 'mindrise-fa09d.firebaseapp.com',
  projectId: 'mindrise-fa09d',
  storageBucket: 'mindrise-fa09d.firebasestorage.app',
  messagingSenderId: '494148792368',
  appId: '1:494148792368:web:a3fa82bad30a66c307bdf5'
}

const app = initializeApp(firebaseConfig)

export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, {
      persistence: indexedDBLocalPersistence
    })
  : getAuth(app)

export const storage = getStorage(app)
export const db = getFirestore(app)
