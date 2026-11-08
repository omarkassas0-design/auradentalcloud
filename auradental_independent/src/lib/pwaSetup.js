/** Registers the application's own PWA manifest and service worker. */
const SW_URL = '/sw.js';
const MANIFEST_URL = '/manifest.webmanifest';
const THEME_COLOR = '#0ea5e9';
export function setupPWA() {
  const manifestLink=document.querySelector('link[rel="manifest"]'); if(manifestLink) manifestLink.href=MANIFEST_URL;
  let themeMeta=document.querySelector('meta[name="theme-color"]'); if(themeMeta) themeMeta.setAttribute('content',THEME_COLOR);
  let titleMeta=document.querySelector('meta[name="apple-mobile-web-app-title"]'); if(!titleMeta){titleMeta=document.createElement('meta');titleMeta.name='apple-mobile-web-app-title';document.head.appendChild(titleMeta);} titleMeta.content='AuraDental';
  if('serviceWorker' in navigator){const register=()=>navigator.serviceWorker.register(SW_URL,{scope:'/'}).catch(err=>console.error('[PWA] Service worker registration failed:',err));if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});}
}
