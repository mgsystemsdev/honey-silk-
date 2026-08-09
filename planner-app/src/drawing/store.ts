import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PageDrawing, Stroke } from './types'

interface DrawingDB extends DBSchema {
  pages: {
    key: number
    value: PageDrawing
  }
}

let dbPromise: Promise<IDBPDatabase<DrawingDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<DrawingDB>('honey-silk-drawings', 1, {
      upgrade(db) {
        db.createObjectStore('pages', { keyPath: 'pageIndex' })
      },
    })
  }
  return dbPromise
}

export async function loadPageStrokes(pageIndex: number): Promise<Stroke[]> {
  const db = await getDb()
  const row = await db.get('pages', pageIndex)
  return row?.strokes ?? []
}

export async function savePageStrokes(
  pageIndex: number,
  strokes: Stroke[],
): Promise<void> {
  const db = await getDb()
  await db.put('pages', {
    pageIndex,
    strokes,
    updatedAt: Date.now(),
  })
}
