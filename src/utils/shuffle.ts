/** Fisher–Yates shuffle; returns new array and index map. */

export function shuffleWithMap<T>(items: T[]): { items: T[]; orderMap: number[] } {
  const indices = items.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return {
    items: indices.map((i) => items[i]),
    orderMap: indices, // displayIndex → originalIndex
  }
}

export function invertMap(orderMap: number[]): number[] {
  const inv = new Array(orderMap.length)
  orderMap.forEach((orig, display) => {
    inv[orig] = display
  })
  return inv
}
