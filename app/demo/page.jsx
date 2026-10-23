'use client';
import {useMemo,useState} from 'react';

const initial=[
 {id:1,item:'Hotel breakfast',type:'sale',quantity:8,unitPrice:3500,payment:'transfer',business:'hotel'},
 {id:2,item:'Room service',type:'sale',quantity:2,unitPrice:9500,payment:'cash',business:'hotel'},
 {id:3,item:'Cafe coffee',type:'sale',quantity:12,unitPrice:1800,payment:'transfer',business:'cafe'},
 {id:4,item:'Sandwich',type:'sale',quantity:6,unitPrice:2800,payment:'cash',business:'cafe'}
];
const naira=n=>'₦'+Number(n).toLocaleString('en-NG');
const panel={background:'#fff',border:'1px solid #d5e0ec',borderRadius:16,padding:20};
const button={border:0,borderRadius:10,background:'#173967',color:'#fff',padding:'10px 15px',fontWeight:700,cursor:'pointer'};
export default function FunderDemo(){
 const [business,setBusiness]=useState('hotel');
 const [transactions,setTransactions]=useState(initial);
 const [item,setItem]=useState('');
 const [amount,setAmount]=useState('');
 const [payment,setPayment]=useState('transfer');
 const [checked,setChecked]=useState(false);
 const [message,setMessage]=useState('');
 const [tab,setTab]=useState('overview');
 const own=useMemo(()=>transactions.filter(x=>x.business===business),[transactions,business]);
 const total=own.reduce((s,x)=>s+x.quantity*x.unitPrice,0);
 const transfers=own.filter(x=>x.payment==='transfer').reduce((s,x)=>s+x.quantity*x.unitPrice,0);
 const businessName=business==='hotel'?'Harbour View Hotel':'Cornerstone Café';
 // Illustrative synthetic confirmed transfers, not a Paystack connection.
 const demoReceipts=business==='hotel'?28000:20000;
 const discrepancy=transfers-demoReceipts;
 function add(e){
  e.preventDefault();const numeric=Number(amount);
  if(!item.trim()||!Number.isSafeInteger(numeric)||numeric<=0||numeric>10000000){setMessage('Enter an item and a whole naira amount between 1 and 10,000,000.');return}
  setTransactions(prev=>[{id:Date.now(),item:item.trim().slice(0,80),type:'sale',quantity:1,unitPrice:numeric,payment,business},...prev]);
  setItem('');setAmount('');setChecked(false);setMessage('Synthetic transaction recorded in this browser only.');
 }
 return <main className="opada-funder-demo" style={{minHeight:'100vh',background:'#f1f5fa',color:'#17304c',fontFamily:'system-ui, sans-serif',padding:'24px 16px 70px'}}>
  <div className="opada-funder-shell" style={{maxWidth:1080,margin:'auto',display:'grid',gap:18}}>
   <header className="opada-funder-hero" style={{display:'flex',justifyContent:'space-between',gap:15,alignItems:'center',flexWrap:'wrap'}}>
    <div><a href="/" style={{color:'#173967'}}>← Opada home</a><h1 style={{fontSize:'clamp(26px,5vw,38px)',margin:'10px 0 4px'}}>Opada interactive demo</h1><p style={{margin:0}}>Hospitality sales, payments and intelligent discrepancy monitoring</p></div>
    <span style={{background:'#fff2ce',padding:12,borderRadius:12,fontWeight:700}}>SYNTHETIC DATA · DEMONSTRATION ONLY</span>
   </header>
   <nav aria-label="Explore Opada pages" style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}><a href="/" style={{...button,textDecoration:'none'}}>Home</a><a href="/owner" style={{...button,textDecoration:'none'}}>Actual owner portal (login required)</a><a href="/staff" style={{...button,textDecoration:'none'}}>Actual staff portal (login required)</a></nav>
   <section style={{...panel,background:'#eaf3ff'}} aria-label="Demo limitations"><strong>What this demonstrates:</strong> Switch between isolated businesses, add a transaction, view business-specific reports and investigate a simulated payment mismatch. <strong>Not connected to Neon, Paystack, Gemini or customer accounts.</strong> All changes are temporary and reset when you reload the page.</section>
   <section style={panel}><label htmlFor="demo-business" style={{fontWeight:700}}>Choose a demo business</label><select id="demo-business" value={business} onChange={e=>{setBusiness(e.target.value);setChecked(false);setMessage('')}} style={{display:'block',marginTop:8,padding:12,width:'100%',maxWidth:420,borderRadius:9,border:'1px solid #b0bfd1',fontSize:16}}><option value="hotel">Harbour View Hotel · Synthetic account A</option><option value="cafe">Cornerstone Café · Synthetic account B</option></select><p style={{color:'#526278',marginBottom:0}}>Current business: <b>{businessName}</b>. Each demo account sees its own records.</p></section>
   <nav className="opada-funder-tabs" aria-label="Demo sections" style={{display:'flex',gap:10,flexWrap:'wrap'}}>{[['overview','Owner dashboard (sample)'],['staff','Staff workspace (sample)'],['transactions','Transactions'],['alerts','Insights & alerts']].map(([id,label])=><button type="button" key={id} style={{...button,background:tab===id?'#173967':'#dce6f1',color:tab===id?'#fff':'#173967'}} onClick={()=>setTab(id)}>{label}</button>)}</nav>
   <section className="opada-funder-metrics" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}} aria-label="Business metrics">
    {[['Recorded sales',naira(total)],['Staff reports',String(own.length)],['Reported transfers',naira(transfers)],['Sample verified receipts',naira(demoReceipts)]].map(([label,value])=><article key={label} style={panel}><div style={{fontSize:13,color:'#65768b'}}>{label}</div><strong style={{display:'block',fontSize:25,marginTop:7}}>{value}</strong></article>)}
   </section>
   {(tab==='overview'||tab==='transactions'||tab==='staff')&&<section style={panel}><h2>{tab==='staff'?'Staff workspace — synthetic sales entry':'Record a sample sale'}</h2><form onSubmit={add} style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end'}}><label style={{flex:'2 1 180px'}}>Item<input aria-label="Item" required maxLength={80} value={item} onChange={e=>setItem(e.target.value)} placeholder="e.g. Event catering" style={{display:'block',padding:12,width:'100%',boxSizing:'border-box',border:'1px solid #a5b8cd',borderRadius:8,fontSize:16}}/></label><label style={{flex:'1 1 130px'}}>Amount (NGN)<input aria-label="Amount in naira" required type="number" min="1" max="10000000" step="1" value={amount} onChange={e=>setAmount(e.target.value)} style={{display:'block',padding:12,width:'100%',boxSizing:'border-box',border:'1px solid #a5b8cd',borderRadius:8,fontSize:16}}/></label><label style={{flex:'1 1 140px'}}>Payment<select aria-label="Payment method" value={payment} onChange={e=>setPayment(e.target.value)} style={{display:'block',padding:12,width:'100%',border:'1px solid #a5b8cd',borderRadius:8,fontSize:16}}><option value="transfer">Transfer</option><option value="cash">Cash</option></select></label><button type="submit" style={button}>Add sample transaction</button></form>{message&&<p role="status">{message}</p>}</section>}
   {(tab==='overview'||tab==='transactions'||tab==='staff')&&<section style={panel}><h2>Staff-reported transactions</h2><div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%',textAlign:'left'}}><thead><tr>{['Item','Quantity','Payment','Amount'].map(x=><th key={x} style={{padding:10,borderBottom:'1px solid #bbcbe0'}}>{x}</th>)}</tr></thead><tbody>{own.map(x=><tr key={x.id}><td style={{padding:10,borderBottom:'1px solid #edf0f4'}}>{x.item}</td><td style={{padding:10,borderBottom:'1px solid #edf0f4'}}>{x.quantity}</td><td style={{padding:10,borderBottom:'1px solid #edf0f4'}}>{x.payment}</td><td style={{padding:10,borderBottom:'1px solid #edf0f4'}}>{naira(x.quantity*x.unitPrice)}</td></tr>)}</tbody></table></div></section>}
   {(tab==='overview'||tab==='alerts')&&<section style={panel}><h2>Illustrative payment reconciliation alert</h2><p>Staff-reported transfers: <strong>{naira(transfers)}</strong>. Synthetic receipt sample: <strong>{naira(demoReceipts)}</strong>.</p><p><strong>{discrepancy===0?'No discrepancy':discrepancy>0?'Unmatched reported transfers: '+naira(discrepancy):'Receipts exceed reports: '+naira(-discrepancy)}</strong></p><p>In the real Opada system, discrepancies require checking stored evidence before action. The sample receipt amount here is invented for demonstration.</p><button type="button" style={button} onClick={()=>setChecked(!checked)}>{checked?'Mark for investigation':'Review this sample alert'}</button>{checked&&<p role="status">Sample alert marked as reviewed in this browser.</p>}</section>}
   <footer style={{fontSize:13,color:'#66788a'}}>Opada by Team Stack-Mind · Interactive funder walkthrough · No real payments, AI requests or financial operations occur on this page.</footer>
  </div>
 </main>
}
