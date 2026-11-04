/* English Master service worker: network first (always the newest version when online), cache as an offline fallback */
const C="em-v16";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html","manifest.webmanifest","icon-192.png"])).catch(()=>{}))});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin)return;
 const key=u.origin+u.pathname;
 e.respondWith((async()=>{try{const res=await fetch(r);if(res.ok){try{const c=await caches.open(C);await c.put(key,res.clone())}catch(x){}}return res}
  catch(err){const m=await caches.match(key);if(m)return m;if(r.mode==="navigate"){const h=await caches.match(u.origin+u.pathname.replace(/[^/]*$/,"")+"index.html")||await caches.match(u.origin+u.pathname.replace(/[^/]*$/,""));if(h)return h}throw err}})())});
