import { useState } from 'react'
import Sidebar from './Sidebar'
import CreateProjectScreen from './CreateProjectScreen'

export default function AppShell() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null)

  return (
    <div className="h-screen flex">
      <Sidebar onSelect={setSelectedProject} />
      <main className="flex-1 p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Short Maker</h1>
        {/* Placeholder for main content, will be replaced by routing later */}
        {selectedProject === null ? (
          <div className="text-gray-500">Choose a project from the sidebar.</div>
        ) : selectedProject < 0 ? (
          <CreateProjectScreen />
        ) : (
          <div>Editing Project #{selectedProject}</div>
        )}
      </main>
    </div>
  )
}
