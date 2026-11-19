
package com.mindrise.app;

import android.Manifest;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(
    name = "MindriseAlarm",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class MindriseAlarmPlugin extends Plugin {

    private static final String SESSION_PREFS = "mindrise_alarm_session";
    private static final String KEY_SESSION = "active_session";

    private BroadcastReceiver sleepMediaReceiver;
    private boolean sleepMediaReceiverRegistered = false;

    @Override
    public void load() {
        super.load();
        registerSleepMediaReceiver();
    }

    private void registerSleepMediaReceiver() {
        if (sleepMediaReceiverRegistered) {
            return;
        }

        sleepMediaReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null) {
                    return;
                }

                String control = intent.getStringExtra(
                        SleepSoundsService.EXTRA_CONTROL
                );

                if (control == null) {
                    return;
                }

                JSObject event = new JSObject();
                event.put("control", control);

                notifyListeners("sleepMediaControl", event);
            }
        };

        IntentFilter filter = new IntentFilter(
                SleepSoundsService.ACTION_CONTROL
        );

        ContextCompat.registerReceiver(
                getContext(),
                sleepMediaReceiver,
                filter,
                ContextCompat.RECEIVER_NOT_EXPORTED
        );

        sleepMediaReceiverRegistered = true;
    }

    @Override
    protected void handleOnDestroy() {
        if (sleepMediaReceiverRegistered && sleepMediaReceiver != null) {
            try {
                getContext().unregisterReceiver(sleepMediaReceiver);
            } catch (IllegalArgumentException ignored) {
            }

            sleepMediaReceiverRegistered = false;
            sleepMediaReceiver = null;
        }

        super.handleOnDestroy();
    }

    @PluginMethod
    public void updateSleepMedia(PluginCall call) {
        String title = call.getString("title", "Sleep Calming Sounds");
        boolean playing = call.getBoolean("playing", false);

        Intent service = new Intent(
                getContext(),
                SleepSoundsService.class
        );

        service.setAction(SleepSoundsService.ACTION_UPDATE);
        service.putExtra(SleepSoundsService.EXTRA_TITLE, title);
        service.putExtra(SleepSoundsService.EXTRA_PLAYING, playing);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(
                        getContext(),
                        service
                );
            } else {
                getContext().startService(service);
            }

            JSObject result = new JSObject();
            result.put("updated", true);
            call.resolve(result);

        } catch (Exception error) {
            call.reject("Could not update Sleep Sounds notification", error);
        }
    }

    @PluginMethod
    public void stopSleepMedia(PluginCall call) {
        Intent service = new Intent(
                getContext(),
                SleepSoundsService.class
        );

        service.setAction(SleepSoundsService.ACTION_STOP);

        try {
            getContext().startService(service);

            JSObject result = new JSObject();
            result.put("stopped", true);
            call.resolve(result);

        } catch (Exception error) {
            call.reject("Could not stop Sleep Sounds notification", error);
        }
    }

    @PluginMethod
    public void checkNotificationPermission(PluginCall call) {
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                || getPermissionState("notifications") == PermissionState.GRANTED;

        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                || getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("openedSettings", false);
            call.resolve(result);
            return;
        }

        requestPermissionForAlias(
                "notifications",
                call,
                "notificationPermissionCallback"
        );
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("notifications")
                == PermissionState.GRANTED;

        JSObject result = new JSObject();
        result.put("granted", granted);
        result.put("openedSettings", false);
        call.resolve(result);
    }

    @PluginMethod
    public void checkExactAlarmPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", AlarmScheduler.canScheduleExactAlarms(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (AlarmScheduler.canScheduleExactAlarms(getContext())) {
            JSObject result = new JSObject();
            result.put("openedSettings", false);
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);

                JSObject result = new JSObject();
                result.put("openedSettings", true);
                result.put("granted", false);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Could not open Alarms & reminders settings", error);
            }
        } else {
            JSObject result = new JSObject();
            result.put("openedSettings", false);
            result.put("granted", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void checkFullScreenIntentPermission(PluginCall call) {
        boolean granted = true;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            NotificationManager manager =
                    getContext().getSystemService(NotificationManager.class);

            granted = manager != null && manager.canUseFullScreenIntent();
        }

        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void requestFullScreenIntentPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            JSObject result = new JSObject();
            result.put("openedSettings", false);
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        NotificationManager manager =
                getContext().getSystemService(NotificationManager.class);

        if (manager != null && manager.canUseFullScreenIntent()) {
            JSObject result = new JSObject();
            result.put("openedSettings", false);
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        try {
            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT
            );

            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);

            JSObject result = new JSObject();
            result.put("openedSettings", true);
            result.put("granted", false);
            call.resolve(result);

        } catch (Exception error) {
            call.reject("Could not open full-screen notification settings", error);
        }
    }

    @PluginMethod
    public void syncAlarms(PluginCall call) {
        JSArray alarms = call.getArray("alarms");

        if (alarms == null) {
            call.reject("The alarms array is required");
            return;
        }

        try {
            JSONArray jsonAlarms = new JSONArray(alarms.toString());

            AlarmScheduler.cancelAll(getContext());
            AlarmScheduler.saveAlarms(getContext(), jsonAlarms);

            boolean permissionGranted =
                    AlarmScheduler.canScheduleExactAlarms(getContext());

            int scheduled = permissionGranted
                    ? AlarmScheduler.scheduleAll(getContext(), jsonAlarms)
                    : 0;

            JSObject result = new JSObject();
            result.put("permissionGranted", permissionGranted);
            result.put("scheduledCount", scheduled);
            result.put("alarmCount", jsonAlarms.length());

            call.resolve(result);

        } catch (JSONException error) {
            call.reject("Could not read alarm data", error);
        }
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        AlarmScheduler.cancelAll(getContext());
        AlarmScheduler.saveAlarms(getContext(), new JSONArray());

        stopNativeRinging();
        clearStoredAlarmSession();

        JSObject result = new JSObject();
        result.put("cancelled", true);
        call.resolve(result);
    }

    @PluginMethod
    public void getPendingAlarm(PluginCall call) {
        String pending = AlarmScheduler.getPendingAlarmJson(getContext());

        JSObject result = new JSObject();

        try {
            result.put(
                    "alarm",
                    pending == null ? null : new JSONObject(pending)
            );
        } catch (JSONException error) {
            result.put("alarm", null);
        }

        call.resolve(result);
    }

    @PluginMethod
    public void saveAlarmSession(PluginCall call) {
        JSObject session = call.getObject("session");

        if (session == null) {
            call.reject("The alarm session is required");
            return;
        }

        try {
            getContext()
                    .getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putString(KEY_SESSION, session.toString())
                    .apply();

            JSObject result = new JSObject();
            result.put("saved", true);
            call.resolve(result);

        } catch (Exception error) {
            call.reject("Could not save the alarm session", error);
        }
    }

    @PluginMethod
    public void getAlarmSession(PluginCall call) {
        String saved = getContext()
                .getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE)
                .getString(KEY_SESSION, null);

        JSObject result = new JSObject();

        try {
            result.put(
                    "session",
                    saved == null ? null : new JSONObject(saved)
            );
        } catch (JSONException error) {
            result.put("session", null);
        }

        call.resolve(result);
    }

    @PluginMethod
    public void clearAlarmSession(PluginCall call) {
        clearStoredAlarmSession();
        AlarmScheduler.clearPendingAlarm(getContext());

        JSObject result = new JSObject();
        result.put("cleared", true);
        call.resolve(result);
    }

    @PluginMethod
    public void startRinging(PluginCall call) {
        JSObject alarm = call.getObject("alarm");

        if (alarm == null) {
            call.reject("The alarm details are required");
            return;
        }

        try {
            String alarmId = alarm.getString("id");
            String alarmName = alarm.optString("name", "Alarm");
            String sound = alarm.optString(
                    "sound",
                    "alarm-synth-verb-hit.wav"
            );

            Intent service = new Intent(
                    getContext(),
                    AlarmRingingService.class
            );

            service.setAction(AlarmRingingService.ACTION_START);
            service.putExtra("alarmId", alarmId);
            service.putExtra("alarmName", alarmName);
            service.putExtra("sound", sound);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(
                        getContext(),
                        service
                );
            } else {
                getContext().startService(service);
            }

            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);

        } catch (Exception error) {
            call.reject("Could not restart the Mindrise alarm", error);
        }
    }

    @PluginMethod
    public void stopRinging(PluginCall call) {
        stopNativeRinging();

        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }

    private void stopNativeRinging() {
        Intent service = new Intent(
                getContext(),
                AlarmRingingService.class
        );

        getContext().stopService(service);
    }

    private void clearStoredAlarmSession() {
        getContext()
                .getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_SESSION)
                .apply();
    }
}
