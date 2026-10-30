import { useEffect, useMemo, useRef, useState } from "react";
import {
  Captions,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  VolumeX,
} from "lucide-react";
import type { CaptionSettings } from "@short-maker/shared";
import { buildPreviewCaptions, previewTime } from "../preview-captions";

export default function CaptionPreview({
  sourceUrl,
  sourceDuration,
  startSeconds,
  script,
  speed,
  settings,
}: {
  sourceUrl: string | null;
  sourceDuration?: number | null;
  startSeconds: number;
  script: string;
  speed: number;
  settings: CaptionSettings;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const cues = useMemo(
    () => buildPreviewCaptions(script, speed),
    [script, speed],
  );
  const estimatedDuration = cues.at(-1)?.end ?? 0;
  const available =
    sourceUrl && sourceDuration != null
      ? Math.max(0, sourceDuration - startSeconds)
      : estimatedDuration;
  const duration = Math.min(estimatedDuration, available);
  const currentCue =
    cues.find((cue) => time >= cue.start && time < cue.end) ??
    (time === duration && time > 0
      ? cues.find((cue) => cue.start < time && cue.end >= time)
      : undefined);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setPlaybackError(null);
    if (video.current) {
      video.current.pause();
      if (
        video.current.readyState >= 1 &&
        startSeconds < video.current.duration
      )
        video.current.currentTime = startSeconds;
    }
  }, [script, speed, startSeconds, sourceUrl]);

  useEffect(() => {
    if (!playing) {
      video.current?.pause();
      return;
    }
    let cancelled = false;
    let frame = 0;
    const origin = performance.now();
    const initialTime = time;
    const update = (now: number) => {
      if (cancelled) return;
      const next = initialTime + (now - origin) / 1000;
      setTime(Math.max(0, Math.min(next, duration)));
      if (next >= duration) setPlaying(false);
      else frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      video.current?.pause();
    };
    // Time is captured when playback starts; adding it would restart every frame.
  }, [playing, duration, startSeconds, sourceUrl]);

  const seek = (next: number) => {
    video.current?.pause();
    setPlaying(false);
    setTime(next);
    if (
      video.current?.readyState &&
      startSeconds + next < video.current.duration
    )
      video.current.currentTime = startSeconds + next;
  };

  const togglePlayback = () => {
    if (playing) {
      video.current?.pause();
      setPlaying(false);
      return;
    }
    const next = time >= duration ? 0 : time;
    setTime(next);
    // Start media in the click gesture so WebKit does not defer playback.
    const element = video.current;
    if (element) {
      if (Math.abs(element.currentTime - startSeconds - next) > 0.05)
        element.currentTime = startSeconds + next;
      void element.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (video.current !== element || element.ended) return;
        setPlaying(false);
        setPlaybackError(
          "This video could not play. Try an MP4 compatible with your browser.",
        );
      });
    }
    setPlaying(true);
  };

  return (
    <section className="preview-panel" aria-label="Live caption preview">
      <div className="preview-heading">
        <div>
          <span className="eyebrow">LIVE PREVIEW</span>
          <h2>Your short, taking shape.</h2>
        </div>
        <span className="format-tag">
          <Maximize2 size={12} />
          9:16
        </span>
      </div>
      <div className="preview-stage" style={{ containerType: "inline-size" }}>
        {sourceUrl ? (
          <video
            ref={video}
            src={sourceUrl}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={() => {
              setPlaybackError(null);
              if (video.current && startSeconds < video.current.duration)
                video.current.currentTime = startSeconds;
            }}
            onEnded={() => setPlaying(false)}
            onError={() =>
              setPlaybackError(
                "Unable to load this source video. Check the file or import it again.",
              )
            }
            aria-label="Muted source video"
          />
        ) : (
          <div className="preview-empty">
            <Captions size={28} strokeWidth={1.5} />
            <p>Your canvas is ready.</p>
            <span>
              Add gameplay to see it here.
              <br />
              You can style your captions now.
            </span>
          </div>
        )}
        <div className="preview-topline">
          <span>ROBLOX RANT</span>
          <VolumeX size={14} aria-label="Silent preview" />
        </div>
        {(currentCue || script.trim()) && (
          <div
            className={`preview-captions ${settings.position === "lower" ? "preview-captions-lower" : ""}`}
            style={{
              fontFamily: settings.fontFamily,
              fontSize: `${settings.fontSize / 10.8}cqw`,
              color: settings.color === "yellow" ? "#ffff00" : "#ffffff",
              WebkitTextStroke: `${(settings.outline * 2) / 10.8}cqw #000`,
            }}
            aria-label="Caption text"
          >
            {currentCue?.text ?? cues[0]?.text}
          </div>
        )}
        <div className="preview-bottomline">
          <span>1080 × 1920</span>
          <span>30 FPS</span>
        </div>
      </div>
      <div className="preview-transport">
        <button
          type="button"
          className="icon-button"
          disabled={!duration || Boolean(playbackError)}
          aria-label={playing ? "Pause preview" : "Play preview"}
          onClick={togglePlayback}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <span className="preview-time">{previewTime(time)}</span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.05}
          value={time}
          disabled={!duration}
          aria-label="Preview position"
          onChange={(event) => seek(Number(event.target.value))}
        />
        <span className="preview-time">{previewTime(duration)}</span>
        <button
          type="button"
          className="icon-button"
          aria-label="Restart preview"
          onClick={() => seek(0)}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      {playbackError && (
        <div className="preview-load-error">
          <p role="alert" className="form-error">
            {playbackError}
          </p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setPlaybackError(null);
              setPlaying(false);
              setTime(0);
              video.current?.load();
            }}
          >
            Retry video
          </button>
        </div>
      )}
      <div className="preview-note">
        <VolumeX size={15} />
        <p>
          <strong>Style first. Voice later.</strong>
          <br />
          Silent preview with estimated timing. Final captions sync to the
          generated voice; line breaks may differ.
        </p>
      </div>
    </section>
  );
}
