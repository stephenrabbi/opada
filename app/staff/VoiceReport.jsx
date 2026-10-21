'use client';
import {useEffect,useRef,useState} from 'react';

const languages=[
 {name:'English (Nigeria)',value:'en-NG'},
 {name:'Yoruba',value:'yo-NG'},
 {name:'Igbo',value:'ig-NG'},
 {name:'Hausa',value:'ha-NG'},
 {name:'Nigerian Pidgin (experimental English fallback)',value:'en-NG-pidgin'}
];
export default function VoiceReport({onTranscript,disabled=false}){
 const recognitionRef=useRef(null),mounted=useRef(true);
 const [language,setLanguage]=useState('en-NG'),[status,setStatus]=useState('idle'),[message,setMessage]=useState(''),[transcript,setTranscript]=useState('');
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;try{recognitionRef.current?.abort()}catch{}recognitionRef.current=null}},[]);
 function stop(){if(recognitionRef.current){try{recognitionRef.current.stop()}catch{}}setStatus('idle')}
 function start(){
  const Native=typeof window!=='undefined'&&(window.SpeechRecognition||window.webkitSpeechRecognition);
  if(!Native){setMessage('Voice transcription is unavailable in this browser. Please type your report instead.');return}
  if(status==='listening')return;
  setMessage('');setTranscript('');
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
    if(spoken){onTranscript(spoken);setMessage('Transcription added to your report. Review every field before saving.')}
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
 return <section className="opada-voice-report" aria-label="Voice report"><div className="opada-voice-head"><div><strong>Voice reporting (experimental)</strong><p>Speak a synthetic report, then correct the form before saving.</p></div><span aria-hidden="true">🎙</span></div><label htmlFor="voice-language">Spoken language</label><select id="voice-language" value={language} disabled={status==='listening'||disabled} onChange={e=>{setLanguage(e.target.value);setTranscript('');setMessage('')}}>{languages.map(l=><option key={l.value} value={l.value}>{l.name}</option>)}</select><div className="opada-voice-actions"><button type="button" onClick={status==='listening'?stop:start} disabled={disabled} aria-pressed={status==='listening'}>{status==='listening'?'■ Stop listening':'🎙 Start recording'}</button><span role="status" aria-live="polite">{status==='listening'?'Listening…':message}</span></div>{transcript&&<div className="opada-voice-preview"><strong>Transcribed report</strong><p>{transcript}</p></div>}<p className="opada-voice-disclosure">Recognition is provided by your browser and may send audio to its speech service. Availability and accuracy vary by language, dialect and device. Pidgin currently uses experimental Nigerian English recognition; dedicated Pidgin recognition is not implemented. Do not dictate real personal or financial data. No audio file is stored by this interface.</p></section>
}
