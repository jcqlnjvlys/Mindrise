
package com.mindrise.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

public class AlarmRingingService extends Service {

    public static final String ACTION_START =
            "com.mindrise.app.START_RINGING";

    public static final String ACTION_STOP =
            "com.mindrise.app.STOP_RINGING";

    private static final String CHANNEL_ID = "mindrise_alarms";
    private static final int NOTIFICATION_ID = 6301;

    private MediaPlayer player;
    private PowerManager.WakeLock screenWakeLock;

    private String currentAlarmId;
    private String currentAlarmName;
    private String currentSound;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {

        if (intent == null) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }

        String action = intent.getAction();

        if (ACTION_STOP.equals(action)) {
            stopPlayback();
            releaseScreenWakeLock();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!ACTION_START.equals(action)) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }

        String alarmId = intent.getStringExtra("alarmId");
        String alarmName = intent.getStringExtra("alarmName");
        String sound = intent.getStringExtra("sound");

        if (alarmId == null || alarmId.trim().isEmpty()) {
            stopPlayback();
            releaseScreenWakeLock();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        currentAlarmId = alarmId;
        currentAlarmName = alarmName;
        currentSound = sound;

        startAlarmForeground(currentAlarmAlarmName(), currentAlarmId);
        wakeScreenBriefly();
        startPlayback(currentSound);

        return START_REDELIVER_INTENT;
    }

    private String currentAlarmAlarmName() {
        return currentAlarmName == null
                || currentAlarmName.trim().isEmpty()
                ? "Mindrise alarm"
                : currentAlarmName;
    }

    private void wakeScreenBriefly() {

        releaseScreenWakeLock();

        try {
            PowerManager powerManager =
                    (PowerManager) getSystemService(POWER_SERVICE);

            if (powerManager == null) {
                return;
            }

            screenWakeLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK
                            | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "Mindrise:AlarmScreenWake"
            );

            screenWakeLock.setReferenceCounted(false);
            screenWakeLock.acquire(15000L);

        } catch (Exception error) {
            error.printStackTrace();
            releaseScreenWakeLock();
        }
    }

    private void releaseScreenWakeLock() {

        if (screenWakeLock != null) {
            try {
                if (screenWakeLock.isHeld()) {
                    screenWakeLock.release();
                }
            } catch (Exception ignored) {
            }

            screenWakeLock = null;
        }
    }

    private void startAlarmForeground(String alarmName, String alarmId) {

        Intent openApp = new Intent(this, MainActivity.class);

        openApp.setAction(
                "com.mindrise.app.OPEN_RINGING_ALARM"
        );

        openApp.putExtra("alarmId", alarmId);
        openApp.putExtra("alarmName", alarmName);

        openApp.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
        );

        PendingIntent fullScreenIntent = PendingIntent.getActivity(
                this,
                6302,
                openApp,
                PendingIntent.FLAG_UPDATE_CURRENT
                        | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder =
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? new Notification.Builder(this, CHANNEL_ID)
                        : new Notification.Builder(this);

        Notification notification = builder
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(alarmName)
                .setContentText("Your alarm is ringing. Tap to open Mindrise.")
                .setCategory(Notification.CATEGORY_ALARM)
                .setPriority(Notification.PRIORITY_MAX)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(fullScreenIntent)
                .setFullScreenIntent(fullScreenIntent, true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void startPlayback(String fileName) {

        stopPlayback();

        String resourceName = sanitizeResourceName(fileName);

        int resourceId = getResources().getIdentifier(
                resourceName,
                "raw",
                getPackageName()
        );

        if (resourceId == 0) {
            resourceId = getResources().getIdentifier(
                    "alarm_synth_verb_hit",
                    "raw",
                    getPackageName()
            );
        }

        if (resourceId == 0) {
            return;
        }

        try {
            player = new MediaPlayer();

            AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();

            player.setAudioAttributes(attributes);

            player.setWakeMode(
                    getApplicationContext(),
                    PowerManager.PARTIAL_WAKE_LOCK
            );

            player.setLooping(true);

            try (android.content.res.AssetFileDescriptor descriptor =
                         getResources().openRawResourceFd(resourceId)) {

                if (descriptor == null) {
                    stopPlayback();
                    return;
                }

                player.setDataSource(
                        descriptor.getFileDescriptor(),
                        descriptor.getStartOffset(),
                        descriptor.getLength()
                );
            }

            player.setOnErrorListener((mp, what, extra) -> {
                stopPlayback();
                return true;
            });

            player.prepare();
            player.start();

        } catch (Exception error) {
            error.printStackTrace();
            stopPlayback();
        }
    }

    private String sanitizeResourceName(String fileName) {

        if (fileName == null || fileName.trim().isEmpty()) {
            return "alarm_synth_verb_hit";
        }

        String name = fileName;

        int dot = name.lastIndexOf('.');
        if (dot > 0) {
            name = name.substring(0, dot);
        }

        return name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_|_$", "");
    }

    private void stopPlayback() {

        if (player != null) {

            try {
                if (player.isPlaying()) {
                    player.stop();
                }
            } catch (Exception ignored) {
            }

            try {
                player.release();
            } catch (Exception ignored) {
            }

            player = null;
        }
    }

    private void createNotificationChannel() {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Mindrise alarms",
                    NotificationManager.IMPORTANCE_HIGH
            );

            channel.setDescription(
                    "Notifications for active Mindrise alarms"
            );

            channel.setLockscreenVisibility(
                    Notification.VISIBILITY_PUBLIC
            );

            NotificationManager manager =
                    getSystemService(NotificationManager.class);

            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        stopPlayback();
        releaseScreenWakeLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
