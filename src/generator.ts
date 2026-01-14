/**
 * Conversation Replay - HTML Generator
 *
 * Generates self-contained HTML files from demo definitions.
 * Supports multi-scenario demos with tabs.
 *
 * Security: All dynamic content is rendered using safe DOM methods (textContent,
 * createElement) - no innerHTML with untrusted content.
 */

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
function generateCss(theme: Theme, hasMultipleScenarios: boolean, colors?: ColorConfig, cornerStyle?: CornerStyle): string {
  const colorOverrides = generateColorOverrides(colors);
  const radius = cornerStyle === 'straight' ? '0' : '8px';
  const radiusLg = cornerStyle === 'straight' ? '0' : '12px';

  const tabCss = hasMultipleScenarios ? `
    /* Tabs - browser-style integrated with canvas */
    .tabs {
      display: flex;
      gap: 0;
      margin-left: 12px;
      margin-bottom: -1px;
      flex-wrap: wrap;
      position: relative;
      z-index: 2;
    }

    .tab {
      padding: 10px 20px;
      border: 1px solid transparent;
      border-bottom: none;
      background: transparent;
      color: var(--tab-inactive-color, var(--text-muted));
      border-radius: var(--radius) var(--radius) 0 0;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      opacity: 0.75;
    }

    .tab:hover {
      opacity: 0.9;
      color: var(--text-primary);
    }

    .tab.active {
      background: var(--bg-chat);
      color: var(--text-primary);
      border-color: var(--border-color);
      opacity: 1;
      position: relative;
    }

    .tab.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--bg-chat);
    }

    @media (max-width: 600px) {
      .tab {
        padding: 10px 14px;
        font-size: 12px;
        flex: 1;
        text-align: center;
        min-width: 0;
      }
    }
  ` : '';

  return `
    *, *::before, *::after {
      box-sizing: border-box;
    }

    :root {
      --bg-primary: #f6f7f9;
      --bg-secondary: #ffffff;
      --bg-chat: #ffffff;
      --text-primary: #060426;
      --text-secondary: #666666;
      --text-muted: #666666;
      --accent: #1a45bc;
      --accent-light: #e0e7f8;
      --user-bg: #e0f2fe;
      --user-border: #7dd3fc;
      --ai-bg: #f0fdf4;
      --ai-border: #86efac;
      --annotation-bg: transparent;
      --annotation-border: #94a3b8;
      --annotation-text: #64748b;
      --transition-bg: #f3e8ff;
      --transition-border: #c084fc;
      --border-color: #e0e7f8;
      --radius: ${radius};
      --radius-lg: ${radiusLg};
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #0d1117;
        --bg-secondary: #161b22;
        --bg-chat: #161b22;
        --text-primary: #c9d1d9;
        --text-secondary: #8b949e;
        --text-muted: #8b949e;
        --accent: #58a6ff;
        --accent-light: #1f2937;
        --user-bg: #0c4a6e;
        --user-border: #0284c7;
        --ai-bg: #14532d;
        --ai-border: #22c55e;
        --annotation-bg: transparent;
        --annotation-border: #475569;
        --annotation-text: #94a3b8;
        --transition-bg: #4c1d95;
        --transition-border: #a855f7;
        --border-color: #30363d;
      }
    }

    /* Dark mode via data-theme attribute (for iframe sync with parent) */
    :root[data-theme="dark"] {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-chat: #161b22;
      --text-primary: #c9d1d9;
      --text-secondary: #8b949e;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --accent-light: #1f2937;
      --user-bg: #0c4a6e;
      --user-border: #0284c7;
      --ai-bg: #14532d;
      --ai-border: #22c55e;
      --annotation-bg: transparent;
      --annotation-border: #475569;
      --annotation-text: #94a3b8;
      --transition-bg: #4c1d95;
      --transition-border: #a855f7;
      --border-color: #30363d;
    }

    :root[data-theme="dark"] .play-overlay {
      background: rgba(0, 0, 0, 0.5);
    }

    :root[data-theme="dark"] .play-overlay-icon {
      background: rgba(255, 255, 255, 0.9);
    }

    ${colorOverrides}

    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .demo-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .demo-header {
      margin-bottom: 16px;
      padding-bottom: 12px;
    }

    .demo-header.hidden {
      display: none;
    }

    .demo-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .demo-title-link {
      color: inherit;
      text-decoration: none;
    }

    .demo-title-link:hover {
      text-decoration: underline;
    }

    .demo-description {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .demo-description a {
      color: var(--accent);
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
      padding: 16px;
      flex: 1;
      min-height: 350px;
      max-height: var(--chat-max-height, 500px);
      overflow-y: auto;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      transition: opacity 0.3s ease;
    }

    .chat-container.fading {
      opacity: 0;
    }

    /* Standalone mode: chat fills available space, controls stay visible */
    body:not(.in-iframe) .demo-container {
      height: calc(100vh - 32px);
      display: flex;
      flex-direction: column;
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
      background: transparent;
      padding: 0;
      margin: 0;
      overflow: hidden;
    }

    body.in-iframe .demo-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: transparent;
      padding: 0;
    }

    body.in-iframe .tabs {
      flex-shrink: 0;
    }

    body.in-iframe .chat-container {
      flex: 1;
      min-height: 0;
    }

    body.in-iframe .controls {
      flex-shrink: 0;
      margin-top: 12px;
      padding-top: 8px;
      padding-bottom: 8px;
    }

    .chat-messages {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 20px;
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
      background: rgba(0, 0, 0, 0.25);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: opacity 0.3s ease;
      z-index: 10;
    }

    .play-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .play-overlay-icon {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s ease;
    }

    .play-overlay:hover .play-overlay-icon {
      transform: scale(1.05);
    }

    .play-overlay-icon svg {
      margin-left: 4px;
    }

    @media (prefers-color-scheme: dark) {
      .play-overlay {
        background: rgba(0, 0, 0, 0.5);
      }
      .play-overlay-icon {
        background: rgba(255, 255, 255, 0.9);
      }
    }

    .message {
      max-width: 85%;
      opacity: 0;
      transform: translateY(10px);
    }

    .message.visible {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .message.user {
      align-self: flex-start;
    }

    .message.ai {
      align-self: flex-end;
      margin-right: 32px;
    }

    .message-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      color: var(--text-muted);
    }

    .message.ai .message-label {
      text-align: right;
    }

    .message-content {
      padding: 12px 16px;
      border-radius: var(--radius);
      border-left: 3px solid;
    }

    .message.user .message-content {
      background: var(--user-bg);
      border-color: var(--user-border);
    }

    .message.ai .message-content {
      background: var(--ai-bg);
      border-color: var(--ai-border);
    }

    .message-content pre {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 10px;
      overflow-x: auto;
      font-size: 12px;
      margin: 8px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .message-content code {
      font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
    }

    .annotation {
      position: relative;
      width: 100%;
      margin: 20px 0;
      padding: 0 0 0 16px;
      font-size: 14px;
      font-style: italic;
      color: var(--annotation-text);
      opacity: 0;
      transform: translateY(10px);
    }

    .annotation::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--annotation-border);
      border-radius: 2px;
    }

    .annotation.visible {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }

    .annotation-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--annotation-border);
      margin-bottom: 4px;
      font-style: normal;
    }

    .annotation-content {
      line-height: 1.5;
    }

    .transition {
      position: relative;
      width: 100%;
      margin: 20px 0;
      padding: 0 0 0 16px;
      font-size: 14px;
      font-weight: 500;
      font-style: italic;
      color: var(--transition-text, var(--text-muted));
      opacity: 0;
      transform: translateY(10px);
    }

    .transition::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--transition-border);
      border-radius: 2px;
    }

    .transition.visible {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }

    .scenario-ending {
      text-align: center;
      padding: 24px 20px;
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
      letter-spacing: 0.5px;
      font-size: 11px;
      margin-bottom: 4px;
    }

    .scenario-ending .next-title {
      font-weight: 600;
      font-size: 15px;
      color: var(--text-primary);
    }

    .controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      flex-wrap: wrap;
    }

    .control-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 14px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-primary);
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .control-btn:hover:not(:disabled) {
      background: var(--accent-light);
      border-color: var(--accent);
    }

    .control-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .control-btn.primary {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }

    .control-btn.primary:hover:not(:disabled) {
      opacity: 0.9;
    }

    .control-btn.icon-only {
      padding: 8px 10px;
    }

    .speed-select {
      padding: 8px 10px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-primary);
      border-radius: var(--radius);
      font-size: 13px;
      cursor: pointer;
    }

    .progress {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .timer-bar {
      position: absolute;
      bottom: 1px;
      left: 1px;
      height: 3px;
      width: 0%;
      background: var(--accent);
      opacity: 0;
      border-radius: 0 0 2px 10px;
      z-index: 5;
      transform-origin: left;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }

    .timer-bar.active {
      opacity: 0.6;
      transition: width 0.1s linear, opacity 0.2s ease;
    }

    .timer-circle {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 18px;
      height: 18px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 5;
      pointer-events: none;
    }

    .timer-circle.active {
      opacity: 0.6;
    }

    .timer-circle circle {
      fill: none;
      stroke: var(--accent);
      stroke-width: 2;
      stroke-dasharray: 44;
      stroke-dashoffset: 0;
      transform: rotate(-90deg);
      transform-origin: center;
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

      body.in-iframe .chat-container {
        max-height: 400px;
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

      .tabs {
        flex-direction: column;
        gap: 4px;
      }

      .tab {
        width: 100%;
        text-align: center;
      }

      .controls {
        flex-wrap: wrap;
        justify-content: center;
      }

      .control-btn {
        flex: 0 0 auto;
      }

      .control-btn.primary {
        order: -1;
        flex: 1 1 100%;
        justify-content: center;
        margin-bottom: 4px;
      }
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

        // Listen for theme changes from parent page
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
      var hasStarted = false;

      // DOM elements
      var chatMessages = document.getElementById('chat-messages');
      var playPauseBtn = document.getElementById('play-pause-btn');
      var playIcon = document.getElementById('play-icon');
      var pauseIcon = document.getElementById('pause-icon');
      var playPauseText = document.getElementById('play-pause-text');
      var resetBtn = document.getElementById('reset-btn');
      var speedSelect = document.getElementById('speed-select');
      var progressEl = document.getElementById('progress');
      var playOverlay = document.getElementById('play-overlay');
      var timerElement = document.getElementById('timer-element');
      var chatContainer = document.getElementById('chat-container');
      var tabs = document.querySelectorAll('.tab');

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

      function smoothScrollToBottom() {
        var container = chatMessages.parentElement;
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        } else {
          container.scrollTop = container.scrollHeight;
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
          footnote.style.cssText = 'margin: 8px 0 0 0; font-style: italic; font-size: 12px; color: var(--text-secondary);';
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

        // Toggle play/pause button icon and text
        if (isActivelyPlaying) {
          playIcon.style.display = 'none';
          pauseIcon.style.display = 'block';
          playPauseText.textContent = 'Pause';
          playPauseBtn.setAttribute('aria-label', 'Pause animation');
        } else {
          playIcon.style.display = 'block';
          pauseIcon.style.display = 'none';
          playPauseText.textContent = 'Play';
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
            smoothScrollToBottom();
          });
        } else {
          div.classList.add('visible');
          smoothScrollToBottom();
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
          smoothScrollToBottom();
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
            smoothScrollToBottom();
          });
        } else {
          element.classList.add('visible');
          smoothScrollToBottom();
        }

        currentStepIndex++;
        updateProgress();

        if (currentStepIndex < steps.length) {
          var delay = calculateDelay(step);
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
          var delay = calculateDelay(firstStep);
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

          // Keep overlay hidden to avoid flash
          playOverlay.classList.add('hidden');
          chatContainer.classList.remove('fading');

          // If was playing, continue playing; otherwise stay paused
          if (wasPlaying && !prefersReducedMotion) {
            play();
          } else if (prefersReducedMotion) {
            showAllInstantly();
          } else {
            // Stay paused - show initial preview but keep overlay hidden
            // User can click play button or canvas to start
            showInitialPreview();
          }
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

      speedSelect.addEventListener('change', function(e) {
        speed = parseFloat(e.target.value);
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

      // Initialize
      updateTabStates();
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
    <nav class="tabs" role="tablist">
      ${tabButtons}
    </nav>
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

  const css = generateCss(theme, hasMultipleScenarios, demo.meta.colors, cornerStyle);
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
        <div class="chat-messages" id="chat-messages"></div>
      </div>
      ${timerHtml}
      <div class="play-overlay" id="play-overlay" role="button" aria-label="Play demo" tabindex="0">
        <div class="play-overlay-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#1a45bc">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      </div>
    </div>

    <div class="controls">
      <button class="control-btn primary" id="play-pause-btn" aria-label="Play animation">
        <svg id="play-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <svg id="pause-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
        <span id="play-pause-text">Play</span>
      </button>
      <button class="control-btn" id="reset-btn" aria-label="Restart animation">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        Restart
      </button>
      <select class="speed-select" id="speed-select" aria-label="Animation speed">
        <option value="0.5">0.5x</option>
        <option value="1" selected>1x</option>
        <option value="2">2x</option>
        <option value="4">4x</option>
      </select>
      <span class="progress" id="progress"></span>
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
  await Bun.write(outputPath, html);
}

