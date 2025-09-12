import { readdir, stat, rename } from 'node:fs/promises'
import { join, extname } from 'node:path'

async function walk(dir) {
  const entries = await readdir(dir)
  await Promise.all(entries.map(async (name) => {
    const p = join(dir, name)
    const s = await stat(p)
    if (s.isDirectory()) return walk(p)
    if (extname(p) === '.js') {
      const dest = p.slice(0, -3) + '.cjs'
      await rename(p, dest)
    }
  }))
}

const root = new URL('../dist-cjs', import.meta.url).pathname
await walk(root)

