/**
 * Conversation Replay - HTML Generator
 *
 * Generates self-contained HTML files from demo definitions.
 * Supports multi-scenario demos with tabs.
 *
 * Security: All dynamic content is rendered using safe DOM methods (textContent,
 * createElement) - no innerHTML with untrusted content.
 */

import { writeFile } from 'node:fs/promises';
import packageJson from '../package.json';

const VERSION = packageJson.version;
import type { Demo, Scenario, Step, Participant, Theme, BuildOptions, ColorConfig, TimerStyle, CornerStyle, SpeedConfig } from './types';

/**
 * Escape HTML special characters for static content only
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate URL is safe (not javascript:, data:, etc.)
 */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  // Block dangerous protocols
  if (trimmed.startsWith('javascript:')) return false;
  if (trimmed.startsWith('data:')) return false;
  if (trimmed.startsWith('vbscript:')) return false;
  // Allow http, https, mailto, tel, and relative URLs
  return true;
}

/**
 * Parse markdown-style links in text: [text](url) -> <a href="url">text</a>
 * Text is HTML-escaped first, then links are converted.
 * Dangerous URLs (javascript:, data:, etc.) are rendered as plain text.
 */
function parseMarkdownLinks(text: string): string {
  return escapeHtml(text).replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, linkText, url) => {
      if (isSafeUrl(url)) {
        return `<a href="${escapeHtml(url)}">${linkText}</a>`;
      }
      // Render dangerous URLs as plain text (already escaped)
      return match;
    }
  );
}

/**
 * Convert scenario steps to JavaScript object notation
 */
function stepsToJs(scenario: Scenario): string {
  const participantMap = new Map(
    scenario.participants.map(p => [p.id, p])
  );

  const jsSteps = scenario.steps.map(step => {
    if (step.type === 'annotation') {
      return `{ type: "annotation", plainText: ${JSON.stringify(step.content)} }`;
    }

    if (step.type === 'transition') {
      return `{ type: "transition", plainText: ${JSON.stringify(step.content)} }`;
    }

    // Message step
    const participant = participantMap.get(step.from)!;
    const role = participant.role === 'left' ? 'user' : 'ai';

    let js = `{ type: ${JSON.stringify(role)}, plainText: ${JSON.stringify(step.content)}`;

    if (step.codeBlock) {
      js += `, codeBlock: ${JSON.stringify(step.codeBlock)}`;
    }

    if (step.footnote) {
      js += `, footnote: ${JSON.stringify(step.footnote)}`;
    }

    js += ' }';
    return js;
  });

  return `[${jsSteps.join(', ')}]`;
}

/**
 * Get participant labels for a scenario
 */
function getParticipantLabels(scenario: Scenario): { left: string; right: string } {
  const left = scenario.participants.find(p => p.role === 'left');
  const right = scenario.participants.find(p => p.role === 'right');

  return {
    left: left?.label ?? 'User',
    right: right?.label ?? 'Assistant',
  };
}

/**
 * Generate scenarios JavaScript object
 */
function generateScenariosJs(demo: Demo): string {
  const scenarioEntries = demo.scenarios.map(scenario => {
    const labels = getParticipantLabels(scenario);
    return `
        ${JSON.stringify(scenario.id)}: {
          title: ${JSON.stringify(scenario.title)},
          labels: { user: ${JSON.stringify(labels.left)}, ai: ${JSON.stringify(labels.right)} },
          steps: ${stepsToJs(scenario)}
        }`;
  });

  return `{${scenarioEntries.join(',')}\n      }`;
}

/**
 * Generate custom color CSS overrides
 */
function generateColorOverrides(colors?: ColorConfig): string {
  if (!colors) return '';

  const overrides: string[] = [];

  if (colors.accent) {
    overrides.push(`--accent: ${colors.accent};`);
  }
  if (colors.pageBg) {
    overrides.push(`--bg-primary: ${colors.pageBg};`);
  }
  if (colors.canvasBg) {
    overrides.push(`--bg-chat: ${colors.canvasBg};`);
  }
  if (colors.leftBg) {
    overrides.push(`--user-bg: ${colors.leftBg};`);
  }
  if (colors.leftBorder) {
    overrides.push(`--user-border: ${colors.leftBorder};`);
  }
  if (colors.rightBg) {
    overrides.push(`--ai-bg: ${colors.rightBg};`);
  }
  if (colors.rightBorder) {
    overrides.push(`--ai-border: ${colors.rightBorder};`);
  }
  if (colors.tabInactiveColor) {
    overrides.push(`--tab-inactive-color: ${colors.tabInactiveColor};`);
  }
  if (colors.annotationText) {
    overrides.push(`--annotation-text: ${colors.annotationText};`);
  }
  if (colors.annotationBorder) {
    overrides.push(`--annotation-border: ${colors.annotationBorder};`);
  }

  if (overrides.length === 0) return '';

  return `
    :root {
      ${overrides.join('\n      ')}
    }
  `;
}

/**
 * Generate the CSS for the demo player
 */
function generateCss(theme: Theme, hasMultipleScenarios: boolean, colors?: ColorConfig, cornerStyle?: CornerStyle, initialBlur?: number): string {
  const colorOverrides = generateColorOverrides(colors);
  const radius = cornerStyle === 'straight' ? '0' : '8px';
  const radiusLg = cornerStyle === 'straight' ? '0' : '12px';
  const blurAmount = initialBlur ?? 1;

  const tabCss = hasMultipleScenarios ? `
    /* Tabs - horizontal scrolling with arrow navigation */
    .tabs-wrapper {
      position: relative;
      margin-left: 12px;
      margin-right: 12px;
      margin-bottom: -1px;
      overflow: hidden;
    }

    .tab-scroll-btn {
      position: absolute;
      top: 0;
      bottom: 1px;
      width: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      z-index: 4;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0;
      color: var(--text-primary);
      transition: color 0.2s ease;
    }

    .tab-scroll-btn:hover {
      color: var(--accent);
    }

    .tab-scroll-btn svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
      /* Glow effect makes icon visible on any background */
      filter: drop-shadow(0 0 2px rgba(255, 255, 255, 1))
              drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))
              drop-shadow(0 0 6px rgba(255, 255, 255, 0.6));
    }

    :root[data-theme="dark"] .tab-scroll-btn svg {
      filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))
              drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
    }

    .tab-scroll-btn.left {
      left: 0;
    }

    .tab-scroll-btn.right {
      right: 0;
    }

    /* Use mask-image to fade tabs at edges - works on any background */
    /* Fade zone is larger so text is fully transparent before reaching the chevron */
    .tabs-wrapper.can-scroll-right .tabs {
      -webkit-mask-image: linear-gradient(to right, black 0%, black calc(100% - 60px), transparent calc(100% - 20px), transparent 100%);
      mask-image: linear-gradient(to right, black 0%, black calc(100% - 60px), transparent calc(100% - 20px), transparent 100%);
    }

    .tabs-wrapper.can-scroll-left .tabs {
      -webkit-mask-image: linear-gradient(to left, black 0%, black calc(100% - 60px), transparent calc(100% - 20px), transparent 100%);
      mask-image: linear-gradient(to left, black 0%, black calc(100% - 60px), transparent calc(100% - 20px), transparent 100%);
    }

    .tabs-wrapper.can-scroll-left.can-scroll-right .tabs {
      -webkit-mask-image: linear-gradient(to right, transparent 0%, transparent 20px, black 60px, black calc(100% - 60px), transparent calc(100% - 20px), transparent 100%);
      mask-image: linear-gradient(to right, transparent 0%, transparent 20px, black 60px, black calc(100% - 60px), transparent calc(100% - 20px), transparent 100%);
    }

    .tabs-wrapper.can-scroll-left .tab-scroll-btn.left {
      display: flex;
    }

    .tabs-wrapper.can-scroll-right .tab-scroll-btn.right {
      display: flex;
    }

    .tabs {
      display: flex;
      gap: 0;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      scrollbar-width: none;
      -ms-overflow-style: none;
      position: relative;
      z-index: 2;
    }

    .tabs::-webkit-scrollbar {
      display: none;
    }

    .tab {
      padding: 10px 20px;
      border: 1px solid transparent;
      border-bottom: 1px solid var(--border-color);
      background: transparent;
      color: var(--tab-inactive-color, var(--text-secondary));
      border-radius: var(--radius) var(--radius) 0 0;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      flex-shrink: 0;
      scroll-snap-align: start;
      white-space: nowrap;
    }

    .tab:hover {
      color: var(--text-primary);
    }

    .tab.active {
      background: var(--bg-chat);
      color: var(--text-primary);
      border-color: var(--border-color);
      border-bottom-color: var(--bg-chat);
      position: relative;
    }

    @media (max-width: 600px) {
      .tabs-wrapper {
        margin-left: 12px;
        margin-right: 12px;
      }

      .tabs {
        padding: 0;
      }

      .tab {
        padding: 10px 16px;
        font-size: 12px;
        min-width: 100px;
        max-width: 150px;
      }

      .tab-scroll-btn {
        width: 28px;
      }
    }

  ` : '';

  return `
    *, *::before, *::after {
      box-sizing: border-box;
    }

    :root {
      /* Base Slate/Zinc Palette - Light */
      --color-slate-50: #f8fafc;
      --color-slate-100: #f1f5f9;
      --color-slate-200: #e2e8f0;
      --color-slate-300: #cbd5e1;
      --color-slate-400: #94a3b8;
      --color-slate-500: #64748b;
      --color-slate-600: #475569;
      --color-slate-700: #334155;
      --color-slate-800: #1e293b;
      --color-slate-900: #0f172a;
      
      /* Primary Brand Color - Deep Blue/Purple */
      --color-primary-50: #eef2ff;
      --color-primary-100: #e0e7ff;
      --color-primary-500: #6366f1;
      --color-primary-600: #4f46e5;
      --color-primary-700: #4338ca;

      --bg-primary: var(--color-slate-50);
      --bg-secondary: #ffffff;
      --bg-chat: #ffffff;
      
      --text-primary: var(--color-slate-900);
      --text-secondary: var(--color-slate-600);
      --text-muted: var(--color-slate-400);

      --accent: var(--color-primary-600);
      --accent-hover: var(--color-primary-500);
      --accent-light: var(--color-primary-50);

      --user-bg: var(--color-primary-50);
      --user-border: transparent;
      --user-text: var(--color-slate-800);
      
      --ai-bg: var(--color-slate-100);
      --ai-border: transparent;
      --ai-text: var(--color-slate-800);
      
      --annotation-bg: transparent;
      --annotation-border: var(--color-slate-300);
      --annotation-text: var(--color-slate-600);

      --transition-bg: var(--color-primary-50);
      --transition-border: var(--color-primary-300);
      --border-color: var(--color-slate-200);
      
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

      --radius: ${radius};
      --radius-lg: ${radiusLg};
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #0f172a; /* Slate 900 */
        --bg-secondary: #1e293b; /* Slate 800 */
        --bg-chat: #1e293b;

        --text-primary: #f8fafc; /* Slate 50 */
        --text-secondary: #94a3b8; /* Slate 400 */
        --text-muted: #64748b; /* Slate 500 */

        --accent: #818cf8; /* Indigo 400 */
        --accent-hover: #6366f1; /* Indigo 500 */
        --accent-light: rgba(99, 102, 241, 0.15);

        --user-bg: rgba(67, 56, 202, 0.4); /* Indigo 800 alpha */
        --user-border: rgba(99, 102, 241, 0.3);
        --user-text: #e2e8f0;

        --ai-bg: rgba(51, 65, 85, 0.6); /* Slate 700 alpha */
        --ai-border: rgba(148, 163, 184, 0.1);
        --ai-text: #e2e8f0;

        --annotation-border: #475569;
        --annotation-text: #cbd5e1;

        --border-color: #334155; /* Slate 700 */
        
        --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
        --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.3);
        --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4);
      }

      .tab-scroll-btn svg {
        filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))
                drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
      }

      .play-overlay {
        background: rgba(30, 41, 59, 0.92); /* Slate 800 - matches --bg-chat */
        backdrop-filter: blur(4px);
      }

      .play-overlay-icon {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .play-overlay-icon svg path {
        fill: #ffffff;
      }
    }

    /* Dark mode via data-theme attribute (for iframe sync with parent) */
    :root[data-theme="dark"] {
        --bg-primary: #0f172a; /* Slate 900 */
        --bg-secondary: #1e293b; /* Slate 800 */
        --bg-chat: #1e293b;

        --text-primary: #f8fafc; /* Slate 50 */
        --text-secondary: #94a3b8; /* Slate 400 */
        --text-muted: #64748b; /* Slate 500 */

        --accent: #818cf8; /* Indigo 400 */
        --accent-hover: #6366f1; /* Indigo 500 */
        --accent-light: rgba(99, 102, 241, 0.15);

        --user-bg: rgba(67, 56, 202, 0.4); /* Indigo 800 alpha */
        --user-border: rgba(99, 102, 241, 0.3);
        --user-text: #e2e8f0;

        --ai-bg: rgba(51, 65, 85, 0.6); /* Slate 700 alpha */
        --ai-border: rgba(148, 163, 184, 0.1);
        --ai-text: #e2e8f0;

        --annotation-border: #475569;
        --annotation-text: #cbd5e1;

        --border-color: #334155; /* Slate 700 */
        
        --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
        --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.3);
    }

    :root[data-theme="dark"] .play-overlay {
      background: rgba(30, 41, 59, 0.92); /* Slate 800 - matches --bg-chat */
      backdrop-filter: blur(4px);
    }

    :root[data-theme="dark"] .play-overlay-icon {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    :root[data-theme="dark"] .play-overlay-icon svg path {
      fill: #ffffff;
    }

    ${colorOverrides}

    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      background: var(--bg-primary);
      color: var(--text-primary);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .demo-container {
      max-width: 768px;
      margin: 0 auto;
    }

    .demo-header {
      margin-bottom: 24px;
      padding-bottom: 0;
    }

    .demo-header.hidden {
      display: none;
    }

    .demo-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
      letter-spacing: -0.025em;
    }

    .demo-title-link {
      color: inherit;
      text-decoration: none;
      transition: color 0.2s;
    }

    .demo-title-link:hover {
      color: var(--accent);
    }

    .demo-description {
      font-size: 15px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.6;
      max-width: 600px;
    }

    .demo-description a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }
    
    .demo-description a:hover {
      text-decoration: underline;
    }

    ${tabCss}

    .chat-wrapper {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .chat-container {
      position: relative;
      background: var(--bg-chat);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-xl);
      padding: 0; /* Reset padding for internal scroll container */
      flex: 1;
      min-height: 400px;
      max-height: var(--chat-max-height, 600px);
      overflow: hidden; /* Hide container overflow, scroll internal list */
      transition: opacity 0.3s ease;
      display: flex;
      flex-direction: column;
    }
    
    .chat-scroll-area {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        
        /* Hide scrollbar for cleaner look */
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none;  /* IE 10+ */
    }
    
    .chat-scroll-area::-webkit-scrollbar { 
        display: none;  /* Chrome Safari */
    }

    .chat-container.fading .chat-scroll-area {
      opacity: 0;
    }

    /* Standalone mode: chat fills available space, controls stay visible */
    body:not(.in-iframe) .demo-container {
      height: calc(100vh - 48px);
      display: flex;
      flex-direction: column;
    }
    
    .controls-wrapper {
      position: relative;
      z-index: 20; /* Ensure controls (and popovers) are above play overlay */
    }

    body:not(.in-iframe) .chat-container {
      /* Fills remaining space after header/tabs/controls */
      --chat-max-height: none;
      flex: 1;
      min-height: 200px;
    }

    /* Iframe mode: fill viewport, transparent background */
    html.in-iframe,
    body.in-iframe {
      height: 100%;
      background: transparent !important; /* Force transparency */
      padding: 0 !important;
      margin: 0 !important;
      overflow: hidden;
    }

    body.in-iframe .demo-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: transparent !important;
      padding: 0;
      margin: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }

    body.in-iframe .tabs {
      flex-shrink: 0;
      padding-top: 0; /* Align tabs to top if present */
    }

    body.in-iframe .chat-wrapper {
        box-shadow: none !important; /* Remove wrapper shadow */
    }

    body.in-iframe .chat-container {
      flex: 1;
      min-height: 0;
      max-height: none !important; /* Remove height constraint in iframe */
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important; /* Subtle shadow in iframe */
      background: var(--bg-chat) !important; /* Ensure opaque background in iframe */
    }

    body.in-iframe .controls-wrapper {
      position: relative;
      flex-shrink: 0;
      display: flex;
      justify-content: center;
      padding: 12px 0;
      z-index: 20;
    }


    .chat-messages {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 80px; /* Space for floating controls */
      padding-left: 32px;   /* Symmetric with right */
      padding-right: 32px;  /* Clearance for timer circle */
    }

    .play-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1); /* Much more transparent */
      backdrop-filter: blur(${blurAmount}px); /* Subtle blur - configurable via initialBlur */
      -webkit-backdrop-filter: blur(${blurAmount}px);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: opacity 0.4s ease;
      z-index: 10;
    }

    .play-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .play-overlay-icon {
      width: 64px; /* Slightly smaller for elegance */
      height: 64px;
      flex: 0 0 auto; /* Prevent squishing on small screens */
      min-width: 64px;
      min-height: 64px;
      aspect-ratio: 1/1; /* Enforce square aspect ratio */
      margin: auto; /* Center in flex container if needed */
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .play-overlay-icon svg {
        margin-left: 5px; /* Optical center adjustment for play triangle */
        width: 26px;
        height: 26px;
        fill: var(--accent);
    }

    .play-overlay:hover .play-overlay-icon {
      transform: scale(1.1);
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
    }

    .message {
      max-width: 85%;
      opacity: 0;
      transform: translateY(12px) scale(0.98);
      transform-origin: bottom center;
    }

    .message.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      transition: opacity 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    
    /* Slightly stagger the content fade in for polish */
    .message.visible .message-content {
      transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
    }

    .message.user {
      align-self: flex-start;
    }

    .message.ai {
      /* AI messages always on the right */
      align-self: flex-end;
      margin-left: 32px; /* Prevent being too wide on large screens */
    }

    .message-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      margin-bottom: 6px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .message.ai .message-label {
      justify-content: flex-end;
    }

    .message-content {
      padding: 14px 18px;
      border-radius: var(--radius);
      position: relative;
      line-height: 1.6;
      box-shadow: var(--shadow-sm);
      overflow-wrap: break-word;
    }
    
    /* Add subtle tails */
    .message-content::before {
      content: '';
      position: absolute;
      bottom: 0;
      width: 12px;
      height: 20px;
    }

    .message.user .message-content {
      background: var(--user-bg);
      border: 1px solid var(--user-border);
      color: var(--user-text);
      border-bottom-left-radius: 2px;
    }

    .message.ai .message-content {
      background: var(--ai-bg);
      border: 1px solid var(--ai-border);
      color: var(--ai-text);
      border-bottom-right-radius: 2px;
    }

    .message-content pre {
      /* User requested no background difference */
      background: transparent;
      border: 1px solid rgba(0, 0, 0, 0.08); /* Slightly clearer border since we lost background */
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      font-size: 13.5px;
      margin: 10px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'SF Mono', Consolas, Menlo, monospace;
    }
    
    :root[data-theme="dark"] .message-content pre {
        background: transparent;
        border-color: rgba(255, 255, 255, 0.1);
    }

    .message-content code {
      font-family: 'SF Mono', Consolas, Menlo, monospace;
      font-size: 13.5px;
      /* User requested no background difference */
      background: transparent;
      padding: 0;
      border-radius: 4px;
    }
    
    :root[data-theme="dark"] .message-content code {
        background: transparent;
    }

    .annotation {
      position: relative;
      width: 100%;
      margin: 24px 0;
      padding: 0 0 0 20px;
      font-size: 16px;
      font-style: italic;
      color: var(--annotation-text);
      opacity: 0;
      transform: translateY(10px);
    }

    .annotation::before {
      content: '';
      position: absolute;
      left: 0;
      top: 2px;
      bottom: 2px;
      width: 4px;
      background: var(--annotation-border);
      border-radius: 2px;
    }

    .annotation.visible {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }

    .annotation-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--annotation-text);
      margin-bottom: 6px;
      font-style: normal;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .annotation-content {
      line-height: 1.6;
    }

    .transition {
      position: relative;
      width: 100%;
      margin: 32px 0;
      /* Center transition like a system message */
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      font-size: 13px;
      font-weight: 500;
      color: var(--transition-text, var(--text-muted));
      opacity: 0;
      transform: translateY(10px);
      padding: 0 40px;
    }

    /* Remove side border for centered style */
    .transition::before {
      display: none; 
    }
    
    /* Add subtle separator lines */
    .transition::after {
      content: '';
      display: block;
      width: 40px;
      height: 2px;
      background: var(--transition-border);
      margin-top: 12px;
      border-radius: 1px;
      opacity: 0.4;
    }

    .transition.visible {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }

    .scenario-ending {
      text-align: center;
      padding: 32px 20px;
      margin-top: 24px;
      color: var(--text-muted);
      font-size: 13px;
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .scenario-ending.visible {
      opacity: 1;
    }

    .scenario-ending .next-label {
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 8px;
      opacity: 0.7;
    }

    .scenario-ending .next-title {
      font-weight: 600;
      font-size: 16px;
      color: var(--text-primary);
    }
    
    .controls-wrapper {
        margin-top: 16px;
        display: flex;
        justify-content: center;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.85); /* Light glass */
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 9999px; /* Pill shape */
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      pointer-events: auto;
      transition: opacity 0.3s, transform 0.3s;
    }
    
    /* In iframe, match standalone appearance */
    body.in-iframe .controls {
      margin-bottom: 0;
      /* Keep same shadow as standalone for consistency */
    }
    
    :root[data-theme="dark"] .controls {
        background: rgba(30, 41, 59, 0.8); /* Slate 800 alpha */
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    :root[data-theme="dark"] body.in-iframe .controls {
        background: rgba(30, 41, 59, 0.9);
    }

    .control-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .control-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
    }

    .control-btn:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.05);
      color: var(--text-primary);
      transform: scale(1.05);
    }
    
    :root[data-theme="dark"] .control-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
    }

    .control-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* Primary Play/Pause Button */
    .control-btn.primary {
      background: var(--accent);
      color: white;
      width: 44px;
      height: 44px;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); /* Colored shadow */
    }
    
    :root[data-theme="dark"] .control-btn.primary {
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }
    
    .control-btn.primary svg {
        width: 20px;
        height: 20px;
        fill: white;
    }

    .control-btn.primary:hover:not(:disabled) {
      background: var(--accent-hover);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
      transform: scale(1.05);
    }

    .speed-select {
      appearance: none;
      -webkit-appearance: none;
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      border-radius: 4px;
      transition: color 0.2s, background-color 0.2s;
      text-align: center;
      min-width: 40px;
    }
    
    .speed-select:hover {
        background: rgba(0, 0, 0, 0.05);
        color: var(--text-primary);
    }
    
    :root[data-theme="dark"] .speed-select:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .divider {
        width: 1px;
        height: 16px;
        background: var(--border-color);
        margin: 0 4px;
    }

    .progress {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--text-muted);
      font-feature-settings: "tnum";
      font-variant-numeric: tabular-nums;
      min-width: 40px;
      justify-content: center;
    }

    .timer-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 0%;
      background: var(--accent);
      opacity: 0;
      z-index: 5;
      transform-origin: left;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }

    .timer-bar.active {
      opacity: 1;
      transition: width 0.1s linear, opacity 0.2s ease;
    }

    .timer-circle {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 20px;
      height: 20px;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 5;
      pointer-events: none;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
    }

    .timer-circle.active {
      opacity: 1;
    }

    .timer-circle circle {
      fill: none;
      stroke: var(--accent);
      stroke-width: 2.5;
      stroke-dasharray: 44;
      stroke-dashoffset: 0; /* 2 * PI * r (approx 44 for r=7) */
      transform: rotate(-90deg);
      transform-origin: center;
      stroke-linecap: round;
    }
    
    .browser-error {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }

    @media (prefers-reduced-motion: reduce) {
      .message,
      .annotation,
      .transition {
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
      }
      .play-overlay {
        transition: none !important;
      }
    }

    @media (max-width: 600px) {
      body {
        padding: 12px;
      }

      .demo-title {
        font-size: 16px;
      }

      .demo-description {
        font-size: 13px;
      }

      .tabs {
        gap: 6px;
      }

      .tab {
        padding: 10px 14px;
        font-size: 12px;
        min-height: 44px;
      }

      .message {
        max-width: 95%;
      }

      .chat-container {
        padding: 12px;
        min-height: 250px;
      }

      .controls {
        gap: 8px;
        padding-top: 12px;
      }

      .control-btn {
        padding: 10px 14px;
        font-size: 13px;
        min-height: 44px;
      }

      .control-btn.icon-only {
        padding: 10px 12px;
        min-width: 44px;
        min-height: 44px;
      }

      .speed-select {
        padding: 10px 12px;
        font-size: 13px;
        min-height: 44px;
      }

      .play-overlay-icon {
        width: 70px;
        height: 70px;
        min-width: 70px;
        min-height: 70px;
      }

      .play-overlay-icon svg {
        width: 28px;
        height: 28px;
      }

      .message-content pre {
        overflow-x: auto;
        max-width: 100%;
      }
    }

    /* Very small phones */
    @media (max-width: 400px) {
      body {
        padding: 8px;
      }

      /* Very small phones - keep scrolling tabs instead of stacking */
      .tabs {
        gap: 4px;
      }

      .tab {
        /* width: 100%; Removed to prevent full stacking */
        text-align: center;
      }

      .controls {
        flex-wrap: nowrap;
        gap: 4px;
        padding: 6px 8px;
      }

      .controls .divider {
        display: none; /* Hide dividers to save space */
      }

      .control-btn {
        width: 36px;
        height: 36px;
        min-width: 36px;
        min-height: 36px;
        padding: 0;
      }

      .control-btn.primary {
        width: 40px;
        height: 40px;
      }

      .speed-select {
        padding: 6px 8px;
        min-width: 32px;
        font-size: 12px;
      }

      .progress {
        font-size: 11px;
        min-width: 36px;
      }
    }



    /* Info Popover */
    .info-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    #info-btn {
      opacity: 0.5;
      transition: opacity 0.2s ease;
    }

    #info-btn:hover, #info-btn[aria-expanded="true"] {
      opacity: 1;
      background: var(--bg-secondary);
    }

    .info-popover {
      position: absolute;
      bottom: 100%;
      right: -10px; /* Align near the button */
      margin-bottom: 12px;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 12px 16px;
      width: 220px;
      box-shadow: var(--shadow-lg);
      font-size: 13px;
      color: var(--text-secondary);
      opacity: 0;
      visibility: hidden;
      transform: translateY(8px);
      transition: all 0.2s ease;
      z-index: 100;
      pointer-events: none;
      text-align: left;
    }

    .info-popover::after {
        content: '';
        position: absolute;
        bottom: -5px;
        right: 20px;
        width: 10px;
        height: 10px;
        background: var(--bg-primary);
        border-bottom: 1px solid var(--border-color);
        border-right: 1px solid var(--border-color);
        transform: rotate(45deg);
    }

    .info-popover.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      pointer-events: auto;
    }

    .info-title-link {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
      display: block;
      text-decoration: none;
    }

    .info-title-link:hover {
      text-decoration: underline;
    }

    .info-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-link {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }

    .info-link:hover {
      text-decoration: underline;
    }
  `;
}

/**
 * Generate the JavaScript for the demo player
 */
function generateJs(demo: Demo, timerStyle: TimerStyle): string {
  const scenariosJs = generateScenariosJs(demo);
  const scenarioOrder = JSON.stringify(demo.scenarios.map(s => s.id));
  const autoAdvance = demo.meta.autoAdvance !== false;
  const hasMultipleScenarios = demo.scenarios.length > 1;
  const annotationLabel = demo.meta.annotationLabel ?? 'Behind the Scenes';
  const useCircleTimer = timerStyle === 'circle';

  return `
    (function() {
      'use strict';

      // Feature detection
      var hasRequiredFeatures = (
        typeof document.querySelector === 'function' &&
        typeof document.querySelectorAll === 'function' &&
        typeof window.addEventListener === 'function' &&
        typeof Array.prototype.forEach === 'function'
      );

      if (!hasRequiredFeatures) {
        var errorDiv = document.querySelector('.browser-error');
        if (errorDiv) {
          errorDiv.style.display = 'block';
        }
        return;
      }

      // Iframe detection - add class for CSS and hide header when embedded
      var isInIframe = false;
      try {
        isInIframe = window.self !== window.top;
      } catch (e) {
        isInIframe = true;
      }

      if (isInIframe) {
        document.documentElement.classList.add('in-iframe');
        document.body.classList.add('in-iframe');

        // Listen for theme changes from parent page (cross-origin support)
        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'theme-change') {
            var theme = event.data.theme;
            if (theme === 'dark') {
              document.documentElement.setAttribute('data-theme', 'dark');
            } else {
              document.documentElement.removeAttribute('data-theme');
            }
          }
        });

        // For same-origin iframes, directly sync with parent's theme
        try {
          var parentDoc = window.parent.document;
          var parentHtml = parentDoc.documentElement;

          // Initial sync
          var parentTheme = parentHtml.getAttribute('data-theme');
          if (parentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
          }

          // Watch for changes
          var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
              if (mutation.attributeName === 'data-theme') {
                var theme = parentHtml.getAttribute('data-theme');
                if (theme === 'dark') {
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.removeAttribute('data-theme');
                }
              }
            });
          });
          observer.observe(parentHtml, { attributes: true, attributeFilter: ['data-theme'] });
        } catch (e) {
          // Cross-origin - fall back to postMessage listener (already set up above)
        }
      }

      var header = document.getElementById('demo-header');
      if (isInIframe && header) {
        header.classList.add('hidden');
      }

      // Configurable annotation label
      var annotationLabel = ${JSON.stringify(annotationLabel)};

      // Scenarios data
      var scenarios = ${scenariosJs};
      var scenarioOrder = ${scenarioOrder};
      var autoAdvance = ${autoAdvance};
      var hasMultipleScenarios = ${hasMultipleScenarios};
      var useCircleTimer = ${useCircleTimer};

      // Speed configuration
      var speedConfig = {
        minDelay: ${demo.meta.speed?.minDelay ?? 3000},
        maxDelay: ${demo.meta.speed?.maxDelay ?? 8000},
        msPerWord: ${demo.meta.speed?.msPerWord ?? 200},
        annotationMultiplier: ${demo.meta.speed?.annotationMultiplier ?? 1.15},
        upNextDelay: ${demo.meta.speed?.upNextDelay ?? 2500}
      };

      // Animation state
      var currentScenario = scenarioOrder[0];
      var currentStepIndex = 0;
      var isPlaying = false;
      var isPaused = false;
      var animationTimeout = null;
      var speed = 1;
      var currentStepBaseDelay = 0; // Base delay before speed adjustment (for mid-playback speed changes)
      var hasStarted = false;

      // DOM elements
      var chatMessages = document.getElementById('chat-messages');
      var playPauseBtn = document.getElementById('play-pause-btn');
      var playIcon = document.getElementById('play-icon');
      var pauseIcon = document.getElementById('pause-icon');
      var resetBtn = document.getElementById('reset-btn');
      var speedSelect = document.getElementById('speed-select');
      var progressEl = document.getElementById('progress');
      var playOverlay = document.getElementById('play-overlay');
      var timerElement = document.getElementById('timer-element');
      var chatContainer = document.getElementById('chat-container');
      var tabs = document.querySelectorAll('.tab');
      var tabsContainer = document.querySelector('.tabs');
      var tabsWrapper = document.querySelector('.tabs-wrapper');
      var infoBtn = document.getElementById('info-btn');
      var infoPopover = document.getElementById('info-popover');

      // Timer animation
      var timerAnimationFrame = null;
      var timerStartTime = 0;
      var timerDuration = 0;

      // Reduced motion preference
      var prefersReducedMotion = false;
      try {
        prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (e) {}

      function getSteps() {
        return scenarios[currentScenario].steps;
      }

      function getLabels() {
        return scenarios[currentScenario].labels;
      }

      // Content-aware delay calculation
      function calculateDelay(step) {
        var wordCount = 0;

        if (step.plainText) {
          wordCount += step.plainText.split(/\\s+/).length;
        }
        if (step.codeBlock) {
          wordCount += Math.floor(step.codeBlock.split(/\\s+/).length * 1.3);
        }
        if (step.footnote) {
          wordCount += step.footnote.split(/\\s+/).length;
        }

        var baseDelay = Math.max(speedConfig.minDelay, Math.min(speedConfig.maxDelay, wordCount * speedConfig.msPerWord));

        if (step.type === 'annotation') {
          baseDelay = Math.floor(baseDelay * speedConfig.annotationMultiplier);
        }

        return baseDelay / speed;
      }

      // Timer functions - supports bar (grows left to right) or circle (stroke countdown)
      function startTimer(duration) {
        timerDuration = duration;
        timerStartTime = Date.now();
        timerElement.classList.add('active');

        if (useCircleTimer) {
          // Circle: animate stroke-dashoffset from 0 to 44 (full circle = 44)
          var circle = timerElement.querySelector('circle');
          if (circle) circle.style.strokeDashoffset = '0';
        } else {
          // Bar: start at 0% width
          timerElement.style.width = '0%';
        }

        function animate() {
          var elapsed = Date.now() - timerStartTime;
          var progress = Math.min(elapsed / timerDuration, 1);

          if (useCircleTimer) {
            // Circle: offset goes from 0 to 44 as time progresses
            var circle = timerElement.querySelector('circle');
            if (circle) circle.style.strokeDashoffset = (progress * 44) + '';
          } else {
            // Bar: width grows from 0% to 100%
            timerElement.style.width = (progress * 100) + '%';
          }

          if (progress < 1 && isPlaying && !isPaused) {
            timerAnimationFrame = requestAnimationFrame(animate);
          }
        }

        if (typeof requestAnimationFrame === 'function') {
          timerAnimationFrame = requestAnimationFrame(animate);
        }
      }

      function stopTimer() {
        if (timerAnimationFrame) {
          cancelAnimationFrame(timerAnimationFrame);
          timerAnimationFrame = null;
        }
        timerElement.classList.remove('active');
        if (useCircleTimer) {
          var circle = timerElement.querySelector('circle');
          if (circle) circle.style.strokeDashoffset = '0';
        } else {
          timerElement.style.width = '0%';
        }
      }

      function clearChatMessages() {
        while (chatMessages.firstChild) {
          chatMessages.removeChild(chatMessages.firstChild);
        }
      }

      function scrollToNewElement(element) {
        var container = chatMessages.parentElement;
        var scrollMargin = 8;
        var elementTop = Math.max(0, element.offsetTop - scrollMargin);
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({ top: elementTop, behavior: 'smooth' });
        } else {
          container.scrollTop = elementTop;
        }
      }

      function createStepElement(step) {
        var div = document.createElement('div');
        var labels = getLabels();

        if (step.type === 'annotation') {
          div.className = 'annotation';

          // Label
          var label = document.createElement('div');
          label.className = 'annotation-label';
          label.textContent = annotationLabel;
          div.appendChild(label);

          // Content
          var content = document.createElement('div');
          content.className = 'annotation-content';
          content.textContent = step.plainText;
          div.appendChild(content);
          return div;
        }

        if (step.type === 'transition') {
          div.className = 'transition';
          div.textContent = step.plainText;
          return div;
        }

        // Message
        div.className = 'message ' + step.type;

        var label = document.createElement('div');
        label.className = 'message-label';
        label.textContent = labels[step.type] || step.type;
        div.appendChild(label);

        var contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content';

        if (step.plainText) {
          var textNode = document.createElement('p');
          var hasMoreContent = step.codeBlock || step.footnote;
          textNode.style.margin = hasMoreContent ? '0 0 8px 0' : '0';
          textNode.textContent = step.plainText;
          contentWrapper.appendChild(textNode);
        }

        if (step.codeBlock) {
          var pre = document.createElement('pre');
          var code = document.createElement('code');
          code.textContent = step.codeBlock;
          pre.appendChild(code);
          contentWrapper.appendChild(pre);
        }

        if (step.footnote) {
          var footnote = document.createElement('p');
          footnote.style.cssText = 'margin: 8px 0 0 0; font-style: italic; font-size: 15px; color: var(--text-secondary);';
          footnote.textContent = step.footnote;
          contentWrapper.appendChild(footnote);
        }

        div.appendChild(contentWrapper);
        return div;
      }

      function updateTabStates() {
        tabs.forEach(function(t) {
          var isActive = t.getAttribute('data-scenario') === currentScenario;
          if (isActive) {
            t.classList.add('active');
            t.setAttribute('aria-selected', 'true');
            t.setAttribute('tabindex', '0');
          } else {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
            t.setAttribute('tabindex', '-1');
          }
        });
      }

      function updateButtonStates() {
        var steps = getSteps();
        var isComplete = currentStepIndex >= steps.length;
        var isActivelyPlaying = isPlaying && !isPaused;

        // Toggle play/pause button icon
        if (isActivelyPlaying) {
          playIcon.style.display = 'none';
          pauseIcon.style.display = 'block';
          playPauseBtn.setAttribute('aria-label', 'Pause animation');
        } else {
          playIcon.style.display = 'block';
          pauseIcon.style.display = 'none';
          playPauseBtn.setAttribute('aria-label', 'Play animation');
        }

        playPauseBtn.disabled = isComplete && !isActivelyPlaying;
      }

      function updateProgress() {
        var steps = getSteps();
        progressEl.textContent = currentStepIndex + ' / ' + steps.length;
      }

      function showInitialPreview() {
        var steps = getSteps();
        if (steps.length > 0) {
          var element = createStepElement(steps[0]);
          element.classList.add('visible');
          chatMessages.appendChild(element);
          currentStepIndex = 0;
        }
        playOverlay.classList.remove('hidden');
        hasStarted = false;
        updateProgress();
        updateButtonStates();
      }

      function switchToScenario(scenarioId, withFade) {
        stopTimer();
        if (animationTimeout) {
          clearTimeout(animationTimeout);
          animationTimeout = null;
        }

        function doSwitch() {
          currentScenario = scenarioId;
          currentStepIndex = 0;
          isPlaying = false;
          isPaused = false;
          hasStarted = false;

          updateTabStates();
          clearChatMessages();
          showInitialPreview();

          if (withFade) {
            // Fade back in
            chatContainer.classList.remove('fading');
          }
        }

        if (withFade) {
          // Fade out first
          chatContainer.classList.add('fading');
          setTimeout(doSwitch, 300);
        } else {
          doSwitch();
        }
      }

      function showTransitionMessage(nextScenarioTitle) {
        var div = document.createElement('div');
        div.className = 'transition';
        div.textContent = 'Switching to: ' + nextScenarioTitle;
        chatMessages.appendChild(div);

        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(function() {
            div.classList.add('visible');
            scrollToNewElement(div);
          });
        } else {
          div.classList.add('visible');
          scrollToNewElement(div);
        }
      }

      function advanceToNextScenario() {
        var currentIndex = scenarioOrder.indexOf(currentScenario);
        var nextIndex = (currentIndex + 1) % scenarioOrder.length;
        var nextScenarioId = scenarioOrder[nextIndex];
        var nextTitle = scenarios[nextScenarioId].title;

        // Show "Up Next" indicator at end of current scenario
        var upNextDiv = document.createElement('div');
        upNextDiv.className = 'scenario-ending';
        var labelDiv = document.createElement('div');
        labelDiv.className = 'next-label';
        labelDiv.textContent = 'Up Next';
        var titleDiv = document.createElement('div');
        titleDiv.className = 'next-title';
        titleDiv.textContent = nextTitle;
        upNextDiv.appendChild(labelDiv);
        upNextDiv.appendChild(titleDiv);
        chatMessages.appendChild(upNextDiv);

        // Animate it in
        requestAnimationFrame(function() {
          upNextDiv.classList.add('visible');
          scrollToNewElement(upNextDiv);
        });

        // Wait for user to see it, then fade and switch
        var upNextDelay = speedConfig.upNextDelay / speed;
        startTimer(upNextDelay);
        animationTimeout = setTimeout(function() {
          stopTimer();
          chatContainer.classList.add('fading');

          setTimeout(function() {
            currentScenario = nextScenarioId;
            currentStepIndex = 0;
            isPlaying = false;
            isPaused = false;
            hasStarted = false;

            updateTabStates();
            clearChatMessages();
            // Skip showInitialPreview() during auto-advance to avoid overlay flash
            // Keep overlay hidden and go directly to playing
            playOverlay.classList.add('hidden');
            chatContainer.classList.remove('fading');

            // Ensure new active tab is visible (not in fade zone)
            scrollActiveTabIntoView();

            // Auto-play immediately
            play();
          }, 300);
        }, upNextDelay);
      }

      function showNextStep() {
        stopTimer();
        var steps = getSteps();

        if (currentStepIndex >= steps.length) {
          // Scenario complete
          if (autoAdvance && hasMultipleScenarios) {
            // Advance to next scenario - it handles its own "Up Next" timing
            advanceToNextScenario();
          } else {
            isPlaying = false;
            updateButtonStates();
          }
          return;
        }

        if (isPaused) return;

        var step = steps[currentStepIndex];
        var element = createStepElement(step);
        chatMessages.appendChild(element);

        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(function() {
            element.classList.add('visible');
            scrollToNewElement(element);
          });
        } else {
          element.classList.add('visible');
          scrollToNewElement(element);
        }

        currentStepIndex++;
        updateProgress();

        if (currentStepIndex < steps.length) {
          var delay = calculateDelay(step);
          currentStepBaseDelay = delay * speed; // Store base delay for mid-playback speed changes
          startTimer(delay);
          animationTimeout = setTimeout(showNextStep, delay);
        } else {
          // Check if we should auto-advance
          if (autoAdvance && hasMultipleScenarios) {
            // Advance to next scenario - it handles its own "Up Next" timing
            advanceToNextScenario();
          } else {
            isPlaying = false;
            updateButtonStates();
          }
        }
      }

      function play() {
        if (!hasStarted) {
          playOverlay.classList.add('hidden');
          hasStarted = true;
          isPlaying = true;
          isPaused = false;
          updateButtonStates();

          var steps = getSteps();
          var firstStep = steps[0];

          // Show first step if not already visible (e.g., during auto-advance)
          if (chatMessages.children.length === 0) {
            var element = createStepElement(firstStep);
            element.classList.add('visible');
            chatMessages.appendChild(element);
          }

          var delay = calculateDelay(firstStep);
          currentStepBaseDelay = delay * speed; // Store base delay for mid-playback speed changes
          currentStepIndex = 1;

          startTimer(delay);
          animationTimeout = setTimeout(showNextStep, delay);
          return;
        }

        if (isPaused) {
          isPaused = false;
          updateButtonStates();
          showNextStep();
          return;
        }

        if (isPlaying) return;

        var steps = getSteps();
        if (currentStepIndex >= steps.length) {
          currentStepIndex = 0;
          clearChatMessages();
          var element = createStepElement(steps[0]);
          element.classList.add('visible');
          chatMessages.appendChild(element);
          currentStepIndex = 1;

          isPlaying = true;
          isPaused = false;
          updateButtonStates();

          var delay = calculateDelay(steps[0]);
          currentStepBaseDelay = delay * speed; // Store base delay for mid-playback speed changes
          startTimer(delay);
          animationTimeout = setTimeout(showNextStep, delay);
          return;
        }

        isPlaying = true;
        isPaused = false;
        updateButtonStates();
        showNextStep();
      }

      function pause() {
        isPaused = true;
        updateButtonStates();
        stopTimer();
        if (animationTimeout) {
          clearTimeout(animationTimeout);
          animationTimeout = null;
        }
      }

      function reset() {
        switchToScenario(currentScenario);
      }

      function showAllInstantly() {
        var steps = getSteps();
        clearChatMessages();
        playOverlay.classList.add('hidden');
        hasStarted = true;

        steps.forEach(function(step) {
          var element = createStepElement(step);
          element.classList.add('visible');
          chatMessages.appendChild(element);
        });

        currentStepIndex = steps.length;
        isPlaying = false;
        updateProgress();
        updateButtonStates();
      }

      // Event listeners
      playOverlay.addEventListener('click', function() {
        if (prefersReducedMotion) {
          showAllInstantly();
        } else {
          play();
        }
      });

      playOverlay.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (prefersReducedMotion) {
            showAllInstantly();
          } else {
            play();
          }
        }
      });

      // Tab switching logic (shared between click and keyboard)
      function switchTab(tab) {
        var scenarioId = tab.getAttribute('data-scenario');
        if (scenarioId === currentScenario) return; // Already on this tab

        // Remember if we were playing before switching
        var wasPlaying = isPlaying && !isPaused;

        // Stop any current animation
        if (animationTimeout) {
          clearTimeout(animationTimeout);
          animationTimeout = null;
        }
        stopTimer();

        // Fade out, switch, fade in
        chatContainer.classList.add('fading');
        setTimeout(function() {
          currentScenario = scenarioId;
          currentStepIndex = 0;
          isPlaying = false;
          isPaused = false;
          hasStarted = false;

          updateTabStates();
          clearChatMessages();

          // Keep overlay hidden to avoid flash during switch
          playOverlay.classList.add('hidden');
          chatContainer.classList.remove('fading');

          if (prefersReducedMotion) {
            showAllInstantly();
          } else {
            // Always show initial preview to render the first message
            showInitialPreview();

            if (wasPlaying) {
              // If we were playing, continue playing (this will hide the overlay again)
              play();
            } else {
              // If we weren't playing, ensure the overlay is hidden?
              // The original comment said "keep overlay hidden" but showInitialPreview shows it.
              // If we pause, we usually show the play button?
              // Actually, standard behavior is usually to show the play button on a fresh tab.
              // But strictly following the intention of "keep overlay hidden" would mean adding it back?
              // Let's stick to standard behavior: new tab = reset state = show play button.
              // showInitialPreview() handles that.

              // However, check if we want to suppress it:
              // "User can click play button or canvas to start"
            }
          }

          // Ensure active tab is fully visible (not obscured by scroll buttons)
          scrollActiveTabIntoView();
        }, 300);
      }

      // Tab click handlers
      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          switchTab(tab);
        });
      });

      // Tab keyboard navigation (arrow keys per ARIA authoring practices)
      tabs.forEach(function(tab, index) {
        tab.addEventListener('keydown', function(e) {
          var tabArray = Array.prototype.slice.call(tabs);
          var currentIndex = tabArray.indexOf(tab);
          var newIndex = currentIndex;

          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            newIndex = currentIndex === 0 ? tabArray.length - 1 : currentIndex - 1;
            e.preventDefault();
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            newIndex = currentIndex === tabArray.length - 1 ? 0 : currentIndex + 1;
            e.preventDefault();
          } else if (e.key === 'Home') {
            newIndex = 0;
            e.preventDefault();
          } else if (e.key === 'End') {
            newIndex = tabArray.length - 1;
            e.preventDefault();
          }

          if (newIndex !== currentIndex) {
            tabArray[newIndex].focus();
            switchTab(tabArray[newIndex]);
          }
        });
      });

      function togglePlayPause() {
        if (isPlaying && !isPaused) {
          pause();
        } else {
          play();
        }
      }

      playPauseBtn.addEventListener('click', togglePlayPause);
      resetBtn.addEventListener('click', reset);

      // Info popover
      if (infoBtn && infoPopover) {
        infoBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var isVisible = infoPopover.classList.contains('visible');
          if (isVisible) {
            infoPopover.classList.remove('visible');
            infoBtn.setAttribute('aria-expanded', 'false');
          } else {
            infoPopover.classList.add('visible');
            infoBtn.setAttribute('aria-expanded', 'true');
          }
        });

        // Close when clicking outside
        document.addEventListener('click', function(e) {
          if (!infoPopover.contains(e.target) && !infoBtn.contains(e.target)) {
             infoPopover.classList.remove('visible');
             infoBtn.setAttribute('aria-expanded', 'false');
          }
        });
        
        // Close on visual viewport resize (mobile keyboard, etc) or scroll
        // Optional, but good for cleanliness
      }

      speedSelect.addEventListener('change', function(e) {
        var oldSpeed = speed;
        speed = parseFloat(e.target.value);

        // If playing, recalculate and reschedule with new speed
        if (isPlaying && !isPaused && animationTimeout && currentStepBaseDelay > 0) {
          var elapsed = Date.now() - timerStartTime;
          var elapsedBase = elapsed * oldSpeed; // Content time consumed
          var remainingBase = currentStepBaseDelay - elapsedBase;

          if (remainingBase > 0) {
            // Cancel current timeout (but keep timer animation running)
            clearTimeout(animationTimeout);

            // Adjust timer variables so animation continues from current position
            // progress = elapsed / timerDuration should remain the same
            timerDuration = currentStepBaseDelay / speed;
            timerStartTime = Date.now() - (elapsedBase / speed);

            // Reschedule with remaining time at new speed
            var remainingTime = remainingBase / speed;
            animationTimeout = setTimeout(showNextStep, remainingTime);
          }
        }
      });

      // Handle page visibility changes (pause timer animation when tab is hidden)
      if (typeof document.hidden !== 'undefined') {
        document.addEventListener('visibilitychange', function() {
          if (document.hidden && timerAnimationFrame) {
            cancelAnimationFrame(timerAnimationFrame);
            timerAnimationFrame = null;
          }
        });
      }

      // Scroll indicators for mobile tabs
      function updateTabScrollIndicators() {
        if (!tabsContainer || !tabsWrapper) return;

        var scrollLeft = tabsContainer.scrollLeft;
        var maxScroll = tabsContainer.scrollWidth - tabsContainer.clientWidth;
        var threshold = 2; // Account for sub-pixel rendering

        if (scrollLeft > threshold) {
          tabsWrapper.classList.add('can-scroll-left');
        } else {
          tabsWrapper.classList.remove('can-scroll-left');
        }

        if (scrollLeft < maxScroll - threshold) {
          tabsWrapper.classList.add('can-scroll-right');
        } else {
          tabsWrapper.classList.remove('can-scroll-right');
        }
      }

      // Auto-scroll to ensure active tab is fully visible (outside the fade zone)
      function scrollActiveTabIntoView() {
        if (!tabsContainer) return;
        var activeTab = tabsContainer.querySelector('.tab.active');
        if (!activeTab) return;

        var containerRect = tabsContainer.getBoundingClientRect();
        var tabRect = activeTab.getBoundingClientRect();
        var fadeZone = 70; // Must be larger than CSS mask fade zone (60px) to keep active tab fully opaque

        // Check if tab is cut off on the right
        if (tabRect.right > containerRect.right - fadeZone) {
          tabsContainer.scrollBy({
            left: tabRect.right - containerRect.right + fadeZone + 8,
            behavior: 'smooth'
          });
        }
        // Check if tab is cut off on the left
        else if (tabRect.left < containerRect.left + fadeZone) {
          tabsContainer.scrollBy({
            left: tabRect.left - containerRect.left - fadeZone - 8,
            behavior: 'smooth'
          });
        }
      }

      if (tabsContainer && tabsWrapper) {
        tabsContainer.addEventListener('scroll', updateTabScrollIndicators, { passive: true });
        window.addEventListener('resize', updateTabScrollIndicators, { passive: true });

        // Arrow button click handlers
        var scrollLeftBtn = tabsWrapper.querySelector('.tab-scroll-btn.left');
        var scrollRightBtn = tabsWrapper.querySelector('.tab-scroll-btn.right');
        var scrollAmount = 200; // pixels to scroll per click

        if (scrollLeftBtn) {
          scrollLeftBtn.addEventListener('click', function() {
            tabsContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
          });
        }

        if (scrollRightBtn) {
          scrollRightBtn.addEventListener('click', function() {
            tabsContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
          });
        }
      }

      // Initialize
      updateTabStates();
      updateTabScrollIndicators();
      showInitialPreview();

      if (prefersReducedMotion) {
        showAllInstantly();
      }
    })();
  `;
}

/**
 * Generate tabs HTML
 */
function generateTabsHtml(demo: Demo): string {
  if (demo.scenarios.length <= 1) {
    return '';
  }

  const tabButtons = demo.scenarios.map((scenario, i) => {
    const activeClass = i === 0 ? ' active' : '';
    const ariaSelected = i === 0 ? 'true' : 'false';
    const tabIndex = i === 0 ? '0' : '-1'; // Only first tab in focus order initially
    return `<button class="tab${activeClass}" role="tab" data-scenario="${escapeHtml(scenario.id)}" aria-selected="${ariaSelected}" tabindex="${tabIndex}">${escapeHtml(scenario.title)}</button>`;
  }).join('\n      ');

  return `
    <div class="tabs-wrapper">
      <button class="tab-scroll-btn left" aria-label="Scroll tabs left">
        <svg viewBox="0 0 24 24"><path d="M18.41 7.41L17 6l-6 6 6 6 1.41-1.41L13.83 12z"/><path d="M12.41 7.41L11 6l-6 6 6 6 1.41-1.41L7.83 12z"/></svg>
      </button>
      <nav class="tabs" role="tablist">
        ${tabButtons}
      </nav>
      <button class="tab-scroll-btn right" aria-label="Scroll tabs right">
        <svg viewBox="0 0 24 24"><path d="M5.59 7.41L7 6l6 6-6 6-1.41-1.41L10.17 12z"/><path d="M11.59 7.41L13 6l6 6-6 6-1.41-1.41L16.17 12z"/></svg>
      </button>
    </div>
  `;
}

/**
 * Generate the complete HTML document
 */
export function generateHtml(demo: Demo, options: BuildOptions = { outputPath: '' }): string {
  const theme = options.theme ?? demo.meta.theme ?? 'chat';
  const includeHeader = options.includeHeader !== false;
  const hasMultipleScenarios = demo.scenarios.length > 1;
  const timerStyle = demo.meta.timerStyle ?? 'circle';
  const cornerStyle = demo.meta.cornerStyle ?? 'rounded';

  const css = generateCss(theme, hasMultipleScenarios, demo.meta.colors, cornerStyle, demo.meta.initialBlur);
  const js = generateJs(demo, timerStyle);

  const titleHtml = demo.meta.articleUrl
    ? `<a href="${escapeHtml(demo.meta.articleUrl)}" class="demo-title-link">${escapeHtml(demo.meta.title)}</a>`
    : escapeHtml(demo.meta.title);

  const descriptionHtml = demo.meta.description
    ? `<p class="demo-description">${parseMarkdownLinks(demo.meta.description)}</p>`
    : '';

  const headerHtml = includeHeader
    ? `
    <header class="demo-header" id="demo-header">
      <h1 class="demo-title">${titleHtml}</h1>
      ${descriptionHtml}
    </header>
    `
    : '';

  const tabsHtml = generateTabsHtml(demo);

  const timerHtml = timerStyle === 'circle'
    ? `<svg class="timer-circle" id="timer-element" aria-hidden="true" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="7"/>
      </svg>`
    : `<div class="timer-bar" id="timer-element" aria-hidden="true"></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(demo.meta.title)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="demo-container">
    ${headerHtml}
    ${tabsHtml}
    <div class="chat-wrapper">
      <div class="chat-container" id="chat-container" role="log" aria-live="polite">
        <div class="chat-scroll-area">
            <div class="chat-messages" id="chat-messages"></div>
        </div>
        ${timerHtml}
        <div class="play-overlay" id="play-overlay" role="button" aria-label="Play demo" tabindex="0">
            <div class="play-overlay-icon">
            <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
            </svg>
            </div>
        </div>
      </div>
    </div>

    <div class="controls-wrapper">
        <div class="controls">
        <button class="control-btn primary" id="play-pause-btn" aria-label="Play animation">
            <svg id="play-icon" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
            </svg>
            <svg id="pause-icon" viewBox="0 0 24 24" style="display:none">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
        </button>
        
        <div class="divider"></div>

        <button class="control-btn icon-only" id="reset-btn" aria-label="Restart animation" title="Restart">
            <svg viewBox="0 0 24 24">
            <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
        </button>
        
        <div class="divider"></div>

        <select class="speed-select" id="speed-select" aria-label="Animation speed" title="Playback Speed">
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
        </select>
        
        <div class="divider"></div>
        
        <span class="progress" id="progress"></span>

        <div class="divider"></div>

        <div class="info-container">
            <button class="control-btn icon-only" id="info-btn" aria-label="About this player" aria-haspopup="true" aria-expanded="false">
                <svg viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
            </button>
            <div class="info-popover" id="info-popover">
                <a href="https://github.com/lennyzeltser/conversation-replay" target="_blank" rel="noopener noreferrer" class="info-title-link">Conversation Replay</a>
                <div class="info-meta">
                    <span>Created by <a href="https://zeltser.com" target="_blank" rel="noopener noreferrer" class="info-link">Lenny Zeltser</a></span>
                    <span>Version ${VERSION}</span>
                </div>
            </div>
        </div>
        </div>
    </div>

    <noscript>
      <div class="browser-error">
        <p>This demo requires JavaScript to be enabled.</p>
      </div>
    </noscript>
  </div>

  <script>${js}</script>
</body>
</html>`;
}

/**
 * Build a demo file to HTML output
 */
export async function buildDemo(
  demo: Demo,
  outputPath: string,
  options: Partial<BuildOptions> = {}
): Promise<void> {
  const html = generateHtml(demo, { ...options, outputPath });
  await writeFile(outputPath, html, 'utf-8');
}

