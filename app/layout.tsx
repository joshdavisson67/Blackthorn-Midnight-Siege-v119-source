import type { Metadata } from 'next';
export const metadata:Metadata={title:'Blackthorn — Midnight Siege',description:'Survive Blackthorn Estate and join the shared leaderboard.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
