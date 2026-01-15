/**
 * Conversation Replay - YAML Parser
 *
 * Parses and validates scenario YAML files.
 */

import { parse } from 'yaml';
import type { Demo, DemoMeta, Scenario, Step, MessageStep, Participant, Theme, ColorConfig, TimerStyle, CornerStyle, SpeedConfig } from './types';

const VALID_THEMES: Theme[] = ['chat', 'email', 'slack', 'terminal', 'generic'];
const VALID_TIMER_STYLES: TimerStyle[] = ['bar', 'circle'];
const VALID_CORNER_STYLES: CornerStyle[] = ['rounded', 'straight'];

export class ParseError extends Error {
  constructor(message: string, public path?: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Parse YAML content into a Demo object
 */
export function parseDemo(yamlContent: string, filePath?: string): Demo {
  let raw: unknown;

  try {
    raw = parse(yamlContent);
  } catch (e) {
    throw new ParseError(`Invalid YAML syntax: ${(e as Error).message}`, filePath);
  }

  if (!raw || typeof raw !== 'object') {
    throw new ParseError('Demo must be an object', filePath);
  }

  const data = raw as Record<string, unknown>;

  if (!Array.isArray(data.scenarios)) {
    throw new ParseError('Demo must have a "scenarios" array', filePath);
  }

  const meta = validateDemoMeta(data.meta, filePath);
  const scenarios = validateScenarios(data.scenarios as unknown[], filePath);

  return { meta, scenarios };
}

function validateDemoMeta(raw: unknown, filePath?: string): DemoMeta {
  if (!raw || typeof raw !== 'object') {
    throw new ParseError('meta section is required', filePath);
  }

  const meta = raw as Record<string, unknown>;

  if (typeof meta.title !== 'string' || !meta.title.trim()) {
    throw new ParseError('meta.title is required and must be a non-empty string', filePath);
  }

  const result: DemoMeta = {
    title: meta.title.trim(),
  };

  if (meta.description !== undefined) {
    if (typeof meta.description !== 'string') {
      throw new ParseError('meta.description must be a string', filePath);
    }
    result.description = meta.description.trim();
  }

  if (meta.theme !== undefined) {
    if (!VALID_THEMES.includes(meta.theme as Theme)) {
      throw new ParseError(
        `meta.theme must be one of: ${VALID_THEMES.join(', ')}`,
        filePath
      );
    }
    result.theme = meta.theme as Theme;
  }

  if (meta.articleUrl !== undefined) {
    if (typeof meta.articleUrl !== 'string') {
      throw new ParseError('meta.articleUrl must be a string', filePath);
    }
    result.articleUrl = meta.articleUrl;
  }

  if (meta.hideHeaderInIframe !== undefined) {
    result.hideHeaderInIframe = Boolean(meta.hideHeaderInIframe);
  }

  if (meta.autoAdvance !== undefined) {
    result.autoAdvance = Boolean(meta.autoAdvance);
  }

  if (meta.annotationLabel !== undefined) {
    if (typeof meta.annotationLabel !== 'string') {
      throw new ParseError('meta.annotationLabel must be a string', filePath);
    }
    result.annotationLabel = meta.annotationLabel.trim();
  }

  if (meta.colors !== undefined) {
    result.colors = validateColors(meta.colors, filePath);
  }

  if (meta.timerStyle !== undefined) {
    if (!VALID_TIMER_STYLES.includes(meta.timerStyle as TimerStyle)) {
      throw new ParseError(
        `meta.timerStyle must be one of: ${VALID_TIMER_STYLES.join(', ')}`,
        filePath
      );
    }
    result.timerStyle = meta.timerStyle as TimerStyle;
  }

  if (meta.cornerStyle !== undefined) {
    if (!VALID_CORNER_STYLES.includes(meta.cornerStyle as CornerStyle)) {
      throw new ParseError(
        `meta.cornerStyle must be one of: ${VALID_CORNER_STYLES.join(', ')}`,
        filePath
      );
    }
    result.cornerStyle = meta.cornerStyle as CornerStyle;
  }

  if (meta.speed !== undefined) {
    result.speed = validateSpeedConfig(meta.speed, filePath);
  }

  return result;
}

function validateSpeedConfig(raw: unknown, filePath?: string): SpeedConfig {
  if (!raw || typeof raw !== 'object') {
    throw new ParseError('meta.speed must be an object', filePath);
  }

  const speed = raw as Record<string, unknown>;
  const result: SpeedConfig = {};

  const numericFields: (keyof SpeedConfig)[] = [
    'minDelay', 'maxDelay', 'msPerWord', 'annotationMultiplier', 'upNextDelay'
  ];

  for (const field of numericFields) {
    if (speed[field] !== undefined) {
      const value = speed[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new ParseError(
          `meta.speed.${field} must be a positive number`,
          filePath
        );
      }
      result[field] = value;
    }
  }

  // Validate logical constraints
  if (result.minDelay !== undefined && result.maxDelay !== undefined) {
    if (result.minDelay > result.maxDelay) {
      throw new ParseError(
        'meta.speed.minDelay cannot be greater than meta.speed.maxDelay',
        filePath
      );
    }
  }

  return result;
}

/**
 * Validate a CSS color value to prevent CSS injection attacks.
 * Allows: hex colors, rgb/rgba/hsl/hsla, named colors, CSS variables
 * Blocks: semicolons, braces, and other CSS injection attempts
 */
function isValidCssColor(value: string): boolean {
  // Block obvious injection attempts
  if (/[;{}]/.test(value)) return false;
  if (/url\s*\(/i.test(value)) return false;
  if (/expression\s*\(/i.test(value)) return false;
  if (/javascript:/i.test(value)) return false;

  // Allow common color formats
  const validPatterns = [
    /^#[0-9a-f]{3,8}$/i,                          // hex colors
    /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i,   // rgb()
    /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i, // rgba()
    /^hsl\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*\)$/i,       // hsl()
    /^hsla\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*,\s*[\d.]+\s*\)$/i, // hsla()
    /^var\(--[a-z0-9-]+\)$/i,                     // CSS variables
    /^[a-z]+$/i,                                   // named colors (red, blue, etc.)
    /^transparent$/i,
    /^inherit$/i,
    /^currentColor$/i,
  ];

  return validPatterns.some(pattern => pattern.test(value.trim()));
}

function validateColors(raw: unknown, filePath?: string): ColorConfig {
  if (!raw || typeof raw !== 'object') {
    throw new ParseError('meta.colors must be an object', filePath);
  }

  const colors = raw as Record<string, unknown>;
  const result: ColorConfig = {};

  const colorFields: (keyof ColorConfig)[] = [
    'accent', 'pageBg', 'canvasBg', 'leftBg', 'leftBorder',
    'rightBg', 'rightBorder', 'tabInactiveColor'
  ];

  for (const field of colorFields) {
    if (colors[field] !== undefined) {
      if (typeof colors[field] !== 'string') {
        throw new ParseError(`meta.colors.${field} must be a string`, filePath);
      }
      const colorValue = colors[field] as string;
      if (!isValidCssColor(colorValue)) {
        throw new ParseError(
          `meta.colors.${field} contains invalid CSS color value: "${colorValue}"`,
          filePath
        );
      }
      result[field] = colorValue;
    }
  }

  return result;
}

function validateScenarios(raw: unknown[], filePath?: string): Scenario[] {
  if (raw.length === 0) {
    throw new ParseError('at least one scenario is required', filePath);
  }

  const ids = new Set<string>();

  return raw.map((s, i) => {
    if (!s || typeof s !== 'object') {
      throw new ParseError(`scenarios[${i}] must be an object`, filePath);
    }

    const scenario = s as Record<string, unknown>;
    const prefix = `scenarios[${i}]`;

    // Validate id
    if (typeof scenario.id !== 'string' || !scenario.id.trim()) {
      throw new ParseError(`${prefix}.id is required`, filePath);
    }

    const id = scenario.id.trim();
    if (ids.has(id)) {
      throw new ParseError(`duplicate scenario id: ${id}`, filePath);
    }
    ids.add(id);

    // Validate title
    if (typeof scenario.title !== 'string' || !scenario.title.trim()) {
      throw new ParseError(`${prefix}.title is required`, filePath);
    }

    // Validate participants
    const participants = validateParticipants(scenario.participants, prefix, filePath);

    // Validate steps
    const steps = validateSteps(scenario.steps, participants, prefix, filePath);

    return {
      id,
      title: scenario.title.trim(),
      participants,
      steps,
    };
  });
}

function validateParticipants(
  raw: unknown,
  prefix: string,
  filePath?: string
): Participant[] {
  if (!Array.isArray(raw)) {
    throw new ParseError(`${prefix}.participants must be an array`, filePath);
  }

  if (raw.length === 0) {
    throw new ParseError(`${prefix}: at least one participant is required`, filePath);
  }

  const ids = new Set<string>();

  return raw.map((p, i) => {
    if (!p || typeof p !== 'object') {
      throw new ParseError(`${prefix}.participants[${i}] must be an object`, filePath);
    }

    const participant = p as Record<string, unknown>;

    if (typeof participant.id !== 'string' || !participant.id.trim()) {
      throw new ParseError(`${prefix}.participants[${i}].id is required`, filePath);
    }

    const id = participant.id.trim();
    if (ids.has(id)) {
      throw new ParseError(`${prefix}: duplicate participant id: ${id}`, filePath);
    }
    ids.add(id);

    if (typeof participant.label !== 'string' || !participant.label.trim()) {
      throw new ParseError(`${prefix}.participants[${i}].label is required`, filePath);
    }

    const role = participant.role ?? 'left';
    if (role !== 'left' && role !== 'right') {
      throw new ParseError(
        `${prefix}.participants[${i}].role must be 'left' or 'right'`,
        filePath
      );
    }

    return {
      id,
      label: participant.label.trim(),
      role: role as 'left' | 'right',
    };
  });
}

function validateSteps(
  raw: unknown,
  participants: Participant[],
  prefix: string,
  filePath?: string
): Step[] {
  if (!Array.isArray(raw)) {
    throw new ParseError(`${prefix}.steps must be an array`, filePath);
  }

  if (raw.length === 0) {
    throw new ParseError(`${prefix}: at least one step is required`, filePath);
  }

  const participantIds = new Set(participants.map(p => p.id));

  return raw.map((s, i) => {
    if (!s || typeof s !== 'object') {
      throw new ParseError(`${prefix}.steps[${i}] must be an object`, filePath);
    }

    const step = s as Record<string, unknown>;
    const type = step.type ?? 'message';
    const stepPrefix = `${prefix}.steps[${i}]`;

    if (type === 'annotation') {
      if (typeof step.content !== 'string' || !step.content.trim()) {
        throw new ParseError(`${stepPrefix}.content is required for annotation`, filePath);
      }
      return { type: 'annotation' as const, content: step.content.trim() };
    }

    if (type === 'transition') {
      if (typeof step.content !== 'string' || !step.content.trim()) {
        throw new ParseError(`${stepPrefix}.content is required for transition`, filePath);
      }
      return { type: 'transition' as const, content: step.content.trim() };
    }

    if (type === 'message') {
      if (typeof step.from !== 'string' || !step.from.trim()) {
        throw new ParseError(`${stepPrefix}.from is required for message`, filePath);
      }

      const from = step.from.trim();
      if (!participantIds.has(from)) {
        throw new ParseError(
          `${stepPrefix}.from "${from}" is not a valid participant id`,
          filePath
        );
      }

      if (typeof step.content !== 'string' || !step.content.trim()) {
        throw new ParseError(`${stepPrefix}.content is required for message`, filePath);
      }

      const result: MessageStep = {
        type: 'message',
        from,
        content: step.content.trim(),
      };

      if (step.codeBlock !== undefined) {
        if (typeof step.codeBlock !== 'string') {
          throw new ParseError(`${stepPrefix}.codeBlock must be a string`, filePath);
        }
        result.codeBlock = step.codeBlock;
      }

      if (step.footnote !== undefined) {
        if (typeof step.footnote !== 'string') {
          throw new ParseError(`${stepPrefix}.footnote must be a string`, filePath);
        }
        result.footnote = step.footnote.trim();
      }

      return result;
    }

    throw new ParseError(
      `${stepPrefix}.type must be 'message', 'annotation', or 'transition'`,
      filePath
    );
  });
}

/**
 * Load and parse a demo from a file path
 */
export async function loadDemo(filePath: string): Promise<Demo> {
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    throw new ParseError(`File not found: ${filePath}`, filePath);
  }

  const content = await file.text();
  return parseDemo(content, filePath);
}

