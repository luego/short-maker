import { Upload } from "lucide-react";

interface VideoPickerProps {
  file: File | null;
  disabled?: boolean;
  onFileSelected: (file: File | null) => void;
}

export default function VideoPicker({
  file,
  disabled,
  onFileSelected,
}: VideoPickerProps) {
  return (
    <div className="video-picker">
      <label
        htmlFor="source-video"
        className={`upload-label ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-blue-500"
        }`}
      >
        <Upload size={18} />
        <span>
          {file ? file.name : "Choose gameplay"}
          <small>MP4, MOV or MKV · up to 2 GB</small>
        </span>
      </label>
      <input
        id="source-video"
        type="file"
        accept=".mp4,.mov,.mkv,video/mp4,video/quicktime,video/x-matroska"
        disabled={disabled}
        onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
    </div>
  );
}
