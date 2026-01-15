# Conversation Replay

Create animated replays of text conversations.

After parsing the annotated conversation data you supply in a YAML file, this tool will generate a self-contained embeddable HTML file. The published conversation can help with security awareness training and other communications that involve presenting an annotated text conversation.

- [Conversation Replay](#conversation-replay)
  - [How This Is Useful](#how-this-is-useful)
  - [Installation](#installation)
    - [Run Without Installing (Recommended)](#run-without-installing-recommended)
    - [Global Install](#global-install)
    - [Install from GitHub](#install-from-github)
  - [Quick Start](#quick-start)
  - [YAML Schema](#yaml-schema)
    - [Basic Structure](#basic-structure)
    - [Step Types](#step-types)
    - [Message Options](#message-options)
    - [Meta Options](#meta-options)
  - [Output Features](#output-features)
  - [Embedding in Websites](#embedding-in-websites)
    - [Automatic "Seamless" Mode](#automatic-seamless-mode)
    - [Basic Iframe Code](#basic-iframe-code)
    - [Dark Mode Sync](#dark-mode-sync)
  - [Multi-Scenario Demos](#multi-scenario-demos)
  - [Development](#development)
    - [Repository Structure](#repository-structure)
    - [Commands](#commands)
  - [AI Agent Quick Reference](#ai-agent-quick-reference)
    - [Key Files](#key-files)
    - [Architecture](#architecture)
  - [Threat Modeling](#threat-modeling)
  - [Author](#author)


## How This Is Useful

Security training often involves showing how attacks unfold through text conversations&mdash;phishing emails, social engineering calls, BEC attempts, scammer chat interactions. Static screenshots lose the temporal element. Video production is time-consuming and hard to update.

Conversation Replay lets you:

- **Define Conversations in YAML:** Easy to create, annotate, review, and version control
- **Generate Self-Contained HTML:** No external dependencies, works offline
- **Slick Design:** Modern UI, nice typography, clean colors, and smooth animations
- **Embed Anywhere:** Seamlessly integrates into blogs and LMS platforms

To see it in action, see the replays embedded in the following articles as well as the corresponding files in the [examples folder](examples/).

* [Write Good Incident Response Reports Using Your AI Tool](https://zeltser.com/good-ir-reports-with-ai)
* [When Bots Chat With Social Network Participants
](https://zeltser.com/bots-chatting-on-social-networks)

## Installation

### Run Without Installing (Recommended)

The easiest way to use Conversation Replay&mdash;no installation required&mdash;after you create the annotated conversation file demo.yaml:

```bash
# Using npx (comes with Node.js)
npx conversation-replay build demo.yaml -o demo.html

# Using bunx (comes with Bun)
bunx conversation-replay build demo.yaml -o demo.html
```

### Global Install

For frequent use, install globally:

```bash
# Using npm
npm install -g conversation-replay

# Using Bun
bun add -g conversation-replay

# Then run directly
conversation-replay build demo.yaml -o demo.html
```

### Install from GitHub

To install the latest development version directly from GitHub:

```bash
npm install -g github:lennyzeltser/conversation-replay
```

Note: This requires [Bun](https://bun.sh) to be installed (for the build step).

## Quick Start

Create a YAML file defining your conversation, then generate the HTML:

```bash
conversation-replay build examples/london-scam.yaml -o demo.html
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

The generated replay is responsive, supports dark mode automatically, and looks nice across various browsers and devices.

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

Display & Behavior:
```yaml
meta:
  description: "Shown below title"
  theme: chat                    # chat | email | slack | terminal | generic
  articleUrl: "/related-article" # "View Article" link in header
  annotationLabel: "Security Note"  # Label for annotations
  autoAdvance: true              # Auto-play next scenario when current ends
  hideHeaderInIframe: true       # Hide header when embedded (default: true)
```

Timing & Visual:
```yaml
meta:
  timerStyle: circle             # circle | bar (countdown display style)
  cornerStyle: rounded           # rounded | straight (border radius)
  initialBlur: 1                 # Blur amount in px for initial play overlay (default: 1)
```

Custom colors (New Slate/Indigo Default Palette):
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
    annotationText: "#475569"    # Slate 600 (Annotation text color)
    annotationBorder: "#cbd5e1"  # Slate 300 (Annotation accent bar)
```

## Output Features

Generated HTML files include:

- **Zero Dependencies:** Everything inlined.
- **Dark Mode:** Automatic system preference detection and sync support.
- **Seamless Embedding:** Detects iframes and automatically removes padding/backgrounds.
- **Accessibility:** ARIA labels, keyboard navigation, reduced motion support.
- **Controls:** Floating glass bar with Play/Pause, Restart, and Speed (0.5x–4x).

## Embedding in Websites

The player is designed to look good when embedded in web pages.

### Automatic "Seamless" Mode
When the the player detects it is running inside an `iframe`:
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

Create rich, multi-part interactive stories using tabs.

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
# Install dependencies
bun install

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
| `src/generator.ts` | The core engine. Generates the HTML, CSS, and runtime JavaScript. |
| `src/parser.ts` | Input validation logic. |

### Architecture

```
YAML Input -> Parser -> Generator -> Single HTML File
```

The generator produces a Single File Application:
- **CSS**: Generated dynamically in `generateCss()` based on theme/colors.
- **JavaScript**: Logic in `generateJs()` handles playback, tabs, and resizing.
- **Data**: Scenario data is injected as a JSON object constant.

---

## Threat Modeling

- **No External Calls**: Generated files make no network requests.
- **Safe Rendering**: Uses `textContent` to mitigate XSS.
- **Input Validation**: Strict schema validation mitigates injection during build.

## Author

**[Lenny Zeltser](https://zeltser.com):** Builder of security products and programs. Teacher of those who run them.
