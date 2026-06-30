/** ProphetX query endpoints: max 1 request per second (Anthony email). */
const MIN_GAP_MS = 1000;
let lastQueryAt = 0;

export async function throttleProphetxQuery<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, MIN_GAP_MS - (now - lastQueryAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastQueryAt = Date.now();
  return fn();
}
