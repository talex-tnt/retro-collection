import { LRUCache } from './lruCache';
import { openDB } from 'idb';

/* ---------------- LRU MEMORY CACHE ---------------- */

export const blobMemoryCache = new LRUCache<Blob>(50);
export const urlMemoryCache = new LRUCache<string>(100);

/* ---------------- DISK CACHE ---------------- */

const DB_NAME = 'drive-image-cache';
const STORE = 'images';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE);
    }
  },
});

/* MEMORY */

export const getMemoryBlob = (id: string) => blobMemoryCache.get(id);
export const setMemoryBlob = (id: string, blob: Blob) =>
  blobMemoryCache.set(id, blob);

export const getMemoryUrl = (id: string) => urlMemoryCache.get(id);
export const setMemoryUrl = (id: string, url: string) =>
  urlMemoryCache.set(id, url);

/* DISK */

export async function getDiskBlob(fileId: string): Promise<Blob | undefined> {
  const db = await dbPromise;
  return db.get(STORE, fileId);
}

export async function setDiskBlob(fileId: string, blob: Blob) {
  const db = await dbPromise;
  await db.put(STORE, blob, fileId);
}
