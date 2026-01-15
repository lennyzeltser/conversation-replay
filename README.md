# Conversation Replay

Create premium, animated conversation demos from simple YAML. Perfect for security awareness, IR training, and communication skills education.

**"VHS for conversations"** — Define conversations declaratively, generate self-contained HTML demos that play back like high-end video interactions.

---

- [Why This Matters](#why-this-matters)
- [Quick Start](#quick-start)
- [YAML Schema](#yaml-schema)
- [Output Features](#output-features)
- [Embedding in Websites](#embedding-in-websites)
- [Multi-Scenario Demos](#multi-scenario-demos)
- [Development](#development)
- [AI Agent Quick Reference](#ai-agent-quick-reference)
- [Security](#security)
- [Author](#author)

---

## Why This Matters

Security training often involves showing how attacks unfold through conversation — phishing emails, social engineering calls, BEC attempts. Static screenshots lose the temporal element. Video production is time-consuming and hard to update.

Conversation Replay lets you:

- **Define conversations in YAML** — Easy to write, review, and version control
- **Generate self-contained HTML** — No external dependencies, works offline
- **Premium Design** — Modern "glassmorphism" UI, beautiful typography, and smooth animations out of the box
- **Embed anywhere** — Seamlessly integrates into blogs and LMS platforms with **automatic transparency**

## Quick Start

**Want to see it in action first?** Open [examples/london-scam.html](examples/london-scam.html) or [examples/ir-report.html](examples/ir-report.html) directly in your browser.

**To build your own demos:**

```bash
# Prerequisite: Bun (https://bun.sh) or Node.js 18+

# Install dependencies
bun install

# Build a demo from YAML
bun run src/cli.ts build examples/london-scam.yaml -o demo.html
```

Output:
```
Loading examples/london-scam.yaml...
Building demo.html...
Done! Generated demo.html
  Title: London Scam - Social Engineering Demo
  Scenarios: 1
    - London Scam: 17 steps (Matt (compromised account), Rakesh)
```

```bash
# Open in browser
open demo.html
```

The generated HTML is fully responsive, supports dark mode automatically, and looks great on any device.

## YAML Schema

### Basic Structure

```yaml
meta:
  title: "Demo Title"
  description: "Shown in header"
  theme: chat                    # chat | email | slack | terminal | generic
  autoAdvance: true              # Auto-advance between scenarios

scenarios:
  - id: scenario-1
    title: "Scenario Name"       # Shown in tab (if multiple scenarios)
    participants:
      - id: attacker
        label: "Scammer"
        role: left               # Messages appear on left
      - id: victim
        label: "Target"
        role: right              # Messages appear on right
    steps:
      - type: message
        from: attacker
        content: "Hey, how are you?"
```

### Step Types

| Type | Purpose | Renders As |
|------|---------|------------|
| `message` | Conversation turn | Chat bubble aligned left or right based on participant role |
| `annotation` | Educational note | Highlighted callout with vertical accent bar |
| `transition` | Scene break | Centered text card indicating time/scene change |

### Message Options

```yaml
# Basic message
- type: message
  from: attacker
  content: "Transfer the funds immediately."

# Message with code block
- type: message
  from: analyst
  content: "Here's what I found:"
  codeBlock: |
    error: unauthorized access
    source: 192.168.1.105

# Message with footnote
- type: message
  from: ai
  content: "I can help with that."
  footnote: "The AI performs a RAG search here."
```

### Meta Options

**Display & Behavior:**
```yaml
meta:
  description: "Shown below title"
  theme: chat                    # chat | email | slack | terminal | generic
  articleUrl: "/related-article" # "View Article" link in header
  annotationLabel: "Security Note"  # Label for annotations
  autoAdvance: true              # Auto-play next scenario when current ends
  hideHeaderInIframe: true       # Hide header when embedded (default: true)
```

**Custom colors (New Slate/Indigo Default Palette):**
You can override any color, but the defaults are designed for a premium look:
```yaml
meta:
  colors:
    accent: "#4f46e5"            # Indigo 600 (Buttons, links)
    pageBg: "#f8fafc"            # Slate 50 (Page background standalone)
    canvasBg: "#ffffff"          # Chat container background
    leftBg: "#eef2ff"            # Indigo 50 (Left/User bubble)
    leftBorder: "transparent"    # Border for left bubble
    rightBg: "#f1f5f9"           # Slate 100 (Right/AI bubble)
    rightBorder: "transparent"   # Border for right bubble
    tabInactiveColor: "#94a3b8"  # Slate 400
```

## Output Features

Generated HTML files include:

- **Premium UI** — Glassmorphism controls, Inter font, and refined shadows.
- **Zero dependencies** — Everything inlined.
- **Dark mode** — Automatic system preference detection and sync support.
- **Seamless Embedding** — Detects iframes and automatically removes padding/backgrounds.
- **Accessibility** — ARIA labels, keyboard navigation, reduced motion support.
- **Controls** — Floating glass bar with Play/Pause, Restart, and Speed (0.5x–4x).

## Embedding in Websites

The player is designed to look perfect when embedded.

### Automatic "Seamless" Mode
When the generated HTML detects it is running inside an `iframe`:
1.  **Removes Padding**: The outer page padding is removed.
2.  **Transparent Background**: The page background becomes transparent, blending with your website.
3.  **Hides Scrollbars**: Internal scrollbars are hidden for a "video" look, while keeping content scrollable.

### Basic Iframe Code

```html
<iframe
  src="/demos/security-awareness.html"
  style="width: 100%; height: 600px; border: none; border-radius: 12px; overflow: hidden;"
  title="Security Awareness Demo"
  loading="lazy"
></iframe>
```

### Dark Mode Sync

To sync the player's theme with your website's dark mode toggle:

```javascript
// Send a message to the iframe
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage({
  type: 'theme-change',
  theme: 'dark' // or 'light'
}, '*');
```

## Multi-Scenario Demos

Create rich, multi-part interactive stories using **Tabs**.

```yaml
scenarios:
  - id: part1
    title: "Phishing Attempt"
    steps: [...]

  - id: part2
    title: "Incident Response"
    steps: [...]

  - id: part3
    title: "Remediation"
    steps: [...]
```

- **Tabs appear automatically** at the top of the player.
- **Auto-Advance**: If `autoAdvance: true` is set, the player smoothly transitions to the next tab when a scenario finishes.

## Development

### Repository Structure

```
conversation-replay/
├── src/
│   ├── cli.ts           # CLI entry point
│   ├── parser.ts        # YAML parsing & validation
│   ├── generator.ts     # HTML generation (CSS/JS injection)
│   └── types.ts         # TypeScript definitions
├── examples/            # Demo YAML files
└── package.json
```

### Commands

```bash
# Build
bun run src/cli.ts build examples/london-scam.yaml -o demo.html

# Validate without building
bun run src/cli.ts validate examples/london-scam.yaml

# Build with options
bun run src/cli.ts build examples/london-scam.yaml -o demo.html --theme email --no-header
```

---

## AI Agent Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/types.ts` | Schema definitions. Edit this to add new YAML properties. |
| `src/generator.ts` | The core engine (~2000 lines). Generates the HTML, CSS (including glassmorphism), and runtime JS. |
| `src/parser.ts` | Input validation logic. |

### Architecture

```
YAML Input -> Parser -> Generator -> Single HTML File
```

The generator produces a **Single File Application**:
- **CSS**: Generated dynamically in `generateCss()` based on theme/colors.
- **JS**: Logic in `generateJs()` handles playback, tabs, and resizing.
- **Data**: Scenario data is injected as a JSON object constant.

---

## Security

- **No External Calls**: Generated files make ZERO network requests (fonts are loaded if available, otherwise fallback).
- **Safe Rendering**: Uses `textContent` to prevent XSS.
- **Input Validation**: Strict schema validation prevents injection during build.

## Author

**[Lenny Zeltser](https://zeltser.com)**
