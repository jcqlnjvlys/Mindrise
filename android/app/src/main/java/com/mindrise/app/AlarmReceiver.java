package com.mindrise.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        if (alarmId == null || alarmId.isEmpty()) return;

        JSONObject alarm = AlarmScheduler.findAlarm(context, alarmId);
        if (alarm == null || !alarm.optBoolean("enabled", false)) return;

        JSONArray repeat = alarm.optJSONArray("repeat");
        if (repeat == null || repeat.length() == 0) {
            try {
                alarm.put("enabled", false);
            } catch (org.json.JSONException ignored) {
                return;
            }
            AlarmScheduler.updateAlarm(context, alarm);
        } else {
            AlarmScheduler.scheduleNext(context, alarm);
        }

        AlarmScheduler.setPendingAlarm(context, alarm);

        Intent service = new Intent(context, AlarmRingingService.class);
        service.setAction(AlarmRingingService.ACTION_START);
        service.putExtra("alarmId", alarmId);
        service.putExtra("alarmName", alarm.optString("name", "Mindrise alarm"));
        service.putExtra("sound", alarm.optString("sound", "alarm-synth-verb-hit.wav"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(service);
        } else {
            context.startService(service);
        }
    }
}
