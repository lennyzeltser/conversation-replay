#!/usr/bin/env node
/**
 * Conversation Replay - CLI
 *
 * Usage:
 *   conversation-replay build <scenario.yaml> -o <output.html>
 *   conversation-replay validate <scenario.yaml>
 */

import { parseArgs } from 'util';
import { loadDemo, ParseError } from './parser';
import { buildDemo } from './generator';
import type { Theme } from './types';

const HELP = `
conversation-replay - Create animated conversation demos from YAML

Usage:
  conversation-replay build <scenario.yaml> -o <output.html> [options]
  conversation-replay validate <scenario.yaml>
  conversation-replay --help

Commands:
  build      Generate HTML from a scenario file
  validate   Check a scenario file for errors

Options:
  -o, --output <path>   Output HTML file path (required for build)
  --theme <theme>       Override theme (chat, email, slack, terminal, generic)
  --no-header           Exclude the demo header
  -h, --help            Show this help message

Examples:
  conversation-replay build demo.yaml -o demo.html
  conversation-replay build demo.yaml -o demo.html --theme email
  conversation-replay validate demo.yaml
`;

const VALID_THEMES = ['chat', 'email', 'slack', 'terminal', 'generic'];

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      output: { type: 'string', short: 'o' },
      theme: { type: 'string' },
      'no-header': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const command = positionals[0];
  const inputFile = positionals[1];

  if (!inputFile) {
    console.error('Error: No input file specified\n');
    console.log(HELP);
    process.exit(1);
  }

  // Validate theme if provided
  if (values.theme && !VALID_THEMES.includes(values.theme)) {
    console.error(`Error: Invalid theme "${values.theme}"`);
    console.error(`Valid themes: ${VALID_THEMES.join(', ')}`);
    process.exit(1);
  }

  try {
    switch (command) {
      case 'build':
        await handleBuild(inputFile, values);
        break;

      case 'validate':
        await handleValidate(inputFile);
        break;

      default:
        console.error(`Error: Unknown command "${command}"\n`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof ParseError) {
      console.error(`Parse Error: ${error.message}`);
      if (error.path) {
        console.error(`  File: ${error.path}`);
      }
      process.exit(1);
    }

    throw error;
  }
}

async function handleBuild(
  inputFile: string,
  options: { output?: string; theme?: string; 'no-header'?: boolean }
) {
  if (!options.output) {
    console.error('Error: Output file required (-o <path>)\n');
    console.log('Usage: conversation-replay build <input.yaml> -o <output.html>');
    process.exit(1);
  }

  console.log(`Loading ${inputFile}...`);
  const demo = await loadDemo(inputFile);

  console.log(`Building ${options.output}...`);
  await buildDemo(demo, options.output, {
    theme: options.theme as Theme | undefined,
    includeHeader: !options['no-header'],
  });

  console.log(`Done! Generated ${options.output}`);
  console.log(`  Title: ${demo.meta.title}`);
  console.log(`  Scenarios: ${demo.scenarios.length}`);
  for (const scenario of demo.scenarios) {
    const stepCount = scenario.steps.length;
    const participants = scenario.participants.map(p => p.label).join(', ');
    console.log(`    - ${scenario.title}: ${stepCount} steps (${participants})`);
  }
}

async function handleValidate(inputFile: string) {
  console.log(`Validating ${inputFile}...`);
  const demo = await loadDemo(inputFile);

  console.log('Valid!');
  console.log(`  Title: ${demo.meta.title}`);
  console.log(`  Theme: ${demo.meta.theme ?? 'chat (default)'}`);
  console.log(`  Scenarios: ${demo.scenarios.length}`);

  for (const scenario of demo.scenarios) {
    console.log(`\n  Scenario: ${scenario.title} (${scenario.id})`);
    console.log(`    Participants:`);
    for (const p of scenario.participants) {
      console.log(`      - ${p.label} (${p.id}, ${p.role})`);
    }

    // Count step types
    const counts = { message: 0, annotation: 0, transition: 0 };
    for (const step of scenario.steps) {
      if (step.type === 'message') counts.message++;
      else if (step.type === 'annotation') counts.annotation++;
      else if (step.type === 'transition') counts.transition++;
    }

    console.log(`    Steps: ${scenario.steps.length}`);
    console.log(`      - Messages: ${counts.message}`);
    if (counts.annotation > 0) console.log(`      - Annotations: ${counts.annotation}`);
    if (counts.transition > 0) console.log(`      - Transitions: ${counts.transition}`);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
