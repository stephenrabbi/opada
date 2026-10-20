import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const home = read('app/page.jsx');
const staff = read('app/staff/page.jsx');
const owner = read('app/owner/page.jsx');
const css = read('app/opada-ui.css');

test('all three application entry points have navigation', () => {
 assert.match(home, /opada-home-nav/);
 assert.match(home, /href="\/staff"/);
 assert.match(home, /href="\/owner"/);
 assert.match(staff, /opada-staff-sidebar/);
 assert.match(staff, /opada-staff-mobile-nav/);
 assert.match(owner, /opada-side-nav/);
 assert.match(owner, /opada-mobile-switch/);
});

test('protected owner navigation requires authentication', () => {
 assert.match(owner, /disabled=\{!identity\}/);
 assert.match(owner, /if\(!\['owner','manager'\]/);
});

test('financial presentation distinguishes reported and verified amounts', () => {
 assert.match(owner, /Verified Paystack receipts/);
 assert.match(owner, /not Paystack-verified receipts/);
 assert.match(owner, /needs_review/);
 assert.match(staff, /Reporting a transfer does not verify/);
});

test('responsive layouts and accessibility affordances are present', () => {
 assert.match(css, /@media\(max-width:620px\)/);
 assert.match(css, /opada-mobile-records/);
 assert.match(css, /opada-staff-fields/);
 assert.match(home, /opada-skip-link/);
 assert.match(css, /:focus-visible/);
 assert.match(css, /prefers-reduced-motion/);
});

function linear(hex){
 const rgb=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255);
 return rgb.map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
}
function ratio(a,b){const x=linear(a),y=linear(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
test('core palette combinations meet WCAG AA normal text contrast', () => {
 const pairs=[
  ['#142c2a','#f7f5f0'], // normal text on paper
  ['#ffffff','#102c34'], // sidebar text
  ['#ffffff','#145b44'], // primary button
  ['#34250d','#fff0ca'], // preview banner
  ['#694002','#fff0c7'], // needs review
  ['#154d2f','#def4e5'], // verified
  ['#344651','#edf1f4']  // neutral
 ];
 for(const [fg,bg] of pairs)assert.ok(ratio(fg,bg)>=4.5,`Low contrast ${fg} on ${bg}: ${ratio(fg,bg).toFixed(2)}`);
});
