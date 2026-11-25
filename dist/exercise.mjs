// Учебная заготовка. Открой локальную копию и меняй только эти функции.

export function filterOpen(requests) {
  // Верни новый массив заявок со статусом open в прежнем порядке.
  return requests;
}

export function normalizeTitle(value) {
  // Удали пробелы по краям. Допусти 4–24 символа после очистки.
  // Для нестрокового или неподходящего значения верни null.
  return typeof value === 'string' ? value.trim() : null;
}
