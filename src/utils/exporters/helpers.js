export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function groupBy(data, key) {
  return data.reduce((acc, item) => {
    const groupKey = item[key]
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(item)
    return acc
  }, {})
}

export function nestBy(data, groupByKey, childKey = 'items') {
  const grouped = groupBy(data, groupByKey)
  return Object.entries(grouped).map(([key, items]) => ({
    [groupByKey]: key,
    [childKey]: items
  }))
}
