import { useState } from 'react'

export default function VideoPicker({ onFileSelected }: { onFileSelected?: (file: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0]
      setFile(f ?? null)
      onFileSelected?.(f ?? null)
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">Source Video</label>
      <input type="file" accept="video/*" onChange={handleChange} className="border rounded p-2 w-full" />
      {file && (
        <p className="mt-1 text-sm text-gray-500">
          Selected: {file.name}
        </p>
      )}
    </div>
  )
}
