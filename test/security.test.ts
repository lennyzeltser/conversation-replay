/**
 * Regression tests for the input-handling boundaries of the generator.
 *
 * Run with: bun test
 */

import { describe, expect, test } from 'bun:test';
import { parseDemo } from '../src/parser';
import { generateHtml, isSafeUrl, jsonForScript, parseMarkdownLinks } from '../src/generator';

const LINE_SEPARATOR = String.fromCharCode(0x2028);

function buildDemoHtml(yaml: string): string {
  return generateHtml(parseDemo(yaml), { outputPath: '' });
}

function minimalYaml(extraMeta: string, content: string): string {
  return `
meta:
  title: "T"
${extraMeta}
scenarios:
  - id: s1
    title: "S"
    participants:
      - id: a
        label: "A"
    steps:
      - type: message
        from: a
        content: ${JSON.stringify(content)}
`;
}

describe('jsonForScript', () => {
  test('escapes the characters that can end or alter an inline script', () => {
    const out = jsonForScript('</script><!-- & ' + LINE_SEPARATOR);
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).not.toContain('&');
    expect(out).not.toContain(LINE_SEPARATOR);
    expect(out).toContain('\\u003c/script\\u003e');
  });

  test('round-trips through JSON.parse and a JavaScript literal', () => {
    const input = 'a </script> & <!-- ' + LINE_SEPARATOR + ' "q" \\ end';
    expect(JSON.parse(jsonForScript(input))).toBe(input);
    expect(new Function('return ' + jsonForScript(input))()).toBe(input);
  });
});

describe('isSafeUrl', () => {
  test('allows the link forms authors use', () => {
    for (const url of [
      'https://example.com/a?x=1&y=2',
      'http://example.com',
      '/related-article',
      '#top',
      '//cdn.example.com/x',
      '?q=1',
      'relative/page.html',
      'mailto:a@b.c',
      'tel:+15551234',
      'MAILTO:a@b.c',
    ]) {
      expect(isSafeUrl(url)).toBe(true);
    }
  });

  test('rejects script schemes including obfuscated forms', () => {
    for (const url of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'java\tscript:alert(1)',
      'java\nscript:alert(1)',
      ' javascript:alert(1)',
      '\u0001javascript:alert(1)',
      'data:text/html,x',
      'vbscript:x',
      'blob:https://x',
      'file:///etc/passwd',
      'http://[',
    ]) {
      expect(isSafeUrl(url)).toBe(false);
    }
  });
});

describe('parseMarkdownLinks', () => {
  test('renders safe links once-escaped and unsafe links as text', () => {
    const out = parseMarkdownLinks('[a](https://x.test/?p=1&q=2) [b](java\tscript:alert(1)) <i>');
    expect(out).toContain('<a href="https://x.test/?p=1&amp;q=2">a</a>');
    expect(out).not.toContain('&amp;amp;');
    expect(out).not.toContain('href="java');
    expect(out).toContain('[b](java\tscript:alert(1))');
    expect(out).toContain('&lt;i&gt;');
  });
});

describe('generateHtml', () => {
  test('message content cannot close the inline script', () => {
    const html = buildDemoHtml(minimalYaml('', 'x </script><img src=x onerror=alert(1)> y'));
    // Exactly one closing script tag: the generator's own.
    expect(html.split('</script>').length - 1).toBe(1);
    expect(html).toContain('\\u003c/script\\u003e');
  });

  test('articleUrl with a script scheme is not emitted as a link', () => {
    const html = buildDemoHtml(minimalYaml('  articleUrl: "java\\tscript:alert(1)"', 'hi'));
    expect(html).not.toContain('href="java');
    expect(html).toContain('<h1 class="demo-title">T</h1>');
  });

  test('articleUrl with a normal path is emitted as a link', () => {
    const html = buildDemoHtml(minimalYaml('  articleUrl: "/interactive-replays"', 'hi'));
    expect(html).toContain('<a href="/interactive-replays" class="demo-title-link">T</a>');
  });

  test('annotation colors are validated and applied', () => {
    const html = buildDemoHtml(
      minimalYaml('  colors:\n    annotationText: "#475569"\n    annotationBorder: "#cbd5e1"', 'hi')
    );
    expect(html).toContain('--annotation-text: #475569;');
    expect(html).toContain('--annotation-border: #cbd5e1;');
    expect(() => buildDemoHtml(minimalYaml('  colors:\n    annotationText: "red;}</style>"', 'hi'))).toThrow();
  });

  test('hideHeaderInIframe is honored', () => {
    expect(buildDemoHtml(minimalYaml('', 'hi'))).toContain('var hideHeaderInIframe = true;');
    expect(buildDemoHtml(minimalYaml('  hideHeaderInIframe: false', 'hi'))).toContain('var hideHeaderInIframe = false;');
  });
});
