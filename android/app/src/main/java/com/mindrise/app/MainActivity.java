package com.mindrise.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String ACTION_OPEN_RINGING_ALARM =
            "com.mindrise.app.OPEN_RINGING_ALARM";

    private static final String ACTION_SHOW_ALARM =
            "com.mindrise.app.SHOW_ALARM";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MindriseAlarmPlugin.class);

        configureAlarmLockScreen(getIntent());

        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        configureAlarmLockScreen(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        configureAlarmLockScreen(getIntent());
    }

    private void configureAlarmLockScreen(Intent intent) {
        boolean isAlarmIntent = intent != null
                && (ACTION_OPEN_RINGING_ALARM.equals(intent.getAction())
                || ACTION_SHOW_ALARM.equals(intent.getAction()));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(isAlarmIntent);
            setTurnScreenOn(isAlarmIntent);
        }

        if (isAlarmIntent) {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) {
                getWindow().addFlags(
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                );
            }
        } else {
            getWindow().clearFlags(
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) {
                getWindow().clearFlags(
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                );
            }
        }
    }
}