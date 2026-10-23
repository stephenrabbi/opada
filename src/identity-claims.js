// Identity claims are only trustworthy after the server verifies a provider's
// signed token, issuer, audience, expiry and authentication requirements.
export function validateVerifiedIdentity(claims,{issuer,audience}={}){
 if(!claims||typeof claims!=='object'||Array.isArray(claims))return null;
 if(!issuer||!audience||claims.iss!==issuer)return null;
 const aud=claims.aud;
 if(!(aud===audience||(Array.isArray(aud)&&aud.includes(audience))))return null;
 if(typeof claims.sub!=='string'||claims.sub.length<1||claims.sub.length>255)return null;
 if(claims.email_verified!==true||typeof claims.email!=='string')return null;
 const email=claims.email.trim().toLowerCase();
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return null;
 const now=Math.floor(Date.now()/1000);
 if(!Number.isSafeInteger(claims.exp)||claims.exp<=now)return null;
 if(!Number.isSafeInteger(claims.iat)||claims.iat>now+60)return null;
 return {subject:claims.sub,email,emailVerified:true};
}
