import './opada-ui.css';
import {LegalFooter} from './legal/components.jsx';
export const metadata={title:'Opada | Restaurant Intelligence',description:'Restaurant-first financial visibility and operational reporting. Development preview uses synthetic data.',robots:{index:false,follow:false}};
export default function RootLayout({children}){return <html lang="en"><body>{children}<LegalFooter/></body></html>}
