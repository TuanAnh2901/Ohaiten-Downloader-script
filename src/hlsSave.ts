// HLS save strategies: pick between in-memory Blob (universal) and
// File System Access API (Chromium-only, lower peak RAM for large files).
//
// The two helpers below accept an `HlsDownloadResult` and a final filename.
// They return a `SaveOutcome` describing how the file landed, so callers can
// surface the right log message without re-implementing the try/catch.
//
// `streamToDisk` requires a user gesture and only works on Chromium-based
// browsers. We call `showSaveFilePicker` lazily and fall back to Blob save
// if the API is missing or the user cancels the picker.

import type { HlsDownloadResult } from './hls'

export type SaveOutcome =
    | { mode: 'blob' }
    | { mode: 'stream' }
    | { mode: 'blob'; fallbackReason: 'unsupported' | 'cancelled' | 'error' }

/**
 * Save HLS result via Blob URL + anchor click. Universal path.
 */
export function saveHlsAsBlob(result: HlsDownloadResult, filename: string): void {
    const blobUrl = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)
}

interface FileSystemWritableFileStreamLike {
    write(data: BlobPart | ArrayBufferLike | Blob): Promise<void>
    close(): Promise<void>
}

interface FileSystemFileHandleLike {
    createWritable(opts?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStreamLike>
}

interface WindowWithPicker {
    showSaveFilePicker?: (opts?: { suggestedName?: string }) => Promise<FileSystemFileHandleLike>
}

/**
 * Save HLS result directly to disk via File System Access API.
 * Returns `false` if the browser doesn't support the API or the user cancels
 * the picker, so the caller can fall back to Blob save.
 */
export async function saveHlsStreamToDisk(
    result: HlsDownloadResult,
    filename: string,
): Promise<{ ok: true } | { ok: false; reason: 'unsupported' | 'cancelled' | 'error' }> {
    const w = window as unknown as WindowWithPicker
    if (typeof w.showSaveFilePicker !== 'function') {
        return { ok: false, reason: 'unsupported' }
    }
    let handle: FileSystemFileHandleLike
    try {
        handle = await w.showSaveFilePicker({ suggestedName: filename })
    } catch (err) {
        // User dismissed the picker (AbortError) or browser denied it.
        const name = err instanceof Error ? err.name : ''
        if (name === 'AbortError') return { ok: false, reason: 'cancelled' }
        return { ok: false, reason: 'error' }
    }
    const writable = await handle.createWritable()
    try {
        // Write each segment in order. Doing it chunk-by-chunk keeps peak RAM
        // bounded: only one segment lives in the writable at a time.
        for (const chunk of result.orderedChunks) {
            await writable.write(chunk)
        }
        await writable.close()
        return { ok: true }
    } catch {
        try { await writable.close() } catch { /* ignore */ }
        return { ok: false, reason: 'error' }
    }
}
