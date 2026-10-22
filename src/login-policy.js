// Authentication rollout remains off until identity provider, migrations,
// rate limits, replay defenses, and security review are completed.
export function loginFeatureEnabled(env=process.env){
 return env.OPADA_SESSION_LOGIN_ENABLED==='true'&&
   env.OPADA_SESSION_READ_ENABLED==='true'&&
   !!env.DATABASE_URL&&
   !!env.OPADA_IDENTITY_ISSUER&&
   !!env.OPADA_IDENTITY_AUDIENCE&&
   !!env.OPADA_IDENTITY_JWKS_URL;
}
export function validateLoginPayload(body){
 if(!body||typeof body!=='object'||Array.isArray(body))return null;
 if(Object.keys(body).length!==1||!Object.hasOwn(body,'identityToken'))return null;
 const token=body.identityToken;
 if(typeof token!=='string'||token.length<20||token.length>12000||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))return null;
 return token;
}
