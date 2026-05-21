type Entry<T> = {
  value: T;
  lastUsed: number;
};

export class LRUCache<T> {
  private maxSize: number;
  private map = new Map<string, Entry<T>>();

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    // update recency
    entry.lastUsed = Date.now();
    this.map.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T) {
    if (this.map.has(key)) {
      this.map.set(key, { value, lastUsed: Date.now() });
      return;
    }

    this.map.set(key, {
      value,
      lastUsed: Date.now(),
    });

    this.evictIfNeeded();
  }

  has(key: string) {
    return this.map.has(key);
  }

  delete(key: string) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  private evictIfNeeded() {
    if (this.map.size <= this.maxSize) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.map.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.map.delete(oldestKey);
    }
  }
}
