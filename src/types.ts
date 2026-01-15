/**
 * Conversation Replay - Type Definitions
 *
 * Defines the schema for YAML scenario files.
 */

export type Theme = 'chat' | 'email' | 'slack' | 'terminal' | 'generic';
export type ParticipantRole = 'left' | 'right';
export type StepType = 'message' | 'annotation' | 'transition';
export type TimerStyle = 'bar' | 'circle';
export type CornerStyle = 'rounded' | 'straight';

/**
 * Speed/timing configuration for frame progression
 */
export interface SpeedConfig {
  /** Minimum delay between frames in ms (default: 3000) */
  minDelay?: number;
  /** Maximum delay between frames in ms (default: 8000) */
  maxDelay?: number;
  /** Milliseconds per word for reading time calculation (default: 200) */
  msPerWord?: number;
  /** Multiplier for annotation display time (default: 1.15) */
  annotationMultiplier?: number;
  /** Delay to show "Up Next" before transitioning in ms (default: 2500) */
  upNextDelay?: number;
}

export interface Participant {
  id: string;
  label: string;
  role: ParticipantRole;
}

export interface MessageStep {
  type: 'message';
  from: string;  // participant id
  content: string;
  codeBlock?: string;
  footnote?: string;
}

export interface AnnotationStep {
  type: 'annotation';
  content: string;
}

export interface TransitionStep {
  type: 'transition';
  content: string;
}

export type Step = MessageStep | AnnotationStep | TransitionStep;

/**
 * A single scenario (one tab in a multi-scenario demo)
 */
export interface Scenario {
  /** Unique identifier for this scenario (used in tabs) */
  id: string;
  /** Display title shown in tab */
  title: string;
  /** Participants in this scenario */
  participants: Participant[];
  /** Steps in this scenario */
  steps: Step[];
}

/**
 * Custom color configuration
 */
export interface ColorConfig {
  /** Primary accent color (used for buttons, links) */
  accent?: string;
  /** Page background color (when not embedded) */
  pageBg?: string;
  /** Chat canvas/container background color */
  canvasBg?: string;
  /** Left participant message background */
  leftBg?: string;
  /** Left participant message border */
  leftBorder?: string;
  /** Right participant message background */
  rightBg?: string;
  /** Right participant message border */
  rightBorder?: string;
  /** Inactive tab text color */
  tabInactiveColor?: string;
  /** Annotation text color */
  annotationText?: string;
  /** Annotation accent/border color */
  annotationBorder?: string;
}

/**
 * Overall demo metadata
 */
export interface DemoMeta {
  title: string;
  description?: string;
  theme?: Theme;
  /** Link back to related article */
  articleUrl?: string;
  /** Whether to auto-hide header when embedded in iframe */
  hideHeaderInIframe?: boolean;
  /** Whether to auto-advance to next scenario when one completes */
  autoAdvance?: boolean;
  /** Label for annotation steps (default: "Behind the Scenes") */
  annotationLabel?: string;
  /** Custom colors */
  colors?: ColorConfig;
  /** Timer display style: 'bar' (horizontal line) or 'circle' (circular countdown). Default: 'circle' */
  timerStyle?: TimerStyle;
  /** Corner style for chat container and bubbles. Default: 'rounded' */
  cornerStyle?: CornerStyle;
  /** Speed/timing configuration for frame progression */
  speed?: SpeedConfig;
  /** Initial blur amount in pixels for the play overlay (default: 1) */
  initialBlur?: number;
}

/**
 * A complete demo with one or more scenarios
 */
export interface Demo {
  meta: DemoMeta;
  scenarios: Scenario[];
}

export interface BuildOptions {
  outputPath: string;
  theme?: Theme;
  /** Include demo header with title/description */
  includeHeader?: boolean;
}
