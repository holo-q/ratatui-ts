import { Terminal, Paragraph, rect, widgetKind, FrameBuilder, headlessRenderFrame, eventKind } from '../src';

async function main() {
  const term = Terminal.init();
  try {
    let running = true;
    let counter = 0;
    while (running) {
      // Build a simple frame
      const p = Paragraph.fromText(`Tick ${counter}`);
      p.setBlockTitle('Loop', true);
      const fb = new FrameBuilder().add(widgetKind.Paragraph, (p as any).ptr, rect(0, 0, 40, 3));
      term.clear();
      term.drawParagraphIn(p, rect(0, 0, 40, 3));
      p.free();

      const evt = Terminal.nextEvent(250);
      if (evt) {
        if (evt.kind === eventKind.Key && evt.key.code === 1 /* Enter */) {
          running = false;
        }
      }
      counter++;
    }
  } finally {
    term.free();
  }
}

main().catch(e => { console.error(e); process.exit(1); });

