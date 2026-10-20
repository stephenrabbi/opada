import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const base=process.env.OPADA_URL||'http://127.0.0.1:3000';
const mockToken='a'.repeat(40);
const identity={staff:{id:'synthetic-staff',name:'Synthetic QA',role:'owner'},restaurant:{id:'synthetic-restaurant',name:'OPADA SYNTHETIC TEST RESTAURANT'}};
const receipts={receipts:[{paystack_reference:'opada_test_visual_fixture',amount_kobo:10000,channel:'card',paid_at:'2026-10-20T11:00:00Z'}]};
const entries={entries:[{id:'visual-entry-1',type:'sale',item:'Jollof rice',amount_kobo:150000,payment_method:'cash',needs_review:true,created_at:'2026-10-20T11:00:00Z'}]};
const flags={flags:[{id:'visual-flag-1',rule:'margin_squeeze',status:'open',suggested_action:'Review pricing and ingredient cost',amount_gap_kobo:35000,evidence_ids:['visual-entry-1']}]};
const devices=[['desktop',1440,900],['tablet',820,1180],['iphone',390,844],['android',360,800]];
const browser=await chromium.launch({headless:true});await mkdir('ui-screenshots',{recursive:true});
try{
 for(const [device,width,height] of devices){
  const context=await browser.newContext({viewport:{width,height}});
  await context.route('**/api/**',async route=>{
   const request=route.request();
   const url=new URL(request.url());
   const authorized=request.headers().authorization==='Bearer '+mockToken;
   if(!authorized){await route.fulfill({status:401,contentType:'application/json',body:'{"error":"Unauthorized"}'});return}
   if(url.pathname==='/api/ingest'&&request.method()==='POST'){
    const payload=request.postDataJSON();
    assert.equal(payload.raw_text,'Synthetic visual QA report');
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({entry_id:'mocked-qa-entry'})});return;
   }
   const response={'/api/me':identity,'/api/paystack/receipts':receipts,'/api/entries':entries,'/api/flags':flags}[url.pathname];
   await route.fulfill({status:response?200:404,contentType:'application/json',body:JSON.stringify(response||{error:'Unknown fixture'})});
  });
  for(const name of ['staff','owner']){
   const page=await context.newPage();
   await page.goto(base+'/'+name,{waitUntil:'networkidle'});
   const secretField=page.locator('input[type="password"]');
   await secretField.fill(mockToken);
   await page.getByRole('button',{name:name==='staff'?'Continue':'View verified records'}).click();
   if(name==='owner'){
    await page.getByText('OPADA SYNTHETIC TEST RESTAURANT').first().waitFor();
    await page.getByText('Verified Paystack receipts').first().waitFor();
   }else{
    await page.getByRole('button',{name:'Save for review'}).waitFor();
   }
   await page.screenshot({path:`ui-screenshots/${device}-${name}-authenticated.png`,fullPage:true});
   const measures=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(measures.documentWidth<=measures.viewport+2,`${device} ${name} horizontal overflow ${JSON.stringify(measures)}`);
   if(name==='staff'){
    await page.getByRole('textbox',{name:/Original staff report/}).fill('Synthetic visual QA report');
    await page.getByRole('button',{name:'Save for review'}).click();
    await page.getByRole('status').getByText(/mocked-qa-entry/).waitFor();
   }else{
    await page.getByRole('button',{name:'Transactions'}).last().click();
    await page.getByRole('textbox',{name:'Filter transactions'}).fill('jollof');
    await page.getByText('Jollof rice').first().waitFor();
   }
   console.log(`PASS ${device} ${name} authenticated viewport and mocked interaction`);
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close()}
