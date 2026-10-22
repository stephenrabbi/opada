import {createRemoteJWKSet,jwtVerify} from 'jose';
import {validateVerifiedIdentity} from './identity-claims.js';

// Server-only helper. Do not expose it to a browser or accept the issuer,
// audience or JWKS URL from an HTTP request. Configure them server-side.
export function identityProviderConfig(env=process.env){
  const {OPADA_IDENTITY_ISSUER:issuer,OPADA_IDENTITY_AUDIENCE:audience,OPADA_IDENTITY_JWKS_URL:jwksUrl}=env;
  if(!issuer||!audience||!jwksUrl)return null;
  try{
    const i=new URL(issuer),j=new URL(jwksUrl);
    if(i.protocol!=='https:'||j.protocol!=='https:'||i.username||i.password||j.username||j.password||i.origin!==j.origin)return null;
    if(i.search||i.hash||j.hash)return null;
    return {issuer,audience,jwksUrl};
  }catch{return null}
}

export async function verifyIdentityToken(token,{config=identityProviderConfig(),keySet}={}){
  if(!config||typeof token!=='string'||token.length<20||token.length>12000)return null;
  try{
    const keys=keySet??createRemoteJWKSet(new URL(config.jwksUrl));
    const {payload}=await jwtVerify(token,keys,{
      issuer:config.issuer,audience:config.audience,
      algorithms:['RS256'],clockTolerance:30
    });
    return validateVerifiedIdentity(payload,{issuer:config.issuer,audience:config.audience});
  }catch{return null}
}

// Not connected to an authentication endpoint yet. A valid JWT does not by
// itself create a session, confirm restaurant membership or authorize payments.
