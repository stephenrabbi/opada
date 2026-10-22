import {SESSION_COOKIE_NAME} from './session-policy.js';
import {findActiveStaffSession} from './session-store.js';

// Parse only the named cookie. Reject duplicate values and malformed secrets.
export function sessionSecretFromCookie(header){
 if(typeof header!=='string'||header.length>8192)return null;
 const matches=header.split(';').map(x=>x.trim()).filter(x=>x.startsWith(SESSION_COOKIE_NAME+'='));
 if(matches.length!==1)return null;
 const value=matches[0].slice(SESSION_COOKIE_NAME.length+1);
 return /^[A-Za-z0-9_-]{43}$/.test(value)?value:null;
}
export async function resolveRequestSession({request,sql}={}){
 if(!request||typeof sql!=='function')return null;
 const secret=sessionSecretFromCookie(request.headers?.get('cookie'));
 if(!secret)return null;
 return findActiveStaffSession({sql,secret});
}
