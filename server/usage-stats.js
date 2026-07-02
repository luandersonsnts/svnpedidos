const isoDay = (value = new Date()) => value.toISOString().slice(0, 10)

export const createUsageStats = () => {
  const requestsByDay = new Map()
  const dbWritesByDay = new Map()

  const bump = (store, day, key) => {
    const entry = store.get(day) || { total: 0, byKey: {} }
    entry.total += 1
    entry.byKey[key] = (entry.byKey[key] || 0) + 1
    store.set(day, entry)
  }

  return {
    recordRequest({ key }) {
      bump(requestsByDay, isoDay(), key || 'unknown')
    },
    recordDbWrite({ key }) {
      bump(dbWritesByDay, isoDay(), key || 'unknown')
    },
    snapshot() {
      const mapToObject = (store) => Object.fromEntries(
        Array.from(store.entries()).sort(([left], [right]) => left.localeCompare(right)),
      )

      return {
        generated_at: new Date().toISOString(),
        requests_by_day: mapToObject(requestsByDay),
        db_writes_by_day: mapToObject(dbWritesByDay),
      }
    },
  }
}
