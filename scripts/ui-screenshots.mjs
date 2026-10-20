import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=process.env.OPADA_URL||'http://127.0.0.1:3000';
const routes=[['home','/'],['staff','/staff'],['owner','/owner']];
const devices=[['desktop',1440,900],['tablet',820,1180],['iphone',390,844],['android',360,800]];
const browser=await chromium.launch({headless:true});
let failures=0;
await mkdir('ui-screenshots',{recursive:true});
try{
 for(const [device,width,height] of devices){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  for(const [name,path] of routes){
   const page=await context.newPage();
   const response=await page.goto(base+path,{waitUntil:'networkidle',timeout:45000});
   await page.screenshot({path:`ui-screenshots/${device}-${name}.png`,fullPage:true});
   const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,heading:document.querySelector('h1')?.textContent||''}));
   const overflow=metrics.scrollWidth>metrics.viewportWidth+2;
   console.log(`${device} ${name}: HTTP ${response?.status()} width=${metrics.scrollWidth}/${metrics.viewportWidth} h1="${metrics.heading}"`);
   if(!response?.ok()||overflow||!metrics.heading){console.error('FAIL: unhealthy response, horizontal overflow, or missing heading');failures++}
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close()}
if(failures)process.exitCode=1;
