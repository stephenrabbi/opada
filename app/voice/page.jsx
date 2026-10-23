'use client';
import {useEffect,useRef,useState} from 'react';

const styles={panel:{background:'#fff',borderRadius:16,padding:22,border:'1px solid #dae3ed'},btn:{background:'#173967',color:'white',padding:'12px 16px',border:0,borderRadius:10,fontWeight:700,cursor:'pointer'}};
const money=n=>'₦'+Number(n).toLocaleString('en-NG');
function parseReport(text){
  const normalized=text.toLowerCase().replace(/,/g,'');
  // Only numeric amounts explicitly expressed in naira or NGN. Never interpret words as figures.
  const matches=[...normalized.matchAll(/(?:₦|ngn\s*|(?:naira\s*))\s*(\d+(?:\.\d{1,2})?)/g)];
  const amounts=matches.map(m=>Number(m[1])).filter(n=>Number.isFinite(n)&&n>0&&n<=10000000);
  if(!amounts.length)return {kind:null,amount:null,warning:'No explicit naira amount detected. Enter the amount manually before confirming.'};
  const expense=/\b(spent|expense|cost|bought|purchase|paid for)\b/.test(normalized);
  const sale=/\b(sold|sales|sale|received|collected|earned)\b/.test(normalized);
  if(expense&&sale)return {kind:null,amount:null,warning:'Multiple transaction types detected. Review and enter one record at a time.'};
  if(amounts.length!==1)return {kind:null,amount:null,warning:'Multiple amounts detected. Review and enter one record at a time.'};
  return {kind:expense?'expense':sale?'sale':null,amount:amounts[0],warning:!expense&&!sale?'Select sale or expense manually.':null};
}
export default function VoiceInput(){
 const recorder=useRef(null);
 const [supported,setSupported]=useState(null);
 const [listening,setListening]=useState(false);
 const [transcript,setTranscript]=useState('');
 const [kind,setKind]=useState('sale');
 const [amount,setAmount]=useState('');
 const [item,setItem]=useState('');
 const [notice,setNotice]=useState('');
 const [records,setRecords]=useState([]);
 const [speak,setSpeak]=useState(false);
 useEffect(()=>{setSupported(Boolean(window.SpeechRecognition||window.webkitSpeechRecognition));return()=>{recorder.current?.abort();}},[]);
 function start(){
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){setNotice('Voice recognition is not available in this browser. Use manual entry.');return;}
  if(!window.isSecureContext){setNotice('A secure HTTPS connection is required for microphone access.');return;}
  recorder.current?.abort();
  const r=new Speech();r.lang='en-NG';r.continuous=false;r.interimResults=false;recorder.current=r;
  r.onstart=()=>{setListening(true);setNotice('Listening. Say one sale or expense, including the naira amount.');};
  r.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript||'';setTranscript(text);const parsed=parseReport(text);if(parsed.kind)setKind(parsed.kind);if(parsed.amount)setAmount(String(parsed.amount));setNotice(parsed.warning||'Review the transcription and details before confirming.');};
  r.onerror=e=>{setNotice('Microphone or recognition error: '+(e.error||'unknown')+'. You can enter details manually.');};
  r.onend=()=>setListening(false);
  try{r.start()}catch{setListening(false);setNotice('Could not start microphone. Check browser permissions.');}
 }
 function confirm(e){e.preventDefault();const n=Number(amount);if(!Number.isSafeInteger(n)||n<=0||n>10000000||!item.trim()){setNotice('Provide a description and an integer amount between ₦1 and ₦10,000,000.');return;}setRecords(prev=>[{id:Date.now(),kind,amount:n,item:item.trim().slice(0,80),transcript},...prev]);setNotice('Confirmed sample saved to this browser session only. Not sent to the backend or Paystack.');setAmount('');setItem('');setTranscript('');}
 function say(){if(!('speechSynthesis' in window)){setNotice('Spoken responses are not supported in this browser.');return;}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance('Hello, I am Opada. You can report a sale or expense. Please confirm the details before saving.');u.lang='en-NG';u.rate=.93;window.speechSynthesis.speak(u);setSpeak(true);u.onend=()=>setSpeak(false);}
 return <main style={{minHeight:'100vh',background:'#f2f6fa',color:'#17304c',fontFamily:'system-ui,sans-serif',padding:'25px 15px'}}>
  <div style={{maxWidth:850,margin:'auto',display:'grid',gap:16}}>
   <header><a href='/demo' style={{color:'#173967'}}>← Back to Opada demo</a><h1>Opada voice reporting</h1><p>English (Nigeria) browser voice input — <b>synthetic demonstration only</b>.</p></header>
   <section style={{...styles.panel,background:'#fff1d5'}}><b>Safety notice:</b> This voice demonstration does not connect to customer accounts, Neon, Paystack or real financial records. Audio processing depends on the browser's speech recognition service. Do not dictate confidential financial information.</section>
   <section style={styles.panel}><h2>Speak a sample transaction</h2><p>Example: “We sold food worth ₦8500 today.” Report one amount at a time.</p><button type='button' style={styles.btn} onClick={listening?()=>recorder.current?.stop():start}>{listening?'Stop recording':'Start microphone'}</button>{' '}<button type='button' style={{...styles.btn,background:'#0c836a'}} onClick={say}>Hear Opada</button><p role='status'>{supported===false?'Speech recognition unavailable; manual entry remains available.':notice}</p>{speak&&<p>Speaking...</p>}</section>
   <section style={styles.panel}><h2>Review before saving</h2><form onSubmit={confirm} style={{display:'grid',gap:12}}>
    <label>Transcription<textarea value={transcript} onChange={e=>setTranscript(e.target.value)} rows={3} style={{display:'block',width:'100%',boxSizing:'border-box',fontSize:16,padding:10}} /></label>
    <label>Transaction type<select value={kind} onChange={e=>setKind(e.target.value)} style={{display:'block',padding:10,fontSize:16}}><option value='sale'>Sale</option><option value='expense'>Expense</option></select></label>
    <label>Description<input required maxLength={80} value={item} onChange={e=>setItem(e.target.value)} placeholder='e.g. Food sales' style={{display:'block',padding:10,width:'100%',boxSizing:'border-box',fontSize:16}} /></label>
    <label>Amount (NGN)<input required type='number' min='1' max='10000000' step='1' value={amount} onChange={e=>setAmount(e.target.value)} style={{display:'block',padding:10,fontSize:16}} /></label>
    <button style={styles.btn} type='submit'>Confirm sample record</button>
   </form></section>
   <section style={styles.panel}><h2>Confirmed samples (browser session only)</h2>{records.length===0?<p>No sample entries yet.</p>:<ul>{records.map(r=><li key={r.id}>{r.kind}: {r.item} — {money(r.amount)}</li>)}</ul>}</section>
  </div></main>;
}
