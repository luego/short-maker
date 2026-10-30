# macOS setup

Verified on Apple Silicon on October 30, 2026. The server runs the complete local
pipeline: audio.cpp/Kokoro narration, Whisper transcription, ASS subtitles, and
FFmpeg H.264/AAC output at 1080x1920 and 30 fps.

## Requirements

- Node.js 22 or later and the pnpm version declared in `package.json`.
- Xcode or Command Line Tools, CMake, and Homebrew.
- FFmpeg with `libx264`, AAC, and the `ass` filter.
- eSpeak NG, required by Kokoro for Spanish and English pronunciation.
- whisper.cpp and a multilingual Whisper model.

```sh
brew install ffmpeg cmake espeak-ng whisper.cpp
pnpm install
```

The checked installation uses whisper.cpp 1.9.5, eSpeak NG 1.52.0, and FFmpeg 7.1.1.
Whisper is installed separately from its model. No Python backend is required.

## audio.cpp

Run the commands below from the repository root. `tools/runtime/` is ignored by
Git, ESLint, and Prettier and contains downloaded source, binaries, and models.
Keep this directory when cleaning build artifacts.

```sh
git clone --depth 1 --recurse-submodules --shallow-submodules https://github.com/0xShug0/audio.cpp.git tools/runtime/audio.cpp
cmake -S tools/runtime/audio.cpp -B tools/runtime/audio.cpp/build -DCMAKE_BUILD_TYPE=Release -DAUDIOCPP_MODEL_SET=custom -DAUDIOCPP_MODELS=kokoro_tts -DAUDIOCPP_DEPLOYMENT_BUILD=ON -DENGINE_ENABLE_METAL=OFF -DENGINE_ENABLE_OPENMP=OFF
cmake --build tools/runtime/audio.cpp/build --target audiocpp_cli -j 6
```

The verified source commit is `350670db7ff64864e5c66c794e6c4b0d3dc98d2f`.
The build uses CPU/Apple Accelerate. Deployment mode embeds the model contract so
the executable works when Express runs from `apps/server`, outside audio.cpp's
source directory. eSpeak NG's Homebrew library/data are discovered automatically.

## Models

Download Kokoro Q8 with its packaged voices and the multilingual Whisper base
model. Use `base`, not `base.en`, for Spanish support.

```sh
curl -L --fail --retry 3 --create-dirs -o tools/runtime/models/kokoro-82m-q8_0.gguf https://huggingface.co/audio-cpp/audio.cpp-gguf/resolve/main/Kokoro-82M-GGUF/kokoro-82m-q8_0.gguf
curl -L --fail --retry 3 --create-dirs -o tools/runtime/models/ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

Together these downloads are approximately 323 MiB. Checksums of the verified files:

| File | SHA-256 |
| --- | --- |
| `kokoro-82m-q8_0.gguf` | `9a4ca6176460cdc8c7845b804c0bbe85a4791ee3ffff568a3fdadbb708c63f47` |
| `ggml-base.bin` | `60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe` |

## Server configuration

Create `apps/server/.env` from `.env.example`. Set absolute paths using your own
checkout location; Windows `.exe` paths cannot be reused on macOS.

```dotenv
PORT=4300
DB_FILE_NAME=file:./data/app.db
FFMPEG_PATH=/opt/homebrew/bin/ffmpeg
FFPROBE_PATH=/opt/homebrew/bin/ffprobe
AUDIO_CPP_PATH=/absolute/path/to/short-maker/tools/runtime/audio.cpp/build/bin/audiocpp_cli
AUDIO_CPP_MODEL_PATH=/absolute/path/to/short-maker/tools/runtime/models/kokoro-82m-q8_0.gguf
WHISPER_CPP_PATH=/opt/homebrew/bin/whisper-cli
WHISPER_MODEL_PATH=/absolute/path/to/short-maker/tools/runtime/models/ggml-base.bin
```

Use `brew --prefix` to check the Homebrew location; Intel Macs usually use a
different prefix. Restart `pnpm dev` after changing `.env`. The server applies
pending SQLite migrations at startup; existing projects remain in the database.

## Verification

```sh
tools/runtime/audio.cpp/build/bin/audiocpp_cli --list-loaders
ffmpeg -hide_banner -filters
whisper-cli --help
pnpm test
pnpm build
pnpm lint
pnpm dev
```

Import a video, enter a short Spanish script, select `em_alex`, set a start time
with enough video remaining, and generate. `em_alex`, `ef_dora`, and `em_santa`
are Spanish; `af_heart` and `am_adam` are English. Kokoro derives the language from
the voice. The old `default-voice` ID maps to `em_alex` for compatibility.

An actual Spanish render reached `completed` through the running API on this Mac.
Narration and exported MP4 remain under `apps/server/media/`; original videos are
preserved. Caption working files are removed by the pipeline. Uploaded projects
created on another machine may need their original videos reimported if those
ignored media files were not copied.

If generation reports `TTS_UNAVAILABLE`, check both audio.cpp paths. If it reports
`WHISPER_UNAVAILABLE`, check the Whisper executable and model paths. A
`SOURCE_VIDEO_TOO_SHORT` error means the narration extends beyond the selected
video segment; choose an earlier start or a longer source.
