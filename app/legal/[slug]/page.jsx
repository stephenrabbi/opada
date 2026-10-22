import {notFound} from 'next/navigation';
import {documents} from '../../legal-content.js';
import {LegalDocument} from '../components.jsx';
export function generateStaticParams(){return Object.keys(documents).map(slug=>({slug}))}
export async function generateMetadata({params}){const {slug}=await params;const item=documents[slug];return {title:item?item.title+' | Opada':'Not Found | Opada',robots:{index:false,follow:false}}}
export default async function LegalPage({params}){const {slug}=await params;if(!documents[slug])notFound();return <LegalDocument slug={slug}/>}
