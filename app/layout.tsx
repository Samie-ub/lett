import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'lett. — Learn the market. Find your footing.',
  description:
    'A calmer place to learn trading. Seven thoughtful phases, clear examples, and your own learning notebook.',
};
const themeScript = `(function(){try{var t=localStorage.getItem('lett-theme')||'system';if(!['light','dark','system'].includes(t))t='system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch(e){}})()`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
