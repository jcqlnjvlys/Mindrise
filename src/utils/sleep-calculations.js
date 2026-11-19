export function calculateSleepDuration(sleepTime, wakeTime) {
  const sleep = new Date(sleepTime), wake = new Date(wakeTime)
  if (Number.isNaN(sleep.getTime()) || Number.isNaN(wake.getTime())) return null
  const duration = wake.getTime() - sleep.getTime()
  if (duration <= 0) return null
  return Math.floor(duration / 60000)
}
export function formatDuration(minutes) {
  if (minutes == null || !Number.isFinite(Number(minutes)) || minutes < 0) return 'Not available'
  const value = Math.floor(minutes), hours = Math.floor(value / 60), mins = value % 60
  return `${hours}h ${mins}m`
}
export function calculateGoalProgress(sleepMinutes, goalMinutes) {
  if (sleepMinutes == null || goalMinutes == null || goalMinutes <= 0) return { percentage: 0, remainingMinutes: 0, reached: false }
  return { percentage: Math.round(sleepMinutes / goalMinutes * 100), remainingMinutes: Math.max(0, goalMinutes - sleepMinutes), reached: sleepMinutes >= goalMinutes }
}
