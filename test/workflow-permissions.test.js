import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

for(const file of ['verify.yml','ui-screenshots.yml']){
 test(file+' uses read-only GitHub token and never pushes code',async()=>{
  const text=await readFile(new URL('../.github/workflows/'+file,import.meta.url),'utf8');
  assert.match(text,/^permissions:\s*\n\s+contents:\s*read\s*$/m);
  assert.doesNotMatch(text,/contents:\s*write|git\s+push|gh\s+api\s+.*contents|peter-evans\/create-pull-request/i);
  assert.match(text,/npm ci --no-audit --no-fund/);
 });
}
