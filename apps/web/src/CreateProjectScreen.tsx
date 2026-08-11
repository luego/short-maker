import { useState } from 'react'
import VideoPicker from './components/VideoPicker'
import TimestampInput from './components/TimestampInput'
import TemplateSelect from './components/TemplateSelect'
import VoiceSelect from './components/VoiceSelect'
import RenderStatus from './components/RenderStatus'

export default function CreateProjectScreen() {
  const [video, setVideo] = useState<File | null>(null)
  const [script, setScript] = useState<string>('')
  const [timestamp, setTimestamp] = useState<string>('')
  const [template, setTemplate] = useState<string>('roblox-rant')
  const [voice, setVoice] = useState<string>('default-voice')
  const [status, setStatus] = useState<string | null>(null)

  const templates = ['roblox-rant', 'example-template']
  const voices = ['default-voice', 'another-voice']

  const canGenerate = video && script.trim() !== '' // simple checks

  const handleGenerate = () => {
    setStatus('Queueing render...')
    // Simulate after delay
    setTimeout(() => {
      setStatus('Generating voice…')
      setTimeout(() => {
        setStatus('Preparing video…')
        setTimeout(() => {
          setStatus('Rendering video…')
          setTimeout(() => {
            setStatus('Completed! You can preview the render.')
          }, 2000)
        }, 1000)
      }, 500)
    }, 200)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Create New Project</h2>

      <VideoPicker onFileSelected={setVideo} />

      <TimestampInput value={timestamp} onChange={setTimestamp} />

      <TemplateSelect
        templates={templates}
        selected={template}
        onChange={setTemplate}
      />

      <VoiceSelect voices={voices} selected={voice} onChange={setVoice} />

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="script">
          Script
        </label>
        <textarea
          id="script"
          className="border rounded p-2 w-full h-32"
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Characters: {script.length}
        </p>
      </div>

      <button
        disabled={!canGenerate}
        onClick={handleGenerate}
        className={`px-4 py-2 rounded font-medium ${{
          true:
            'bg-blue-600 text-white hover:bg-blue-700',
          false: 'bg-gray-400 text-gray-200 cursor-not-allowed'
        }[canGenerate ? 'true' : 'false']}`}
      >
        Generate Short
      </button>

      {status && <RenderStatus status={status} />}
    </div>
  )
}
