import { useState } from 'react'

export default function Sidebar({ onSelect }: { onSelect: (id: number) => void }) {
  const [projects, setProjects] = useState([1, 2]) // Mock data for now

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
      <ul className="p-4">
        {projects.map((p) => (
          <li key={p}>
            <button
              onClick={() => onSelect(p)}
              className={`w-full text-left py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${p === 1 ? 'font-bold' : ''}`}
            >
              Project #{p}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
