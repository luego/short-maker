export default function TemplateSelect({
  templates,
  selected,
  onChange,
}: {
  templates: string[];
  selected: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">Template</label>
      <select
        value={selected ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded p-2 w-full"
      >
        {templates.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
