import { describe, expect, it } from 'vitest';
import { serialize } from '@/serializer';
import { simpleProject } from '../fixtures/simple';

describe('serializer — simple name generator', () => {
  const { lists, html } = serialize(simpleProject);

  it('emits the lists panel with 2-space indentation and weights', () => {
    expect(lists).toBe(
      'output\n' +
        '  [firstName] [lastName]\n' +
        '\n' +
        'firstName\n' +
        '  Alice\n' +
        '  Bob\n' +
        '  Carol ^2\n' +
        '\n' +
        'lastName\n' +
        '  Smith\n' +
        '  Nakamura\n',
    );
  });

  it('emits the HTML panel with outputRef, button, and update()', () => {
    expect(html).toBe(
      '<div style="font-size: 1.5em">[output]</div>\n' +
        '<br>\n' +
        '<span id="out">[output]</span>\n' +
        '<button onclick="update(out)">Generate</button>',
    );
  });
});
