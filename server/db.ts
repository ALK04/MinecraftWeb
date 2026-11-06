import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { config } from './config.ts'

// Une seule base SQLite pour tout le site (objectifs + succès)
mkdirSync(path.dirname(config.dbPath), { recursive: true })
export const db = new DatabaseSync(config.dbPath)
