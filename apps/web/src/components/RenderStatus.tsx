import { useEffect, useState } from 'react'

export default function RenderStatus({ status }: { status: string }) {
  return (
    <div className="p-4 bg-gray-100 rounded">
      <p className="font-medium">Render Status</p>
      <p>{status}</p>
    </div>
  )
}
