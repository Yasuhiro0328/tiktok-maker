import { GenerateRequest } from '../types'

const BASE = '/api'

export async function uploadImages(files: File[]): Promise<{ fileId: string; filename: string }[]> {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.files
}

export async function startGenerate(req: GenerateRequest): Promise<string> {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.jobId
}

export async function getStatus(jobId: string): Promise<{ status: string; progress: number; error?: string }> {
  const res = await fetch(`${BASE}/status/${jobId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function getDownloadUrl(jobId: string): string {
  return `${BASE}/download/${jobId}`
}

export async function searchMusic(query: string): Promise<any[]> {
  const res = await fetch(`${BASE}/music/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.tracks || []
}
