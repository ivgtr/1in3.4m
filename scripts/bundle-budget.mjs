import { gzipSync } from 'node:zlib';

// Budgets cover the entry plus each screen's static dependency closure, not just its largest file.
const runtime = 'game/GameRuntime.jsx';
const game = 'pages/GamePage.jsx';
const observe = 'pages/ObservePage.jsx';
const engine = ['domain/model.js', 'domain/model-data.json', 'game/GameProvider.jsx'];
export const scenarios = [
  { name: 'welcome', sources: [game], bytes: 340_000, gzip: 110_000, exclude: engine },
  { name: 'about', sources: ['pages/AboutPage.jsx'], bytes: 360_000, gzip: 120_000, exclude: engine },
  { name: 'encounter', sources: [game, runtime, 'pages/EncounterPage.jsx'], bytes: 505_000, gzip: 172_000, exclude: ['components/Result.jsx', 'components/People.jsx'] },
  { name: 'resume', sources: [game, runtime, observe], bytes: 530_000, gzip: 181_000, exclude: ['components/Result.jsx', 'components/People.jsx', 'components/EvidenceGuide.jsx'] },
  { name: 'decision', sources: [game, runtime, observe, 'components/DecisionFlow.jsx'], bytes: 540_000, gzip: 186_000, exclude: ['components/Result.jsx', 'components/People.jsx'] },
];

export function checkBundle(output, checks = scenarios, maxChunkBytes = 350_000) {
  const chunks = output.filter(item => item.type === 'chunk');
  const byFile = new Map(chunks.map(chunk => [chunk.fileName, chunk]));
  const contains = (chunk, source) => Object.keys(chunk.modules).some(id => id.replaceAll('\\', '/').endsWith(`/src/${source}`));
  const failures = [];
  for (const chunk of chunks) {
    if (Buffer.byteLength(chunk.code) > maxChunkBytes) failures.push(`${chunk.fileName}: single chunk exceeds ${maxChunkBytes} bytes`);
  }
  const measurements = checks.map(check => {
    const included = new Set();
    function visit(chunk) {
      if (!chunk) throw new Error(`${check.name}: missing output chunk`);
      if (included.has(chunk)) return;
      included.add(chunk);
      for (const file of chunk.imports) visit(byFile.get(file));
    }
    const entries = chunks.filter(chunk => chunk.isEntry);
    if (entries.length !== 1) throw new Error('Expected one application entry');
    visit(entries[0]);
    for (const source of check.sources) {
      const chunk = chunks.find(candidate => contains(candidate, source));
      if (!chunk) throw new Error(`${check.name}: source missing from output: ${source}`);
      visit(chunk);
    }
    const selected = [...included];
    const bytes = selected.reduce((sum, chunk) => sum + Buffer.byteLength(chunk.code), 0);
    const gzip = selected.reduce((sum, chunk) => sum + gzipSync(chunk.code).length, 0);
    if (bytes > check.bytes || gzip > check.gzip) failures.push(`${check.name}: ${bytes}/${gzip} bytes (raw/gzip), budget ${check.bytes}/${check.gzip}`);
    for (const source of check.exclude) {
      if (selected.some(chunk => contains(chunk, source))) failures.push(`${check.name}: eagerly includes ${source}; restore the feature's lazy boundary`);
    }
    return { screen: check.name, bytes, gzip, chunks: selected.length };
  });
  if (failures.length) throw new Error(`Bundle budget failed:\n${failures.join('\n')}`);
  return measurements;
}
