self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Keep this fetch handler minimal to avoid behavior changes.
self.addEventListener('fetch', () => {});
// Web Push payloads are deliberately generic on the lock screen.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data.json(); } catch { return; }
    payload = payload ?? {};
    let ownSession = false;
    try {
      const response = await fetch('/api/auth/session', {credentials:'include',cache:'no-store'});
      if(response.ok){const body=await response.json();const user=body.data?.user??body.data??body;ownSession=typeof payload.userId==='string'&&user?.id===payload.userId;}
    } catch {}
    const url = typeof payload.url === 'string' && /^\/(?!\/)/.test(payload.url) && !/[\\\r\n]/.test(payload.url) ? payload.url : '/notifications';
    await self.registration.showNotification(ownSession ? String(payload.title ?? 'MTX').slice(0,160) : 'MTX', {body:ownSession ? String(payload.body ?? '').slice(0,200) : 'Open MTX to view your notifications.',tag:ownSession ? String(payload.id) : 'mtx-notification',icon:'/logo/logo-web.svg',data:{id:ownSession?payload.id:null,userId:ownSession?payload.userId:null,url:ownSession?url:'/notifications'}});
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const data=event.notification.data??{};
    const url=new URL(typeof data.url==='string'?data.url:'/notifications',self.location.origin);
    if(url.origin!==self.location.origin) return;
    try {
      const response=await fetch('/api/auth/session',{credentials:'include',cache:'no-store'});const body=await response.json();const user=body.data?.user??body.data??body;
      if(response.ok&&user?.id===data.userId&&typeof data.id==='string')await fetch('/api/notifications/'+encodeURIComponent(data.id)+'/read',{method:'PATCH',credentials:'include'});
      else {url.pathname='/notifications';url.search='';}
    }catch {url.pathname='/notifications';url.search='';}
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows)if(new URL(client.url).origin===self.location.origin){await client.navigate(url.href);await client.focus();return;}
    await self.clients.openWindow(url.href);
  })());
});
