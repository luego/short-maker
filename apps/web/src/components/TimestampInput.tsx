export default function TimestampInput({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium" htmlFor="start-time">
        Start Time
      </label>
      <input
        id="start-time"
        type="text"
        placeholder="MM:SS or HH:MM:SS"
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "start-time-error" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border p-2"
      />
      {error && (
        <p
          id="start-time-error"
          role="alert"
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
