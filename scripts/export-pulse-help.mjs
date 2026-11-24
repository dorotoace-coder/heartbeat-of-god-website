import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('src/lib/help/guides.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, {exports, require: createRequire(import.meta.url)});
writeFileSync('public/help/pulse-os-tutorial-source.txt', exports.videoSourcePack());
if (process.env.HELP_DATA_OUTPUT) writeFileSync(process.env.HELP_DATA_OUTPUT, JSON.stringify({edition:exports.guideEdition,start:exports.startSteps,guides:exports.pulseGuides},null,2));
console.log(`Exported ${exports.pulseGuides.length} guides and ${exports.pulseGuides.filter(guide=>guide.narration).length} video scripts.`);
