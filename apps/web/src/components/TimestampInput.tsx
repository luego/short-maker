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
    <div className="field timestamp-field">
      <label htmlFor="start-time">Start Time</label>
      <input
        id="start-time"
        type="text"
        placeholder="MM:SS or HH:MM:SS"
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "start-time-error" : undefined}
        onChange={(e) => onChange(e.target.value)}
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
