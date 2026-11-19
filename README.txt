Mindrise native alarm integration - Stage 2

This package contains complete replacements for:
- src/main.js
- src/pages/alarm-ringing.js
- android/app/src/main/java/com/mindrise/app/MindriseAlarmPlugin.java

It connects the Android plugin from Stage 1 to the existing JavaScript app.

Important behavior:
- Android exact alarms are scheduled through the native plugin when permission is granted.
- The app asks the user to open Android's Alarms & reminders settings if access is missing.
- Native alarm playback is not duplicated by WebView audio.
- The existing three challenges and 100-second confirmation flow remain in JavaScript.
- Android native pending alarms are polled while the WebView is active/resumed.
- Native schedules are synchronized after data saves and cleared on sign-out.
- Browser alarm polling remains as a fallback when native exact-alarm access is not enabled.

This is an integration build, not a claim that all locked-screen/full-screen behavior has been validated. Test on a real Android device. The current notification requires the user to tap it to open the challenge screen; a full-screen alarm activity is a separate follow-up enhancement.

Extract the ZIP into the Mindrise project root and allow these three files to be replaced. Keep a backup of the existing files first.
