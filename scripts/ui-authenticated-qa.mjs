import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const base=process.env.OPADA_URL||'http://127.0.0.1:3000';
const mockToken='a'.repeat(40);
const identity={staff:{id:'synthetic-staff',name:'Synthetic QA',role:'owner'},restaurant:{id:'synthetic-restaurant',name:'OPADA SYNTHETIC TEST RESTAURANT'}};
const receipts={receipts:[{paystack_reference:'opada_test_visual_fixture',amount_kobo:10000,channel:'card',paid_at:'2026-10-20T11:00:00Z'}]};
const entries={entries:[{id:'visual-entry-1',type:'sale',item:'Jollof rice',amount_kobo:150000,payment_method:'cash',needs_review:true,created_at:'2026-10-20T11:00:00Z'}]};
const marginFlag={id:'11111111-1111-4111-8111-111111111111',rule:'margin_squeeze',day:'2026-10-20',item:'jollof rice',status:'open',suggested_action:'Review pricing and ingredient cost',amount_gap_kobo:null,details:{proposed_price_kobo:185000},evidence_ids:['visual-entry-1'],updated_at:'2026-10-20T11:00:00Z'};
const transferFlag={id:'22222222-2222-4222-8222-222222222222',rule:'transfer_paystack',day:'2026-10-20',item:null,status:'open',suggested_action:'₦3,500 recorded as transfer has no matching Paystack payment yet.',amount_gap_kobo:350000,details:{},evidence_ids:['visual-entry-1'],updated_at:'2026-10-20T12:00:00Z'};
// Per-context state: the transfer alert "arrives" after sign-in, to prove auto-refresh, and can be marked checked.
const state={flags:[marginFlag],checked:new Set()};
const flagsNow=()=>({flags:state.flags.map(f=>state.checked.has(f.id)?{...f,status:'checked'}:f)});
const evidence={flag:transferFlag,entries:[{id:'visual-entry-1',type:'sale',item:'fried rice',quantity:'3',unit:'plate',amount_kobo:'540000',payment_method:'transfer',payment_split:null,raw_text:'3 plate fried rice don comot, 1800 each, dem transfer am',created_at:'2026-10-20T12:20:00Z',recorded_by:'Tunde (simulated cashier)',review_reasons:[]}],payments:[{id:'p1',paystack_reference:'opada_test_visual_fixture',amount_kobo:'450000',channel:'bank_transfer',paid_at:'2026-10-20T12:30:00Z'}],menu:[],checked_by:null};
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
    assert.match(payload.idempotency_key,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(payload.amount_kobo,Math.round(payload.quantity*payload.unit_price_kobo));
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({entry_id:'mocked-qa-entry',saved:true,duplicate:false,needs_review:true})});return;
   }
   if(url.pathname==='/api/ingest/message'&&request.method()==='POST'){
    const payload=request.postDataJSON();
    assert.equal(payload.text,'3 plate fried rice, 1800 each, dem transfer am');
    assert.match(payload.idempotency_key,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const entry={id:'mocked-message-entry',line_no:1,type:'sale',item:'fried rice',quantity:'3',unit:'plate',unit_price_kobo:'180000',amount_kobo:'540000',payment_method:'transfer',needs_review:true,extraction:{review_reasons:['total_mismatch']}};
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({saved:true,duplicate:false,status:'extracted',notice:null,entries:[entry]})});return;
   }
   if(url.pathname==='/api/flags/check'&&request.method()==='POST'){state.checked.add(request.postDataJSON().flag_id);await route.fulfill({status:200,contentType:'application/json',body:'{"checked":true}'});return}
   if(url.pathname.startsWith('/api/flags/')&&url.pathname.endsWith('/evidence')){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(evidence)});return}
   const response={'/api/me':identity,'/api/paystack/receipts':receipts,'/api/entries':entries,'/api/flags':flagsNow()}[url.pathname];
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
    await page.getByRole('region',{name:'Voice report'}).waitFor();
    const languageChoices=await page.locator('#voice-language option').allTextContents();
    assert.equal(languageChoices.length,5,'Five speech language selections must be visible');
    await page.locator('#voice-language').selectOption('yo-NG');
    assert.equal(await page.locator('#voice-language').inputValue(),'yo-NG');
   }
   await page.screenshot({path:`ui-screenshots/${device}-${name}-authenticated.png`,fullPage:true});
   const measures=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(measures.documentWidth<=measures.viewport+2,`${device} ${name} horizontal overflow ${JSON.stringify(measures)}`);
   if(name==='staff'){
    await page.getByRole('textbox',{name:'Item',exact:true}).fill('fried rice');
    await page.getByRole('spinbutton',{name:/Quantity/}).fill('3');
    await page.getByRole('spinbutton',{name:/Unit price/}).fill('1800');
    await page.getByLabel('Payment method').selectOption('transfer');
    await page.getByRole('textbox',{name:/Original staff report/}).fill('Synthetic visual QA report');
    await page.getByRole('button',{name:'Save for review'}).click();
    await page.getByRole('status').getByText(/mocked-qa-entry/).waitFor();
    await page.getByRole('textbox',{name:'Quick message'}).fill('3 plate fried rice, 1800 each, dem transfer am');
    await page.getByRole('button',{name:'Send message'}).click();
    await page.getByText('Saved for owner review:').waitFor();
    await page.getByText(/fried rice, ₦5,400, transfer/).waitFor();
    await page.getByText('Total corrected to quantity × price').waitFor();
    await page.screenshot({path:`ui-screenshots/${device}-staff-quick-message.png`,fullPage:true});
   }else{
    const sidebarTransaction=page.locator('.opada-side-nav').getByRole('button',{name:'Transactions'});
    const tabTransaction=page.locator('.opada-tabs').getByRole('button',{name:'Transactions'});
    if(await sidebarTransaction.isVisible())await sidebarTransaction.click();
    else{
     if(!(await tabTransaction.isVisible()))await page.locator('.opada-mobile-switch button').click();
     await tabTransaction.click();
    }
    await page.getByRole('textbox',{name:'Filter transactions'}).fill('jollof');
    await page.locator(width<=620?'.opada-record-card:visible':'.opada-data-scroller:visible').getByText('Jollof rice').first().waitFor();
   }
   if(name==='owner'){
    const ownerNav=async section=>{
     const side=page.locator('.opada-side-nav').getByRole('button',{name:section});
     const tabs=page.locator('.opada-tabs').getByRole('button',{name:section});
     if(await side.isVisible())await side.click();
     else{
      if(!(await tabs.isVisible()))await page.locator('.opada-mobile-switch button').click();
      await tabs.click();
     }
    };
    await ownerNav('Payments');
    await page.getByRole('heading',{name:'Verified Paystack receipts'}).waitFor();
    await page.locator(width<=620?'.opada-record-card:visible':'.opada-data-scroller:visible').getByText('opada_test_visual_fixture').first().waitFor();
    await ownerNav('Insights');
    await page.getByRole('heading',{name:'Alerts'}).waitFor();
    await page.getByText('Review pricing and ingredient cost').first().waitFor();
    await page.getByText('Suggested price: ₦1,850').waitFor();
    assert.equal(await page.getByRole('button',{name:/apply/i}).count(),0,'No apply-price button in the demo');
    // A new alert arrives server-side; auto-refresh (5 s) must show it, highlighted, without pressing Refresh.
    state.flags=[transferFlag,marginFlag];
    const alert=page.getByRole('article',{name:'Transfers vs Paystack alert'});
    await alert.waitFor({timeout:9000});
    await alert.getByText('New',{exact:true}).waitFor();
    await alert.getByRole('button',{name:'View evidence'}).click();
    await alert.getByText('Tunde (simulated cashier)',{exact:false}).waitFor();
    await alert.getByText('3 plate fried rice don comot',{exact:false}).waitFor();
    await page.screenshot({path:`ui-screenshots/${device}-owner-alert-evidence.png`,fullPage:true});
    await alert.getByRole('button',{name:'Mark as checked'}).click();
    await alert.getByText('Checked',{exact:true}).waitFor();
    assert.equal(await alert.getByRole('button',{name:'Mark as checked'}).count(),0);
    state.flags=[marginFlag];state.checked.clear();
    await page.getByRole('button',{name:'Lock'}).click();
    await page.getByRole('heading',{name:'Authorized test access'}).waitFor();
    assert.equal(await page.locator('input[type="password"]').inputValue(),'');
   }else{
    await page.getByRole('button',{name:'Lock'}).click();
    await page.getByRole('heading',{name:'Welcome back'}).waitFor();
    assert.equal(await page.locator('input[type="password"]').inputValue(),'');
   }
   console.log(`PASS ${device} ${name} authenticated viewport and mocked interaction`);
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close()}
