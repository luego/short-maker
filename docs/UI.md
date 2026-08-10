# UI Guidelines

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
