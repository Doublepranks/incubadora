export function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

export function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day === 0 ? -6 : 1) - day; // shift so Monday is start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getLastNWeekStarts(n: number) {
  const weeks: Date[] = [];
  let current = startOfWeekMonday(new Date());
  for (let i = 0; i < n; i++) {
    const copy = new Date(current);
    weeks.push(copy);
    current = new Date(current);
    current.setDate(current.getDate() - 7);
  }
  return weeks.reverse();
}
