export const CAPACITY_BYTES = 500 * 1_000_000;

export function usedBytes(books) {
  return books.reduce((total, book) => total + book.bytes, 0);
}

export function interactionCount(book) {
  return book.downloads + book.comments.length;
}

// New files make room by retiring the least-used books. Age breaks ties.
export function makeRoom(books, incomingBytes) {
  if (incomingBytes > CAPACITY_BYTES) return { accepted: false, books, removed: [] };

  const remaining = [...books];
  const removed = [];
  while (usedBytes(remaining) + incomingBytes > CAPACITY_BYTES) {
    const candidate = [...remaining].sort((a, b) =>
      interactionCount(a) - interactionCount(b) || a.order - b.order
    )[0];
    if (!candidate) break;
    remaining.splice(remaining.indexOf(candidate), 1);
    removed.push(candidate);
  }
  return { accepted: true, books: remaining, removed };
}
