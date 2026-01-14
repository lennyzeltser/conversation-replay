# Conversation Replay

Create animated conversation demos from YAML for security awareness, IR training, and communication skills education.

**"VHS for conversations"** — Define conversations declaratively, generate self-contained HTML demos that play back like videos.

---

- [Why This Matters](#why-this-matters)
- [Quick Start](#quick-start)
- [YAML Schema](#yaml-schema)
- [Output Features](#output-features)
- [Embedding in Websites](#embedding-in-websites)
- [Use Cases](#use-cases)
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
- **Embed anywhere** — Drop into articles, training materials, or presentations
- **Update easily** — Change the YAML, regenerate the HTML

## Quick Start

**Want to see it in action first?** Open [examples/london-scam.html](examples/london-scam.html) or [examples/ir-report.html](examples/ir-report.html) directly in your browser — no build step required.

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

The generated HTML is completely self-contained — CSS, JavaScript, and content are all inlined. No external dependencies, works offline.

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
  content: "Here's what I found in the logs:"
  codeBlock: |
    error: unauthorized access attempt
    source: 192.168.1.105
    timestamp: 2024-01-15T14:23:00Z

# Message with footnote
- type: message
  from: ai
  content: "I can help with that."
  footnote: "The AI retrieves context from the MCP server"
```

### Meta Options

**Required:**
- `title` — Demo title shown in header

**Display options:**
```yaml
meta:
  description: "Shown below title"
  theme: chat                    # chat | email | slack | terminal | generic
  articleUrl: "/related-article" # "View Article" link in header
  annotationLabel: "Security Note"  # Label for annotations (default: "Behind the Scenes")
  timerStyle: circle             # circle | bar (progress indicator style)
  cornerStyle: rounded           # rounded | straight (bubble corners)
```

**Behavior options:**
```yaml
meta:
  autoAdvance: true              # Auto-play next scenario when current ends
  hideHeaderInIframe: true       # Hide header when embedded (default: true)
```

**Custom colors:**
```yaml
meta:
  colors:
    accent: "#1a45bc"            # Buttons, links
    pageBg: "#f6f7f9"            # Page background (standalone mode)
    canvasBg: "#ffffff"          # Chat container background
    leftBg: "#e0f2fe"            # Left participant bubble background
    leftBorder: "#7dd3fc"        # Left participant bubble border
    rightBg: "#f0fdf4"           # Right participant bubble background
    rightBorder: "#86efac"       # Right participant bubble border
    tabInactiveColor: "#666666"  # Inactive tab text
```

**Timing configuration:**
```yaml
meta:
  speed:
    minDelay: 3000               # Minimum pause between steps (ms)
    maxDelay: 8000               # Maximum pause between steps (ms)
    msPerWord: 200               # Reading time per word
    annotationMultiplier: 1.15   # Extra time multiplier for annotations
    upNextDelay: 2500            # How long to show "Up Next" before transitioning
```

### Multi-Scenario Demos

When you define multiple scenarios, they appear as tabs:

```yaml
scenarios:
  - id: create
    title: "Creating Reports"
    # ...steps...

  - id: review
    title: "Reviewing Reports"
    # ...steps...

  - id: tips
    title: "Writing Tips"
    # ...steps...
```

With `autoAdvance: true`, the demo automatically transitions between scenarios.

## Output Features

Generated HTML files include:

- **Zero external dependencies** — Everything inlined
- **Dark mode support** — Respects `prefers-color-scheme` and syncs with parent page
- **Responsive design** — Fills screen standalone, fixed height when embedded
- **Accessibility** — Respects `prefers-reduced-motion`, includes ARIA labels, keyboard navigation
- **Playback controls** — Play/pause, restart, speed selector (0.5x–4x)
- **Tab navigation** — Arrow keys navigate between scenario tabs
- **Progress indicator** — Timer and step counter

## Embedding in Websites

### Basic Iframe

```html
<iframe
  src="/demos/security-awareness.html"
  style="width:100%; height:650px; border:none; border-radius:8px;"
  loading="lazy"
></iframe>
```

### Dark Mode Sync

The demo automatically respects `prefers-color-scheme`. If your site has a manual dark mode toggle, sync it to the iframe:

```javascript
// When your page toggles dark mode
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage({
  type: 'theme-change',
  theme: 'dark' // or 'light'
}, '*');

// On page load, sync initial theme
iframe.addEventListener('load', function() {
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  iframe.contentWindow.postMessage({ type: 'theme-change', theme }, '*');
});
```

### Behavior Differences

| Context | Behavior |
|---------|----------|
| **Standalone** | Chat fills available screen height, header visible |
| **Embedded (iframe)** | Fixed height, transparent background, header hidden |

## Use Cases

- **Social engineering awareness** — Show how scams unfold over time ([example](examples/london-scam.html))
- **IR training** — Demonstrate incident communication patterns ([example](examples/ir-report.html))
- **Communication skills** — Good vs. bad professional dialogue
- **Tool demos** — Showcase AI/chatbot interactions
- **Phishing education** — Step-by-step attack anatomy

## Development

### Repository Structure

```
conversation-replay/
├── src/
│   ├── cli.ts           # CLI entry point (build, validate commands)
│   ├── parser.ts        # YAML parsing and validation
│   ├── generator.ts     # HTML generation with embedded CSS/JS
│   └── types.ts         # TypeScript type definitions
├── examples/
│   ├── README.md             # Examples documentation
│   ├── london-scam.yaml      # Single-scenario demo (source)
│   ├── london-scam.html      # Pre-built HTML demo
│   ├── ir-report.yaml   # Multi-scenario demo (source)
│   └── ir-report.html   # Pre-built HTML demo
├── package.json
└── tsconfig.json
```

See [examples/README.md](examples/README.md) for detailed descriptions of each demo.

### Commands

```bash
# Build a demo
bun run src/cli.ts build examples/london-scam.yaml -o demo.html

# Validate scenario without building (catches errors before generation)
bun run src/cli.ts validate examples/london-scam.yaml

# Build with different theme
bun run src/cli.ts build examples/london-scam.yaml -o demo.html --theme email

# Build without header
bun run src/cli.ts build examples/london-scam.yaml -o demo.html --no-header
```

### CLI Reference

```
conversation-replay build <scenario.yaml> -o <output.html> [options]
conversation-replay validate <scenario.yaml>

Options:
  -o, --output <path>   Output HTML file (required for build)
  --theme <theme>       Override theme: chat, email, slack, terminal, generic
  --no-header           Exclude the demo header
  -h, --help            Show help
```

### Adding New Themes

1. Add theme name to `VALID_THEMES` in `src/types.ts`
2. Add CSS variables in `generateCss()` in `src/generator.ts`
3. Theme is automatically available via `--theme` CLI option

---

## AI Agent Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/types.ts` | TypeScript interfaces defining YAML schema |
| `src/parser.ts` | YAML parsing with validation (color sanitization, type checking) |
| `src/generator.ts` | HTML generation with embedded CSS/JS (~1700 lines) |
| `src/cli.ts` | CLI interface |

### Architecture

```
YAML Input → Parser (validation) → Generator (HTML/CSS/JS) → Self-contained HTML
```

The generator produces a single HTML file with:
- All CSS in a `<style>` tag
- All JavaScript in a `<script>` tag
- Scenario data embedded as JavaScript objects

### Common Tasks

**Add a new meta option:**
1. Add to interface in `src/types.ts`
2. Add validation in `src/parser.ts`
3. Use in `src/generator.ts`

**Modify CSS:**
- Edit the template strings in `generateCss()` in `src/generator.ts`

**Modify JavaScript behavior:**
- Edit the template string in `generateJs()` in `src/generator.ts`

### Validation

Run `bun run src/cli.ts validate <file.yaml>` to check a scenario without building. The parser validates:

- Required fields (title, scenarios, participants, steps)
- Type constraints (theme, timerStyle, cornerStyle must be valid enum values)
- Color values (blocks CSS injection via semicolons, braces, url())
- Speed config (numeric values, minDelay ≤ maxDelay)
- Participant references (step.from must match a participant.id)
- Unique IDs (no duplicate scenario or participant IDs)

---

## Security

### Input Validation

The parser validates all input to prevent:
- **CSS injection** — Color values checked against allowlist of valid formats
- **XSS via links** — Markdown links block `javascript:`, `data:`, `vbscript:` URLs
- **Invalid configurations** — Type checking for all enum values

### Output Security

Generated HTML:
- Uses `textContent` for all dynamic content (no `innerHTML` with user data)
- Self-contained with no external resource loading
- No cookies or local storage (except theme preference)

### Threat Model

This tool generates static HTML from trusted YAML input. Consider:
- YAML files should be treated as code (review before building)
- Generated HTML is safe to host publicly
- No server-side execution — pure static output

---

## Author

**[Lenny Zeltser](https://zeltser.com)**: Builder of security products and programs. Teacher of those who run them.

