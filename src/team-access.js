// A read-only policy for restaurant and hospitality business teams.
// Never accept a restaurant selector from URL parameters or JSON request bodies.
export const TEAM_READER_ROLES=Object.freeze(['owner','manager']);
export function teamScope(auth){
  if(!auth||!auth.staff||!TEAM_READER_ROLES.includes(auth.staff.role))return null;
  const id=auth.staff.business_id;
  // Neon returns UUID as a string; refuse missing/invalid scope rather than broad queries.
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return null;
  return id;
}
