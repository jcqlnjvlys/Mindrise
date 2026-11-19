
package com.mindrise.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

public class SleepSoundsService extends Service {

    public static final String ACTION_UPDATE =
            "com.mindrise.app.SLEEP_SOUNDS_UPDATE";
    public static final String ACTION_STOP =
            "com.mindrise.app.SLEEP_SOUNDS_STOP";
    public static final String ACTION_CONTROL =
            "com.mindrise.app.SLEEP_MEDIA_CONTROL";

    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_PLAYING = "playing";
    public static final String EXTRA_CONTROL = "control";

    private static final String CHANNEL_ID = "mindrise_sleep_sounds";
    private static final int NOTIFICATION_ID = 6302;

    private static final String CONTROL_PREVIOUS = "previous";
    private static final String CONTROL_PLAY = "play";
    private static final String CONTROL_PAUSE = "pause";
    private static final String CONTROL_NEXT = "next";
    private static final String CONTROL_STOP = "stop";

    private MediaSessionCompat mediaSession;
    private String currentTitle = "Sleep Calming Sounds";
    private boolean isPlaying = false;

    @Override
    public void onCreate() {
        super.onCreate();

        createNotificationChannel();

        mediaSession = new MediaSessionCompat(
                this,
                "MindriseSleepSounds"
        );

        /*
         * FIX:
         * Lock-screen media controls communicate through the MediaSession.
         * Register a callback so those commands are forwarded to the
         * existing native-to-JavaScript control broadcast.
         */
        mediaSession.setCallback(new MediaSessionCompat.Callback() {

            @Override
            public void onPlay() {
                dispatchControl(CONTROL_PLAY);
            }

            @Override
            public void onPause() {
                dispatchControl(CONTROL_PAUSE);
            }

            @Override
            public void onSkipToNext() {
                dispatchControl(CONTROL_NEXT);
            }

            @Override
            public void onSkipToPrevious() {
                dispatchControl(CONTROL_PREVIOUS);
            }

            @Override
            public void onStop() {
                dispatchControl(CONTROL_STOP);
            }

            @Override
            public void onPlayFromMediaId(String mediaId, android.os.Bundle extras) {
                dispatchControl(CONTROL_PLAY);
            }
        });

        mediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS
                        | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        updateMediaSession();
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) {
            return START_NOT_STICKY;
        }

        String action = intent.getAction();

        if (ACTION_UPDATE.equals(action)) {
            currentTitle = intent.getStringExtra(EXTRA_TITLE);

            if (currentTitle == null || currentTitle.trim().isEmpty()) {
                currentTitle = "Sleep Calming Sounds";
            }

            isPlaying = intent.getBooleanExtra(EXTRA_PLAYING, false);

            updateMediaSession();
            startOrUpdateNotification();

        } else if (ACTION_STOP.equals(action)) {
            stopMediaNotification();

        } else {
            handleNotificationControl(action);
        }

        return START_NOT_STICKY;
    }

    /*
     * Both notification PendingIntents and MediaSession callbacks
     * use this same control dispatch pathway.
     */
    private void dispatchControl(String control) {
        Intent controlIntent = new Intent(ACTION_CONTROL);
        controlIntent.setPackage(getPackageName());
        controlIntent.putExtra(EXTRA_CONTROL, control);

        sendBroadcast(controlIntent);

        if (CONTROL_STOP.equals(control)) {
            stopMediaNotification();
        }
    }

    private void handleNotificationControl(String action) {
        String control = null;

        if (CONTROL_PREVIOUS.equals(action)) {
            control = CONTROL_PREVIOUS;
        } else if (CONTROL_NEXT.equals(action)) {
            control = CONTROL_NEXT;
        } else if (CONTROL_PLAY.equals(action)) {
            control = CONTROL_PLAY;
        } else if (CONTROL_PAUSE.equals(action)) {
            control = CONTROL_PAUSE;
        } else if (CONTROL_STOP.equals(action)) {
            control = CONTROL_STOP;
        }

        if (control == null) {
            return;
        }

        dispatchControl(control);
    }

    private void updateMediaSession() {
        if (mediaSession == null) {
            return;
        }

        MediaMetadataCompat metadata = new MediaMetadataCompat.Builder()
                .putString(
                        MediaMetadataCompat.METADATA_KEY_TITLE,
                        currentTitle
                )
                .putString(
                        MediaMetadataCompat.METADATA_KEY_ARTIST,
                        "Mindrise Sleep Sounds"
                )
                .putString(
                        MediaMetadataCompat.METADATA_KEY_ALBUM,
                        "Mindrise"
                )
                .build();

        mediaSession.setMetadata(metadata);

        long actions =
                PlaybackStateCompat.ACTION_PLAY
                        | PlaybackStateCompat.ACTION_PAUSE
                        | PlaybackStateCompat.ACTION_PLAY_PAUSE
                        | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                        | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                        | PlaybackStateCompat.ACTION_STOP;

        int state = isPlaying
                ? PlaybackStateCompat.STATE_PLAYING
                : PlaybackStateCompat.STATE_PAUSED;

        PlaybackStateCompat playbackState =
                new PlaybackStateCompat.Builder()
                        .setActions(actions)
                        .setState(
                                state,
                                PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN,
                                1.0f
                        )
                        .build();

        mediaSession.setPlaybackState(playbackState);
    }

    private void startOrUpdateNotification() {
        Notification notification = buildNotification();

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

    private Notification buildNotification() {
        int playPauseIcon = isPlaying
                ? android.R.drawable.ic_media_pause
                : android.R.drawable.ic_media_play;

        String playPauseAction = isPlaying
                ? CONTROL_PAUSE
                : CONTROL_PLAY;

        String playPauseLabel = isPlaying ? "Pause" : "Play";

        PendingIntent previousIntent =
                createServicePendingIntent(CONTROL_PREVIOUS, 1);

        PendingIntent playPauseIntent =
                createServicePendingIntent(playPauseAction, 2);

        PendingIntent nextIntent =
                createServicePendingIntent(CONTROL_NEXT, 3);

        PendingIntent stopIntent =
                createServicePendingIntent(CONTROL_STOP, 4);

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.ic_media_play)
                        .setContentTitle(currentTitle)
                        .setContentText("Mindrise Sleep Sounds")
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                        .setOngoing(true)
                        .setOnlyAlertOnce(true)
                        .setShowWhen(false)
                        .addAction(
                                android.R.drawable.ic_media_previous,
                                "Previous",
                                previousIntent
                        )
                        .addAction(
                                playPauseIcon,
                                playPauseLabel,
                                playPauseIntent
                        )
                        .addAction(
                                android.R.drawable.ic_media_next,
                                "Next",
                                nextIntent
                        )
                        .addAction(
                                android.R.drawable.ic_menu_close_clear_cancel,
                                "Stop",
                                stopIntent
                        )
                        .setStyle(
                                new MediaStyle()
                                        .setMediaSession(
                                                mediaSession.getSessionToken()
                                        )
                                        .setShowActionsInCompactView(0, 1, 2)
                        );

        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(
                Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
        );

        PendingIntent contentIntent = PendingIntent.getActivity(
                this,
                5,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT
                        | PendingIntent.FLAG_IMMUTABLE
        );

        builder.setContentIntent(contentIntent);

        return builder.build();
    }

    private PendingIntent createServicePendingIntent(
            String action,
            int requestCode
    ) {
        Intent intent = new Intent(this, SleepSoundsService.class);
        intent.setAction(action);

        return PendingIntent.getService(
                this,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT
                        | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Sleep Calming Sounds",
                    NotificationManager.IMPORTANCE_LOW
            );

            channel.setDescription(
                    "Playback controls for Mindrise sleep sounds"
            );
            channel.setShowBadge(false);

            NotificationManager manager =
                    getSystemService(NotificationManager.class);

            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void stopMediaNotification() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }

        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setCallback(null);
            mediaSession.release();
            mediaSession = null;
        }

        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
