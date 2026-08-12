import { Upload } from "lucide-react";

interface VideoPickerProps {
  file: File | null;
  previewUrl: string | null;
  disabled?: boolean;
  onFileSelected: (file: File | null) => void;
}

export default function VideoPicker({
  file,
  previewUrl,
  disabled,
  onFileSelected,
}: VideoPickerProps) {
  return (
    <div className="mb-5">
      <label className="mb-2 block text-sm font-medium" htmlFor="source-video">
        Source video
      </label>
      <label
        htmlFor="source-video"
        className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 hover:border-blue-500"
      >
        <Upload size={18} />
        {file ? file.name : "Choose an MP4, MOV, or MKV video"}
      </label>
      <input
        id="source-video"
        type="file"
        accept=".mp4,.mov,.mkv,video/mp4,video/quicktime,video/x-matroska"
        disabled={disabled}
        onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
      {previewUrl && (
        <video
          className="mt-3 aspect-video w-full rounded-md bg-black"
          controls
          src={previewUrl}
        >
          Your browser does not support video playback.
        </video>
      )}
    </div>
  );
}
