import {chromium} from 'playwright';
const origin=process.env.OPADA_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true});
try{
 for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  const sent=[];
  page.on('request',request=>{if(request.url().includes('/api/')||request.url().includes('paystack.com'))sent.push(request.url())});
  const response=await page.goto(origin+'/demo',{waitUntil:'networkidle',timeout:45000});
  if(!response?.ok())throw Error(device+': demo route not healthy');
  await page.getByText('SYNTHETIC DATA · DEMONSTRATION ONLY').waitFor();
  await page.getByRole('heading',{name:'Opada interactive demo'}).waitFor();
  await page.getByRole('link',{name:'Actual owner portal (login required)'}).waitFor();
  await page.getByRole('link',{name:'Actual staff portal (login required)'}).waitFor();
  await page.getByRole('button',{name:'Owner dashboard (sample)'}).click();
  await page.getByRole('button',{name:'Staff workspace (sample)'}).click();
  await page.getByRole('heading',{name:'Staff workspace — synthetic sales entry'}).waitFor();
  await page.getByRole('combobox',{name:'Choose a demo business'}).selectOption('cafe');
  await page.getByText('Cafe coffee').waitFor();
  if(await page.getByText('Hotel breakfast').count())throw Error(device+': business isolation failed');
  await page.getByRole('textbox',{name:'Item'}).fill('Synthetic catering');
  await page.getByRole('spinbutton',{name:'Amount in naira'}).fill('4400');
  await page.getByRole('button',{name:'Add sample transaction'}).click();
  await page.getByText('Synthetic transaction recorded in this browser only.').waitFor();
  await page.getByText('Synthetic catering').waitFor();
  await page.getByRole('button',{name:'Insights & alerts'}).click();
  await page.getByRole('button',{name:'Review this sample alert'}).click();
  await page.getByText('Sample alert marked as reviewed in this browser.').waitFor();
  if(sent.length)throw Error(device+': synthetic demo invoked external financial APIs '+sent.join(','));
  const widthCheck=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
  if(widthCheck.scroll>widthCheck.width+2)throw Error(device+': horizontal overflow');
  await page.screenshot({path:'ui-screenshots/'+device+'-funder-demo.png',fullPage:true});
  await page.reload({waitUntil:'networkidle'});
  if(await page.getByText('Synthetic catering').count())throw Error(device+': browser-only demo data survived reload');
  console.log(device+': interactive synthetic funder demo passed');
  await context.close();
 }
}finally{await browser.close()}
