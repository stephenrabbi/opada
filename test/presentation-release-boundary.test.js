import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('presentation homepage directs owner and staff visitors to existing sample views',async()=>{
 const page=await read('app/page.jsx');
 assert.match(page,/href="\/demo\?view=overview"/);
 assert.match(page,/href="\/demo\?view=staff"/);
 assert.doesNotMatch(page,/href="\/(owner|staff)"/);
});

test('presentation demo includes isolated sample views without live finance APIs',async()=>{
 const page=await read('app/demo/page.jsx');
 assert.match(page,/Owner dashboard \(sample\)/);
 assert.match(page,/Staff workspace \(sample\)/);
 assert.match(page,/\['overview','staff','transactions','alerts'\]/);
 assert.doesNotMatch(page,/fetch\s*\(|\.\/api\/|DATABASE_URL|PAYSTACK_TEST_SECRET_KEY/);
});

test('presentation stylesheet cannot globally restyle the real owner and staff routes',async()=>{
 const css=await read('app/opada-ui.css');
 assert.match(css,/\.opada-home/);
 assert.match(css,/\.opada-funder/);
 assert.doesNotMatch(css,/\.opada-owner|\.opada-staff/);
 assert.doesNotMatch(css,/(?:^|\})\s*(?:body|html|\*|button|input|select)\s*\{/);
});
