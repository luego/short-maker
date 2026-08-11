import { useState } from 'react'

export default function TimestampInput({ value, onChange }: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">Start Time</label>
      <input
        type="text"
        placeholder="HH:MM:SS"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded p-2 w-full"
      />
    </div>
  )
}
