export default function VoiceSelect({
  voices,
  selected,
  onChange,
}: {
  voices: string[];
  selected: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">Voice</label>
      <select
        value={selected ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded p-2 w-full"
      >
        {voices.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}
