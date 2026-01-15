/**
 * Schema utilities for conversation-replay
 *
 * Provides:
 * - YAML template generation for `init` command
 * - JSON Schema for IDE autocomplete
 * - Schema reference output for `schema` command
 */

import type { Theme } from './types';

/**
 * Generate a starter YAML template with inline documentation
 */
export function generateTemplate(theme?: Theme): string {
  const selectedTheme = theme || 'chat';

  return `# Conversation Replay - Demo Configuration
# Documentation: https://github.com/lennyzeltser/conversation-replay
#
# Run: conversation-replay build this-file.yaml -o output.html
# Validate: conversation-replay validate this-file.yaml

meta:
  title: "My Demo Title"                    # Required: shown in header
  description: "A brief description"        # Optional: shown below title
  theme: ${selectedTheme}                            # chat | email | slack | terminal | generic
  # articleUrl: "/related-article"          # Optional: "View Article" link
  # annotationLabel: "Behind the Scenes"    # Label for annotation steps
  # autoAdvance: true                        # Auto-play next scenario when current ends

  # Timer and visual style
  # timerStyle: circle                       # circle | bar
  # cornerStyle: rounded                     # rounded | straight
  # initialBlur: 1                           # Blur amount for play overlay (px)

  # Custom colors (all optional)
  # colors:
  #   accent: "#4f46e5"                      # Buttons, links (Indigo 600)
  #   pageBg: "#f8fafc"                      # Page background (Slate 50)
  #   canvasBg: "#ffffff"                    # Chat container background
  #   leftBg: "#eef2ff"                      # Left bubble background (Indigo 50)
  #   leftBorder: "transparent"              # Left bubble border
  #   rightBg: "#f1f5f9"                     # Right bubble background (Slate 100)
  #   rightBorder: "transparent"             # Right bubble border
  #   annotationText: "#475569"              # Annotation text (Slate 600)
  #   annotationBorder: "#cbd5e1"            # Annotation accent bar (Slate 300)

  # Timing configuration (all in milliseconds)
  # speed:
  #   minDelay: 3000                         # Minimum delay between steps
  #   maxDelay: 8000                         # Maximum delay between steps
  #   msPerWord: 200                         # Reading time per word
  #   annotationMultiplier: 1.15             # Extra time for annotations
  #   upNextDelay: 2500                      # "Up Next" display time

scenarios:
  - id: main
    title: "Scenario Title"                  # Shown in tab (if multiple scenarios)

    participants:
      - id: user1
        label: "Person A"
        role: left                           # Messages appear on left
      - id: user2
        label: "Person B"
        role: right                          # Messages appear on right

    steps:
      # Message from a participant
      - type: message
        from: user1                          # Must match a participant id
        content: "Hello! This is a sample message."

      - type: message
        from: user2
        content: "Hi there! Here's a response."
        # footnote: "Optional italic footnote below the message"

      # Message with code block
      # - type: message
      #   from: user2
      #   content: "Here's some code:"
      #   codeBlock: |
      #     function example() {
      #       return "hello";
      #     }

      # Annotation - educational callout with accent bar
      - type: annotation
        content: "This annotation explains something to the viewer."

      # Transition - centered scene break
      # - type: transition
      #   content: "Later that day..."

  # Additional scenarios appear as tabs
  # - id: part2
  #   title: "Part Two"
  #   participants:
  #     - id: analyst
  #       label: "Analyst"
  #       role: left
  #   steps:
  #     - type: message
  #       from: analyst
  #       content: "This is another scenario."
`;
}

/**
 * JSON Schema for conversation-replay YAML files
 */
export const jsonSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/lennyzeltser/conversation-replay/schema.json",
  "title": "Conversation Replay Demo",
  "description": "Schema for conversation-replay YAML configuration files",
  "type": "object",
  "required": ["meta", "scenarios"],
  "properties": {
    "meta": {
      "type": "object",
      "description": "Demo metadata and configuration",
      "required": ["title"],
      "properties": {
        "title": {
          "type": "string",
          "description": "Demo title shown in header",
          "minLength": 1
        },
        "description": {
          "type": "string",
          "description": "Brief description shown below title"
        },
        "theme": {
          "type": "string",
          "enum": ["chat", "email", "slack", "terminal", "generic"],
          "description": "Visual theme for message styling",
          "default": "chat"
        },
        "articleUrl": {
          "type": "string",
          "description": "URL for 'View Article' link in header"
        },
        "hideHeaderInIframe": {
          "type": "boolean",
          "description": "Auto-hide header when embedded in iframe",
          "default": true
        },
        "autoAdvance": {
          "type": "boolean",
          "description": "Auto-play next scenario when current one completes"
        },
        "annotationLabel": {
          "type": "string",
          "description": "Label shown above annotation content",
          "default": "Behind the Scenes"
        },
        "timerStyle": {
          "type": "string",
          "enum": ["bar", "circle"],
          "description": "Countdown timer display style",
          "default": "circle"
        },
        "cornerStyle": {
          "type": "string",
          "enum": ["rounded", "straight"],
          "description": "Border radius style for containers and bubbles",
          "default": "rounded"
        },
        "initialBlur": {
          "type": "number",
          "description": "Blur amount in pixels for play overlay",
          "default": 1,
          "minimum": 0
        },
        "colors": {
          "type": "object",
          "description": "Custom color overrides",
          "properties": {
            "accent": { "type": "string", "description": "Primary accent color (buttons, links)" },
            "pageBg": { "type": "string", "description": "Page background color" },
            "canvasBg": { "type": "string", "description": "Chat container background" },
            "leftBg": { "type": "string", "description": "Left participant bubble background" },
            "leftBorder": { "type": "string", "description": "Left participant bubble border" },
            "rightBg": { "type": "string", "description": "Right participant bubble background" },
            "rightBorder": { "type": "string", "description": "Right participant bubble border" },
            "tabInactiveColor": { "type": "string", "description": "Inactive tab text color" },
            "annotationText": { "type": "string", "description": "Annotation text color" },
            "annotationBorder": { "type": "string", "description": "Annotation accent bar color" }
          }
        },
        "speed": {
          "type": "object",
          "description": "Timing configuration for playback",
          "properties": {
            "minDelay": { "type": "number", "description": "Minimum delay between steps (ms)", "default": 3000 },
            "maxDelay": { "type": "number", "description": "Maximum delay between steps (ms)", "default": 8000 },
            "msPerWord": { "type": "number", "description": "Milliseconds per word for reading time", "default": 200 },
            "annotationMultiplier": { "type": "number", "description": "Time multiplier for annotations", "default": 1.15 },
            "upNextDelay": { "type": "number", "description": "'Up Next' display duration (ms)", "default": 2500 }
          }
        }
      }
    },
    "scenarios": {
      "type": "array",
      "description": "One or more conversation scenarios (shown as tabs if multiple)",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "title", "participants", "steps"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique identifier for this scenario",
            "minLength": 1
          },
          "title": {
            "type": "string",
            "description": "Display title (shown in tab)",
            "minLength": 1
          },
          "participants": {
            "type": "array",
            "description": "People/entities in this conversation",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["id", "label"],
              "properties": {
                "id": {
                  "type": "string",
                  "description": "Unique identifier (referenced in message 'from' field)"
                },
                "label": {
                  "type": "string",
                  "description": "Display name shown above messages"
                },
                "role": {
                  "type": "string",
                  "enum": ["left", "right"],
                  "description": "Which side messages appear on",
                  "default": "left"
                }
              }
            }
          },
          "steps": {
            "type": "array",
            "description": "Sequence of messages, annotations, and transitions",
            "minItems": 1,
            "items": {
              "oneOf": [
                {
                  "type": "object",
                  "description": "A message from a participant",
                  "required": ["type", "from", "content"],
                  "properties": {
                    "type": { "const": "message" },
                    "from": { "type": "string", "description": "Participant ID" },
                    "content": { "type": "string", "description": "Message text" },
                    "codeBlock": { "type": "string", "description": "Optional code/preformatted text" },
                    "footnote": { "type": "string", "description": "Optional italic footnote" }
                  }
                },
                {
                  "type": "object",
                  "description": "An educational annotation/callout",
                  "required": ["type", "content"],
                  "properties": {
                    "type": { "const": "annotation" },
                    "content": { "type": "string", "description": "Annotation text" }
                  }
                },
                {
                  "type": "object",
                  "description": "A scene break/transition",
                  "required": ["type", "content"],
                  "properties": {
                    "type": { "const": "transition" },
                    "content": { "type": "string", "description": "Transition text (e.g., 'Later that day...')" }
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
};

/**
 * Generate human-readable schema reference for CLI output
 */
export function getSchemaReference(section?: string): string {
  if (section === 'meta') {
    return `
META OPTIONS
============

Required:
  title: string              Demo title shown in header

Optional:
  description: string        Brief description below title
  theme: string              chat | email | slack | terminal | generic (default: chat)
  articleUrl: string         URL for "View Article" link
  annotationLabel: string    Label for annotations (default: "Behind the Scenes")
  autoAdvance: boolean       Auto-play next scenario when current ends
  hideHeaderInIframe: bool   Auto-hide header when embedded (default: true)
  timerStyle: string         circle | bar (default: circle)
  cornerStyle: string        rounded | straight (default: rounded)
  initialBlur: number        Play overlay blur in px (default: 1)
  colors: object             Custom color overrides (see: schema colors)
  speed: object              Timing configuration (see: schema speed)
`;
  }

  if (section === 'colors') {
    return `
COLOR OPTIONS (meta.colors)
===========================

All colors are optional CSS color values (hex, rgb, named colors, etc.)

  accent: string             Buttons, links (default: #4f46e5)
  pageBg: string             Page background (default: #f8fafc)
  canvasBg: string           Chat container background (default: #ffffff)
  leftBg: string             Left bubble background (default: #eef2ff)
  leftBorder: string         Left bubble border (default: transparent)
  rightBg: string            Right bubble background (default: #f1f5f9)
  rightBorder: string        Right bubble border (default: transparent)
  tabInactiveColor: string   Inactive tab text (default: #94a3b8)
  annotationText: string     Annotation text (default: #475569)
  annotationBorder: string   Annotation accent bar (default: #cbd5e1)
`;
  }

  if (section === 'speed') {
    return `
SPEED OPTIONS (meta.speed)
==========================

All values are in milliseconds.

  minDelay: number           Minimum delay between steps (default: 3000)
  maxDelay: number           Maximum delay between steps (default: 8000)
  msPerWord: number          Reading time per word (default: 200)
  annotationMultiplier: num  Extra time multiplier for annotations (default: 1.15)
  upNextDelay: number        "Up Next" indicator duration (default: 2500)
`;
  }

  if (section === 'steps') {
    return `
STEP TYPES
==========

MESSAGE - A chat bubble from a participant
  type: message              (required)
  from: string               Participant ID (required)
  content: string            Message text (required)
  codeBlock: string          Optional preformatted code block
  footnote: string           Optional italic footnote

ANNOTATION - Educational callout with accent bar
  type: annotation           (required)
  content: string            Annotation text (required)

TRANSITION - Centered scene break
  type: transition           (required)
  content: string            Transition text (required)
`;
  }

  // Full schema reference
  return `
CONVERSATION REPLAY SCHEMA
==========================

STRUCTURE
---------
meta:                        Demo configuration (see: schema meta)
scenarios:                   Array of conversation scenarios

SCENARIO
--------
  id: string                 Unique identifier (required)
  title: string              Display title for tab (required)
  participants: array        People in conversation (required)
  steps: array               Message/annotation sequence (required)

PARTICIPANT
-----------
  id: string                 Unique ID, used in message 'from' field (required)
  label: string              Display name shown above messages (required)
  role: string               left | right (default: left)

STEP TYPES
----------
  message                    Chat bubble (requires: from, content)
  annotation                 Educational callout (requires: content)
  transition                 Scene break (requires: content)

Use 'schema <section>' for details:
  schema meta                Meta/configuration options
  schema colors              Color customization
  schema speed               Timing configuration
  schema steps               Step type details
`;
}
