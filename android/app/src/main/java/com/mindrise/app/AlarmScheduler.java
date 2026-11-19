package com.mindrise.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

final class AlarmScheduler {
    private static final String PREFS = "mindrise_native_alarms";
    private static final String KEY_ALARMS = "alarms_json";
    private static final String KEY_PENDING = "pending_alarm_json";
    private static final String[] DAYS = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};

    private AlarmScheduler() {}

    static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return manager != null && manager.canScheduleExactAlarms();
    }

    static void saveAlarms(Context context, JSONArray alarms) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY_ALARMS, alarms.toString()).apply();
    }

    static JSONArray loadAlarms(Context context) {
        String saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_ALARMS, "[]");
        try {
            return new JSONArray(saved);
        } catch (JSONException error) {
            return new JSONArray();
        }
    }

    static int scheduleAll(Context context, JSONArray alarms) {
        cancelAll(context);
        if (!canScheduleExactAlarms(context)) return 0;
        int count = 0;
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject alarm = alarms.optJSONObject(i);
            if (alarm != null && alarm.optBoolean("enabled", false) && scheduleNext(context, alarm)) {
                count++;
            }
        }
        return count;
    }

    static boolean scheduleNext(Context context, JSONObject alarm) {
        if (!canScheduleExactAlarms(context)) return false;
        String id = alarm.optString("id", "");
        String time = alarm.optString("time", "");
        if (id.isEmpty() || !time.matches("\\d{2}:\\d{2}")) return false;

        String[] parts = time.split(":");
        int hour = Integer.parseInt(parts[0]);
        int minute = Integer.parseInt(parts[1]);
        if (hour > 23 || minute > 59) return false;

        JSONArray repeat = alarm.optJSONArray("repeat");
        Set<String> repeatDays = new HashSet<>();
        if (repeat != null) {
            for (int i = 0; i < repeat.length(); i++) repeatDays.add(repeat.optString(i));
        }

        Calendar now = Calendar.getInstance();
        Calendar candidate = (Calendar) now.clone();
        boolean found = false;
        for (int offset = 0; offset <= 7; offset++) {
            candidate = (Calendar) now.clone();
            candidate.add(Calendar.DAY_OF_YEAR, offset);
            candidate.set(Calendar.HOUR_OF_DAY, hour);
            candidate.set(Calendar.MINUTE, minute);
            candidate.set(Calendar.SECOND, 0);
            candidate.set(Calendar.MILLISECOND, 0);

            boolean selectedDay = repeatDays.isEmpty() || repeatDays.contains(DAYS[candidate.get(Calendar.DAY_OF_WEEK) - 1]);
            if (selectedDay && candidate.getTimeInMillis() > now.getTimeInMillis()) {
                found = true;
                break;
            }
        }
        if (!found) return false;

        Context app = context.getApplicationContext();
        AlarmManager manager = (AlarmManager) app.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return false;

        Intent receiverIntent = new Intent(app, AlarmReceiver.class);
        receiverIntent.setAction("com.mindrise.app.FIRE_ALARM");
        receiverIntent.setData(Uri.parse("mindrise://alarm/" + Uri.encode(id)));
        receiverIntent.putExtra("alarmId", id);
        PendingIntent operation = PendingIntent.getBroadcast(
                app, requestCode(id), receiverIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent showIntent = new Intent(app, MainActivity.class);
        showIntent.setAction("com.mindrise.app.SHOW_ALARM");
        showIntent.setData(Uri.parse("mindrise://show-alarm/" + Uri.encode(id)));
        showIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent showPending = PendingIntent.getActivity(
                app, requestCode(id) + 100000, showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        try {
            AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(
                    candidate.getTimeInMillis(), showPending
            );
            manager.setAlarmClock(info, operation);
            return true;
        } catch (SecurityException error) {
            return false;
        }
    }

    static void cancelAll(Context context) {
        JSONArray alarms = loadAlarms(context);
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject alarm = alarms.optJSONObject(i);
            if (alarm == null) continue;
            String id = alarm.optString("id", "");
            if (id.isEmpty()) continue;
            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.setAction("com.mindrise.app.FIRE_ALARM");
            intent.setData(Uri.parse("mindrise://alarm/" + Uri.encode(id)));
            PendingIntent pending = PendingIntent.getBroadcast(
                    context, requestCode(id), intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (pending != null) {
                manager.cancel(pending);
                pending.cancel();
            }
        }
    }

    static JSONObject findAlarm(Context context, String id) {
        JSONArray alarms = loadAlarms(context);
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject alarm = alarms.optJSONObject(i);
            if (alarm != null && id.equals(alarm.optString("id"))) return alarm;
        }
        return null;
    }

    static void updateAlarm(Context context, JSONObject updated) {
        String id = updated.optString("id", "");
        JSONArray old = loadAlarms(context);
        JSONArray next = new JSONArray();
        for (int i = 0; i < old.length(); i++) {
            JSONObject alarm = old.optJSONObject(i);
            if (alarm == null) continue;
            if (id.equals(alarm.optString("id"))) next.put(updated);
            else next.put(alarm);
        }
        saveAlarms(context, next);
    }

    static void setPendingAlarm(Context context, JSONObject alarm) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY_PENDING, alarm.toString()).apply();
    }

    static String getPendingAlarmJson(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_PENDING, null);
    }

    static void clearPendingAlarm(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_PENDING).apply();
    }

    static int requestCode(String id) {
        return id.hashCode() & 0x7fffffff;
    }
}
