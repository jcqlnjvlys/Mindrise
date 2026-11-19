const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
export function getNextAlarmDate(alarm, now = new Date()) {
  if (!alarm?.time || !/^\d{2}:\d{2}$/.test(alarm.time)) return null
  const [hours,minutes] = alarm.time.split(':').map(Number)
  if (hours > 23 || minutes > 59) return null
  const repeatDays = Array.isArray(alarm.repeat) ? alarm.repeat : []
  for (let offset=0; offset<=7; offset++) { const candidate = new Date(now); candidate.setDate(candidate.getDate()+offset); candidate.setHours(hours,minutes,0,0); const selected = !repeatDays.length || repeatDays.includes(dayNames[candidate.getDay()]); if (selected && candidate.getTime()>now.getTime()) return candidate }
  return null
}
export function formatTimeUntil(target, now = new Date()) { if (!target) return 'an unknown time'; const total = Math.ceil(Math.max(0,target.getTime()-now.getTime())/60000), hours=Math.floor(total/60), minutes=total%60; return `${hours} hours and ${minutes} minutes` }
export function getAlarmOccurrenceKey(alarm,date) { if (!alarm?.id || !date) return null; return `${alarm.id}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}` }
