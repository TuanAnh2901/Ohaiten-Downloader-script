// src/urljoin.ts — join path/absolute-url với base m3u8 (đủ dùng, không thêm dep)
export function vidUrlJoin(baseWithFile: string, rel: string): string {
  if (/^https?:\/\//i.test(rel)) return rel
  const base = baseWithFile.includes('?') ? baseWithFile.split('?')[0] : baseWithFile
  const idx = base.lastIndexOf('/')
  if (rel.startsWith('/')) {
    const m = base.match(/^(https?:\/\/[^/]+)/)
    return m ? m[1] + rel : rel
  }
  return base.slice(0, idx + 1) + rel
}
