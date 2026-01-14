# Examples

Example YAML source files and their pre-built HTML demos.

## Files

| File | Description |
|------|-------------|
| `london-scam.yaml` | Single-scenario social engineering demo (source) |
| `london-scam.html` | Pre-built HTML demo |
| `ir-report.yaml` | Multi-scenario IR report writing demo (source) |
| `ir-report.html` | Pre-built HTML demo |

## Viewing the Demos

Open any `.html` file directly in your browser — no server required.

## Example Descriptions

### London Scam

**Source:** [Facebook Fraud: A Transcript](https://rake.sh/2009/01/20/facebook-fraud-a-transcript/) by Rakesh Pai

A social engineering awareness demo showing how attackers use compromised social media accounts to scam victims with the "stranded traveler" pretext.

**Features demonstrated:** Single scenario with linear flow, `message` steps with left/right participant roles, `annotation` steps for educational callouts, `transition` steps for scene breaks, custom `annotationLabel`.

### IR Report Writing

**Source:** [AI Can Help You Create Good Incident Response Reports](https://zeltser.com/good-ir-reports-with-ai) by Lenny Zeltser

Three-part demo showing how AI can assist with incident response documentation:

1. **IR Report Creation** — Gathering incident details for a BEC attack
2. **IR Report Review** — Improving clarity and eliminating jargon
3. **Writing Coach** — Executive summary structure and tone guidance

**Features demonstrated:** Multiple scenarios with tab navigation, `autoAdvance` for automatic scenario progression, `codeBlock` for report text, `footnote` for supplementary information.

## Rebuilding the HTML Files

```bash
bun run src/cli.ts build examples/london-scam.yaml -o examples/london-scam.html
bun run src/cli.ts build examples/ir-report.yaml -o examples/ir-report.html
```

See the [main README](../README.md) for the complete YAML schema reference.
