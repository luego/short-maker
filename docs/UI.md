# UI Guidelines

## Current editor

The project editor uses a two-column desktop layout: compact project/source
controls, a script editor and tabbed caption/voice settings on the left, and a
sticky 9:16 live preview on the right. On tablets the preview becomes a compact
horizontal card above the form. Mobile stacks the panels and keeps navigation
scrollable.

The preview uses a muted HTML video and React text overlay; script edits need no
TTS or render request. Phrase timings use a 165 words/minute planning clock,
adjusted for voice speed, and are explicitly approximate. Final captions use
Whisper timings. Font sizes and placement use the 1080x1920 output coordinates.
Style changes remain visible while playing; script/start/speed changes reset the
preview. Users can play, pause, seek, and restart. Source loading failures offer
a retry action.

Caption settings apply to export as well as preview. Voice delivery controls tune
pacing; they do not claim emotional or voice-cloning capabilities. Audio is only
generated when the user submits a render. Render settings are persisted with each
job; unfinished form edits are local component state, not saved project drafts.

## Direction

Modern, minimal creator utility.

The UI should feel closer to:

- Linear
- Raycast
- modern desktop creator tools

and less like:

- a gaming landing page
- a SaaS analytics dashboard
- CapCut
- Adobe Premiere

## Visual principles

Use:

- neutral background
- subtle borders
- clean cards
- restrained shadows
- one accent color
- medium corner radius
- compact controls
- strong typography hierarchy
- generous but not excessive whitespace

Avoid:

- glassmorphism
- glowing borders
- animated gradients
- excessive purple/blue gradients
- giant dashboard cards
- decorative charts
- unnecessary badges
- excessive rounded pills

## Suggested shell

Desktop:

```text
┌─────────────────────────────────────────────────────────────┐
│ Short Maker                                    Settings     │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│ Projects      │  Project: Roblox Rant #12                  │
│               │                                             │
│ + New         │  ┌───────────────────────┐  ┌────────────┐ │
│               │  │                       │  │ Script     │ │
│ Recent        │  │     Video Preview     │  │            │ │
│ Project A     │  │                       │  │            │ │
│ Project B     │  │                       │  │            │ │
│               │  └───────────────────────┘  └────────────┘ │
│               │                                             │
│               │  Start  08:25       Voice  Roblox Rant     │
│               │                                             │
│               │                      [ Generate Short ]      │
└───────────────┴─────────────────────────────────────────────┘
```

## Main project page

Prioritize:

1. preview
2. script
3. start timestamp
4. voice/template
5. generate button
6. render status

Do not bury the main action.

## Suggested components

```text
AppShell
Sidebar
ProjectList
VideoPreview
SourceVideoPicker
ScriptEditor
TimestampInput
VoiceSelect
TemplateSelect
RenderButton
RenderProgress
RenderPreview
Toast
ConfirmDialog
```

Do not create an internal design-system package during MVP.

Small reusable components inside `apps/web` are enough.

## Colors

Use Tailwind neutral/slate/zinc families.

Recommended approach:

- background: near-white or very dark neutral
- surface: slightly separated neutral
- text: high contrast
- secondary text: muted
- borders: subtle
- primary action: one clear accent

Support dark mode only if it is nearly free to implement.

Dark mode should not delay MVP.

## Typography

Use a clean sans-serif system.

Prefer:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

## Motion

Use minimal transitions:

- hover
- focus
- progress
- dialogs

No decorative page transitions.

## Empty state

Example:

```text
No projects yet.

Create your first Short from a gameplay video.

[ Create project ]
```

## Render state

While processing, show the actual stage:

```text
Generating voice...
Preparing video...
Creating captions...
Rendering video...
```

Prefer this over a fake percentage when exact progress is not known.

## Error state

Errors should explain the next useful action.

Bad:

```text
Render failed.
```

Better:

```text
The selected gameplay video ends before the narration finishes.
Choose an earlier start position and render again.
```

## Accessibility

Required:

- visible focus states
- proper labels
- keyboard-friendly forms
- semantic buttons
- no color-only status indicators
- readable contrast
