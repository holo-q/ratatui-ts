import { describe, it, expect } from 'vitest';
import { Paragraph, headlessRender, loadLibrary } from '../src';

describe('Paragraph headless rendering', () => {
  it('renders simple text with title', () => {
    // If the library is not available, skip
    try { loadLibrary(); } catch { return; }
    const p = Paragraph.fromText('Hello');
    p.setBlockTitle('Box', true);
    const out = headlessRender(10, 3, p);
    expect(out.split('\n').length).toBe(3);
    expect(out).toContain('Hello');
  });
});

