// Pure request-origin policy for cookie-authenticated state changes.
export function originIsAllowed(request){
  try{
    const origin=request.headers.get('origin');
    const url=new URL(request.url);
    return !!origin&&origin===url.origin&&url.protocol==='https:';
  }catch{return false}
}
