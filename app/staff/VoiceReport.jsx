'use client';
import {useEffect,useRef,useState} from 'react';

const languages=[
 {name:'English (Nigeria)',value:'en-NG'},
 {name:'Yoruba',value:'yo-NG'},
 {name:'Igbo',value:'ig-NG'},
 {name:'Hausa',value:'ha-NG'},
 {name:'Nigerian Pidgin (experimental English fallback)',value:'en-NG-pidgin'}
];
export default function VoiceReport({onTranscript,accessToken='',disabled=false}){
 const recognitionRef=useRef(null),mounted=useRef(true),mediaRef=useRef(null),chunksRef=useRef([]),timeoutRef=useRef(null);
 const [verifiedEngine,setVerifiedEngine]=useState('');const [language,setLanguage]=useState('en-NG'),[status,setStatus]=useState('idle'),[message,setMessage]=useState(''),[transcript,setTranscript]=useState(''),[googleEnabled,setGoogleEnabled]=useState(false),[engine,setEngine]=useState('browser');
 useEffect(()=>{mounted.current=true;fetch('/api/voice',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(mounted.current)setGoogleEnabled(Boolean(d?.enabled))}).catch(()=>{});return ()=>{mounted.current=false;if(timeoutRef.current)clearTimeout(timeoutRef.current);try{recognitionRef.current?.abort()}catch{}try{mediaRef.current?.stream?.getTracks().forEach(t=>t.stop());mediaRef.current?.stop()}catch{}recognitionRef.current=null}},[]);
 function stop(){if(timeoutRef.current){clearTimeout(timeoutRef.current);timeoutRef.current=null}if(engine==='google'&&mediaRef.current?.state==='recording'){mediaRef.current.stop();return}if(recognitionRef.current){try{recognitionRef.current.stop()}catch{}}setStatus('idle')}
 async function googleStart(){
  if(!accessToken.trim()){setMessage('Sign in with your synthetic staff token before using Google transcription.');return}
  if(language==='en-NG-pidgin'){setMessage('Google has no dedicated Nigerian Pidgin model. Use experimental browser recognition or type your report.');return}
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setMessage('Microphone recording is unavailable on this browser. Try browser recognition or typing.');return}
  try{setMessage('');setTranscript('');setVerifiedEngine('');const stream=await navigator.mediaDevices.getUserMedia({audio:true});const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime){stream.getTracks().forEach(t=>t.stop());throw Error('Unsupported recording format. Use browser recognition instead.')}
   chunksRef.current=[];const media=new MediaRecorder(stream,{mimeType:mime});mediaRef.current=media;media.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)};media.onstop=async()=>{if(timeoutRef.current){clearTimeout(timeoutRef.current);timeoutRef.current=null}stream.getTracks().forEach(t=>t.stop());if(!mounted.current)return;setStatus('transcribing');try{const blob=new Blob(chunksRef.current,{type:mime.split(';')[0]});if(blob.size>1024*1024)throw Error('Recording is too large. Keep it under 1 MB.');const form=new FormData();form.append('audio',blob,'report.'+(mime.includes('mp4')?'mp4':mime.includes('ogg')?'ogg':'webm'));form.append('language',language);const response=await fetch('/api/voice',{method:'POST',headers:{Authorization:'Bearer '+accessToken.trim()},body:form});const result=await response.json();if(!response.ok)throw Error([result.code,result.error].filter(Boolean).join(': ')||'Google transcription unavailable');if(typeof result.transcript!=='string'||!result.transcript.trim())throw Error('Google returned no transcript. Nothing was added to the report.');setVerifiedEngine('Google Cloud Speech-to-Text');setTranscript(result.transcript);onTranscript(result.transcript);setMessage('Google transcript added. Review carefully before saving.')}catch(e){setMessage(e.message||'Google transcription failed.')}finally{setStatus('idle')}};
   media.start();timeoutRef.current=setTimeout(()=>{if(media.state==='recording')media.stop()},20000);setStatus('listening');setMessage('Google transcription may incur Cloud charges when enabled. Recording automatically stops after 20 seconds.');
  }catch(e){setStatus('idle');setMessage(e.message||'Unable to record audio.')}
 }
 function start(){
  if(engine==='google'){googleStart();return}
  const Native=typeof window!=='undefined'&&(window.SpeechRecognition||window.webkitSpeechRecognition);
  if(!Native){setMessage('Voice transcription is unavailable in this browser. Please type your report instead.');return}
  if(status==='listening')return;
  setMessage('');setTranscript('');setVerifiedEngine('');
  let recognition;
  try{
   recognition=new Native();recognitionRef.current=recognition;
   recognition.lang=language==='en-NG-pidgin'?'en-NG':language;
   recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=1;
   recognition.onstart=()=>{if(mounted.current)setStatus('listening')};
   recognition.onresult=e=>{
    if(!mounted.current)return;
    const spoken=Array.from(e.results).map(r=>r[0]?.transcript||'').join(' ').trim();
    setTranscript(spoken);setStatus('idle');
    if(spoken){setVerifiedEngine('Browser speech recognition');onTranscript(spoken);setMessage('Transcription added to your report. Review every field before saving.')}
    else setMessage('No speech was transcribed. Try again or type the report.');
   };
   recognition.onerror=e=>{
    if(!mounted.current)return;
    setStatus('idle');
    const errors={not:'', 'not-allowed':'Microphone permission was denied. Allow access in browser settings or type your report.','audio-capture':'No working microphone was found. You can type your report.','no-speech':'No speech was detected. Try again or type your report.','language-not-supported':'The selected language is not supported by this browser recognition service. Please type your report.'};
    setMessage(errors[e.error]||'Speech recognition failed or is unsupported for this language. Please type your report.');
   };
   recognition.onend=()=>{if(mounted.current)setStatus('idle');recognitionRef.current=null};
   recognition.start();
  }catch{setStatus('idle');setMessage('Unable to start the microphone. Please type your report.')}
 }
 return <section className="opada-voice-report" aria-label="Voice report"><div className="opada-voice-head"><div><strong>Voice reporting (experimental)</strong><p>Speak a synthetic report, then correct the form before saving.</p></div><span aria-hidden="true">🎙</span></div><label htmlFor="voice-language">Spoken language</label><select id="voice-language" value={language} disabled={status==='listening'||disabled} onChange={e=>{setLanguage(e.target.value);setTranscript('');setMessage('')}}>{languages.map(l=><option key={l.value} value={l.value}>{l.name}</option>)}</select><label htmlFor="voice-engine">Recognition engine</label><select id="voice-engine" value={engine} disabled={disabled||status!=='idle'} onChange={e=>setEngine(e.target.value)}><option value="browser">Browser speech recognition (fallback)</option><option value="google" disabled={!googleEnabled}>Google Cloud Speech-to-Text {googleEnabled?'(enabled)':'(not configured)'}</option></select><div className="opada-voice-actions"><button type="button" onClick={status==='listening'?stop:start} disabled={disabled||status==='transcribing'} aria-pressed={status==='listening'}>{status==='listening'?'■ Stop listening':'🎙 Start recording'}</button><span role="status" aria-live="polite">{status==='listening'?'Listening…':status==='transcribing'?'Google is transcribing…':message}</span></div>{transcript&&<div className="opada-voice-preview"><strong>Transcribed report</strong><p>Engine used: {verifiedEngine||'Unknown'}</p><p>{transcript}</p></div>}<p className="opada-voice-disclosure">Browser recognition may send audio to your browser provider. When Google Cloud mode is separately enabled, short recordings are transmitted through Opada to Google Cloud for transcription and may incur charges. Availability and accuracy vary by language, dialect and device. Pidgin currently uses experimental Nigerian English recognition; dedicated Pidgin recognition is not implemented. Do not dictate real personal or financial data. No audio file is stored by this interface.</p></section>
}
