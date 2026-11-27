const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/marriages/questions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out});
const {questions,visibleQuestions}=out;
assert.equal(questions.length,38);assert.equal(new Set(questions.map(q=>q.key)).size,38);assert.equal(new Set(questions.map(q=>q.pillar)).size,10);
assert.equal(visibleQuestions('discernment').length,38);assert.equal(visibleQuestions('preparation').length,35);
assert.equal(questions.filter(q=>q.clinical).length,4);assert.ok(questions.filter(q=>q.clinical).every(q=>q.visibility==='sealed'));
assert.ok(visibleQuestions('preparation').every(q=>q.track!=='discernment'));
console.log('PASS: 38 unique questions, 10 pillars, track filtering and sealed health defaults');
