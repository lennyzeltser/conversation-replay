#!/usr/bin/env node
/**
 * Conversation Replay - CLI
 *
 * Usage:
 *   conversation-replay build <scenario.yaml> -o <output.html>
 *   conversation-replay validate <scenario.yaml>
 *   conversation-replay init <output.yaml>
 *   conversation-replay schema [section]
 */

import { parseArgs } from 'util';
import { loadDemo, ParseError } from './parser';
import { buildDemo } from './generator';
import { generateTemplate, getSchemaReference, jsonSchema } from './schema';
import type { Theme } from './types';
import packageJson from '../package.json';

const HELP = `
conversation-replay - Create annotated replays of text conversations from YAML

Usage:
  conversation-replay build <scenario.yaml> -o <output.html> [options]
  conversation-replay validate <scenario.yaml>
  conversation-replay init <output.yaml> [--theme <theme>]
  conversation-replay schema [section] [--json]
  conversation-replay info
  conversation-replay --help | --version

Commands:
  build      Generate HTML from a scenario file
  validate   Check a scenario file for errors
  init       Create a starter YAML template with documentation
  schema     Show schema reference (sections: meta, colors, speed, steps)
  info       Show tool name, version, author, and links

Options:
  -o, --output <path>   Output HTML file path (required for build)
  --theme <theme>       Override theme (chat, email, slack, terminal, generic)
  --no-header           Exclude the demo header
  --json                Output JSON schema (for schema command)
  -h, --help            Show this help message
  -v, --version         Show version number

Examples:
  conversation-replay build demo.yaml -o demo.html
  conversation-replay init my-demo.yaml
  conversation-replay schema meta
  conversation-replay info
`;

const VALID_THEMES = ['chat', 'email', 'slack', 'terminal', 'generic'];

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      output: { type: 'string', short: 'o' },
      theme: { type: 'string' },
      'no-header': { type: 'boolean' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
    allowPositionals: true,
  });

  if (values.version) {
    console.log(`conversation-replay v${packageJson.version}`);
    process.exit(0);
  }

  if (values.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const command = positionals[0];
  const arg1 = positionals[1];

  // Commands that don't require an input file
  if (command === 'schema') {
    handleSchema(arg1, values.json);
    process.exit(0);
  }

  if (command === 'info') {
    handleInfo();
    process.exit(0);
  }

  if (!arg1) {
    console.error('Error: No file specified\n');
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
        await handleBuild(arg1, values);
        break;

      case 'validate':
        await handleValidate(arg1);
        break;

      case 'init':
        await handleInit(arg1, values.theme as Theme | undefined);
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

async function handleInit(outputFile: string, theme?: Theme) {
  const fs = await import('fs/promises');

  // Check if file exists
  try {
    await fs.access(outputFile);
    console.error(`Error: File already exists: ${outputFile}`);
    console.error('Use a different filename or delete the existing file.');
    process.exit(1);
  } catch {
    // File doesn't exist, good to proceed
  }

  const template = generateTemplate(theme);
  await fs.writeFile(outputFile, template, 'utf-8');

  console.log(`Created ${outputFile}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Edit ${outputFile} to define your conversation`);
  console.log(`  2. Validate: conversation-replay validate ${outputFile}`);
  console.log(`  3. Build: conversation-replay build ${outputFile} -o output.html`);
  console.log('');
  console.log('For schema reference: conversation-replay schema');
}

function handleInfo() {
  console.log(`
Conversation Replay v${packageJson.version}
https://github.com/lennyzeltser/conversation-replay

Created by Lenny Zeltser
https://zeltser.com
`.trim());
}

function handleSchema(section?: string, outputJson?: boolean) {
  if (outputJson) {
    console.log(JSON.stringify(jsonSchema, null, 2));
    return;
  }

  console.log(getSchemaReference(section));
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
