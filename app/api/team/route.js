import {NextResponse} from 'next/server';
import {authorizeStaff} from '../../../src/staff-auth.js';
import {teamScope,TEAM_READER_ROLES} from '../../../src/team-access.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};

export async function GET(request){
  let auth;
  try {
    auth=await authorizeStaff(request,TEAM_READER_ROLES);
  } catch {
    return NextResponse.json({error:'Authentication unavailable'},{status:503,headers});
  }
  const businessId=teamScope(auth);
  if(!businessId)return NextResponse.json({error:'Unauthorized'},{status:401,headers});

  try {
    // Query only members belonging to the authenticated restaurant.
    // Deliberately exclude token hashes and auth subjects from the response.
    const people=await auth.sql`SELECT id,display_name,role,active,created_at FROM staff WHERE business_id=${businessId} ORDER BY created_at ASC LIMIT 100`;
    return NextResponse.json({team:people},{headers});
  } catch {
    return NextResponse.json({error:'Team temporarily unavailable'},{status:503,headers});
  }
}
