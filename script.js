
(() => {
'use strict';
const D = window.CCD_DATA || {};
const CFG = window.CCD_CONFIG || {};
const PREFIX = CFG.STORAGE_PREFIX || 'berryVibesCCDNeo';
const K = {state:`${PREFIX}:state`, token:`${PREFIX}:token`, profile:`${PREFIX}:profile`, theme:`${PREFIX}:theme`, accounts:`${PREFIX}:accounts`, reset:`${PREFIX}:reset`, settings:`${PREFIX}:settings`, grocery:`${PREFIX}:grocery`, social:`${PREFIX}:social`, period:`${PREFIX}:period`, socialIdentity:`${PREFIX}:socialIdentity`};
const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=(n,d=0)=>Number(Number(n||0).toFixed(d));
const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function parseWheelTime(text,dateISO=todayISO()){
 const m=String(text||'').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
 if(!m)return new Date(`${dateISO}T00:00:00`);
 let h=Number(m[1])%12;const minute=clamp(Number(m[2])||0,0,59);if(m[3].toUpperCase()==='PM')h+=12;
 const parts=String(dateISO||todayISO()).split('-').map(Number);return new Date(parts[0],(parts[1]||1)-1,parts[2]||1,h,minute,0,0)
}
function toast(msg){const el=qs('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2800)}
function getState(){try{const s=JSON.parse(localStorage.getItem(K.state))||{};return {logs:Array.isArray(s.logs)?s.logs:[],water:s.water&&typeof s.water==='object'?s.water:{},customRestaurant:Array.isArray(s.customRestaurant)?s.customRestaurant:[],recipeCards:Array.isArray(s.recipeCards)?s.recipeCards:[],modifiedRecipes:Array.isArray(s.modifiedRecipes)?s.modifiedRecipes:[],customFoods:Array.isArray(s.customFoods)?s.customFoods:[],labRecipes:Array.isArray(s.labRecipes)?s.labRecipes:[],savedRecipeIds:Array.isArray(s.savedRecipeIds)?s.savedRecipeIds:[],plans:Array.isArray(s.plans)?s.plans:[],customMovements:Array.isArray(s.customMovements)?s.customMovements:[],activeFast:s.activeFast&&typeof s.activeFast==='object'?s.activeFast:null}}catch{return{logs:[],water:{},customRestaurant:[],recipeCards:[],modifiedRecipes:[],customFoods:[],labRecipes:[],savedRecipeIds:[],plans:[],customMovements:[],activeFast:null}}}
function saveState(s){localStorage.setItem(K.state,JSON.stringify(s));}
function mutate(fn){const s=getState();fn(s);saveState(s);return s}
function token(){return localStorage.getItem(K.token)||''}
function getProfile(){try{const raw=JSON.parse(localStorage.getItem(K.profile))||{};return normalizeProfile(raw)}catch{return normalizeProfile({})}}
function normalizeProfile(raw={}){const hasHeight=raw.heightInches!=null||raw.height!=null,legacyHeight=raw.heightInches??raw.height??65;const age=(raw.age==null||raw.age==='')?25:Number(raw.age)||25;return {name:raw.name||'BERRY FRIEND',height:heightToDisplay(hasHeight?legacyHeight:65),heightInches:heightToInches(hasHeight?legacyHeight:65),weight:raw.weight??'',reason:raw.reason||'',photo:raw.photo||'',age,activity:raw.activity||'',goal:raw.goal||'',onboardingComplete:!!raw.onboardingComplete}}
function heightToDisplay(value){
 if(value==null||value==='')return "5'2";
 if(typeof value==='string'){
  const v=value.trim();
  const m=v.match(/^(\d+)\s*(?:ft|')\s*(\d{1,2})?\s*(?:in|")?$/i);
  if(m)return `${Number(m[1])}'${Number(m[2]||0)}`;
  if(/^\d+$/.test(v)){const inches=Number(v),feet=Math.floor(inches/12),inch=inches%12;return `${feet}'${inch}`}
  return v.replace(/\s+/g,'')
 }
 const inches=Math.round(Number(value)||62),feet=Math.floor(inches/12),inch=inches%12;return `${feet}'${inch}`
}
function heightToInches(value){
 if(value==null||value==='')return 62;
 if(typeof value==='number')return Math.round(value)||62;
 const v=String(value).trim();
 let m=v.match(/^(\d+)\s*(?:ft|')\s*(\d{1,2})?\s*(?:in|")?$/i);
 if(m)return Number(m[1])*12+Number(m[2]||0);
 m=v.match(/^(\d+)$/);
 if(m)return Number(m[1]);
 return 62
}
function saveProfile(p){
 localStorage.setItem(K.profile,JSON.stringify(p));
 const acct=currentLocalAccount?.();
 if(acct){const accounts=getLocalAccounts();const i=accounts.findIndex(x=>x.id===acct.id);if(i>=0){accounts[i].profile={...p};saveLocalAccounts(accounts)}}
}
function allFoods(){const s=getState();return [...(s.labRecipes||[]),...(s.customFoods||[]),...(D.CCD_RECIPES||[]),...(D.RECOVERED_FOOD_LOGS||[])]}
const CCD_RECIPE_IDS=new Set((D.CCD_RECIPES||[]).map(r=>r.id));
function median(values=[]){const a=values.map(Number).filter(n=>Number.isFinite(n)&&n>0).sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:Math.round((a[m-1]+a[m])/2)}
function archivedRecipeCalories(item={}){
 const own=Number(item.calories),nut=Number(item.nutrition?.calories);if(nut>0)return nut;if(own>0)return own;
 if(!CCD_RECIPE_IDS.has(item.id))return Math.max(0,own||nut||0);
 const recipes=D.CCD_RECIPES||[],sameGroup=recipes.filter(r=>r.group&&r.group===item.group).map(r=>Number(r.nutrition?.calories)||Number(r.calories)||0),groupMedian=median(sameGroup);
 const globalMedian=median(recipes.map(r=>Number(r.nutrition?.calories)||Number(r.calories)||0));
 return groupMedian||globalMedian||220
}
function estimatedNutrition(item){
 const n=item.nutrition;if(n&&typeof n==='object'){const c=+(n.calories??item.calories??0)||archivedRecipeCalories(item);return {calories:c,carbs:+(n.carbs||0),protein:+(n.protein||0),fat:+(n.fat||0),fiber:+(n.fiber||0),estimated:!(Number(n.calories)>0)}};
 const c=archivedRecipeCalories(item); const name=(item.name||'').toLowerCase(); const savory=/chicken|steak|egg|cheese|rice|pasta|sandwich|pizza|burrito|omelet/.test(name); const protein=savory?c*.22/4:c*.10/4; const fat=savory?c*.30/9:c*.28/9; const carbs=Math.max(0,(c-protein*4-fat*9)/4); const fiber=c>0?Math.max(1,Math.min(9,carbs*.07)):0;
 return {calories:c,carbs:round(carbs,1),protein:round(protein,1),fat:round(fat,1),fiber:round(fiber,1),estimated:true};
}
function recipePoolAll(){return [...(getState().labRecipes||[]),...(D.CCD_RECIPES||[])]}
function recipeById(id){return recipePoolAll().find(x=>x.id===id)}
function recipeSaved(id){return (getState().savedRecipeIds||[]).includes(id)}
function toggleRecipeSaved(id){const r=recipeById(id);if(!r)return false;let saved=false;mutate(s=>{s.savedRecipeIds=s.savedRecipeIds||[];const i=s.savedRecipeIds.indexOf(id);if(i>=0){s.savedRecipeIds.splice(i,1);saved=false}else{s.savedRecipeIds.unshift(id);saved=true}});toast(saved?`${r.name.toUpperCase()} SAVED ♥`:`${r.name.toUpperCase()} REMOVED FROM SAVED`);return saved}

const PHOTO_BANK={
 pancake:'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1100&q=82',
 chocolate:'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1100&q=82',
 chicken:'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1100&q=82',
 sandwich:'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=1100&q=82',
 rice:'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1100&q=82',
 pasta:'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1100&q=82',
 coffee:'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1100&q=82',
 breakfast:'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1100&q=82',
 default:'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1100&q=82'
};
const DRINK_PRESETS={
 water:{id:'water',name:'WATER',baseLabel:'1 BOTTLE',nutrition:{calories:0,carbs:0,protein:0,fat:0,fiber:0}},
 'cinnamon-coffee':{id:'cinnamon-coffee',name:'HOT CINNAMON COFFEE',baseLabel:'1 MUG',nutrition:{calories:0,carbs:0,protein:0,fat:0,fiber:0}},
 'orange-juice':{id:'orange-juice',name:'ORANGE JUICE',baseLabel:'1/2 CUP',nutrition:{calories:56,carbs:13,protein:.8,fat:0,fiber:.2}},
 'skim-milk':{id:'skim-milk',name:'SKIM MILK',baseLabel:'1 CUP',nutrition:{calories:80,carbs:12.8,protein:8,fat:0,fiber:0}}
};
function photoFor(x){if(x?.image)return x.image;const s=`${x?.name||''} ${x?.group||''}`.toLowerCase();if(/pancake|waffle|french toast/.test(s))return PHOTO_BANK.pancake;if(/chocolate|brownie|cake|cookie|oreo|muffin/.test(s))return PHOTO_BANK.chocolate;if(/chicken|drumstick/.test(s))return PHOTO_BANK.chicken;if(/sandwich|bagel|toast|philly/.test(s))return PHOTO_BANK.sandwich;if(/rice|jollof/.test(s))return PHOTO_BANK.rice;if(/pasta|spaghetti/.test(s))return PHOTO_BANK.pasta;if(/coffee|mocha|latte/.test(s))return PHOTO_BANK.coffee;if(/breakfast|egg|omelet/.test(s))return PHOTO_BANK.breakfast;return PHOTO_BANK.default}
function scaledNutrition(n,scale=1){return Object.fromEntries(['calories','carbs','protein','fat','fiber'].map(k=>[k,round((+n[k]||0)*scale,k==='calories'?0:1)]))}
function sotdNutrition(item,qty=1){const c=+(item.calories||0);let base;if(item.id==='oreos')base={calories:c,carbs:8.3,protein:.5,fat:2.3,fiber:.33};else if(item.id==='cake-pop')base={calories:c,carbs:21,protein:2,fat:8,fiber:1};else{base={calories:c,carbs:round(c*.55/4,1),protein:round(c*.06/4,1),fat:round(c*.39/9,1),fiber:round(Math.max(.3,c*.55/4*.04),1)}}return scaledNutrition(base,qty)}
function miniMacros(n){return [['CALORIES',`${n.calories} KCAL`],['CARBS',`${n.carbs} G`],['PROTEIN',`${n.protein} G`],['FAT',`${n.fat} G`],['FIBER',`${n.fiber} G`]].map(([a,b])=>`<div class="mini-macro"><span>${a}</span><strong>${b}</strong></div>`).join('')}
function bar(label,value,max,cls=''){const pct=clamp(value/max*100,0,100);return `<div class="bar-row ${cls}"><div class="bar-label">${label}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><div class="bar-value">${round(value,1)}${label==='CALORIES'?'':' g'}</div></div>`}
function logEntry(entry){const row={id:uid(),date:todayISO(),createdAt:new Date().toISOString(),...entry};mutate(x=>{x.logs=x.logs||[];x.logs.unshift(row)});syncLog(row).catch(()=>{});return row}
function backendConfigured(){const base=String(CFG.API_BASE||'').trim();return /^https?:\/\//i.test(base)&&!base.includes('YOUR-BACKEND')}
async function api(path,opts={}){const base=(CFG.API_BASE||'').replace(/\/$/,'');if(!backendConfigured())throw new Error('SERVER MODE IS NOT CONNECTED.');const headers={'Content-Type':'application/json',...(opts.headers||{})};if(token()&&!token().startsWith('local:'))headers.Authorization=`Bearer ${token()}`;const res=await fetch(base+path,{...opts,headers});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||`Request failed (${res.status})`);return data}
async function syncLog(entry){if(!token()||token().startsWith('local:')||!backendConfigured())return;try{await api('/api/logs',{method:'POST',body:JSON.stringify(entry)})}catch{}}
async function fileDataUrl(file){return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
async function compactImageDataUrl(file){
 if(!file||!String(file.type||'').startsWith('image/'))return await fileDataUrl(file);
 if(file.size>20*1024*1024)throw new Error('PHOTO MUST BE 20 MB OR SMALLER.');
 if(file.type==='image/gif')return await fileDataUrl(file);
 try{
  const src=URL.createObjectURL(file),img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=src});
  const maxDim=1400,scale=Math.min(1,maxDim/Math.max(img.naturalWidth||1,img.naturalHeight||1)),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{alpha:true});ctx.drawImage(img,0,0,w,h);URL.revokeObjectURL(src);
  return canvas.toDataURL('image/webp',.78)
 }catch{return await fileDataUrl(file)}
}
async function uploadFile(file,kind='food'){if(!file)return '';const isImage=String(file.type||'').startsWith('image/'),dataUrl=isImage?await compactImageDataUrl(file):await fileDataUrl(file);if(token()&&!token().startsWith('local:')&&backendConfigured()){try{const out=await api('/api/upload',{method:'POST',body:JSON.stringify({name:file.name,mime:isImage&&dataUrl.startsWith('data:image/webp')?'image/webp':file.type,kind,dataUrl})});const u=out.url||'';return /^https?:/i.test(u)?u:`${(CFG.API_BASE||'').replace(/\/$/,'')}${u}`}catch(err){console.warn('Server upload failed; using browser photo copy instead.',err)}}return dataUrl}
function openMediaDb(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window))return resolve(null);try{const req=indexedDB.open(`${PREFIX}:media`,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('blobs'))db.createObjectStore('blobs')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null)}catch{return resolve(null)}})}
async function storeLocalMedia(file){const db=await openMediaDb();if(!db){if(file.size>2*1024*1024)throw new Error('THIS BROWSER NEEDS SMALLER MEDIA FILES IN LOCAL MODE.');return await fileDataUrl(file)}const key=`media-${uid()}`;await new Promise((resolve,reject)=>{const tx=db.transaction('blobs','readwrite');tx.objectStore('blobs').put(file,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();return `idb:${key}`}
async function resolveMediaRef(ref){if(!String(ref||'').startsWith('idb:'))return ref||'';const db=await openMediaDb();if(!db)return'';const key=String(ref).slice(4),blob=await new Promise((resolve,reject)=>{const tx=db.transaction('blobs','readonly'),req=tx.objectStore('blobs').get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)});db.close();return blob?URL.createObjectURL(blob):''}
async function uploadSocialMedia(file){if(!file)return null;const type=String(file.type||'');const okImage=/^image\/(jpeg|png|webp|gif)$/i.test(type),okVideo=/^video\/(mp4|webm|quicktime)$/i.test(type);if(!okImage&&!okVideo)throw new Error('USE A JPG, PNG, WEBP, GIF, MP4, WEBM, OR MOV FILE.');if(file.size>20*1024*1024)throw new Error('EACH SOCIAL MEDIA FILE MUST BE 20 MB OR SMALLER.');let url;if(token()&&!token().startsWith('local:')&&backendConfigured()){const dataUrl=await fileDataUrl(file);const out=await api('/api/upload',{method:'POST',body:JSON.stringify({name:file.name,mime:type,kind:'social',dataUrl})});const u=out.url||'';url=/^https?:/i.test(u)?u:`${(CFG.API_BASE||'').replace(/\/$/,'')}${u}`}else url=await storeLocalMedia(file);return{url,type:okVideo?'video':'image',mime:type,name:file.name}}
function socialMediaList(post){if(Array.isArray(post?.media)&&post.media.length)return post.media;if(post?.photo)return[{url:post.photo,type:'image',mime:'image/jpeg',name:'photo'}];return[]}
async function hydrateMediaRefs(root=document){for(const el of qsa('[data-media-ref]',root)){const ref=el.dataset.mediaRef;if(!ref||el.dataset.mediaHydrated==='1')continue;try{const src=await resolveMediaRef(ref);if(src){el.src=src;el.dataset.mediaHydrated='1'}}catch{}}}
function socialMediaHtml(media=[],postId=''){const count=Math.min(4,media.length);if(!count)return'';return `<div class="social-media-grid media-count-${count}">${media.slice(0,4).map((m,i)=>m.type==='video'?`<div class="social-media-item video-item"><video controls playsinline preload="metadata" data-media-ref="${esc(m.url)}"></video><button class="media-expand" data-open-media-post="${esc(postId)}" data-open-media-index="${i}" aria-label="Open video">⛶</button></div>`:`<button class="social-media-item image-item" data-open-media-post="${esc(postId)}" data-open-media-index="${i}"><img data-media-ref="${esc(m.url)}" alt="Post image"></button>`).join('')}</div>`}
function clearFileInput(inputId,previewId,nameId,emptyLabel,removeId){const input=qs('#'+inputId);if(input)input.value='';const preview=previewId?qs('#'+previewId):null;if(preview)preview.innerHTML='';const name=nameId?qs('#'+nameId):null;if(name)name.textContent=emptyLabel||'NO PHOTO SELECTED';const btn=removeId?qs('#'+removeId):null;if(btn)btn.hidden=true}
function previewSingleImage(input,preview,nameEl,removeBtn,emptyLabel='NO PHOTO SELECTED'){
 const f=input?.files?.[0];if(nameEl)nameEl.textContent=f?f.name:emptyLabel;if(removeBtn)removeBtn.hidden=!f;if(!preview)return;preview.innerHTML='';if(!f)return;
 if(!String(f.type||'').startsWith('image/')){input.value='';if(nameEl)nameEl.textContent=emptyLabel;if(removeBtn)removeBtn.hidden=true;toast('CHOOSE AN IMAGE FILE 📸');return}
 const url=URL.createObjectURL(f);preview.innerHTML=`<figure class="upload-preview-card removable-upload-preview"><img src="${url}" alt="upload preview"><figcaption>${esc(f.name)}</figcaption><button type="button" class="upload-preview-remove" aria-label="Remove selected photo">×</button></figure>`;qs('.upload-preview-remove',preview)?.addEventListener('click',()=>{input.value='';preview.innerHTML='';if(nameEl)nameEl.textContent=emptyLabel;if(removeBtn)removeBtn.hidden=true;URL.revokeObjectURL(url);toast('PHOTO REMOVED.')},{once:true})
}
function markLoginIntro(){sessionStorage.setItem(`${PREFIX}:showLoginIntro`,'1')}
function initLoginMotionIntro(){const key=`${PREFIX}:showLoginIntro`;if(sessionStorage.getItem(key)!=='1'){document.documentElement.classList.remove('login-intro-pending');return}sessionStorage.removeItem(key);const p=getProfile(),overlay=document.createElement('div');overlay.className='login-motion-intro intro-live';overlay.innerHTML=`<div class="intro-aurora intro-a"></div><div class="intro-aurora intro-b"></div><div class="intro-orbit intro-orbit-a"></div><div class="intro-orbit intro-orbit-b"></div><button class="intro-skip" type="button">SKIP</button><div class="intro-copy"><span class="intro-kicker">BERRY VIBES × CCD</span><h1><span>WELCOME</span><span>BACK, ${(p.name||'DANIELLE').toUpperCase()}</span></h1><p>LOG IT · BUILD IT · MOVE IT · MAKE IT YOURS ✨</p></div>`;document.body.appendChild(overlay);let closed=false;const close=()=>{if(closed)return;closed=true;overlay.classList.add('intro-out');setTimeout(()=>{overlay.remove();document.documentElement.classList.remove('login-intro-pending')},650)};qs('.intro-skip',overlay).onclick=close;setTimeout(close,3200)}
function initKineticText(){if(!getSettings().motion)return;const nodes=qsa('.page-head h1,.recipe-hero-v6 h1,.battle-hero-v6 h1,.dashboard-hero .hero-copy h1');nodes.forEach((el,idx)=>{if(el.dataset.kineticReady)return;el.dataset.kineticReady='1';const text=el.textContent.trim(),words=text.split(/\s+/);el.textContent='';words.forEach((w,i)=>{const span=document.createElement('span');span.className='kinetic-word';span.style.setProperty('--word-i',i);span.textContent=w;el.append(span,document.createTextNode(' '))});setTimeout(()=>el.classList.add('kinetic-text-live'),80+idx*70)});qsa('.btn,.nav-menu-toggle').forEach(btn=>btn.addEventListener('pointerdown',e=>{const r=document.createElement('span'),box=btn.getBoundingClientRect();r.className='click-ripple';r.style.left=`${e.clientX-box.left}px`;r.style.top=`${e.clientY-box.top}px`;btn.appendChild(r);setTimeout(()=>r.remove(),650)}))}
function applyTheme(){const t=localStorage.getItem(K.theme)||'berry-cream';document.documentElement.dataset.theme=t;qsa('[data-theme-choice]').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===t))}
function ensureSettingsNavLink(){const nav=qs('.nav-scroll');if(!nav||nav.querySelector('a[href="settings.html"]'))return;const link=document.createElement('a');link.className='nav-link';link.href='settings.html';link.textContent='SETTINGS';const food=[...nav.querySelectorAll('.nav-link')].find(a=>(a.getAttribute('href')||'').toLowerCase()==='foods.html');if(food)food.insertAdjacentElement('afterend',link);else nav.appendChild(link)}
function authNav(){ensureSettingsNavLink();const a=qs('[data-auth-link]');if(!a)return;if(hasSession()){a.hidden=true;a.style.display='none'}else{a.hidden=false;a.style.display='';a.textContent='SIGN IN';a.href='login.html'}}
function getLocalAccounts(){try{const a=JSON.parse(localStorage.getItem(K.accounts)||'[]');return Array.isArray(a)?a:[]}catch{return[]}}
function saveLocalAccounts(a){localStorage.setItem(K.accounts,JSON.stringify(a))}
function currentLocalAccount(){const t=token();if(!t.startsWith('local:'))return null;const id=t.slice(6);return getLocalAccounts().find(x=>x.id===id)||null}
const USER_DATA_KEYS=[K.state,K.profile,K.theme,K.settings,K.grocery,K.period,K.social,K.socialIdentity];
function freshProfile(name='BERRY FRIEND'){return {name,height:"5'5",heightInches:65,weight:'',reason:'',photo:'',age:25,activity:'',goal:'',onboardingComplete:false}}
function userDataSnapshot(){const out={};USER_DATA_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!=null)out[k]=v});return out}
function stashCurrentLocalAccountData(){const acct=currentLocalAccount();if(!acct)return;const accounts=getLocalAccounts(),i=accounts.findIndex(x=>x.id===acct.id);if(i<0)return;accounts[i].appData=userDataSnapshot();try{accounts[i].profile=JSON.parse(localStorage.getItem(K.profile)||'null')||accounts[i].profile}catch{}saveLocalAccounts(accounts)}
function clearUserDataStorage(){USER_DATA_KEYS.forEach(k=>localStorage.removeItem(k));sessionStorage.removeItem(`${PREFIX}:pendingFast`);sessionStorage.removeItem(`${PREFIX}:showLoginIntro`);sessionStorage.removeItem(`${PREFIX}:newAccountOnboarding`)}
function restoreLocalAccountData(acct){clearUserDataStorage();if(acct?.appData&&typeof acct.appData==='object'){Object.entries(acct.appData).forEach(([k,v])=>{if(USER_DATA_KEYS.includes(k)&&v!=null)localStorage.setItem(k,v)})}const raw=acct?.profile||freshProfile(acct?.username||'BERRY FRIEND');localStorage.setItem(K.profile,JSON.stringify(normalizeProfile(raw)))}
function resetLocalAccountData(acct){if(!acct)return;const accounts=getLocalAccounts(),i=accounts.findIndex(x=>x.id===acct.id);if(i<0)return;accounts[i].profile=freshProfile(acct.username);accounts[i].appData={};saveLocalAccounts(accounts);clearUserDataStorage();localStorage.setItem(K.profile,JSON.stringify(accounts[i].profile))}
function getSettings(){try{return {motion:true,gallerySpeed:'normal',socialPrivacy:'public',dailyRecipes:true,startPage:'index.html',...(JSON.parse(localStorage.getItem(K.settings)||'{}')||{})}}catch{return{motion:true,gallerySpeed:'normal',socialPrivacy:'public',dailyRecipes:true,startPage:'index.html'}}}
function saveSettings(v){localStorage.setItem(K.settings,JSON.stringify(v));applySettings()}
function applySettings(){const s=getSettings();document.documentElement.classList.toggle('motion-disabled',!s.motion);document.documentElement.style.setProperty('--gallery-speed',s.gallerySpeed==='slow'?'58s':s.gallerySpeed==='fast'?'24s':'38s')}
function currentUserId(){const a=currentLocalAccount();if(a)return a.id;let id=localStorage.getItem(K.socialIdentity);if(!id){id=`server-${uid()}`;localStorage.setItem(K.socialIdentity,id)}return id}
function currentUserName(){return currentLocalAccount()?.username||getProfile().name||'CCD USER'}
function avatarSvg(label='BV',tone='#f5a8c0'){const initials=String(label||'BV').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase().slice(0,2)||'BV';return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="${tone}"/><stop offset="1" stop-color="#f7d7e4"/></linearGradient></defs><rect width="240" height="240" rx="65" fill="url(#g)"/><text x="120" y="142" text-anchor="middle" font-family="Arial" font-size="72" font-weight="900" fill="#3a2534">${initials}</text></svg>`)}
async function syncLogUpdate(entry){if(!token()||token().startsWith('local:')||!backendConfigured())return;try{await api(`/api/logs/${encodeURIComponent(entry.id)}`,{method:'PUT',body:JSON.stringify(entry)})}catch{}}
async function syncLogDelete(id){if(!token()||token().startsWith('local:')||!backendConfigured())return;try{await api(`/api/logs/${encodeURIComponent(id)}`,{method:'DELETE',body:'{}'})}catch{}}
function activateNav(){const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();qsa('.nav-link').forEach(a=>a.classList.toggle('active',(a.getAttribute('href')||'').toLowerCase()===file))}
function initHamburgerMenu(){
 const nav=qs('.top-nav');if(!nav||isAuthPage()||qs('.nav-menu-toggle',nav))return;
 const navLinks=qsa('.nav-link',nav),current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
 const btn=document.createElement('button');btn.type='button';btn.className='nav-menu-toggle';btn.setAttribute('aria-label','Open website menu');btn.setAttribute('aria-expanded','false');btn.innerHTML='<span class="hamburger-glyph">☰</span><b>MENU</b>';
 nav.appendChild(btn);
 const overlay=document.createElement('button');overlay.type='button';overlay.className='nav-drawer-overlay';overlay.setAttribute('aria-label','Close menu');
 const drawer=document.createElement('aside');drawer.className='nav-drawer';drawer.setAttribute('aria-hidden','true');drawer.innerHTML=`<div class="nav-drawer-head"><div><span class="section-kicker">BERRY VIBES × CCD</span><h2>MENU</h2></div><button type="button" class="nav-drawer-close" aria-label="Close menu">×</button></div><nav class="nav-drawer-links">${navLinks.map(a=>`<a href="${esc(a.getAttribute('href'))}" class="${(a.getAttribute('href')||'').toLowerCase()===current?'active':''}">${esc(a.textContent)}</a>`).join('')}</nav><div class="nav-drawer-foot"><a href="settings.html" class="${current==='settings.html'?'active':''}">⚙ SETTINGS + ACCOUNT</a><span>YOUR FULL SITE, WITHOUT THE CROWDED BAR ✨</span></div>`;
 document.body.append(overlay,drawer);
 const setOpen=open=>{document.body.classList.toggle('nav-drawer-open',open);btn.setAttribute('aria-expanded',String(open));drawer.setAttribute('aria-hidden',String(!open))};
 btn.onclick=()=>setOpen(!document.body.classList.contains('nav-drawer-open'));overlay.onclick=()=>setOpen(false);qs('.nav-drawer-close',drawer).onclick=()=>setOpen(false);qsa('a',drawer).forEach(a=>a.onclick=()=>setOpen(false));document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
 const visible=navLinks.slice(0,5).some(a=>(a.getAttribute('href')||'').toLowerCase()===current);btn.classList.toggle('current-in-menu',!visible&&current!=='settings.html')
}
function closeDialogById(id){const d=qs('#'+id);if(d?.open)d.close()}
function bindDialogClosers(){qsa('[data-close-dialog]').forEach(b=>b.onclick=()=>closeDialogById(b.dataset.closeDialog))}
function hasSession(){const t=token();if(!t)return false;if(backendConfigured())return true;return t.startsWith('local:')&&!!currentLocalAccount()}
async function localPasswordHash(password){const value=String(password||'');if(globalThis.crypto?.subtle){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return `fallback-${(h>>>0).toString(16)}`}
function randomCode(){if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return String(100000+(a[0]%900000))}return String(100000+Math.floor(Math.random()*900000))}
function isAuthPage(){return document.body.classList.contains('auth-page')}
function ensureAccess(){if(isAuthPage()){if(hasSession()&&document.body.dataset.page==='login'){location.replace('index.html');return false}return true}if(!hasSession()){localStorage.removeItem(K.token);const here=location.pathname.split('/').pop()||'index.html';sessionStorage.setItem(`${PREFIX}:returnTo`,here);location.replace('login.html');return false}document.body.classList.add('authenticated');return true}
function afterAuthDestination(fallback=getSettings().startPage||'index.html'){const dest=sessionStorage.getItem(`${PREFIX}:returnTo`);sessionStorage.removeItem(`${PREFIX}:returnTo`);if(!dest||/^(login|signup|forgot-|reset-)/.test(dest))return fallback;if(['account.html','profile.html','social.html','about.html'].includes(dest))return 'settings.html';return dest}
function updateAuthModeNote(){const el=qs('#authModeNote');if(!el)return;el.textContent=backendConfigured()?'SERVER ACCOUNT MODE · YOUR PRIVATE MENU UNLOCKS AFTER SIGN IN.':'GITHUB PAGES ACCOUNT MODE · THIS LOGIN WORKS IN THIS BROWSER; CONNECT THE INCLUDED NODE SERVER ANY TIME FOR SERVER SYNC.'}
function bindTilt(){qsa('.tilt-card').forEach(el=>{el.addEventListener('pointermove',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(900px) rotateX(${-y*5}deg) rotateY(${x*6}deg) translateY(-2px)`});el.addEventListener('pointerleave',()=>el.style.transform='')})}
class TimeWheel{
 constructor(root,date=new Date()){this.root=root;if(!root)return;this.values={hour:(date.getHours()%12)||12,minute:date.getMinutes(),ampm:date.getHours()>=12?'PM':'AM'};this.build();}
 build(){this.root.innerHTML='<div class="wheel-colon">:</div>';this.addColumn('hour',Array.from({length:12},(_,i)=>i+1),v=>String(v));this.addColumn('minute',Array.from({length:60},(_,i)=>i),v=>String(v).padStart(2,'0'));this.addColumn('ampm',['AM','PM'],v=>v);requestAnimationFrame(()=>{this.snapAll();this.emit()})}
 addColumn(key,vals,fmt){const col=document.createElement('div');col.className='wheel-column';col.dataset.key=key;vals.forEach(v=>{const b=document.createElement('div');b.className='wheel-option';b.dataset.value=v;b.textContent=fmt(v);b.addEventListener('click',()=>{this.values[key]=typeof vals[0]==='number'?+v:v;this.center(b,col);this.paint(col,key);this.emit()});col.appendChild(b)});let t;col.addEventListener('scroll',()=>{clearTimeout(t);t=setTimeout(()=>this.pickCenter(col,key),75)});this.root.appendChild(col)}
 center(el,col){col.scrollTo({top:el.offsetTop-(col.clientHeight-el.clientHeight)/2,behavior:'smooth'})}
 snapAll(){qsa('.wheel-column',this.root).forEach(col=>{const key=col.dataset.key;const el=qsa('.wheel-option',col).find(x=>String(x.dataset.value)===String(this.values[key]));if(el){col.scrollTop=el.offsetTop-(col.clientHeight-el.clientHeight)/2;this.paint(col,key)}})}
 pickCenter(col,key){const c=col.scrollTop+col.clientHeight/2;let best=null,dist=Infinity;qsa('.wheel-option',col).forEach(el=>{const d=Math.abs(el.offsetTop+el.offsetHeight/2-c);if(d<dist){dist=d;best=el}});if(best){this.values[key]=key==='ampm'?best.dataset.value:+best.dataset.value;this.center(best,col);this.paint(col,key);this.emit()}}
 paint(col,key){qsa('.wheel-option',col).forEach(x=>x.classList.toggle('is-selected',String(x.dataset.value)===String(this.values[key])))}
 emit(){this.root.dispatchEvent(new CustomEvent('timewheelchange',{detail:this.get()}))}
 set(text){const m=String(text||'').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);if(!m)return false;this.values={hour:Math.max(1,Math.min(12,+m[1]||12)),minute:Math.max(0,Math.min(59,+m[2]||0)),ampm:m[3].toUpperCase()};this.snapAll();this.emit();return true}
 get(){return {...this.values,text:`${this.values.hour}:${String(this.values.minute).padStart(2,'0')} ${this.values.ampm}`}}
}
const wheels={};function initWheels(){qsa('[data-time-wheel]').forEach(el=>{const d=new Date();d.setMinutes(d.getMinutes()+(+el.dataset.offsetMinutes||0));wheels[el.id]=new TimeWheel(el,d)})}
function timeOf(id){return wheels[id]?.get().text||new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
function initToday(){
 const g=qs('#greeting');if(!g)return;const h=new Date().getHours();const p=getProfile();g.textContent=`${h<12?'GOOD MORNING':h<17?'GOOD AFTERNOON':'GOOD EVENING'}, ${(p.name||'DANIELLE').toUpperCase()} ✨`;qs('#dateLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
 const s=getState(),logs=(s.logs||[]).filter(x=>x.date===todayISO());let totals={calories:0,carbs:0,protein:0,fat:0,fiber:0},burn=0;logs.forEach(x=>{if(['food','sotd','restaurant'].includes(x.type))Object.keys(totals).forEach(k=>totals[k]+=+(x.nutrition?.[k]||0));if(x.type==='movement')burn+=+(x.burn||0)});Object.keys(totals).forEach(k=>totals[k]=round(totals[k],1));
 qs('#todayMetrics').innerHTML=`<div class="metric-chip"><span>FOOD IN</span><strong>${round(totals.calories)} KCAL</strong></div><div class="metric-chip"><span>MAINTENANCE RANGE</span><strong>${D.MAINTENANCE?.low||2100}–${D.MAINTENANCE?.high||2150}</strong></div><div class="metric-chip"><span>REMAINING TO LOW</span><strong>${Math.max(0,(D.MAINTENANCE?.low||2100)-totals.calories)} KCAL</strong></div><div class="metric-chip"><span>MOVE BURN · SEPARATE</span><strong>${round(burn)} KCAL</strong></div>`;
 qs('#macroBars').innerHTML=bar('CARBS',totals.carbs,260,'carbs')+bar('PROTEIN',totals.protein,100,'protein')+bar('FAT',totals.fat,80,'fat')+bar('FIBER',totals.fiber,30,'fiber');
 const cats={COZY:0,PROTEIN:0,GRAINS:0,FRUITVEG:0,TREATS:0};logs.forEach(l=>{const n=(l.name||'').toLowerCase();if(/chicken|egg|steak|cheese/.test(n))cats.PROTEIN++;else if(/rice|pasta|bread|bagel|pancake|waffle|oat/.test(n))cats.GRAINS++;else if(/apple|berry|avocado|spinach|orange/.test(n))cats.FRUITVEG++;else if(/oreo|cake|brownie|cookie|shake|chocolate|candy/.test(n))cats.TREATS++;else cats.COZY++});const m=Math.max(1,...Object.values(cats));qs('#pyramidBars').innerHTML=Object.entries(cats).map(([k,v],i)=>bar(k,v,m,['fiber','protein','fat','carbs'][i%4])).join('');
 qs('#burnToday').textContent=round(burn);const water=+(s.water?.[todayISO()]||0);qs('#waterCount').textContent=water;const waterPct=Math.min(100,water/5*100);if(qs('#waterMeterFill'))qs('#waterMeterFill').style.width=`${waterPct}%`;if(qs('#waterBottleSteps'))qs('#waterBottleSteps').innerHTML=Array.from({length:5},(_,i)=>`<span class="${i<water?'filled':''}">💧</span>`).join('');if(qs('#hydrationMessage'))qs('#hydrationMessage').textContent=water>=5?'HYDRATION GOAL HIT ✨💧':water>=3?'NICE FLOW — KEEP IT GOING 💧':water>0?'WATER IS ON THE BOARD 💧':'START YOUR WATER STORY ✨';qsa('[data-water]').forEach(b=>b.onclick=()=>{mutate(x=>{x.water=x.water||{};x.water[todayISO()]=Math.max(0,+(x.water[todayISO()]||0)+(+b.dataset.water))});initToday()});
 const fast=logs.find(x=>x.type==='fast');qs('#fastSummary').textContent=fast?`${fast.durationHours} HRS`:'—';qs('#fastMeta').textContent=fast?`${fast.preset} · ${fast.startTime} → ${fast.breakTime}`:'NO FAST LOGGED YET.';
 qs('#timeline').innerHTML=logs.length?logs.slice(0,12).map(l=>`<div class="timeline-item"><span class="time">${esc(l.time||l.startTime||'')}</span><div><strong>${esc(l.name||l.type)}</strong><div class="type">${esc((l.type||'LOG').toUpperCase())}</div></div><span>${l.nutrition?.calories?`${l.nutrition.calories} KCAL`:l.burn?`${l.burn} BURN`:''}</span></div>`).join(''):'<div class="empty-state">NO LOGS YET — YOUR DAY IS WAITING ✨</div>';
 const picks=[allFoods()[0],allFoods()[8],allFoods()[24],...(D.RECOVERED_FOOD_LOGS||[]).slice(0,3)].filter(Boolean);qs('#photoPortal').innerHTML=picks.map(x=>`<article class="photo-card"><img src="${photoFor(x)}" alt="${esc(x.name)}"><div class="card-body"><strong>${esc(x.name)}</strong><div class="card-meta">${estimatedNutrition(x).calories} KCAL · OPEN IN FOOD LOG</div></div></article>`).join('')
}
function mealSlotMatches(item,slot){
 const s=String(slot||'ALL').toUpperCase();
 if(s==='ALL')return true;
 if(item?.customMealSlot)return String(item.customMealSlot).toUpperCase()===s || (s==='SOTD'&&item.customType==='snack');
 const name=String(item.name||'').toLowerCase();
 const group=String(item.group||'').toLowerCase();
 const recovered=/recovered|recent ccd|original formulas|sunday home-cooked/.test(group);
 const savoryMeal=/sandwich|wrap|burrito|quesadilla|pizza|pasta|spaghetti|rice|jollof|chicken|steak|philly|bagel|melt|toast|drumstick/.test(name);
 if(s==='BREAKFAST')return /sweet breakfast bakes|savory breakfasts and egg ideas/.test(group) || (recovered&&/breakfast|belvita|omelet|pancake|waffle|french toast|egg/.test(name));
 if(s==='LUNCH')return /sandwiches and open sandwiches|wraps, burritos, and quesadillas|bowls, pizzas, and pasta-style meals/.test(group) || (recovered&&savoryMeal);
 if(s==='DINNER')return /sandwiches and open sandwiches|wraps, burritos, and quesadillas|bowls, pizzas, and pasta-style meals/.test(group) || (recovered&&savoryMeal);
 if(s==='SNACK')return /cookies and bars|muffins, donuts, and handheld bakes|puddings, creams, and cold treats|microwave sweet recipes|savory snacks and sides|recovered snack logs/.test(group);
 if(s==='SOTD')return /cookies and bars|puddings, creams, and cold treats|recovered snack logs/.test(group) || /oreo|cookie|brownie|cake pop|candy|sour patch|milkshake|chips/.test(name);
 return true
}
function foodRecipeBlueprint(item={}){
 const savedIngredients=Array.isArray(item.ingredients)?item.ingredients.filter(Boolean):[];
 const savedSteps=Array.isArray(item.steps)?item.steps.filter(Boolean):[];
 const name=String(item.name||'FOOD').toLowerCase(),group=String(item.group||'').toLowerCase();
 let ingredients=savedIngredients.slice(),steps=savedSteps.slice(),reconstructed=false;
 const named=(label)=>`PORTION / INGREDIENTS FOR ${String(item.name||label).toUpperCase()}`;
 if(!ingredients.length){
  reconstructed=true;
  if(/pancake|waffle|french toast|breakfast bake|muffin|donut|cake|brownie|cookie|roll|loaf|oat square/.test(`${name} ${group}`))ingredients=[named('BAKE'),'FLOUR / GRAIN BASE USED IN YOUR CCD VERSION','EGG OR BINDER USED IN YOUR VERSION','DAIRY / LIQUID USED IN YOUR VERSION','FLAVORINGS / TOPPINGS NAMED IN THE FOOD TITLE'];
  else if(/sandwich|bagel|toast|philly|melt|wrap|burrito|quesadilla/.test(`${name} ${group}`))ingredients=[named('SANDWICH'),'BREAD / BAGEL / WRAP BASE','PROTEIN OR EGG USED IN YOUR VERSION','CHEESE / SPREAD USED IN YOUR VERSION','ANY SAVED TOPPINGS OR SEASONING'];
  else if(/rice|jollof|pasta|spaghetti|bowl|pizza/.test(`${name} ${group}`))ingredients=[named('MEAL'),'GRAIN / PASTA BASE','PROTEIN USED IN YOUR VERSION','SAUCE / CHEESE / SEASONING USED IN YOUR VERSION','ANY SAVED VEGETABLES OR TOPPINGS'];
  else if(/chicken|steak|drumstick|bacon|egg|omelet/.test(`${name} ${group}`))ingredients=[named('PROTEIN'),'MAIN PROTEIN PORTION','COOKING FAT / SEASONING IF USED','SIDE / BREAD / CHEESE IF PART OF THE SAVED FOOD'];
  else if(/drink|coffee|juice|latte|tea|milk/.test(`${name} ${group}`))ingredients=[named('DRINK'),'BASE DRINK','MILK / SWEETENER / FLAVORING IF USED','ICE / WATER IF PART OF YOUR VERSION'];
  else ingredients=[named('FOOD'),'USE THE SAME BRAND / BASE PORTION AS YOUR SAVED CCD FOOD','ADD-ONS ONLY IF THEY WERE PART OF THE VERSION YOU ATE'];
 }
 if(!steps.length){
  reconstructed=true;
  if(/pancake|waffle/.test(name))steps=['MEASURE THE INGREDIENTS FOR YOUR SAVED CCD VERSION.','MIX THE WET AND DRY COMPONENTS UNTIL JUST COMBINED.','COOK IN A PREHEATED PAN OR WAFFLE IRON UNTIL SET AND GOLDEN.','ADD ONLY THE TOPPINGS / SIDES INCLUDED IN YOUR VERSION, THEN SERVE.'];
  else if(/bake|muffin|donut|cake|brownie|cookie|roll|loaf/.test(`${name} ${group}`))steps=['MEASURE THE INGREDIENTS FOR YOUR SAVED CCD VERSION.','COMBINE THE BASE, BINDER, LIQUID, AND FLAVORINGS.','COOK / BAKE USING THE METHOD THAT MATCHES THIS SAVED RECIPE UNTIL SET.','PORTION TO THE SAVED SERVING SIZE AND SERVE.'];
  else if(/sandwich|bagel|toast|philly|melt|wrap|burrito|quesadilla/.test(`${name} ${group}`))steps=['PREP THE BREAD / BAGEL / WRAP AND THE SAVED FILLINGS.','HEAT THE PROTEIN / EGG COMPONENT IF NEEDED.','ASSEMBLE WITH THE SAVED CHEESE, SPREAD, AND TOPPINGS.','TOAST / WARM IF THAT MATCHES YOUR VERSION, THEN SERVE.'];
  else if(/rice|jollof|pasta|spaghetti|bowl|pizza/.test(`${name} ${group}`))steps=['PREP THE SAVED GRAIN / PASTA / BASE PORTION.','HEAT OR COOK THE PROTEIN AND SAUCE COMPONENTS.','COMBINE USING THE SAME PORTIONS AS YOUR SAVED VERSION.','FINISH WITH THE SAVED CHEESE / TOPPINGS AND SERVE.'];
  else if(/snack|bar|chips|belvita|oreo|candy/.test(`${name} ${group}`))steps=['PORTION THE SAVED SERVING SIZE.','ADD ANY SAVED PAIRING OR TOPPING IF THIS VERSION USED ONE.','SERVE / LOG THE PORTION AS PREPARED.'];
  else steps=['USE THE SAVED PORTION AND INGREDIENTS FOR THIS CCD FOOD.','PREP OR HEAT EACH COMPONENT AS NEEDED.','ASSEMBLE THE FOOD THE SAME WAY AS YOUR SAVED VERSION.','SERVE AT THE SAVED PORTION SIZE.'];
 }
 return {ingredients,steps,reconstructed};
}
function normalizeMeasureText(value=''){
 let s=String(value).toLowerCase().replace(/[–—]/g,'-').replace(/¼/g,' 1/4 ').replace(/½/g,' 1/2 ').replace(/¾/g,' 3/4 ').replace(/⅓/g,' 1/3 ').replace(/⅔/g,' 2/3 ').replace(/⅛/g,' 1/8 ');s=s.replace(/(\d+)\s+and\s+(\d+)\/(\d+)/g,(_,a,b,c)=>String(+a+(+b/+c))).replace(/\b(tsp|tbsp|oz|lb|g|ml)\./g,'$1');
 const phrases=[['one and a half','1.5'],['one-and-a-half','1.5'],['two and a half','2.5'],['two-and-a-half','2.5'],['three and a half','3.5'],['three quarters','0.75'],['three-quarters','0.75'],['a quarter','0.25'],['one quarter','0.25'],['one-quarter','0.25'],['a half','0.5'],['one half','0.5'],['one-half','0.5'],['half','0.5'],['quarter','0.25']];
 phrases.forEach(([a,b])=>{s=s.replace(new RegExp(`\\b${a.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}\\b`,'g'),b)});
 const words={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
 Object.entries(words).forEach(([a,b])=>{s=s.replace(new RegExp(`\\b${a}\\b`,'g'),String(b))});
 s=s.replace(/\b(?:a|an)\s+(?=(?:tsp|teaspoon|tbsp|tablespoon|cup|oz|ounce|gram|g\b|ml\b|slice|egg|bagel|piece|item|serving|bottle))/g,'1 ');
 return s.replace(/\s+/g,' ').trim();
}
function parseLooseQuantity(value){
 const s=String(value??'').trim();if(!s)return 1;
 const mixed=s.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);if(mixed)return +mixed[1]+(+mixed[2]/+mixed[3]);
 const frac=s.match(/^(\d+)\/(\d+)$/);if(frac)return +frac[2]?+frac[1]/+frac[2]:1;
 const n=Number(s);return Number.isFinite(n)&&n>0?n:1;
}
function canonicalMeasureUnit(unit=''){
 const u=String(unit).trim().toLowerCase().replace(/\./g,'');
 if(!u)return'';
 if(/^(tsp|tsps|teaspoon|teaspoons|teasp|t)$/.test(u))return'TSP';
 if(/^(tbsp|tbsps|tbs|tablespoon|tablespoons|tbl|tbls)$/.test(u))return'TBSP';
 if(/^(cup|cups|c)$/.test(u))return'CUP';
 if(/^(oz|ounce|ounces)$/.test(u))return'OZ';
 if(/^(lb|lbs|pound|pounds)$/.test(u))return'LB';
 if(/^(g|gram|grams)$/.test(u))return'G';
 if(/^(ml|milliliter|milliliters|millilitre|millilitres)$/.test(u))return'ML';
 if(/^(egg|eggs|egg white|egg whites)$/.test(u))return'EGG';
 if(/^(slice|slices)$/.test(u))return'SLICE';
 if(/^(bagel|bagels)$/.test(u))return'BAGEL';
 if(/^(bottle|bottles)$/.test(u))return'BOTTLE';
 if(/^(piece|pieces|item|items|serving|servings|unit|units)$/.test(u))return'ITEM';
 return u.toUpperCase();
}
function baseMeasureInfo(item={}){
 const raw=String(item.unit||'ITEM').trim();const norm=normalizeMeasureText(raw);
 const m=norm.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*(tsp|tbsp|cup|oz|g|ml|slice|egg|bagel|bottle|item|piece)s?$/i);
 if(m)return {amount:parseLooseQuantity(m[1]),unit:canonicalMeasureUnit(m[2])};
 return {amount:1,unit:canonicalMeasureUnit(norm)||'ITEM'};
}
function ingredientDensityGPerCup(item={}){
 const n=String(item.name||'').toLowerCase();
 if(/oat flour/.test(n))return 92;if(/flour/.test(n))return 120;if(/brown sugar/.test(n))return 220;if(/sugar/.test(n))return 200;if(/cocoa/.test(n))return 85;if(/chocolate chip/.test(n))return 170;if(/sour cream/.test(n))return 240;if(/cottage cheese/.test(n))return 226;if(/ricotta/.test(n))return 246;if(/mozzarella|cheddar/.test(n))return 113;if(/milk|juice|coffee|sauce|syrup/.test(n))return 245;if(/butter|spread/.test(n))return 227;if(/flax/.test(n))return 112;if(/chia/.test(n))return 160;if(/avocado/.test(n))return 150;if(/rice/.test(n))return 186;if(/spaghetti|pasta/.test(n))return 140;if(/chicken/.test(n))return 140;if(/steak|ribeye/.test(n))return 150;if(/bacon/.test(n))return 128;return 240;
}
function ingredientCountMassG(item={}){const n=String(item.name||'').toLowerCase();if(/egg white/.test(n))return 33;if(/egg/.test(n))return 50;if(/bagel/.test(n))return 100;if(/bread/.test(n))return 28;if(/bacon/.test(n))return 8;if(/slice/.test(String(item.unit||'').toLowerCase()))return 28;return 30}
function measureFamily(unit){if(['TSP','TBSP','CUP','ML'].includes(unit))return'volume';if(['OZ','LB','G'].includes(unit))return'weight';return'count'}
function volumeToCups(qty,unit){if(unit==='CUP')return qty;if(unit==='TBSP')return qty/16;if(unit==='TSP')return qty/48;if(unit==='ML')return qty/236.588;return null}
function weightToGrams(qty,unit){if(unit==='G')return qty;if(unit==='OZ')return qty*28.3495;if(unit==='LB')return qty*453.592;return null}
function measureToBaseUnits(qty,enteredUnit,item={}){
 qty=Math.max(0,Number(qty)||0);const base=baseMeasureInfo(item),entered=canonicalMeasureUnit(enteredUnit)||base.unit,bf=measureFamily(base.unit),ef=measureFamily(entered);
 if(!qty)return {baseQty:0,approx:false,enteredUnit:entered};
 if(bf==='volume'&&ef==='volume'){const eCups=volumeToCups(qty,entered),bCups=volumeToCups(base.amount,base.unit);return {baseQty:eCups/bCups,approx:false,enteredUnit:entered}}
 if(bf==='weight'&&ef==='weight'){const eg=weightToGrams(qty,entered),bg=weightToGrams(base.amount,base.unit);return {baseQty:eg/bg,approx:false,enteredUnit:entered}}
 if(bf==='count'&&ef==='count')return {baseQty:qty/base.amount,approx:entered!==base.unit,enteredUnit:entered};
 const density=ingredientDensityGPerCup(item),countMass=ingredientCountMassG(item);
 function toGrams(amount,unit){const fam=measureFamily(unit);if(fam==='weight')return weightToGrams(amount,unit);if(fam==='volume')return volumeToCups(amount,unit)*density;if(fam==='count')return amount*countMass;return amount*countMass}
 const eg=toGrams(qty,entered),bg=toGrams(base.amount,base.unit);return {baseQty:bg?eg/bg:qty,approx:true,enteredUnit:entered};
}
function ingredientAliasesFlexible(item={}){
 const n=String(item.name||'').toLowerCase().replace(/[–—]/g,'-'),a=[n,n.replace(/-/g,' ')];
 if(/all-purpose flour|ap flour/.test(n))a.push('ap flour','all purpose flour','all-purpose flour','plain flour','flour');
 if(/oat flour/.test(n))a.push('oat flour');if(/dutch cocoa|cocoa powder/.test(n))a.push('dutch cocoa','cocoa powder','cocoa');
 if(/whole egg/.test(n))a.push('whole egg','whole eggs','egg','eggs');
 if(/egg white/.test(n))a.push('egg white','egg whites');
 if(/sour cream/.test(n))a.push('sour cream');
 if(/skim milk/.test(n))a.push('skim milk');
 if(/powdered milk/.test(n))a.push('powdered milk','milk powder');
 if(/dark chocolate chips/.test(n))a.push('dark chocolate chips','chocolate chips','choc chips');
 if(/rotisserie chicken|cooked chicken/.test(n))a.push('rotisserie chicken','cooked chicken','chicken');
 if(/ribeye/.test(n))a.push('ribeye steak','ribeye','steak');
 if(/mozzarella/.test(n))a.push('mozzarella','mozzarella cheese');
 if(/cheddar/.test(n))a.push('cheddar','cheddar cheese');
 if(/butter spread/.test(n))a.push('butter spread','butter');
 if(/maple syrup/.test(n))a.push('maple syrup','syrup');
 if(/arrabbiata/.test(n))a.push('arrabbiata sauce');
 if(/cooked rice/.test(n))a.push('cooked rice','rice');
 if(/spaghetti/.test(n))a.push('cooked spaghetti','spaghetti','pasta');
 if(/flax/.test(n))a.push('ground flaxseed','flaxseed','flax');
 if(/chia/.test(n))a.push('chia seeds','chia');
 return [...new Set(a.map(x=>x.trim()).filter(x=>x.length>1))].sort((x,y)=>y.length-x.length);
}
function extractMeasurementNear(text,index,aliasLength){
 const unit='(?:tsp|tsps|teaspoons?|teasp|tbsp|tbsps|tbs|tablespoons?|cups?|c|oz|ounces?|lbs?|pounds?|g|grams?|ml|millilit(?:er|re)s?|eggs?|egg\s+whites?|slices?|bagels?|bottles?|pieces?|items?|servings?)';
 const qty='(?:\\d+(?:\\.\\d+)?(?:\\s+\\d+\\/\\d+)?|\\d+\\/\\d+)';
 const before=text.slice(Math.max(0,index-90),index),after=text.slice(index+aliasLength,Math.min(text.length,index+aliasLength+70));
 const reBefore=new RegExp(`(${qty})\\s*(${unit})?\\s*(?:of\\s+)?$`,'i'),reAfter=new RegExp(`^\\s*(?:[:=,-]\\s*)?(?:of\\s+)?(${qty})\\s*(${unit})?`,'i');
 let m=before.match(reBefore);if(m)return {qty:parseLooseQuantity(m[1]),unit:canonicalMeasureUnit(m[2]||''),raw:m[0].trim()};
 m=after.match(reAfter);if(m)return {qty:parseLooseQuantity(m[1]),unit:canonicalMeasureUnit(m[2]||''),raw:m[0].trim()};
 return {qty:1,unit:'',raw:'1'};
}
function baseIngredientBaseQty(selected,item,aliases){
 const lines=Array.isArray(selected?.ingredients)?selected.ingredients:[];
 for(const line of lines){const text=normalizeMeasureText(line);let best=null;for(const alias of aliases){const i=text.indexOf(alias);if(i>=0&&(best==null||alias.length>best.alias.length))best={alias,index:i}}if(!best)continue;const m=extractMeasurementNear(text,best.index,best.alias.length),conv=measureToBaseUnits(m.qty,m.unit,item);if(conv.baseQty>0)return conv.baseQty}
 return 0;
}
function parseNaturalIngredientChanges(raw,library=[],selected=null){
 const text=normalizeMeasureText(raw);if(!text)return[];const rows=[],occupied=[];
 const candidates=[];for(const item of library){for(const alias of ingredientAliasesFlexible(item)){let pos=0;while(true){const idx=text.indexOf(alias,pos);if(idx<0)break;const left=idx===0?' ':text[idx-1],right=text[idx+alias.length]||' ';if(!/[a-z0-9]/.test(left)&&!/[a-z0-9]/.test(right))candidates.push({item,alias,idx});pos=idx+alias.length}}}
 candidates.sort((a,b)=>a.idx-b.idx||b.alias.length-a.alias.length);
 for(const c of candidates){const span=[c.idx,c.idx+c.alias.length];if(occupied.some(([a,b])=>span[0]<b&&span[1]>a))continue;occupied.push(span);
  const item=c.item,aliases=ingredientAliasesFlexible(item),measurement=extractMeasurementNear(text,c.idx,c.alias.length),before=text.slice(Math.max(0,c.idx-75),c.idx),after=text.slice(c.idx+c.alias.length,Math.min(text.length,c.idx+c.alias.length+55)),local=`${before} ${c.alias} ${after}`;
  const baseQty=baseIngredientBaseQty(selected,item,aliases),converted=measureToBaseUnits(measurement.qty,measurement.unit,item);
  let action='add',effectiveBase=converted.baseQty,reason='AUTO FROM NOTE';
  const isInsteadOf=/instead\s+of\s*$/i.test(before)||/\bwithout\b/i.test(before)||/\bno\s*$/i.test(before);
  const actionWindow=before.slice(-75),removeRe=/\b(remove|removed|removing|take out|took out|leave out|left out|omit|omitted|without|minus|less|skip|skipped|no)\b/gi,addRe=/\b(add|added|adding|put in|include|included|plus|extra|more|mix in|mixed in|topped with)\b/gi;let lastRemove=-1,lastAdd=-1,mAct;while((mAct=removeRe.exec(actionWindow)))lastRemove=mAct.index;while((mAct=addRe.exec(actionWindow)))lastAdd=mAct.index;const remove=lastRemove>lastAdd,add=lastAdd>lastRemove;
  const replace=/\b(use|used|using|swap|swapped|replace|replaced|substitute|substituted|instead)\b/i.test(local);
  if(isInsteadOf||remove){action='remove';effectiveBase=measurement.raw==='1'&&baseQty?baseQty:converted.baseQty}
  else if(replace&&baseQty){const delta=converted.baseQty-baseQty;action=delta<0?'remove':'add';effectiveBase=Math.abs(delta);reason='AUTO REPLACEMENT DELTA'}
  else if(add){action='add'}
  if(/\bdouble\b/i.test(before.slice(-35))&&baseQty){action='add';effectiveBase=baseQty;reason='AUTO DOUBLE'}
  if(/\bhalf\b/i.test(before.slice(-35))&&baseQty&&measurement.raw==='1'){action='remove';effectiveBase=baseQty*.5;reason='AUTO HALF'}
  if(!Number.isFinite(effectiveBase)||effectiveBase<=.0001)continue;
  rows.push({id:`note-${item.id}-${c.idx}`,ingredientId:item.id,name:item.name,unit:item.unit,action,qty:measurement.qty,enteredUnit:measurement.unit||baseMeasureInfo(item).unit,baseQty:effectiveBase,nutrition:{calories:+item.calories||0,carbs:+item.carbs||0,protein:+item.protein||0,fat:+item.fat||0,fiber:+item.fiber||0},inferred:true,approx:converted.approx,reason});
 }
 return rows;
}

function initFoods(){
 const box=qs('#foodResults');if(!box)return;
 let selected=null,editingModifiedId=null,editingCustomFoodId=null,modAdjustments=[],foodTray=[];
 const search=qs('#foodSearch'),mealSlot=qs('#mealSlot');

 function ingredientLibrary(){
  const pantry=(D.PANTRY||[]).map(x=>({id:`pantry-${x.id}`,name:x.name,unit:x.unit||'UNIT',calories:+x.calories||0,carbs:+x.carbs||0,protein:+x.protein||0,fat:+x.fat||0,fiber:+x.fiber||0}));
  const extra=(typeof EXTRA_LAB_INGREDIENTS!=='undefined'?EXTRA_LAB_INGREDIENTS:[]).map(x=>({id:`extra-${x.id}`,name:x.name,unit:x.unit||'UNIT',calories:+x.calories||0,carbs:+x.carbs||0,protein:+x.protein||0,fat:+x.fat||0,fiber:+x.fiber||0}));
  const custom=(getGrocery().custom||[]).map(x=>({id:`grocery-${x.id}`,name:x.name,unit:x.unit||'UNIT',calories:+x.calories||0,carbs:+x.carbs||0,protein:+x.protein||0,fat:+x.fat||0,fiber:+x.fiber||0}));
  const foods=allFoods().map(x=>{const n=estimatedNutrition(x);return{id:`food-${x.id}`,name:x.name,unit:'SERVING',calories:+n.calories||0,carbs:+n.carbs||0,protein:+n.protein||0,fat:+n.fat||0,fiber:+n.fiber||0}});
  const seen=new Set();return [...pantry,...extra,...custom,...foods].filter(x=>{const k=String(x.name||'').toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true});
 }
 function fillModIngredientSelect(){const el=qs('#modIngredientSelect');if(!el)return;const list=ingredientLibrary();el.innerHTML=list.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} · ${x.calories} KCAL / ${esc(x.unit)}</option>`).join('')}
 function inferredNoteAdjustments(){if(!selected)return[];const raw=(qs('#recipeChangeNote')?.value||'').trim();if(!raw)return[];const manualIds=new Set(modAdjustments.map(a=>a.ingredientId));return parseNaturalIngredientChanges(raw,ingredientLibrary(),selected).filter(x=>!manualIds.has(x.ingredientId))}
 function currentModifiedNutrition(){
  const base=selected?estimatedNutrition(selected):{calories:0,carbs:0,protein:0,fat:0,fiber:0};
  const out={...base};
  [...modAdjustments,...inferredNoteAdjustments()].forEach(a=>{const sign=a.action==='remove'?-1:1;['calories','carbs','protein','fat','fiber'].forEach(k=>out[k]=(+out[k]||0)+sign*(+a.nutrition[k]||0)*(+(a.baseQty??a.qty)||0))});
  out.calories=Math.max(0,round(out.calories));['carbs','protein','fat','fiber'].forEach(k=>out[k]=Math.max(0,round(out[k],1)));return out
 }
 function updateModificationPanel(){
  const base=selected?estimatedNutrition(selected):null,modified=selected?currentModifiedNutrition():null;
  if(qs('#recipeBaseCalories'))qs('#recipeBaseCalories').textContent=base?`${round(base.calories)} KCAL`:'— KCAL';
  if(qs('#modifiedCalories'))qs('#modifiedCalories').textContent=modified?`${round(modified.calories)} KCAL`:'— KCAL';
  const delta=base&&modified?round(modified.calories-base.calories):0,deltaEl=qs('#calorieDelta');if(deltaEl){deltaEl.textContent=base?`${delta>0?'+':''}${delta} KCAL VS ORIGINAL`:'0 KCAL CHANGE';deltaEl.className=`${delta>0?'delta-up':delta<0?'delta-down':'delta-same'}`}
  const target=qs('#modAdjustments'),inferred=inferredNoteAdjustments(),allRows=[...modAdjustments,...inferred];if(target)target.innerHTML=allRows.length?allRows.map((a,i)=>{const used=+(a.baseQty??a.qty)||0,displayUnit=a.enteredUnit||a.unit;return `<div class="mod-adjustment-row ${a.inferred?'auto-inferred':''}"><span>${a.inferred?`✨ ${esc(a.reason||'AUTO FROM NOTE')} · `:''}${a.action==='remove'?'−':'+'} ${round(a.qty,3)} ${esc(displayUnit)} · ${esc(a.name)}${a.approx?' · ≈ CONVERTED':''}</span><strong>${a.action==='remove'?'−':'+'}${round((a.nutrition.calories||0)*used)} KCAL</strong>${a.inferred?'':`<button type="button" class="icon-btn" data-remove-mod-adjustment="${i}" aria-label="Remove adjustment">×</button>`}</div>`}).join(''):'<div class="card-meta">LIVE CALCULATION IS ON. TYPE A MEASURABLE CHANGE ABOVE OR ADD / REMOVE AN INGREDIENT BELOW.</div>';
  qsa('[data-remove-mod-adjustment]',target||document).forEach(b=>b.onclick=()=>{modAdjustments.splice(+b.dataset.removeModAdjustment,1);updateModificationPanel()})
 }
 function clearModification(){editingModifiedId=null;modAdjustments=[];if(qs('#recipeChangeNote'))qs('#recipeChangeNote').value='';if(qs('#modifiedRecipeName'))qs('#modifiedRecipeName').value='';updateModificationPanel()}

 function openFoodRecipe(item){
  if(!item)return;const dlg=qs('#foodRecipeDialog'),content=qs('#foodRecipeDialogContent'),title=qs('#foodRecipeDialogTitle');if(!dlg||!content)return;
  const bp=foodRecipeBlueprint(item),n=estimatedNutrition(item);if(title)title.textContent=String(item.name||'RECIPE').toUpperCase();
  content.innerHTML=`<div class="food-recipe-detail"><div class="food-recipe-hero"><img src="${photoFor(item)}" alt="${esc(item.name)}"><div><span class="pill">${n.calories} KCAL</span><h3>${esc(item.name)}</h3><p>${esc(item.yieldText||item.group||'CCD FOOD')}</p>${bp.reconstructed?'<span class="archive-guide-badge">ARCHIVE GUIDE · ORIGINAL METHOD WAS NOT FULLY SAVED</span>':''}<div class="mini-macros">${miniMacros(n)}</div></div></div><h3>INGREDIENTS</h3><div class="ingredient-chart">${bp.ingredients.map(x=>`<div>${esc(x)}</div>`).join('')}</div><h3>RECIPE INSTRUCTIONS</h3><ol class="food-recipe-steps">${bp.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="ingredient-chart"><div><strong>WHAT TO EXPECT / TASTE</strong><br>${esc(item.taste||item.notes||'COZY, SATISFYING, AND EASY TO CUSTOMIZE.')}</div></div></div>`;
  qs('[data-close-food-recipe]',dlg)?.addEventListener('click',()=>dlg.close(),{once:true});dlg.showModal()
 }
 function trayModificationSnapshot(item){
  if(!selected||selected.id!==item.id)return null;const changes=(qs('#recipeChangeNote')?.value||'').trim();if(!changes)return null;const base=estimatedNutrition(item),modified=currentModifiedNutrition();return {changes,label:'THE ONLY THING I CHANGED FROM THE RECIPE I CREATED WAS....',baseCalories:round(base.calories),modifiedCalories:round(modified.calories),calorieDelta:round(modified.calories-base.calories),adjustments:[...modAdjustments,...inferredNoteAdjustments()].map(x=>({...x,nutrition:{...(x.nutrition||{})}})),nutrition:modified,name:(qs('#modifiedRecipeName')?.value||'').trim()||item.name}
 }
 function addToTray(item,useCurrentVersion=false){
  if(!item)return;const mod=useCurrentVersion?trayModificationSnapshot(item):null,existing=foodTray.find(x=>x.itemId===item.id&&JSON.stringify(x.recipeModification?.changes||'')===JSON.stringify(mod?.changes||''));
  if(existing)existing.scale=round(existing.scale+.25,2);else foodTray.push({key:uid(),itemId:item.id,name:mod?.name||item.name,scale:1,nutrition:mod?.nutrition||estimatedNutrition(item),recipeModification:mod,mealSlot:item.customMealSlot||mealSlot?.value||'ALL'});
  renderFoodTray();render();toast(`${String(item.name).toUpperCase()} ADDED TO YOUR FOOD TRAY ✨`)
 }
 function renderFoodTray(){
  const target=qs('#foodTrayList'),count=qs('#foodTrayCount'),btn=qs('#logFoodBtn'),hint=qs('#batchLogHint');if(!target)return;
  if(count)count.textContent=`${foodTray.length} ITEM${foodTray.length===1?'':'S'}`;
  target.innerHTML=foodTray.length?foodTray.map(row=>{const item=allFoods().find(x=>x.id===row.itemId),n=scaledNutrition(row.nutrition||estimatedNutrition(item||{}),row.scale);return `<article class="food-tray-row"><img src="${photoFor(item||row)}" alt=""><div class="food-tray-copy"><strong>${esc(row.name||item?.name||'FOOD')}</strong><span>${row.scale}× · ${n.calories} KCAL${row.recipeModification?' · MODIFIED VERSION':''}</span></div><div class="food-tray-controls"><button class="icon-btn" type="button" data-tray-minus="${row.key}">−</button><b>${row.scale}×</b><button class="icon-btn" type="button" data-tray-plus="${row.key}">+</button><button class="btn tiny ghost" type="button" data-tray-remove="${row.key}">REMOVE</button></div></article>`}).join(''):'<div class="empty-state compact-empty">YOUR TRAY IS EMPTY — TAP + ADD TO TRAY ON ANY FOOD.</div>';
  qsa('[data-tray-minus]',target).forEach(b=>b.onclick=()=>{const r=foodTray.find(x=>x.key===b.dataset.trayMinus);if(!r)return;r.scale=Math.max(.25,round(r.scale-.25,2));renderFoodTray()});
  qsa('[data-tray-plus]',target).forEach(b=>b.onclick=()=>{const r=foodTray.find(x=>x.key===b.dataset.trayPlus);if(!r)return;r.scale=Math.min(8,round(r.scale+.25,2));renderFoodTray()});
  qsa('[data-tray-remove]',target).forEach(b=>b.onclick=()=>{foodTray=foodTray.filter(x=>x.key!==b.dataset.trayRemove);renderFoodTray();render()});
  if(btn)btn.textContent=foodTray.length?`LOG ${foodTray.length} FOOD${foodTray.length===1?'':'S'} + DRINK ✨`:'LOG FOOD + DRINK ✨';
  if(hint)hint.textContent=foodTray.length?'EVERY TRAY ITEM WILL LOG AT THE SAME SELECTED TIME. THE DRINK + UPLOADS ARE ATTACHED ONCE TO THE BATCH.':'ADD MULTIPLE FOODS TO THE TRAY TO LOG THEM TOGETHER.'
 }

 const render=()=>{
  const q=search.value.trim().toLowerCase(),slot=mealSlot?.value||'ALL';
  const matches=allFoods().filter(x=>mealSlotMatches(x,slot)&&(!q||`${x.name} ${x.group||''} ${x.source||''}`.toLowerCase().includes(q)));
  const arr=matches,status=qs('#mealFilterStatus');if(status)status.innerHTML=`<strong>${esc(slot)}</strong> · ${matches.length} MATCHING OPTION${matches.length===1?'':'S'} · EVERY CARD HAS RECIPE + INSTRUCTIONS${q?` · SEARCH: “${esc(search.value.trim())}”`:''}`;
  box.innerHTML=arr.length?arr.map(x=>{const n=estimatedNutrition(x),inTray=foodTray.some(t=>t.itemId===x.id),bp=foodRecipeBlueprint(x);return `<article class="food-card ${selected?.id===x.id?'selected':''} ${inTray?'in-tray':''}" data-food-id="${esc(x.id)}"><img src="${photoFor(x)}" alt="${esc(x.name)}"><div class="card-body"><h3>${esc(x.name)}</h3><span class="pill">${n.calories} KCAL</span><div class="card-meta">${esc(x.group||'CCD ARCHIVE')} ${x.customType?'· MY CUSTOM FOOD':n.estimated?'· AUTO MACRO ESTIMATE':''}</div><div class="food-card-actions"><button type="button" class="btn tiny ghost" data-view-food-recipe="${esc(x.id)}">VIEW RECIPE</button><button type="button" class="btn tiny ${inTray?'secondary':'primary'}" data-add-food-tray="${esc(x.id)}">${inTray?'✓ IN TRAY':'+ ADD TO TRAY'}</button></div>${bp.reconstructed?'<small class="recipe-guide-note">ARCHIVE RECIPE GUIDE AVAILABLE</small>':''}</div></article>`}).join(''):`<div class="food-filter-empty"><strong>NO ${esc(slot)} MATCHES YET</strong><span>TRY A DIFFERENT SEARCH OR ADD YOUR OWN RECIPE / SNACK BELOW.</span></div>`;
  qsa('[data-food-id]',box).forEach(c=>c.onclick=e=>{if(e.target.closest('button'))return;selected=allFoods().find(x=>x.id===c.dataset.foodId);qs('#foodServing').value=1;clearModification();updateSelected();render()});qsa('[data-view-food-recipe]',box).forEach(b=>b.onclick=e=>{e.stopPropagation();openFoodRecipe(allFoods().find(x=>x.id===b.dataset.viewFoodRecipe))});qsa('[data-add-food-tray]',box).forEach(b=>b.onclick=e=>{e.stopPropagation();const item=allFoods().find(x=>x.id===b.dataset.addFoodTray);if(item)addToTray(item,false)})
 };
 function updateSelected(){const n=selected?scaledNutrition(estimatedNutrition(selected),+qs('#foodServing').value):null;qs('#foodServingLabel').textContent=`${(+qs('#foodServing').value).toFixed(2).replace(/0+$/,'').replace(/\.$/,'')}×`;qs('#selectedFood').innerHTML=selected?`<img class="mini-thumb" src="${photoFor(selected)}" alt=""><h3>${esc(selected.name)}</h3><div class="card-meta">${esc(selected.yieldText||selected.group||'')}</div><button type="button" class="btn tiny ghost" id="selectedViewRecipeBtn">VIEW RECIPE + INSTRUCTIONS</button>`:'CHOOSE A FOOD CARD.';qs('#selectedViewRecipeBtn')?.addEventListener('click',()=>openFoodRecipe(selected));qs('#foodNutritionPreview').innerHTML=n?miniMacros(n):'';updateModificationPanel()}
 function drinkInfo(){const id=qs('#drinkPreset')?.value||'none';if(id==='none')return null;if(id==='custom'){const name=(qs('#drinkCustomName')?.value||'').trim(),amount=(qs('#drinkCustomAmount')?.value||'').trim();return name?{id:'custom',name:name.toUpperCase(),amount:amount||'AMOUNT NOTED',nutrition:{calories:0,carbs:0,protein:0,fat:0,fiber:0},custom:true}:null}const d=DRINK_PRESETS[id];if(!d)return null;const scale=+(qs('#drinkServing')?.value||1);return {...d,scale,amount:`${scale.toFixed(1).replace(/\.0$/,'')}× ${d.baseLabel}`,nutrition:scaledNutrition(d.nutrition,scale)}}
 function updateDrink(){const id=qs('#drinkPreset')?.value||'none',preset=qs('#drinkPresetFields'),custom=qs('#drinkCustomFields');if(preset)preset.hidden=id==='none'||id==='custom';if(custom)custom.hidden=id!=='custom';const scale=+(qs('#drinkServing')?.value||1);if(qs('#drinkServingLabel'))qs('#drinkServingLabel').textContent=`${scale.toFixed(1)}×`;const info=drinkInfo();if(qs('#drinkNutritionPreview'))qs('#drinkNutritionPreview').innerHTML=info&&!info.custom?miniMacros(info.nutrition):'';if(qs('#drinkSummary')){qs('#drinkSummary').classList.toggle('has-drink',!!info);qs('#drinkSummary').textContent=info?`${info.name} · ${info.amount}${info.nutrition.calories?` · ${info.nutrition.calories} KCAL`:''}`:(id==='custom'?'TYPE YOUR DRINK NAME + AMOUNT.':'NO DRINK ADDED.')}}

 function saveModifiedVersion(){
  if(!selected)return toast('PICK THE ORIGINAL RECIPE FIRST ✨');
  const changes=(qs('#recipeChangeNote')?.value||'').trim();if(!changes)return toast('TELL ME WHAT YOU CHANGED FROM YOUR ORIGINAL RECIPE ✨');
  const customName=(qs('#modifiedRecipeName')?.value||'').trim(),baseNutrition=estimatedNutrition(selected),nutrition=currentModifiedNutrition(),state=getState(),existing=editingModifiedId?state.modifiedRecipes.find(x=>x.id===editingModifiedId):null;
  const row={id:editingModifiedId||uid(),baseItemId:selected.id,baseName:selected.name,name:customName||`${selected.name} · MY MODIFIED VERSION`,changes,baseNutrition,nutrition,calorieDelta:round(nutrition.calories-baseNutrition.calories),adjustments:modAdjustments.map(x=>({...x,nutrition:{...x.nutrition}})),image:photoFor(selected),createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(editingModifiedId)state.modifiedRecipes=state.modifiedRecipes.map(x=>x.id===editingModifiedId?row:x);else state.modifiedRecipes.unshift(row);saveState(state);editingModifiedId=row.id;renderModifiedRecipes();toast(existing?'MODIFIED RECIPE UPDATED + RECALCULATED ✨':'MODIFIED VERSION SAVED + RECALCULATED ✨')
 }
 function loadModified(id,edit=false){const row=getState().modifiedRecipes.find(x=>x.id===id);if(!row)return;const base=allFoods().find(x=>x.id===row.baseItemId)||allFoods().find(x=>x.name===row.baseName);if(!base)return toast('THE ORIGINAL RECIPE COULD NOT BE FOUND.');selected=base;qs('#foodServing').value=1;qs('#recipeChangeNote').value=row.changes||'';qs('#modifiedRecipeName').value=row.name||'';modAdjustments=Array.isArray(row.adjustments)?row.adjustments.map(x=>({...x,nutrition:{...(x.nutrition||{})}})):[];editingModifiedId=edit?row.id:null;updateSelected();render();document.querySelector('.food-detail-card')?.scrollIntoView({behavior:'smooth',block:'start'});toast(edit?'MODIFIED VERSION READY TO EDIT ✨':'MODIFIED VERSION LOADED ✨')}
 function renderModifiedRecipes(){const target=qs('#modifiedRecipeVault');if(!target)return;const rows=getState().modifiedRecipes||[];target.innerHTML=rows.length?rows.map(r=>{const base=r.baseNutrition||{calories:estimatedNutrition(allFoods().find(x=>x.id===r.baseItemId)||{}).calories||0},mod=r.nutrition||base,delta=round((mod.calories||0)-(base.calories||0));return`<article class="modified-recipe-card"><img src="${r.image||PHOTO_BANK.default}" alt="${esc(r.name)}"><div class="modified-recipe-body"><span class="pill">MODIFIED · ${round(mod.calories)} KCAL</span><h3>${esc(r.name)}</h3><div class="recipe-delta-chip ${delta>0?'up':delta<0?'down':'same'}">${round(base.calories)} → ${round(mod.calories)} KCAL · ${delta>0?'+':''}${delta} VS ORIGINAL</div><p><strong>THE ONLY THING I CHANGED FROM THE RECIPE I CREATED WAS....</strong><br>${esc(r.changes)}</p><small>ORIGINAL · ${esc(r.baseName)}</small><div class="modified-recipe-actions"><button class="btn tiny primary" data-load-modified="${r.id}">LOAD</button><button class="btn tiny ghost" data-edit-modified="${r.id}">EDIT</button><button class="btn tiny ghost" data-delete-modified="${r.id}">DELETE</button></div></div></article>`}).join(''):'<div class="empty-state">NO MODIFIED RECIPE VERSIONS SAVED YET.</div>';qsa('[data-load-modified]',target).forEach(b=>b.onclick=()=>loadModified(b.dataset.loadModified,false));qsa('[data-edit-modified]',target).forEach(b=>b.onclick=()=>loadModified(b.dataset.editModified,true));qsa('[data-delete-modified]',target).forEach(b=>b.onclick=()=>{if(!confirm('DELETE THIS MODIFIED RECIPE VERSION?'))return;mutate(s=>{s.modifiedRecipes=(s.modifiedRecipes||[]).filter(x=>x.id!==b.dataset.deleteModified)});if(editingModifiedId===b.dataset.deleteModified)clearModification();renderModifiedRecipes();toast('MODIFIED VERSION DELETED.')})}

 fillModIngredientSelect();
 qs('#addModIngredientBtn')?.addEventListener('click',()=>{if(!selected)return toast('PICK A RECIPE FIRST ✨');const list=ingredientLibrary(),item=list.find(x=>x.id===qs('#modIngredientSelect').value);if(!item)return;const qty=Math.max(.001,parseLooseQuantity(normalizeMeasureText(qs('#modIngredientQty').value||'1'))),action=qs('#modIngredientAction').value,chosen=qs('#modIngredientUnit')?.value||'AUTO',enteredUnit=chosen==='AUTO'?baseMeasureInfo(item).unit:chosen,conv=measureToBaseUnits(qty,enteredUnit,item);modAdjustments.push({id:uid(),ingredientId:item.id,name:item.name,unit:item.unit,action,qty,enteredUnit,baseQty:conv.baseQty,approx:conv.approx,nutrition:{calories:item.calories,carbs:item.carbs,protein:item.protein,fat:item.fat,fiber:item.fiber}});updateModificationPanel()});
 qs('#recipeChangeNote')?.addEventListener('input',()=>{updateModificationPanel();qs('#modifiedCalories')?.classList.add('live-calc-pulse');setTimeout(()=>qs('#modifiedCalories')?.classList.remove('live-calc-pulse'),180)});
 qs('#saveModifiedRecipeBtn')?.addEventListener('click',saveModifiedVersion);qs('#clearRecipeChangeBtn')?.addEventListener('click',()=>{clearModification();toast('RECIPE CHANGE CALCULATOR CLEARED.')});renderModifiedRecipes();

 search.oninput=render;
 if(mealSlot)mealSlot.onchange=()=>{selected=null;search.value='';qs('#foodServing').value=1;clearModification();updateSelected();render();box.scrollTop=0;toast(`${mealSlot.value} OPTIONS LOADED ✨`)};
 qs('#foodServing').oninput=updateSelected;qs('#addSelectedToTrayBtn')?.addEventListener('click',()=>{if(!selected)return toast('PICK A FOOD FIRST ✨');addToTray(selected,true)});qs('#clearFoodTrayBtn')?.addEventListener('click',()=>{foodTray=[];renderFoodTray();render();toast('FOOD TRAY CLEARED.')});renderFoodTray();render();
 qs('#drinkPreset')?.addEventListener('change',updateDrink);qs('#drinkServing')?.addEventListener('input',updateDrink);qs('#drinkCustomName')?.addEventListener('input',updateDrink);qs('#drinkCustomAmount')?.addEventListener('input',updateDrink);updateDrink();
 function refreshFoodUploadPreview(){const area=qs('#uploadPreview');if(!area)return;area.innerHTML='';const defs=[['foodPhoto','foodPhotoName','NO PHOTO SELECTED','removeFoodPhoto'],['recipeCardPhoto','recipeCardPhotoName','NO CARD SELECTED','removeRecipeCardPhoto']];defs.forEach(([id,nameId,empty,removeId])=>{const input=qs('#'+id),f=input?.files?.[0],name=qs('#'+nameId),remove=qs('#'+removeId);if(name)name.textContent=f?f.name:empty;if(remove)remove.hidden=!f;if(f){const url=URL.createObjectURL(f);area.insertAdjacentHTML('beforeend',`<figure class="upload-preview-card removable-upload-preview" data-preview-for="${id}"><img src="${url}" alt="upload preview"><figcaption>${esc(f.name)}</figcaption><button type="button" class="upload-preview-remove" data-clear-food-upload="${id}">×</button></figure>`)}});qsa('[data-clear-food-upload]',area).forEach(b=>b.onclick=()=>{const id=b.dataset.clearFoodUpload,empty=id==='foodPhoto'?'NO PHOTO SELECTED':'NO CARD SELECTED',nameId=id==='foodPhoto'?'foodPhotoName':'recipeCardPhotoName',removeId=id==='foodPhoto'?'removeFoodPhoto':'removeRecipeCardPhoto';clearFileInput(id,'',nameId,empty,removeId);refreshFoodUploadPreview();toast('UPLOAD REMOVED.')})}
 [qs('#foodPhoto'),qs('#recipeCardPhoto')].forEach(inp=>inp?.addEventListener('change',refreshFoodUploadPreview));
 qs('#removeFoodPhoto')?.addEventListener('click',()=>{clearFileInput('foodPhoto','', 'foodPhotoName','NO PHOTO SELECTED','removeFoodPhoto');refreshFoodUploadPreview()});
 qs('#removeRecipeCardPhoto')?.addEventListener('click',()=>{clearFileInput('recipeCardPhoto','', 'recipeCardPhotoName','NO CARD SELECTED','removeRecipeCardPhoto');refreshFoodUploadPreview()});
 qs('#logFoodBtn').onclick=async()=>{
  if(!foodTray.length&&!selected)return toast('PICK A FOOD OR ADD FOODS TO YOUR TRAY FIRST ✨');
  if(qs('#drinkPreset')?.value==='custom'&&!qs('#drinkCustomName').value.trim())return toast('TYPE THE CUSTOM DRINK NAME FIRST 🥤');
  const drink=drinkInfo(),time=timeOf('foodTime');toast('UPLOADING / SAVING…');const [photo,recipeCard]=await Promise.all([uploadFile(qs('#foodPhoto').files[0],'food'),uploadFile(qs('#recipeCardPhoto').files[0],'recipe-card')]);
  if(foodTray.length){
   const batchId=uid();foodTray.forEach((row,i)=>{const item=allFoods().find(x=>x.id===row.itemId)||row,foodNutrition=scaledNutrition(row.nutrition||estimatedNutrition(item),row.scale),total={...foodNutrition};if(i===0&&drink)Object.keys(total).forEach(k=>total[k]=round((+total[k]||0)+(+drink.nutrition[k]||0),k==='calories'?0:1));logEntry({type:'food',name:row.name||item.name,itemId:row.itemId,baseRecipeName:item.name||row.name,mealSlot:row.mealSlot||item.customMealSlot||'ALL',time,scale:row.scale,foodNutrition,nutrition:total,drink:i===0?drink:null,photo:i===0?photo:'',recipeCard:i===0?recipeCard:'',batchId,batchSize:foodTray.length,recipeModification:row.recipeModification||null})});
   const count=foodTray.length;foodTray=[];renderFoodTray();render();renderRecentFoods();toast(`${count} FOODS LOGGED TOGETHER ✨${drink?'🥤':''}`);return
  }
  const scale=+qs('#foodServing').value,recipeChanges=(qs('#recipeChangeNote')?.value||'').trim(),modifiedName=(qs('#modifiedRecipeName')?.value||'').trim(),baseNutrition=estimatedNutrition(selected),activeNutrition=recipeChanges?currentModifiedNutrition():baseNutrition,foodNutrition=scaledNutrition(activeNutrition,scale),total={...foodNutrition};if(drink)Object.keys(total).forEach(k=>total[k]=round((+total[k]||0)+(+drink.nutrition[k]||0),k==='calories'?0:1));logEntry({type:'food',name:modifiedName||selected.name,itemId:selected.id,baseRecipeName:selected.name,mealSlot:qs('#mealSlot').value,time,scale,foodNutrition,nutrition:total,drink,photo,recipeCard,recipeModification:recipeChanges?{changes:recipeChanges,label:'THE ONLY THING I CHANGED FROM THE RECIPE I CREATED WAS....',baseCalories:round(baseNutrition.calories),modifiedCalories:round(activeNutrition.calories),calorieDelta:round(activeNutrition.calories-baseNutrition.calories),adjustments:[...modAdjustments,...inferredNoteAdjustments()]}:null});toast(drink?'FOOD + DRINK LOGGED ✨🥤':'FOOD LOGGED ✨');renderRecentFoods()
 };


 function customFoodFromForm(photo=''){const type=qs('#customFoodType').value,name=qs('#customFoodName').value.trim(),slot=qs('#customFoodMeal').value,calories=+qs('#customFoodCalories').value||0;return{id:editingCustomFoodId||`custom-food-${uid()}`,name,customType:type,customMealSlot:slot,group:type==='snack'?'CUSTOM SNACK':'CUSTOM RECIPE',source:'MY CUSTOM FOOD VAULT',yieldText:qs('#customFoodServing').value.trim()||'CUSTOM SERVING',ingredients:qs('#customFoodIngredients').value.split(/\n+/).map(x=>x.trim()).filter(Boolean),steps:(qs('#customFoodInstructions')?.value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean),taste:qs('#customFoodNotes').value.trim(),notes:qs('#customFoodNotes').value.trim(),image:photo||((getState().customFoods||[]).find(x=>x.id===editingCustomFoodId)?.image||''),calories,nutrition:{calories,carbs:+qs('#customFoodCarbs').value||0,protein:+qs('#customFoodProtein').value||0,fat:+qs('#customFoodFat').value||0,fiber:+qs('#customFoodFiber').value||0},createdAt:new Date().toISOString()}}
 function clearCustomFoodForm(){editingCustomFoodId=null;['customFoodName','customFoodServing','customFoodIngredients','customFoodInstructions','customFoodNotes','customFoodCalories','customFoodCarbs','customFoodProtein','customFoodFat','customFoodFiber'].forEach(id=>{const el=qs('#'+id);if(el)el.value=''});if(qs('#customFoodPhoto'))qs('#customFoodPhoto').value='';if(qs('#customFoodPhotoPreview'))qs('#customFoodPhotoPreview').innerHTML='';if(qs('#saveCustomFoodBtn'))qs('#saveCustomFoodBtn').textContent='SAVE TO MY FOOD VAULT ✨'}
 function renderCustomFoods(){const target=qs('#customFoodVault');if(!target)return;const rows=getState().customFoods||[];target.innerHTML=rows.length?rows.map(r=>`<article class="modified-recipe-card"><img src="${photoFor(r)}" alt="${esc(r.name)}"><div class="modified-recipe-body"><span class="pill">${r.customType==='snack'?'MY SNACK':'MY RECIPE'} · ${estimatedNutrition(r).calories} KCAL</span><h3>${esc(r.name)}</h3><p>${esc(r.taste||r.notes||r.yieldText||'MY CUSTOM FOOD')}</p><small>${esc(r.customMealSlot||'SNACK')} · ${esc(r.yieldText||'CUSTOM SERVING')}</small><div class="modified-recipe-actions"><button class="btn tiny primary" data-custom-load="${r.id}">LOAD TO LOG</button><button class="btn tiny secondary" data-custom-tray="${r.id}">+ TRAY</button><button class="btn tiny ghost" data-custom-view="${r.id}">VIEW RECIPE</button><button class="btn tiny ghost" data-custom-edit="${r.id}">EDIT</button><button class="btn tiny ghost" data-custom-delete="${r.id}">DELETE</button></div></div></article>`).join(''):'<div class="empty-state">NO CUSTOM RECIPES OR SNACKS YET — ADD YOUR FIRST ONE ABOVE ✨</div>';qsa('[data-custom-load]',target).forEach(b=>b.onclick=()=>{const row=(getState().customFoods||[]).find(x=>x.id===b.dataset.customLoad);if(!row)return;mealSlot.value=row.customMealSlot||'SNACK';search.value='';selected=row;clearModification();updateSelected();render();document.querySelector('.food-log-layout')?.scrollIntoView({behavior:'smooth',block:'start'});toast(`${row.name.toUpperCase()} READY TO LOG ✨`)});qsa('[data-custom-tray]',target).forEach(b=>b.onclick=()=>{const row=(getState().customFoods||[]).find(x=>x.id===b.dataset.customTray);if(row)addToTray(row,false)});qsa('[data-custom-view]',target).forEach(b=>b.onclick=()=>{const row=(getState().customFoods||[]).find(x=>x.id===b.dataset.customView);if(row)openFoodRecipe(row)});qsa('[data-custom-edit]',target).forEach(b=>b.onclick=()=>{const r=(getState().customFoods||[]).find(x=>x.id===b.dataset.customEdit);if(!r)return;editingCustomFoodId=r.id;qs('#customFoodType').value=r.customType||'recipe';qs('#customFoodMeal').value=r.customMealSlot||'SNACK';qs('#customFoodName').value=r.name||'';qs('#customFoodServing').value=r.yieldText||'';qs('#customFoodIngredients').value=(r.ingredients||[]).join('\n');if(qs('#customFoodInstructions'))qs('#customFoodInstructions').value=(r.steps||[]).join('\n');qs('#customFoodNotes').value=r.taste||r.notes||'';const n=estimatedNutrition(r);qs('#customFoodCalories').value=n.calories;qs('#customFoodCarbs').value=n.carbs;qs('#customFoodProtein').value=n.protein;qs('#customFoodFat').value=n.fat;qs('#customFoodFiber').value=n.fiber;qs('#saveCustomFoodBtn').textContent='UPDATE MY CUSTOM FOOD ✨';document.querySelector('.custom-food-studio')?.scrollIntoView({behavior:'smooth',block:'start'})});qsa('[data-custom-delete]',target).forEach(b=>b.onclick=()=>{if(!confirm('DELETE THIS CUSTOM FOOD?'))return;mutate(s=>{s.customFoods=(s.customFoods||[]).filter(x=>x.id!==b.dataset.customDelete)});if(selected?.id===b.dataset.customDelete){selected=null;updateSelected()}render();renderCustomFoods();toast('CUSTOM FOOD DELETED.')})}
 qs('#customFoodPhoto')?.addEventListener('change',()=>{const input=qs('#customFoodPhoto'),f=input.files[0],target=qs('#customFoodPhotoPreview');target.innerHTML=f?`<figure class="upload-preview-card removable-upload-preview"><img src="${URL.createObjectURL(f)}" alt="custom food preview"><figcaption>${esc(f.name)}</figcaption><button type="button" class="upload-preview-remove" data-clear-custom-food-photo>×</button></figure>`:'';qs('[data-clear-custom-food-photo]',target)?.addEventListener('click',()=>{input.value='';target.innerHTML='';toast('PHOTO REMOVED.')})});
 async function saveCustomFoodFromStudio(addToTrayAfter=false){
  if(!qs('#customFoodName').value.trim())return toast('NAME YOUR RECIPE OR SNACK FIRST ✨');if(qs('#customFoodCalories').value==='')return toast('ADD THE CALORIES FOR THIS CUSTOM FOOD.');const image=await uploadFile(qs('#customFoodPhoto').files[0],'custom-food'),row=customFoodFromForm(image),st=getState();if(editingCustomFoodId)st.customFoods=st.customFoods.map(x=>x.id===editingCustomFoodId?{...x,...row}:x);else st.customFoods.unshift(row);saveState(st);const wasEdit=!!editingCustomFoodId;if(addToTrayAfter)addToTray(row,false);clearCustomFoodForm();render();renderCustomFoods();fillModIngredientSelect();toast(addToTrayAfter?'CUSTOM FOOD SAVED + ADDED TO TRAY 🧺':wasEdit?'CUSTOM FOOD UPDATED ✨':'NEW RECIPE / SNACK SAVED ✨')
 }
 qs('#saveCustomFoodBtn')?.addEventListener('click',()=>saveCustomFoodFromStudio(false));qs('#saveCustomFoodToTrayBtn')?.addEventListener('click',()=>saveCustomFoodFromStudio(true));

 renderCustomFoods();

 renderRecentFoods();function renderRecentFoods(){const logs=(getState().logs||[]).filter(x=>x.type==='food').slice(0,8);qs('#recentFoods').innerHTML=logs.length?logs.map(logCard).join(''):'<div class="empty-state">NO FOOD LOGS YET.</div>'}
}

function logCard(x){const drink=x.drink?`<span class="log-extra">🥤 DRINK · ${esc(x.drink.name)}${x.drink.amount?` · ${esc(x.drink.amount)}`:''}</span>`:'';const recipeChange=x.recipeModification?.changes?`<span class="log-extra">✏️ ${esc(x.recipeModification.label||'RECIPE CHANGE')} ${esc(x.recipeModification.changes)}${x.recipeModification.modifiedCalories!=null?` · ${x.recipeModification.baseCalories} → ${x.recipeModification.modifiedCalories} KCAL (${x.recipeModification.calorieDelta>0?'+':''}${x.recipeModification.calorieDelta})`:''}</span>`:'';const movementRange=x.type==='movement'&&x.startTime&&x.endTime?`<span class="log-extra">🕘 ${esc(x.startTime)} → ${esc(x.endTime)}</span>`:'';const duration=x.type==='movement'&&x.minutes?`<span class="log-extra">⏱️ DURATION · ${esc(x.minutes)} MIN</span>`:'';return `<article class="log-card"><strong>${esc(x.name||x.type)}</strong><span>${esc(x.date||'')} · ${esc(x.time||'')} ${x.nutrition?.calories?`· ${x.nutrition.calories} KCAL`:x.burn?`· ${x.burn} KCAL BURN`:''}</span>${drink}${recipeChange}${movementRange}${duration}${x.photo?`<img src="${x.photo}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:14px;margin-top:9px">`:''}</article>`}
function recipeFacts(r){const n=estimatedNutrition(r);return [`${r.name} lands around ${n.calories} kcal for the saved base serving.`,r.taste||`Expect a cozy ${/chocolate/i.test(r.name)?'chocolate-forward':'soft, comforting'} vibe with room for variations.`,n.estimated?'Some older macro details were not preserved, so this card clearly marks its macro split as an automatic estimate.':'This recipe has preserved macro information in the archive.']}
function variations(r){const base=estimatedNutrition(r);return [{name:'CINNAMON CLOUD',mult:1.02,note:'WARMER SPICE + SOFTER BAKERY VIBE'},{name:'DOUBLE CHOCOLATE',mult:1.12,note:'DEEPER COCOA / CHIP ENERGY'},{name:'COZY LIGHT',mult:.92,note:'A SLIGHTLY LIGHTER PORTION VARIATION'}].map(v=>({...v,n:scaledNutrition(base,v.mult)}))}
function labIngredientCategory(p){const n=String(p?.name||'').toLowerCase();if(/flour|cornstarch|baking|flax|chia|cocoa|vanilla|cinnamon/.test(n))return'BAKING';if(/milk|cream|cheese|ricotta|yogurt/.test(n))return'DAIRY';if(/egg|chicken|steak|bacon/.test(n))return'PROTEIN';if(/bread|bagel|rice|pasta|oat/.test(n))return'GRAINS';if(/chocolate|sugar|syrup/.test(n))return'SWEET';if(/juice|coffee/.test(n))return'DRINKS';return'BAKING'}
const EXTRA_LAB_INGREDIENTS=[
 {id:'extra-ap-flour',name:'ALL-PURPOSE FLOUR',unit:'TBSP',calories:28,carbs:5.9,protein:.8,fat:.1,fiber:.2},
 {id:'extra-brown-sugar',name:'BROWN SUGAR',unit:'TBSP',calories:52,carbs:13.4,protein:0,fat:0,fiber:0},
 {id:'extra-white-sugar',name:'GRANULATED SUGAR',unit:'TBSP',calories:49,carbs:12.6,protein:0,fat:0,fiber:0},
 {id:'extra-butter-spread',name:'CANOLA OIL BUTTER SPREAD',unit:'TBSP',calories:50,carbs:0,protein:0,fat:5.5,fiber:0},
 {id:'extra-maple',name:'MAPLE SYRUP',unit:'TBSP',calories:52,carbs:13.4,protein:0,fat:0,fiber:0},
 {id:'extra-ricotta',name:'WHOLE-MILK RICOTTA',unit:'TBSP',calories:27,carbs:1.1,protein:1.5,fat:2,fiber:0},
 {id:'extra-mozzarella',name:'WHOLE-MILK MOZZARELLA',unit:'TBSP',calories:22,carbs:.2,protein:1.6,fat:1.6,fiber:0},
 {id:'extra-cheddar',name:'CHEDDAR CHEESE',unit:'TBSP',calories:28,carbs:.1,protein:1.7,fat:2.3,fiber:0},
 {id:'extra-egg-white',name:'EGG WHITE',unit:'EGG WHITE',calories:17,carbs:.2,protein:3.6,fat:0,fiber:0},
 {id:'extra-flax',name:'GROUND FLAXSEED',unit:'TSP',calories:18,carbs:1,protein:.6,fat:1.4,fiber:.9},
 {id:'extra-chia',name:'CHIA SEEDS',unit:'TSP',calories:20,carbs:1.7,protein:.7,fat:1.3,fiber:1.4},
 {id:'extra-cocoa',name:'DUTCH COCOA',unit:'TBSP',calories:12,carbs:3,protein:1,fat:.7,fiber:2},
 {id:'extra-choc-chips',name:'DARK CHOCOLATE CHIPS',unit:'TBSP',calories:70,carbs:9,protein:1,fat:4,fiber:1},
 {id:'extra-bagel',name:'PLAIN BAGEL',unit:'BAGEL',calories:260,carbs:52,protein:9,fat:1.5,fiber:2},
 {id:'extra-wheat-bread',name:'WHEAT BREAD',unit:'SLICE',calories:70,carbs:13,protein:3,fat:1,fiber:2},
 {id:'extra-rice',name:'COOKED RICE',unit:'1/4 CUP',calories:52,carbs:11.3,protein:1,fat:.1,fiber:.2},
 {id:'extra-pasta',name:'COOKED SPAGHETTI',unit:'1/4 CUP',calories:55,carbs:10.8,protein:2,fat:.3,fiber:.7},
 {id:'extra-sauce',name:'ARRABBIATA SAUCE',unit:'1/4 CUP',calories:35,carbs:5,protein:1,fat:1.5,fiber:1},
 {id:'extra-chicken',name:'ROTISSERIE CHICKEN',unit:'OZ',calories:47,carbs:0,protein:8.8,fat:1.1,fiber:0},
 {id:'extra-steak',name:'COOKED RIBEYE STEAK',unit:'OZ',calories:82,carbs:0,protein:7,fat:6,fiber:0},
 {id:'extra-bacon',name:'COOKED BACON',unit:'SLICE',calories:43,carbs:.1,protein:3,fat:3.3,fiber:0},
 {id:'extra-avocado',name:'AVOCADO',unit:'1/4 CUP',calories:80,carbs:4.3,protein:1,fat:7.4,fiber:3.4},
 {id:'extra-orange-juice',name:'ORANGE JUICE',unit:'1/2 CUP',calories:56,carbs:13,protein:.8,fat:0,fiber:.2},
 {id:'extra-coffee',name:'BREWED COFFEE',unit:'CUP',calories:2,carbs:0,protein:.3,fat:0,fiber:0}
];
function initRecipes(){
 const grid=qs('#recipeGrid');if(!grid)return;
 const search=qs('#recipeSearch'),groupSelect=qs('#recipeGroup'),deck=qs('#pantryDeck');
 let bowl=[];let pantryItems=[];
 function recipePool(){return recipePoolAll()}
 function refreshGroups(){const groups=[...new Set(recipePool().map(x=>x.group).filter(Boolean))].sort();const current=groupSelect.value;groupSelect.innerHTML='<option value="">ALL GROUPS</option>'+groups.map(g=>`<option>${esc(g)}</option>`).join('');if(groups.includes(current))groupSelect.value=current}
 function renderRecipes(){refreshGroups();const q=search.value.trim().toLowerCase(),g=groupSelect.value;const arr=recipePool().filter(x=>(!q||`${x.name} ${x.group||''} ${x.source||''}`.toLowerCase().includes(q))&&(!g||x.group===g));if(qs('#recipeCountPill'))qs('#recipeCountPill').textContent=`${arr.length} RECIPE${arr.length===1?'':'S'}`;grid.innerHTML=arr.map(x=>{const n=estimatedNutrition(x),saved=recipeSaved(x.id);return `<article class="recipe-card recipe-card-v6" data-recipe-id="${esc(x.id)}"><div class="recipe-card-image"><img src="${photoFor(x)}" alt="${esc(x.name)}"><span>${x.source==='RECIPE BUILDER LAB'?'MY LAB':'CCD'}</span><button type="button" class="recipe-save-heart ${saved?'saved':''}" data-save-recipe="${esc(x.id)}" aria-label="${saved?'Remove from saved recipes':'Save recipe'}">${saved?'♥':'♡'}</button></div><div class="card-body"><h3>${esc(x.name)}</h3><div class="recipe-card-stats"><b>${n.calories} KCAL</b><span>${esc(x.group||'CCD')}</span></div>${n.estimated?'<small class="recipe-calorie-note">CALORIE / MACRO ESTIMATE</small>':''}</div></article>`}).join('');qsa('[data-recipe-id]',grid).forEach(c=>c.onclick=()=>openRecipe(c.dataset.recipeId));qsa('[data-save-recipe]',grid).forEach(b=>b.onclick=e=>{e.stopPropagation();toggleRecipeSaved(b.dataset.saveRecipe);renderRecipes();renderSavedRecipes()})}
 search.oninput=renderRecipes;groupSelect.onchange=renderRecipes;
 function rebuildPantry(){const merged=[...(D.PANTRY||[]),...EXTRA_LAB_INGREDIENTS,...(getGrocery().custom||[]).map(x=>({...x,custom:true}))],seen=new Set();pantryItems=merged.filter(x=>{const k=String(x.name||'').toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true}).map(x=>({...x,id:String(x.id||uid()),unit:x.unit||'UNIT',category:x.category||labIngredientCategory(x),calories:+x.calories||0,carbs:+x.carbs||0,protein:+x.protein||0,fat:+x.fat||0,fiber:+x.fiber||0}));renderPantry();renderUnitPicker()}
 function renderPantry(){const q=(qs('#pantrySearch')?.value||'').trim().toLowerCase(),cat=qs('#pantryCategory')?.value||'ALL',items=pantryItems.filter(p=>(cat==='ALL'||p.category===cat)&&(!q||p.name.toLowerCase().includes(q)));deck.innerHTML=items.map(p=>`<button class="pantry-tile pantry-tile-v6" data-pantry-id="${esc(p.id)}" type="button"><span class="pantry-plus">＋</span><strong>${esc(p.name)}</strong><div class="card-meta">${p.calories} KCAL / ${esc(p.unit)}</div><small>${esc(p.category)}</small></button>`).join('');qsa('[data-pantry-id]',deck).forEach(b=>b.onclick=()=>{const p=pantryItems.find(x=>x.id===b.dataset.pantryId);const existing=bowl.find(x=>x.id===p.id);existing?existing.qty+=1:bowl.push({...p,qty:1});renderBowl();b.classList.add('popped');setTimeout(()=>b.classList.remove('popped'),350)})}
 qs('#pantrySearch')?.addEventListener('input',renderPantry);qs('#pantryCategory')?.addEventListener('change',renderPantry);
 function labTotals(){const t={calories:0,carbs:0,protein:0,fat:0,fiber:0};bowl.forEach(p=>Object.keys(t).forEach(k=>t[k]+=+(p[k]||0)*(+p.qty||0)));t.calories=round(t.calories);['carbs','protein','fat','fiber'].forEach(k=>t[k]=round(t[k],1));return t}
 function defaultSteps(){return['COMBINE THE SELECTED INGREDIENTS UNTIL EVENLY MIXED.','COOK, BAKE, HEAT, OR CHILL USING THE METHOD THAT FITS YOUR RECIPE.','CHECK TEXTURE / DONENESS, THEN SERVE AND ENJOY.']}
 function defaultVars(){return['ADD CINNAMON OR VANILLA FOR A WARMER FLAVOR.','CHANGE THE SERVING SIZE WHILE KEEPING THE SAME BASE RECIPE.','SWAP ONE COMPATIBLE INGREDIENT FROM YOUR CCD PANTRY.']}
 function renderBowl(){const target=qs('#labIngredients');target.innerHTML=bowl.length?bowl.map((p,i)=>`<div class="ingredient-line ingredient-line-v6"><div><strong>${esc(p.name)}</strong><div class="card-meta">${p.calories} KCAL / ${esc(p.unit)}</div></div><div class="ingredient-qty"><button type="button" data-lab-minus="${i}">−</button><input type="number" min="0" step="0.25" value="${p.qty}" data-lab-qty="${i}"><button type="button" data-lab-plus="${i}">＋</button></div><button class="ingredient-remove" type="button" data-lab-remove="${i}" aria-label="Remove ingredient">×</button></div>`).join(''):'<div class="empty-state lab-empty">TAP INGREDIENT TILES TO START YOUR RECIPE ✨</div>';qsa('[data-lab-qty]',target).forEach(i=>i.oninput=()=>{bowl[+i.dataset.labQty].qty=Math.max(0,+i.value||0);renderLabNutrition()});qsa('[data-lab-minus]',target).forEach(b=>b.onclick=()=>{const i=+b.dataset.labMinus;bowl[i].qty=Math.max(.25,(+bowl[i].qty||1)-.25);renderBowl()});qsa('[data-lab-plus]',target).forEach(b=>b.onclick=()=>{const i=+b.dataset.labPlus;bowl[i].qty=(+bowl[i].qty||0)+.25;renderBowl()});qsa('[data-lab-remove]',target).forEach(b=>b.onclick=()=>{bowl.splice(+b.dataset.labRemove,1);renderBowl()});renderLabNutrition()}
 function renderLabNutrition(){const t=labTotals();if(qs('#labCaloriesBig'))qs('#labCaloriesBig').textContent=`${t.calories} KCAL`;qs('#labMacros').innerHTML=bar('CARBS',t.carbs,100,'carbs')+bar('PROTEIN',t.protein,50,'protein')+bar('FAT',t.fat,45,'fat')+bar('FIBER',t.fiber,25,'fiber');renderDraftPreview(t)}
 function renderDraftPreview(t=labTotals()){const target=qs('#labRecipePreview');if(!target)return;const name=(qs('#labRecipeName')?.value||'').trim()||'YOUR RECIPE DRAFT',taste=(qs('#labRecipeTaste')?.value||'').trim()||'ADD A TASTE / WHAT TO EXPECT NOTE WHEN YOU ARE READY.';target.innerHTML=`<div class="lab-preview-card"><div><span class="section-kicker">LIVE RECIPE CARD</span><h2>${esc(name)}</h2><p>${esc(taste)}</p></div><div class="lab-preview-calories"><strong>${t.calories}</strong><span>KCAL</span></div><div class="mini-macros">${miniMacros(t)}</div></div>`}
 ['labRecipeName','labRecipeTaste','labRecipeYield','labInstructions','labVariations'].forEach(id=>qs('#'+id)?.addEventListener('input',()=>renderDraftPreview()));
 qs('#mixRecipeBtn').onclick=()=>{if(!bowl.length)return toast('ADD INGREDIENTS TO THE BOWL FIRST 🥣');const rig=qs('.mixing-rig');rig.classList.remove('mixing');void rig.offsetWidth;rig.classList.add('mixing');if(!qs('#labInstructions').value.trim())qs('#labInstructions').value=defaultSteps().join('\n');if(!qs('#labVariations').value.trim())qs('#labVariations').value=defaultVars().join('\n');renderDraftPreview();toast('MIXED! NUTRITION + RECIPE CARD UPDATED ✨')};
 qs('#clearLabBtn').onclick=()=>{bowl=[];renderBowl();toast('BOWL CLEARED 🥣')};
 qs('#labRecipePhoto')?.addEventListener('change',()=>{const input=qs('#labRecipePhoto'),f=input.files[0],target=qs('#labRecipePhotoPreview');if(qs('#labRecipePhotoName'))qs('#labRecipePhotoName').textContent=f?f.name:'CHOOSE A PHOTO FROM YOUR DEVICE';target.innerHTML=f?`<figure class="upload-preview-card removable-upload-preview"><img src="${URL.createObjectURL(f)}" alt="recipe preview"><figcaption>${esc(f.name)}</figcaption><button type="button" class="upload-preview-remove" data-clear-lab-photo>×</button></figure>`:'';qs('[data-clear-lab-photo]',target)?.addEventListener('click',()=>{input.value='';target.innerHTML='';if(qs('#labRecipePhotoName'))qs('#labRecipePhotoName').textContent='CHOOSE A PHOTO FROM YOUR DEVICE';toast('PHOTO REMOVED.')})});
 qs('#addLabCustomIngredientBtn')?.addEventListener('click',()=>{const name=qs('#labCustomIngredientName').value.trim();if(!name)return toast('NAME THE INGREDIENT FIRST ✨');const row={id:`lab-custom-${uid()}`,name:name.toUpperCase(),unit:qs('#labCustomIngredientUnit').value.trim()||'UNIT',calories:+qs('#labCustomIngredientCalories').value||0,carbs:+qs('#labCustomIngredientCarbs').value||0,protein:+qs('#labCustomIngredientProtein').value||0,fat:+qs('#labCustomIngredientFat').value||0,fiber:+qs('#labCustomIngredientFiber').value||0,category:labIngredientCategory({name}),price:0,description:'ADDED FROM RECIPE BUILDER LAB',source:'CUSTOM'};const g=getGrocery();g.custom.unshift(row);saveGrocery(g);['labCustomIngredientName','labCustomIngredientUnit','labCustomIngredientCalories','labCustomIngredientCarbs','labCustomIngredientProtein','labCustomIngredientFat','labCustomIngredientFiber'].forEach(id=>qs('#'+id).value='');rebuildPantry();toast('NEW INGREDIENT ADDED TO THE LAB + GROCERY ✨')});
 async function saveLabRecipe(){if(!bowl.length)return toast('ADD INGREDIENTS FIRST 🥣');const name=qs('#labRecipeName').value.trim();if(!name)return toast('NAME YOUR RECIPE FIRST ✨');const nutrition=labTotals(),steps=qs('#labInstructions').value.split(/\n+/).map(x=>x.trim()).filter(Boolean),vars=qs('#labVariations').value.split(/\n+/).map(x=>x.trim()).filter(Boolean),file=qs('#labRecipePhoto').files[0];toast('SAVING YOUR RECIPE…');const image=file?await uploadFile(file,'lab-recipe'):'';const row={id:`lab-recipe-${uid()}`,name,group:'MY BUILDER LAB',source:'RECIPE BUILDER LAB',customType:'recipe',customMealSlot:qs('#labMealSlot').value,yieldText:qs('#labRecipeYield').value.trim()||'1 RECIPE',taste:qs('#labRecipeTaste').value.trim()||'CUSTOM CCD RECIPE',ingredients:bowl.map(p=>`${p.qty} ${p.unit} · ${p.name}`),ingredientData:bowl.map(p=>({...p})),steps:steps.length?steps:defaultSteps(),variations:vars.length?vars:defaultVars(),nutrition,calories:nutrition.calories,image:image||PHOTO_BANK.default,createdAt:new Date().toISOString()};mutate(s=>{s.labRecipes=s.labRecipes||[];s.labRecipes.unshift(row)});renderLabRecipes();renderRecipes();toast(`${name.toUpperCase()} SAVED ✨`)}
 qs('#saveLabRecipeBtn')?.addEventListener('click',saveLabRecipe);
 function renderLabRecipes(){const target=qs('#labRecipeVault');if(!target)return;const rows=getState().labRecipes||[];target.innerHTML=rows.length?rows.map(r=>`<article class="modified-recipe-card lab-saved-card"><img src="${photoFor(r)}" alt="${esc(r.name)}"><div class="modified-recipe-body"><span class="pill">MY LAB RECIPE · ${estimatedNutrition(r).calories} KCAL</span><h3>${esc(r.name)}</h3><p>${esc(r.taste||'CUSTOM CCD RECIPE')}</p><div class="saved-recipe-summary"><span>${(r.ingredients||[]).length} INGREDIENTS</span><span>${(r.steps||[]).length} STEPS</span><span>${(r.variations||[]).length} VARIATIONS</span></div><div class="modified-recipe-actions"><button class="btn tiny primary" data-open-lab-recipe="${r.id}">VIEW CARD</button><a class="btn tiny ghost" href="foods.html">LOG IN FOOD</a><button class="btn tiny ghost" data-delete-lab-recipe="${r.id}">DELETE</button></div></div></article>`).join(''):'<div class="empty-state">NO BUILDER RECIPES YET — MAKE YOUR FIRST ONE ABOVE ✨</div>';qsa('[data-open-lab-recipe]',target).forEach(b=>b.onclick=()=>openRecipe(b.dataset.openLabRecipe));qsa('[data-delete-lab-recipe]',target).forEach(b=>b.onclick=()=>{if(!confirm('DELETE THIS BUILDER RECIPE?'))return;mutate(s=>{s.labRecipes=(s.labRecipes||[]).filter(x=>x.id!==b.dataset.deleteLabRecipe)});renderLabRecipes();renderRecipes();toast('BUILDER RECIPE DELETED.')})}
 function renderUnitPicker(){const unitIngredient=qs('#unitIngredient');if(!unitIngredient)return;const current=+unitIngredient.value||0;unitIngredient.innerHTML=pantryItems.map((p,i)=>`<option value="${i}">${esc(p.name)} · BASE ${esc(p.unit)}</option>`).join('');unitIngredient.value=Math.min(current,pantryItems.length-1);updateUnit()}
 function conv(p,target){const u=String(p.unit).toUpperCase();if(u==='TSP'){if(target==='TSP')return 1;if(target==='TBSP')return 3;if(target==='CUP')return 48}if(u==='TBSP'){if(target==='TSP')return 1/3;if(target==='TBSP')return 1;if(target==='CUP')return 16}if(u==='1/4 CUP'){if(target==='TSP')return 1/12;if(target==='TBSP')return 1/4;if(target==='CUP')return 4}if(u==='CUP'){if(target==='TSP')return 1/48;if(target==='TBSP')return 1/16;if(target==='CUP')return 1}return null}
 function updateUnit(){const unitIngredient=qs('#unitIngredient');if(!unitIngredient||!pantryItems.length)return;const p=pantryItems[+unitIngredient.value]||pantryItems[0],target=qs('#unitType').value,q=+qs('#unitQty').value,baseCount=conv(p,target);qs('#unitQtyLabel').textContent=`${q} ${target}`;if(baseCount==null){qs('#unitNutrition').innerHTML=`<div class="selected-food"><strong>${esc(p.name)}</strong><p>BASE UNIT: ${esc(p.unit)} · A RELIABLE ${target} CONVERSION IS NOT AVAILABLE.</p></div>`;return}qs('#unitNutrition').innerHTML=miniMacros(scaledNutrition(p,baseCount*q))}
 qs('#unitIngredient')?.addEventListener('change',updateUnit);qs('#unitType')?.addEventListener('change',updateUnit);qs('#unitQty')?.addEventListener('input',updateUnit);
 qs('#recipeCardUpload')?.addEventListener('change',()=>{const input=qs('#recipeCardUpload'),f=input.files[0],target=qs('#recipeCardUploadPreview');if(qs('#recipeCardUploadName'))qs('#recipeCardUploadName').textContent=f?f.name:'CHOOSE AN IMAGE FROM YOUR DEVICE';target.innerHTML=f?`<figure class="upload-preview-card removable-upload-preview"><img src="${URL.createObjectURL(f)}" alt="recipe card preview"><figcaption>${esc(f.name)}</figcaption><button type="button" class="upload-preview-remove" data-clear-card-upload>×</button></figure>`:'';qs('[data-clear-card-upload]',target)?.addEventListener('click',()=>{input.value='';target.innerHTML='';if(qs('#recipeCardUploadName'))qs('#recipeCardUploadName').textContent='CHOOSE AN IMAGE FROM YOUR DEVICE';toast('RECIPE CARD IMAGE REMOVED.')})});
 qs('#saveRecipeCardBtn').onclick=async()=>{const f=qs('#recipeCardUpload').files[0],title=qs('#recipeCardTitle').value.trim();if(!f||!title)return toast('ADD A TITLE + CHOOSE A RECIPE CARD IMAGE.');toast('SAVING RECIPE CARD…');const photo=await uploadFile(f,'recipe-card');mutate(s=>{s.recipeCards=s.recipeCards||[];s.recipeCards.unshift({id:uid(),title,photo,date:todayISO()})});qs('#recipeCardTitle').value='';qs('#recipeCardUpload').value='';if(qs('#recipeCardUploadName'))qs('#recipeCardUploadName').textContent='CHOOSE AN IMAGE FROM YOUR DEVICE';qs('#recipeCardUploadPreview').innerHTML='';renderSavedCards();toast('RECIPE CARD SAVED ✨')};
 function renderSavedCards(){const a=getState().recipeCards||[];qs('#savedRecipeCards').innerHTML=a.length?a.map(x=>`<article class="photo-card"><img src="${x.photo}" alt="${esc(x.title)}"><div class="card-body"><strong>${esc(x.title)}</strong></div></article>`).join(''):'<div class="empty-state">NO UPLOADED RECIPE CARDS YET.</div>'}
 function renderSavedRecipes(){refreshSavedRecipePage()}
 rebuildPantry();renderBowl();renderLabRecipes();renderSavedCards();renderRecipes();renderSavedRecipes();
}

function refreshSavedRecipePage(){const target=qs('#savedRecipeGrid');if(!target)return;const ids=getState().savedRecipeIds||[],rows=ids.map(recipeById).filter(Boolean);if(qs('#savedRecipeCount'))qs('#savedRecipeCount').textContent=`${rows.length} SAVED`;target.innerHTML=rows.length?rows.map(r=>{const n=estimatedNutrition(r);return `<article class="saved-recipe-card"><img src="${photoFor(r)}" alt="${esc(r.name)}"><div><span class="pill">${n.calories} KCAL</span><h3>${esc(r.name)}</h3><p>${esc(r.group||'CCD RECIPE')}</p><div class="saved-recipe-card-actions"><button class="btn tiny primary" data-open-saved-recipe="${esc(r.id)}">VIEW RECIPE</button><button class="btn tiny ghost" data-unsave-recipe="${esc(r.id)}">REMOVE</button></div></div></article>`}).join(''):'<div class="empty-state">TAP ♡ ON ANY RECIPE TO BUILD YOUR SAVED RECIPE COLLECTION ✨</div>';qsa('[data-open-saved-recipe]',target).forEach(b=>b.onclick=()=>openRecipe(b.dataset.openSavedRecipe));qsa('[data-unsave-recipe]',target).forEach(b=>b.onclick=()=>{toggleRecipeSaved(b.dataset.unsaveRecipe);refreshSavedRecipePage();qsa('[data-save-recipe]').filter(x=>x.dataset.saveRecipe===b.dataset.unsaveRecipe).forEach(x=>{x.classList.remove('saved');x.textContent='♡'})})}
function openRecipe(id){const r=recipeById(id);if(!r)return;const n=estimatedNutrition(r),autoVars=variations(r),customVars=Array.isArray(r.variations)&&r.variations.length?r.variations:null,dlg=qs('#recipeDialog'),c=qs('#recipeDialogContent');const varHtml=customVars?customVars.map((v,i)=>`<button class="btn ghost" data-custom-var="${i}">${esc(v)}</button>`).join(''):autoVars.map((v,i)=>`<button class="btn ghost" data-var="${i}">${v.name}</button>`).join('');const saved=recipeSaved(r.id);c.innerHTML=`<div class="dialog-content"><div class="dialog-hero"><div><div class="section-kicker">${esc(r.group||'CCD RECIPE')}</div><h2 style="font-size:46px;margin:6px 0">${esc(r.name)}</h2><p>${esc(r.source||'RECOVERED CCD ARCHIVE')}</p><div class="recipe-dialog-save-row"><span class="recipe-dialog-calorie">${n.calories} KCAL</span><button id="dialogSaveRecipeBtn" class="btn ${saved?'primary':'secondary'}" type="button">${saved?'♥ SAVED RECIPE':'♡ SAVE RECIPE'}</button></div><div class="mini-macros" id="recipeScaledMacros">${miniMacros(n)}</div><label class="field-label">TOTAL SERVING SCALE <span id="recipeScaleLabel">1×</span></label><input id="recipeScale" type="range" min="0.25" max="4" step="0.25" value="1"></div><img src="${photoFor(r)}" alt="${esc(r.name)}"></div><h3>INGREDIENT CHART · VERTICAL ONLY</h3><div class="ingredient-chart">${(r.ingredients||[]).map(i=>`<div>${esc(i)}</div>`).join('')||'<div>INGREDIENTS NOT SAVED FOR THIS ARCHIVE RECIPE.</div>'}</div><div class="ingredient-chart"><div><strong>WHAT TO EXPECT / TASTE</strong><br>${esc(r.taste||'COZY, SATISFYING, AND BUILT TO FEEL LIKE A REAL TREAT.')}</div></div><h3>VARIATIONS</h3><div class="variation-row">${varHtml}</div><div id="variationPreview" class="mini-macros"></div><h3>RECIPE INSTRUCTIONS</h3><ol>${(r.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')||'<li>METHOD WAS NOT SAVED FOR THIS ARCHIVE RECIPE.</li>'}</ol><h3>THREE CCD ONE-LINERS</h3><div class="fact-stack">${recipeFacts(r).map((f,i)=>`<div class="fact-card"><b>0${i+1}</b> ${esc(f)}</div>`).join('')}</div></div>`;const saveBtn=qs('#dialogSaveRecipeBtn',c);if(saveBtn)saveBtn.onclick=()=>{const isSaved=toggleRecipeSaved(r.id);saveBtn.className=`btn ${isSaved?'primary':'secondary'}`;saveBtn.textContent=isSaved?'♥ SAVED RECIPE':'♡ SAVE RECIPE';qsa(`[data-save-recipe="${r.id}"]`).forEach(x=>{x.classList.toggle('saved',isSaved);x.textContent=isSaved?'♥':'♡'});refreshSavedRecipePage()};const scaleInput=qs('#recipeScale',c);if(scaleInput)scaleInput.oninput=()=>{const v=+scaleInput.value;qs('#recipeScaleLabel',c).textContent=`${v}×`;qs('#recipeScaledMacros',c).innerHTML=miniMacros(scaledNutrition(n,v))};qsa('[data-var]',c).forEach(b=>b.onclick=()=>{const v=autoVars[+b.dataset.var];qs('#variationPreview',c).innerHTML=`<div class="selected-food"><h3>${v.name}</h3><p>${v.note}</p><div class="mini-macros">${miniMacros(v.n)}</div></div>`});qsa('[data-custom-var]',c).forEach(b=>b.onclick=()=>{qs('#variationPreview',c).innerHTML=`<div class="selected-food"><strong>${esc(customVars[+b.dataset.customVar])}</strong><p>THIS VARIATION USES THE SAVED BASE NUTRITION UNTIL YOU CHANGE INGREDIENT AMOUNTS.</p></div>`});qs('[data-close-dialog]',dlg).onclick=()=>dlg.close();dlg.showModal()}
function initSotd(){const grid=qs('#sotdGrid');if(!grid)return;let selected=null;grid.innerHTML=(D.SOTD_ITEMS||[]).map(x=>`<article class="sotd-card" data-sotd-id="${x.id}"><img src="${photoFor(x)}" alt="${esc(x.name)}"><div class="card-body"><h3>${esc(x.name)}</h3><div class="card-meta">${esc(x.note||'')}</div></div></article>`).join('');qsa('[data-sotd-id]').forEach(c=>c.onclick=()=>{selected=D.SOTD_ITEMS.find(x=>x.id===c.dataset.sotdId);qsa('[data-sotd-id]').forEach(x=>x.classList.toggle('selected',x===c));qs('#sotdQty').min=selected.min;qs('#sotdQty').max=selected.max;qs('#sotdQty').step=selected.step;qs('#sotdQty').value=selected.min;update()});function update(){if(!selected)return;const q=+qs('#sotdQty').value;qs('#sotdQtyLabel').textContent=`${q} ${selected.unit}${q===1?'':'S'}`;const n=sotdNutrition(selected,q);qs('#sotdSelected').innerHTML=`<h3>${esc(selected.name)}</h3><p>${esc(selected.note||'')}</p>`;qs('#sotdPreview').innerHTML=miniMacros(n)}qs('#sotdQty').oninput=update;qs('#logSotdBtn').onclick=()=>{if(!selected)return toast('PICK AN SOTD FIRST 🍪');const q=+qs('#sotdQty').value;logEntry({type:'sotd',name:selected.name,itemId:selected.id,time:timeOf('sotdTime'),quantity:q,nutrition:sotdNutrition(selected,q)});toast('SOTD LOGGED ✨')}}
function movementDurationMinutes(startText,endText){
 const start=parseWheelTime(startText,'2000-01-01'),end=parseWheelTime(endText,'2000-01-01');
 if(!(start instanceof Date)||!(end instanceof Date)||Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))return 0;
 let mins=Math.round((end.getTime()-start.getTime())/60000);
 // A finish time earlier than the start means the session crossed midnight.
 if(mins<0)mins+=24*60;
 return clamp(mins,0,24*60);
}
function movementBurn(met,mins,weightLb){
 const safeMet=Math.max(0,Number(met)||0),safeMins=Math.max(0,Number(mins)||0),safeWeight=Math.max(1,Number(weightLb)||117.4);
 return round(safeMet*3.5*(safeWeight/2.20462)/200*safeMins)
}
const EXTRA_MOVEMENTS=[
 {id:'gentle-walk-plus',name:'Gentle Walk',emoji:'🚶🏽‍♀️',category:'walking',met:2.8,note:'Easy comfortable walking pace.'},
 {id:'easy-walk',name:'Easy Walk',emoji:'🚶🏽',category:'walking',met:3.0,note:'Relaxed everyday walking.'},
 {id:'brisk-walk',name:'Brisk Walk',emoji:'👟',category:'walking',met:4.3,note:'Purposeful faster walking pace.'},
 {id:'power-walk',name:'Power Walk',emoji:'⚡',category:'walking',met:5.0,note:'Fast energetic walking with stronger arm drive.'},
 {id:'incline-walk',name:'Incline Treadmill Walk',emoji:'⛰️',category:'walking',met:5.5,note:'Walking on an incline or hilly treadmill setting.'},
 {id:'gentle-yoga',name:'Gentle Yoga',emoji:'🧘🏽‍♀️',category:'mind-body',met:2.5,note:'Slow poses, breathing, and easy transitions.'},
 {id:'vinyasa-yoga',name:'Vinyasa Yoga',emoji:'🌿',category:'mind-body',met:3.5,note:'Flow-style yoga with continuous transitions.'},
 {id:'barre',name:'Barre',emoji:'🩰',category:'mind-body',met:3.5,note:'Low-impact barre strength and balance work.'},
 {id:'mat-pilates',name:'Mat Pilates',emoji:'✨',category:'mind-body',met:3.0,note:'Mat-based core, control, and mobility work.'},
 {id:'reformer-pilates',name:'Reformer Pilates',emoji:'🎀',category:'mind-body',met:3.5,note:'Pilates using reformer resistance and controlled movement.'},
 {id:'stretching',name:'Stretching',emoji:'🤸🏽‍♀️',category:'recovery',met:2.3,note:'Dedicated flexibility and stretch session.'},
 {id:'mobility-flow',name:'Mobility Flow',emoji:'🫧',category:'recovery',met:2.5,note:'Joint mobility, range-of-motion, and recovery flow.'},
 {id:'just-dance',name:'Just Dance',emoji:'💃🏽',category:'dance',met:5.5,note:'Interactive dance-game session.'},
 {id:'mj-experience',name:'Michael Jackson: The Experience',emoji:'🕺🏽',category:'dance',met:5.8,note:'Dance-game routine with Michael Jackson choreography.'},
 {id:'freestyle-dance',name:'Freestyle Dance',emoji:'🎶',category:'dance',met:5.0,note:'Free-form dancing at a moderate pace.'},
 {id:'dance-cardio',name:'Dance Cardio',emoji:'🔥',category:'dance',met:6.0,note:'Continuous higher-energy dance workout.'},
 {id:'zumba',name:'Zumba',emoji:'🌈',category:'dance',met:6.5,note:'High-energy dance fitness session.'},
 {id:'bodyweight-strength',name:'Bodyweight Strength',emoji:'💪🏽',category:'strength',met:5.0,note:'Squats, lunges, push movements, and bodyweight circuits.'},
 {id:'resistance-bands',name:'Resistance Band Workout',emoji:'🎗️',category:'strength',met:3.5,note:'Strength session using resistance bands.'},
 {id:'strength-training',name:'Strength Training',emoji:'🏋🏽‍♀️',category:'strength',met:5.0,note:'General resistance or weight-training session.'},
 {id:'core-circuit',name:'Core Circuit',emoji:'🌀',category:'strength',met:4.0,note:'Focused abdominal and trunk-strength circuit.'},
 {id:'easy-cycling',name:'Easy Cycling',emoji:'🚲',category:'cardio',met:4.0,note:'Comfortable low-intensity cycling.'},
 {id:'moderate-cycling',name:'Moderate Cycling',emoji:'🚴🏽‍♀️',category:'cardio',met:6.8,note:'Steady moderate cycling pace.'},
 {id:'elliptical',name:'Elliptical',emoji:'🔄',category:'cardio',met:5.0,note:'Moderate elliptical-machine session.'},
 {id:'stair-climbing',name:'Stair Climbing',emoji:'🪜',category:'cardio',met:8.0,note:'Continuous stairs or stair-machine workout.'},
 {id:'jogging',name:'Jogging',emoji:'🏃🏽‍♀️',category:'cardio',met:7.0,note:'Easy-to-moderate jogging pace.'},
 {id:'running',name:'Running',emoji:'🏃🏽',category:'cardio',met:8.3,note:'Steady running workout.'},
 {id:'jump-rope',name:'Jump Rope',emoji:'🪢',category:'cardio',met:10.0,note:'Continuous jump-rope intervals.'},
 {id:'kickboxing',name:'Kickboxing',emoji:'🥊',category:'cardio',met:7.5,note:'Cardio kickboxing combinations and footwork.'},
 {id:'hiking',name:'Hiking',emoji:'🥾',category:'sport',met:6.0,note:'Outdoor trail or hill walking.'},
 {id:'leisure-swim',name:'Leisure Swimming',emoji:'🏊🏽‍♀️',category:'sport',met:6.0,note:'Relaxed continuous swimming.'},
 {id:'lap-swim',name:'Swimming Laps',emoji:'🌊',category:'sport',met:7.0,note:'Moderate continuous lap swimming.'},
 {id:'rowing',name:'Rowing Machine',emoji:'🚣🏽‍♀️',category:'cardio',met:7.0,note:'Moderate rowing-machine session.'},
 {id:'tennis',name:'Tennis',emoji:'🎾',category:'sport',met:7.3,note:'Singles-style tennis movement.'},
 {id:'badminton',name:'Badminton',emoji:'🏸',category:'sport',met:5.5,note:'Recreational badminton session.'},
 {id:'roller-skating',name:'Roller Skating',emoji:'🛼',category:'sport',met:7.0,note:'Steady recreational roller skating.'}
];
function movementCategoryFor(m={}){if(m.category)return m.category;const s=`${m.name||''} ${m.note||''}`.toLowerCase();if(/walk|treadmill/.test(s))return'walking';if(/yoga|pilates|barre/.test(s))return'mind-body';if(/dance|zumba|michael jackson|just dance/.test(s))return'dance';if(/strength|weight|resistance|band|core/.test(s))return'strength';if(/stretch|mobility|recovery/.test(s))return'recovery';if(/hike|swim|tennis|badminton|skate/.test(s))return'sport';return'cardio'}
function movementLibrary(){
 const base=(D.MOVEMENTS||[]).map((m,i)=>({...m,id:m.id||`base-move-${i}`,category:movementCategoryFor(m),custom:false}));
 const custom=(getState().customMovements||[]).map(m=>({...m,category:m.category||'other',custom:true}));
 const merged=[...base,...EXTRA_MOVEMENTS.map(m=>({...m,custom:false})),...custom],seen=new Set();
 return merged.filter(m=>{const key=String(m.id||m.name).toLowerCase();const name=String(m.name||'').toLowerCase();if(seen.has(key)||seen.has(`name:${name}`))return false;seen.add(key);seen.add(`name:${name}`);return true})
}
function customMovementMet(category='other',intensity='moderate'){
 const table={
  walking:{gentle:2.5,light:3.0,moderate:4.0,vigorous:5.0,high:6.0},
  'mind-body':{gentle:2.0,light:2.5,moderate:3.3,vigorous:4.2,high:5.0},
  dance:{gentle:2.8,light:3.5,moderate:5.0,vigorous:6.5,high:7.5},
  cardio:{gentle:3.0,light:4.0,moderate:5.5,vigorous:7.5,high:9.0},
  strength:{gentle:2.8,light:3.5,moderate:5.0,vigorous:6.0,high:7.0},
  sport:{gentle:3.0,light:4.0,moderate:5.5,vigorous:7.0,high:8.5},
  recovery:{gentle:1.8,light:2.2,moderate:2.7,vigorous:3.2,high:4.0},
  other:{gentle:2.5,light:3.0,moderate:4.5,vigorous:6.0,high:7.5}
 };
 return table[category]?.[intensity]||table.other[intensity]||4.5
}
function initMovement(){
 const deck=qs('#movementDeck');if(!deck)return;let selected=null,editingCustomId=null;
 const search=qs('#movementSearch'),categoryFilter=qs('#movementCategoryFilter'),count=qs('#movementCount');
 const customName=qs('#customMoveName'),customCategory=qs('#customMoveCategory'),customIntensity=qs('#customMoveIntensity'),customEmoji=qs('#customMoveEmoji'),customNote=qs('#customMoveNote'),customPreview=qs('#customMoveAutoPreview'),customList=qs('#customMovementList'),saveCustom=qs('#saveCustomMoveBtn'),cancelEdit=qs('#cancelCustomMoveEditBtn');
 function currentRange(){const startTime=timeOf('movementStartTime'),endTime=timeOf('movementEndTime'),mins=movementDurationMinutes(startTime,endTime);return{startTime,endTime,mins}}
 function update(){const {startTime,endTime,mins}=currentRange(),w=+getProfile().weight||117.4,burn=selected?movementBurn(selected.met,mins,w):0;if(qs('#movementDurationBig'))qs('#movementDurationBig').textContent=mins;if(qs('#movementStartLabel'))qs('#movementStartLabel').textContent=startTime;if(qs('#movementEndLabel'))qs('#movementEndLabel').textContent=endTime;qs('#movementBurn').textContent=burn;qs('#movementSelected').innerHTML=selected?`<div class="movement-selected-hero"><span>${selected.emoji||'✨'}</span><div><div class="section-kicker">${esc((selected.category||movementCategoryFor(selected)).replace('-',' '))}${selected.custom?' · CUSTOM':''}</div><h3>${esc(selected.name)}</h3><p>${esc(selected.note||'CUSTOM MOVEMENT')}</p><div class="duration-chip">🕘 ${esc(startTime)} → ${esc(endTime)} · ${mins} MIN</div><small>ESTIMATE ENGINE · ${round(selected.met,1)} MET</small></div></div>`:'PICK A MOVEMENT.'}
 function cardHtml(m){return `<article class="movement-card ${m.custom?'custom-movement-card':''} ${selected?.id===m.id?'selected':''}" data-move-id="${esc(m.id)}"><div class="movement-card-top"><div class="emoji">${m.emoji||'✨'}</div>${m.custom?'<span class="movement-custom-badge">MY MOVE</span>':''}</div><h3>${esc(m.name)}</h3><div class="card-meta">${esc(m.note||'')}</div><div class="movement-card-bottom"><span>${esc((m.category||movementCategoryFor(m)).replace('-',' ').toUpperCase())}</span><strong>${round(m.met,1)} MET</strong></div></article>`}
 function filteredMoves(){const q=String(search?.value||'').trim().toLowerCase(),cat=categoryFilter?.value||'all';return movementLibrary().filter(m=>{const matchesCat=cat==='all'||(cat==='custom'?m.custom:(m.category||movementCategoryFor(m))===cat);const matchesQ=!q||`${m.name||''} ${m.note||''} ${m.category||''}`.toLowerCase().includes(q);return matchesCat&&matchesQ})}
 function bindDeck(){qsa('[data-move-id]',deck).forEach(c=>c.onclick=()=>{selected=movementLibrary().find(x=>x.id===c.dataset.moveId)||null;update();renderDeck();qs('.movement-console-layout')?.scrollIntoView({behavior:'smooth',block:'start'})})}
 function renderDeck(){const moves=filteredMoves();deck.innerHTML=moves.length?moves.map(cardHtml).join(''):'<div class="empty-state movement-empty">NO MOVEMENTS MATCH THAT FILTER.</div>';if(count)count.textContent=`${moves.length} ${moves.length===1?'MOVE':'MOVES'}`;bindDeck()}
 function customPreviewRender(){if(!customPreview)return;const cat=customCategory?.value||'other',intensity=customIntensity?.value||'moderate',met=customMovementMet(cat,intensity),w=+getProfile().weight||117.4,burn30=movementBurn(met,30,w);customPreview.innerHTML=`<div><span>AUTO INTENSITY ESTIMATE</span><strong>${round(met,1)} MET</strong></div><div><span>30-MIN PREVIEW</span><strong>~${burn30} KCAL</strong></div><p>BURN WILL STILL USE YOUR REAL START → FINISH DURATION WHEN YOU LOG IT.</p>`}
 function resetCustomForm(){editingCustomId=null;if(customName)customName.value='';if(customCategory)customCategory.value='walking';if(customIntensity)customIntensity.value='moderate';if(customEmoji)customEmoji.value='';if(customNote)customNote.value='';if(saveCustom)saveCustom.textContent='SAVE CUSTOM EXERCISE ✨';if(cancelEdit)cancelEdit.hidden=true;customPreviewRender()}
 function renderCustomList(){if(!customList)return;const rows=getState().customMovements||[];customList.innerHTML=rows.length?rows.map(m=>`<article class="custom-move-row"><div class="custom-move-row-main"><span>${m.emoji||'✨'}</span><div><strong>${esc(m.name)}</strong><small>${esc((m.category||'other').replace('-',' ').toUpperCase())} · ${esc(String(m.intensity||'moderate').toUpperCase())} · ${round(m.met,1)} MET</small></div></div><div class="custom-move-row-actions"><button type="button" class="btn tiny secondary" data-use-custom-move="${esc(m.id)}">USE NOW</button><button type="button" class="btn tiny ghost" data-edit-custom-move="${esc(m.id)}">EDIT</button><button type="button" class="btn tiny ghost danger" data-delete-custom-move="${esc(m.id)}">DELETE</button></div></article>`).join(''):'<div class="empty-state">NO CUSTOM EXERCISES YET — BUILD ONE ABOVE ✨</div>';
  qsa('[data-use-custom-move]',customList).forEach(b=>b.onclick=()=>{selected=movementLibrary().find(x=>x.id===b.dataset.useCustomMove)||null;update();renderDeck();qs('.movement-console-layout')?.scrollIntoView({behavior:'smooth',block:'start'})});
  qsa('[data-edit-custom-move]',customList).forEach(b=>b.onclick=()=>{const m=(getState().customMovements||[]).find(x=>x.id===b.dataset.editCustomMove);if(!m)return;editingCustomId=m.id;customName.value=m.name||'';customCategory.value=m.category||'other';customIntensity.value=m.intensity||'moderate';customEmoji.value=m.emoji||'';customNote.value=m.note||'';saveCustom.textContent='UPDATE CUSTOM EXERCISE ✨';cancelEdit.hidden=false;customPreviewRender();customName.focus()});
  qsa('[data-delete-custom-move]',customList).forEach(b=>b.onclick=()=>{const m=(getState().customMovements||[]).find(x=>x.id===b.dataset.deleteCustomMove);if(!m)return;if(!confirm(`DELETE ${m.name}?`))return;mutate(s=>{s.customMovements=(s.customMovements||[]).filter(x=>x.id!==m.id)});if(selected?.id===m.id)selected=null;if(editingCustomId===m.id)resetCustomForm();renderCustomList();renderDeck();update();toast('CUSTOM EXERCISE DELETED.')})
 }
 search?.addEventListener('input',renderDeck);categoryFilter?.addEventListener('change',renderDeck);
 [customCategory,customIntensity].forEach(el=>el?.addEventListener('change',customPreviewRender));
 saveCustom?.addEventListener('click',()=>{const name=String(customName?.value||'').trim();if(!name)return toast('NAME YOUR CUSTOM EXERCISE FIRST ✨');const wasEditing=!!editingCustomId,category=customCategory?.value||'other',intensity=customIntensity?.value||'moderate',met=customMovementMet(category,intensity),record={id:editingCustomId||`custom-move-${uid()}`,name,category,intensity,met,emoji:String(customEmoji?.value||'✨').trim()||'✨',note:String(customNote?.value||'').trim()||`${intensity.toUpperCase()} CUSTOM ${category.replace('-',' ').toUpperCase()} EXERCISE`,custom:true,updatedAt:new Date().toISOString()};mutate(s=>{s.customMovements=s.customMovements||[];const i=s.customMovements.findIndex(x=>x.id===record.id);if(i>=0)s.customMovements[i]=record;else s.customMovements.unshift(record)});selected=record;renderCustomList();renderDeck();update();resetCustomForm();toast(wasEditing?'CUSTOM EXERCISE UPDATED ✨':'CUSTOM EXERCISE SAVED ✨')});
 cancelEdit?.addEventListener('click',resetCustomForm);
 ['movementStartTime','movementEndTime'].forEach(id=>qs('#'+id)?.addEventListener('timewheelchange',()=>requestAnimationFrame(update)));
 qs('#logMovementBtn').onclick=()=>{if(!selected)return toast('PICK A MOVEMENT FIRST ✨');const {startTime,endTime,mins}=currentRange();if(mins<=0)return toast('FINISH TIME MUST BE AFTER START TIME ✨');if(mins>480&&!confirm(`THIS TIME RANGE IS ${mins} MINUTES. LOG IT ANYWAY?`))return;const burn=movementBurn(selected.met,mins,+getProfile().weight||117.4);logEntry({type:'movement',name:selected.name,movementId:selected.id,movementCategory:selected.category||movementCategoryFor(selected),movementMet:selected.met,customMovement:!!selected.custom,time:startTime,startTime,endTime,minutes:mins,durationMinutes:mins,burn});toast(`${startTime} → ${endTime} · ${mins} MIN LOGGED 💃🏽`);history()};
 function history(){const a=(getState().logs||[]).filter(x=>x.type==='movement').slice(0,12);qs('#movementHistory').innerHTML=a.length?a.map(logCard).join(''):'<div class="empty-state">NO MOVEMENT LOGS YET.</div>'}
 renderDeck();renderCustomList();resetCustomForm();history();setTimeout(update,0)
}
function initFasting(){
 const deck=qs('#fastPresetDeck');if(!deck)return;
 let preset=(D.FAST_PRESETS||[]).find(x=>x.id==='16:8')||D.FAST_PRESETS?.[0];
 deck.innerHTML=(D.FAST_PRESETS||[]).map(x=>`<button class="fast-preset ${x.id===preset?.id?'active':''}" data-fast="${x.id}"><strong>${x.id}</strong><span>${x.hours} HOUR FAST</span></button>`).join('');
 qsa('[data-fast]').forEach(b=>b.onclick=()=>{preset=D.FAST_PRESETS.find(x=>x.id===b.dataset.fast);qsa('[data-fast]').forEach(x=>x.classList.toggle('active',x===b))});
 qs('#fastStartDate').value=todayISO();qs('#fastBreakDate').value=todayISO();
 let pending=getState().activeFast||null;
 const lastMealStatus=qs('#lastMealFastStatus'),lastMealBtn=qs('#startFastAfterLastMealBtn');
 function findLastMeal(date){
  const mealTypes=new Set(['food','sotd','restaurant']);
  return (getState().logs||[]).filter(x=>x.date===date&&mealTypes.has(x.type)&&/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.test(String(x.time||''))).sort((a,b)=>parseWheelTime(b.time,date)-parseWheelTime(a.time,date))[0]||null
 }
 function currentActive(){return getState().activeFast||pending||null}
 function fastDurationMinutes(startDate,startTime,breakDate,breakTime){
  const start=parseWheelTime(startTime,startDate),end=parseWheelTime(breakTime,breakDate);
  const startMs=start instanceof Date?start.getTime():Number(start),endMs=end instanceof Date?end.getTime():Number(end);
  if(!Number.isFinite(startMs)||!Number.isFinite(endMs))return 0;
  let mins=Math.round((endMs-startMs)/60000);
  // If somebody keeps the same calendar date but chooses an earlier clock time,
  // treat that as an overnight break on the following day. Explicit next-day
  // dates work normally and never need this adjustment.
  if(mins<0&&startDate===breakDate)mins+=1440;
  return Math.max(0,mins)
 }
 function formatFastMinutes(mins){
  const total=Math.max(0,Math.round(+mins||0)),h=Math.floor(total/60),m=total%60;
  if(h&&m)return `${h} HR ${m} MIN`;
  if(h)return `${h} HR${h===1?'':'S'}`;
  return `${m} MIN`
 }
 function fastGoalHours(row){
  const found=(D.FAST_PRESETS||[]).find(x=>x.id===row?.preset);
  if(found?.hours)return +found.hours;
  const n=parseFloat(String(row?.preset||'').split(':')[0]);
  return Number.isFinite(n)&&n>0?n:16
 }
 function setStartControlsLocked(locked){if(lastMealBtn)lastMealBtn.disabled=!!locked}
 function updateLastMealStatus(activeMeal=null){
  if(!lastMealStatus||!lastMealBtn)return;
  const active=currentActive();
  if(active){
   lastMealStatus.classList.add('active');lastMealStatus.classList.remove('found');
   lastMealStatus.innerHTML=`<strong>FAST IS ACTIVE ✨</strong><br>${esc(active.preset)} · STARTED ${esc(active.startDate)} AT ${esc(active.startTime)}${active.lastMealName?` · AFTER ${esc(active.lastMealName)}`:''}`;
   setStartControlsLocked(true);return
  }
  setStartControlsLocked(false);
  const date=qs('#fastStartDate').value||todayISO(),meal=activeMeal||findLastMeal(date);
  lastMealStatus.classList.remove('found','active');
  if(!meal){lastMealStatus.textContent=`NO FOOD / SNACK / RESTAURANT LOG WITH A TIME FOUND ON ${date}. YOU CAN STILL SET THE FAST MANUALLY BELOW.`;lastMealBtn.disabled=true;return}
  lastMealBtn.disabled=false;lastMealStatus.classList.add('found');
  lastMealStatus.innerHTML=`<strong>LAST MEAL FOUND</strong><br>${esc(meal.name)} · ${esc(meal.time)} · ${esc(date)}`
 }
 function beginFast(data){
  if(currentActive())return toast('YOU ALREADY HAVE AN ACTIVE FAST. BREAK IT BEFORE STARTING ANOTHER. ⏳');
  const startLog=logEntry({type:'fast-start',event:'start',name:`${data.preset} FAST STARTED`,preset:data.preset,date:data.startDate,time:data.startTime,startTime:data.startTime,startDate:data.startDate,startSource:data.startSource||'manual',lastMealId:data.lastMealId||'',lastMealName:data.lastMealName||'',status:'active'});
  pending={...data,startLogId:startLog.id,status:'active'};
  mutate(st=>{st.activeFast={...pending}});
  sessionStorage.setItem(`${PREFIX}:pendingFast`,JSON.stringify(pending));
  render();updateLastMealStatus();
  toast(`${data.preset} FAST STARTED + LOGGED · ${data.startTime} ✨`)
 }
 qs('#fastStartDate').addEventListener('change',()=>updateLastMealStatus());
 lastMealBtn?.addEventListener('click',()=>{
  const date=qs('#fastStartDate').value||todayISO(),meal=findLastMeal(date);if(!meal){updateLastMealStatus();return toast('NO TIMED MEAL LOG FOUND ON THAT DAY. 🍽️')}
  beginFast({preset:preset.id,startTime:meal.time,startDate:date,startSource:'last-meal',lastMealId:meal.id,lastMealName:meal.name})
 });
 qs('#saveFastBreakBtn').onclick=()=>{
  pending=currentActive()||JSON.parse(sessionStorage.getItem(`${PREFIX}:pendingFast`)||'null');if(!pending)return toast('START A FAST FIRST.');
  const breakTime=timeOf('fastBreakTime'),breakDate=qs('#fastBreakDate').value,durationMinutes=fastDurationMinutes(pending.startDate,pending.startTime,breakDate,breakTime),hrs=durationMinutes/60;
  if(durationMinutes<=0)return toast('BREAK TIME MUST BE AFTER YOUR FAST START. ⏳');
  const completed=logEntry({type:'fast',event:'break',name:`${pending.preset} FAST BROKEN`,preset:pending.preset,date:breakDate,startTime:pending.startTime,startDate:pending.startDate,breakTime,breakDate,durationMinutes,durationHours:round(hrs,1),time:breakTime,startSource:pending.startSource||'manual',lastMealId:pending.lastMealId||'',lastMealName:pending.lastMealName||'',status:'completed',startLogId:pending.startLogId||''});
  let startRow=null;
  mutate(st=>{const row=(st.logs||[]).find(x=>x.id===pending.startLogId);if(row){row.status='completed';row.breakTime=breakTime;row.breakDate=breakDate;row.durationMinutes=durationMinutes;row.durationHours=round(hrs,1);row.completedLogId=completed.id;startRow={...row}}st.activeFast=null});
  if(startRow)syncLogUpdate(startRow).catch(()=>{});
  sessionStorage.removeItem(`${PREFIX}:pendingFast`);pending=null;
  toast(`FAST BROKEN + LOGGED · ${round(hrs,1)} HOURS ✨`);render();updateLastMealStatus()
 };
 function openFastDetail(id){const x=(getState().logs||[]).find(r=>r.id===id);if(!x)return;let start=x,brk=x;if(x.type==='fast-start'&&x.completedLogId)brk=(getState().logs||[]).find(r=>r.id===x.completedLogId)||x;if(x.type==='fast'&&x.startLogId)start=(getState().logs||[]).find(r=>r.id===x.startLogId)||x;const dlg=qs('#fastDetailDialog'),c=qs('#fastDetailContent');if(!dlg||!c)return;const completed=(brk.type==='fast'&&brk.breakTime)||start.status==='completed';c.innerHTML=`<div class="section-kicker">INDIVIDUAL FAST LOG</div><h2 style="font-size:clamp(34px,5vw,58px);margin:8px 0 18px">${esc(start.preset||brk.preset||'FAST')} FAST ${completed?'COMPLETE':'ACTIVE'} ⏳</h2><div class="fast-detail-grid"><div><span>STATUS</span><strong>${completed?'COMPLETED ✅':'ACTIVE 🟣'}</strong></div><div><span>START</span><strong>${esc(start.startDate||start.date||brk.startDate||'')} · ${esc(start.startTime||start.time||brk.startTime||'')}</strong></div><div><span>BREAK</span><strong>${completed?`${esc(brk.breakDate||'')} · ${esc(brk.breakTime||'')}`:'NOT BROKEN YET'}</strong></div><div><span>DURATION</span><strong>${completed?formatFastMinutes(+brk.durationMinutes||+start.durationMinutes||Math.round((+brk.durationHours||+start.durationHours||0)*60)):'IN PROGRESS'}</strong></div><div><span>START METHOD</span><strong>${(start.startSource||brk.startSource)==='last-meal'?'AFTER LAST MEAL':'MANUAL'}</strong></div><div><span>LAST MEAL</span><strong>${esc(start.lastMealName||brk.lastMealName||'—')}</strong></div></div><div class="fast-detail-story"><strong>FAST STORY</strong><p>STARTED ${esc(start.startDate||start.date||brk.startDate||'')} AT ${esc(start.startTime||start.time||brk.startTime||'')}${start.lastMealName||brk.lastMealName?` AFTER ${esc(start.lastMealName||brk.lastMealName)}`:''}.${completed?` BROKEN ${esc(brk.breakDate||'')} AT ${esc(brk.breakTime||'')} AFTER ${esc(formatFastMinutes(+brk.durationMinutes||+start.durationMinutes||Math.round((+brk.durationHours||+start.durationHours||0)*60)))}.`:' THIS FAST IS STILL ACTIVE.'}</p></div>`;dlg.showModal()}
 function normalizeCompletedFastHistory(){
  const logs=getState().logs||[],starts=logs.filter(x=>x.type==='fast-start'||x.event==='start'||/FAST STARTED/i.test(String(x.name||''))),rows=[],usedStartIds=new Set(),seen=new Set();
  const byId=new Map(logs.map(x=>[x.id,x]));
  function parseDurationText(row){
   const s=`${row?.name||''} ${row?.duration||''} ${row?.summary||''}`.toUpperCase();
   const hm=s.match(/(\d+(?:\.\d+)?)\s*HR(?:S|OURS?)?(?:\s*(\d+)\s*MIN)?/);if(hm)return Math.round(Number(hm[1])*60+Number(hm[2]||0));
   const mm=s.match(/(\d+)\s*MIN/);return mm?Number(mm[1]):0
  }
  function nearestStart(row){
   if(row?.startLogId&&byId.has(row.startLogId))return byId.get(row.startLogId);
   const preset=String(row?.preset||'');
   const breakDate=row?.breakDate||row?.date||todayISO(),breakTime=row?.breakTime||row?.time||'11:59 PM',breakMs=parseWheelTime(breakTime,breakDate).getTime();
   let best=null,bestMs=-Infinity;
   starts.forEach(s=>{if(preset&&s.preset&&String(s.preset)!==preset)return;const sd=s.startDate||s.date||'',st=s.startTime||s.time||'';if(!sd||!st)return;const ms=parseWheelTime(st,sd).getTime();if(ms<=breakMs&&ms>bestMs){best=s;bestMs=ms}});
   return best
  }
  function pushRow(source,startRow=null){
   const startDate=source.startDate||startRow?.startDate||startRow?.date||source.date||'',startTime=source.startTime||startRow?.startTime||startRow?.time||'';
   const breakDate=source.breakDate||startRow?.breakDate||source.date||'',breakTime=source.breakTime||source.time||startRow?.breakTime||'';
   let mins=Number(source.durationMinutes||startRow?.durationMinutes||0);if(!mins){const hrs=Number(source.durationHours||startRow?.durationHours||0);if(hrs>0)mins=Math.round(hrs*60)}
   if(!mins)mins=parseDurationText(source)||parseDurationText(startRow);
   if(!mins&&startDate&&startTime&&breakDate&&breakTime)mins=fastDurationMinutes(startDate,startTime,breakDate,breakTime);
   if(!(mins>0)||!startDate)return;
   const linkedStartId=source.startLogId||startRow?.id||'',linkedBreakId=source.completedLogId||source.id||startRow?.completedLogId||'';
   const key=linkedBreakId||`${startDate}|${startTime}|${breakDate}|${breakTime}|${mins}`;if(seen.has(key))return;seen.add(key);if(linkedStartId)usedStartIds.add(linkedStartId);
   rows.push({...source,id:source.id||linkedBreakId||linkedStartId||key,startDate,startTime,breakDate,breakTime,durationMinutes:mins,durationHours:mins/60,preset:source.preset||startRow?.preset||'FAST',startSource:source.startSource||startRow?.startSource||'',lastMealName:source.lastMealName||startRow?.lastMealName||'',_mins:mins,_hours:mins/60,_recovered:!(source.durationMinutes>0)})
  }
  logs.filter(x=>x.type==='fast'||x.event==='break'||/FAST BROKEN/i.test(String(x.name||''))).forEach(x=>pushRow(x,nearestStart(x)));
  starts.filter(x=>x.status==='completed'||x.breakTime||x.durationMinutes||x.durationHours).forEach(s=>{if(usedStartIds.has(s.id))return;const brk=s.completedLogId&&byId.get(s.completedLogId);pushRow(brk||s,s)});
  return rows.sort((a,b)=>parseWheelTime(b.startTime||'12:00 AM',b.startDate).getTime()-parseWheelTime(a.startTime||'12:00 AM',a.startDate).getTime())
 }
 function renderDailyCalculations(){
  const target=qs('#fastDailyCalculations'),stats=qs('#fastDailyStats');if(!target||!stats)return;
  const completed=normalizeCompletedFastHistory();
  const groups=new Map();
  completed.forEach(x=>{const day=x.startDate||x.date||x.breakDate||todayISO();if(!groups.has(day))groups.set(day,[]);groups.get(day).push(x)});
  const days=[...groups.entries()].sort((a,b)=>b[0].localeCompare(a[0]));
  const totalMinutes=completed.reduce((n,x)=>n+x._mins,0),avgMinutes=completed.length?Math.round(totalMinutes/completed.length):0,longest=completed.reduce((best,x)=>x._mins>(best?best._mins:0)?x:best,null);
  stats.innerHTML=completed.length?`<article><span>ALL COMPLETED FASTS</span><strong>${completed.length}</strong></article><article><span>AVERAGE FAST</span><strong>${formatFastMinutes(avgMinutes)}</strong></article><article><span>LONGEST FAST</span><strong>${longest?formatFastMinutes(longest._mins):'—'}</strong></article>`:`<article><span>ALL COMPLETED FASTS</span><strong>0</strong></article><article><span>AVERAGE FAST</span><strong>—</strong></article><article><span>LONGEST FAST</span><strong>—</strong></article>`;
  if(!days.length){target.innerHTML='<div class="empty-state fasting-daily-empty">NO COMPLETED FASTS COULD BE CALCULATED YET. ONCE A START + BREAK ARE SAVED, THEY WILL APPEAR HERE AUTOMATICALLY. ⏳</div>';return}
  target.innerHTML=days.map(([day,rows])=>{
   const total=rows.reduce((n,x)=>n+x._mins,0),main=rows[0],goal=Math.max(1,fastGoalHours(main)*60),pct=Math.min(100,Math.round(total/goal*100)),dateLabel=new Date(`${day}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',year:'numeric'}).toUpperCase();
   const detail=rows.map(x=>`<div class="fasting-daily-equation"><span>${esc(x.startTime||'START')}</span><b>→</b><span>${esc((x.breakDate&&x.breakDate!==x.startDate)?`${x.breakDate} · `:'')}${esc(x.breakTime||'BREAK')}</span><strong>= ${formatFastMinutes(x._mins)}</strong><button type="button" class="fasting-inline-view" data-view-fast="${esc(x.id)}">VIEW</button></div>`).join('');
   const recovered=rows.some(x=>x._recovered)?'<span class="fasting-history-recovered">PREVIOUS LOG RECOVERED ✓</span>':'';
   return `<article class="fasting-day-card"><div class="fasting-day-top"><div><span class="fasting-day-date">${esc(dateLabel)}</span><strong>${formatFastMinutes(total)}</strong><small>${round(total/60,1)} HOURS TOTAL · ${rows.length} ${rows.length===1?'FAST':'FASTS'}</small></div><div class="fasting-day-ring" style="--fast-pct:${pct}%"><span>${pct}%</span></div></div><div class="fasting-day-progress"><i style="width:${pct}%"></i></div><div class="fasting-day-goal">${esc(main.preset||'FAST')} GOAL · ${fastGoalHours(main)} HRS ${recovered}</div>${detail}</article>`
  }).join('');
 }

 function render(){
  const a=(getState().logs||[]).filter(x=>x.type==='fast'||x.type==='fast-start').slice(0,12);
  qs('#fastHistory').innerHTML=a.length?a.map(x=>x.type==='fast-start'?`<article class="log-card fasting-event-card fast-start-event"><span class="pill">START LOG</span><strong>${esc(x.preset)} FAST STARTED</strong><span>${esc(x.startDate||x.date)} · ${esc(x.startTime||x.time)}</span><span class="log-extra">${x.status==='completed'?'✅ COMPLETED':'🟣 ACTIVE'}${x.startSource==='last-meal'?` · 🍽️ AFTER ${esc(x.lastMealName||'LAST MEAL')}`:''}</span><button type="button" class="btn tiny ghost fast-view-btn" data-view-fast="${esc(x.id)}">VIEW FULL LOG</button></article>`:`<article class="log-card fasting-event-card fast-break-event"><span class="pill">BREAK LOG</span><strong>${esc(x.preset)} FAST BROKEN · ${formatFastMinutes(+x.durationMinutes||Math.round((+x.durationHours||0)*60))}</strong><span>${esc(x.startDate)} ${esc(x.startTime)} → ${esc(x.breakDate)} ${esc(x.breakTime)}</span>${x.startSource==='last-meal'?`<span class="log-extra">🍽️ STARTED AFTER LAST MEAL · ${esc(x.lastMealName||'LAST MEAL')}</span>`:''}<button type="button" class="btn tiny ghost fast-view-btn" data-view-fast="${esc(x.id)}">VIEW FULL LOG</button></article>`).join(''):'<div class="empty-state">NO FAST STARTS OR BREAKS LOGGED YET.</div>';
  renderDailyCalculations();
  qsa('[data-view-fast]').forEach(b=>b.onclick=()=>openFastDetail(b.dataset.viewFast))
 }
 render();setTimeout(()=>{const active=currentActive();if(active){pending=active;qs('#fastStartDate').value=active.startDate||todayISO()}updateLastMealStatus()},0)
}
function initRestaurants(){
 const wrap=qs('#restaurantChains');if(!wrap)return;
 wrap.innerHTML=(D.RESTAURANT_CHAINS||[]).map(r=>`<article class="restaurant-card"><img src="${r.image||PHOTO_BANK.default}" alt="${esc(r.name)}"><div class="card-body"><h3>${esc(r.name)}</h3><div class="card-meta">${r.items.length} SAVED ITEM${r.items.length===1?'':'S'} · ${esc(r.source||'')}</div></div></article>`).join('');
 const rs=qs('#restaurantSelect'),is=qs('#restaurantItemSelect'),photoInput=qs('#customRestaurantPhoto'),photoPreview=qs('#customRestaurantPhotoPreview'),photoName=qs('#customRestaurantPhotoName'),removePhoto=qs('#removeCustomRestaurantPhoto');
 function fillItems(){const r=D.RESTAURANT_CHAINS[+rs.value];is.innerHTML=r.items.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('');preview()}
 function preview(){const r=D.RESTAURANT_CHAINS[+rs.value],x=r.items[+is.value],q=+qs('#restaurantQty').value,n=scaledNutrition(x,q);qs('#restaurantQtyLabel').textContent=`${q}×`;qs('#restaurantPresetPreview').innerHTML=`<h3>${esc(x.name)}</h3><p>${esc(r.name)}</p><div class="mini-macros">${miniMacros(n)}</div>`}
 function clearRestaurantPhoto(){clearFileInput('customRestaurantPhoto','customRestaurantPhotoPreview','customRestaurantPhotoName','NO PHOTO SELECTED','removeCustomRestaurantPhoto')}
 photoInput?.addEventListener('change',()=>previewSingleImage(photoInput,photoPreview,photoName,removePhoto,'NO PHOTO SELECTED'));
 removePhoto?.addEventListener('click',()=>{clearRestaurantPhoto();toast('RESTAURANT PHOTO REMOVED.')});
 rs.onchange=fillItems;is.onchange=preview;qs('#restaurantQty').oninput=preview;fillItems();
 qs('#logRestaurantPresetBtn').onclick=()=>{const r=D.RESTAURANT_CHAINS[+rs.value],x=r.items[+is.value],q=+qs('#restaurantQty').value;logEntry({type:'restaurant',name:`${r.name} · ${x.name}`,restaurant:r.name,itemId:x.id,time:timeOf('restaurantTime'),quantity:q,nutrition:scaledNutrition(x,q),photo:r.image});toast('RESTAURANT ITEM LOGGED ✨')};
 qs('#saveCustomRestaurantBtn').onclick=async()=>{const fields=['customRestaurant','customRestaurantItem','customCalories','customCarbs','customProtein','customFat','customFiber'];if(fields.some(id=>qs('#'+id).value===''))return toast('FILL IN THE RESTAURANT ITEM + NUTRITION.');try{const f=photoInput?.files?.[0];if(f)toast('SAVING YOUR FOOD PHOTO… 📸');const photo=await uploadFile(f,'restaurant');const item={id:uid(),restaurant:qs('#customRestaurant').value.trim(),name:qs('#customRestaurantItem').value.trim(),nutrition:{calories:+qs('#customCalories').value,carbs:+qs('#customCarbs').value,protein:+qs('#customProtein').value,fat:+qs('#customFat').value,fiber:+qs('#customFiber').value},photo,date:todayISO()};mutate(st=>{st.customRestaurant=st.customRestaurant||[];st.customRestaurant.unshift(item)});logEntry({type:'restaurant',name:`${item.restaurant} · ${item.name}`,restaurant:item.restaurant,time:timeOf('restaurantTime'),nutrition:item.nutrition,photo});fields.forEach(id=>qs('#'+id).value='');clearRestaurantPhoto();renderCustom();toast(photo?'CUSTOM ORDER + PHOTO SAVED ✨📸':'CUSTOM RESTAURANT FOOD SAVED + LOGGED ✨')}catch(err){console.error(err);toast(err.message||'PHOTO COULD NOT BE SAVED. TRY A SMALLER IMAGE.') }};
 function renderCustom(){const a=getState().customRestaurant||[];qs('#customRestaurantVault').innerHTML=a.length?a.map(x=>`<article class="log-card restaurant-vault-card">${x.photo?`<img src="${x.photo}" alt="${esc(x.name)}" class="restaurant-vault-photo">`:''}<strong>${esc(x.restaurant)} · ${esc(x.name)}</strong><span>${x.nutrition.calories} KCAL · C ${x.nutrition.carbs} · P ${x.nutrition.protein} · F ${x.nutrition.fat} · FIB ${x.nutrition.fiber}</span><div class="log-actions">${x.photo?`<button class="btn tiny ghost" data-remove-restaurant-photo="${x.id}">REMOVE PHOTO</button>`:''}<button class="btn tiny ghost" data-delete-restaurant-item="${x.id}">DELETE ITEM</button></div></article>`).join(''):'<div class="empty-state">NO CUSTOM RESTAURANT FOODS YET.</div>';
  qsa('[data-remove-restaurant-photo]').forEach(b=>b.onclick=()=>{if(!confirm('REMOVE THIS UPLOADED PHOTO?'))return;mutate(st=>{const row=(st.customRestaurant||[]).find(x=>x.id===b.dataset.removeRestaurantPhoto);if(row)row.photo='' });renderCustom();toast('UPLOADED PHOTO REMOVED.')});
  qsa('[data-delete-restaurant-item]').forEach(b=>b.onclick=()=>{if(!confirm('DELETE THIS CUSTOM RESTAURANT ITEM?'))return;mutate(st=>{st.customRestaurant=(st.customRestaurant||[]).filter(x=>x.id!==b.dataset.deleteRestaurantItem)});renderCustom();toast('CUSTOM RESTAURANT ITEM DELETED.')})
 }
 renderCustom()
}

function initCalendar(){
 const grid=qs('#calendarGrid');if(!grid)return;bindDialogClosers();let cursor=new Date();cursor=new Date(cursor.getFullYear(),cursor.getMonth(),1);let selected=todayISO(),editingId='';
 function stateSafe(){const s=getState();return{logs:s.logs||[],water:s.water||{},plans:s.plans||[]}}
 function totalsForDay(logs){return logs.reduce((o,x)=>{if(['food','sotd','restaurant'].includes(x.type)){o.calories+=+(x.nutrition?.calories||0);o.protein+=+(x.nutrition?.protein||0)}if(x.type==='movement')o.burn+=+(x.burn||0);return o},{calories:0,protein:0,burn:0})}
 function renderDay(){const {logs,water,plans}=stateSafe(),dayLogs=logs.filter(x=>x.date===selected),dayPlans=plans.filter(x=>x.date===selected),title=qs('#selectedDayTitle'),out=qs('#selectedDayLogs'),sum=totalsForDay(dayLogs);if(title)title.textContent=new Date(selected+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}).toUpperCase();qs('#selectedDaySummary').innerHTML=`<div><span>FOOD</span><strong>${round(sum.calories)} KCAL</strong></div><div><span>PROTEIN</span><strong>${round(sum.protein,1)} G</strong></div><div><span>MOVE</span><strong>${round(sum.burn)} KCAL</strong></div><div><span>WATER</span><strong>${water[selected]||0} BOTTLES</strong></div>`;qs('#selectedWaterCount').textContent=`${water[selected]||0} BOTTLE${(water[selected]||0)===1?'':'S'}`;const planHtml=dayPlans.map(x=>`<article class="calendar-entry plan-entry"><div><span class="entry-type">PLAN · ${esc((x.type||'other').toUpperCase())}</span><strong>${esc(x.title)}</strong><small>${esc(x.time||'ANY TIME')}${x.note?` · ${esc(x.note)}`:''}</small></div><div class="entry-actions"><button class="btn tiny ghost" data-edit-plan="${x.id}">EDIT</button><button class="btn tiny ghost" data-delete-plan="${x.id}">DELETE</button></div></article>`).join('');const logHtml=dayLogs.map(x=>`<article class="calendar-entry ${x.photo?'has-photo':''}">${x.photo?`<img class="calendar-entry-photo" src="${x.photo}" alt="${esc(x.name||'Food photo')}">`:''}<div><span class="entry-type">${esc((x.type||'LOG').toUpperCase())}</span><strong>${esc(x.name||x.type)}</strong><small>${esc(x.time||x.startTime||'')}${x.nutrition?.calories?` · ${x.nutrition.calories} KCAL`:x.burn?` · ${x.burn} BURN`:''}${x.notes?` · ${esc(x.notes)}`:''}</small></div><div class="entry-actions"><button class="btn tiny ghost" data-edit-log="${x.id}">EDIT</button><button class="btn tiny ghost" data-delete-log="${x.id}">DELETE</button></div></article>`).join('');out.innerHTML=(planHtml+logHtml)||'<div class="empty-state">NO LOGS OR PLANS ON THIS DATE — ADD ONE ON THE RIGHT.</div>';qsa('[data-delete-log]').forEach(b=>b.onclick=()=>deleteLog(b.dataset.deleteLog));qsa('[data-edit-log]').forEach(b=>b.onclick=()=>openLogEditor(b.dataset.editLog));qsa('[data-delete-plan]').forEach(b=>b.onclick=()=>deletePlan(b.dataset.deletePlan));qsa('[data-edit-plan]').forEach(b=>b.onclick=()=>editPlan(b.dataset.editPlan))}
 function render(){const y=cursor.getFullYear(),m=cursor.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),{logs,water,plans}=stateSafe();qs('#calTitle').textContent=cursor.toLocaleDateString(undefined,{month:'long',year:'numeric'}).toUpperCase();grid.innerHTML=Array.from({length:42},(_,i)=>{const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,ls=logs.filter(x=>x.date===iso),ps=plans.filter(x=>x.date===iso),dots=[...new Set(ls.map(x=>x.type))];if((water[iso]||0)>0&&!dots.includes('water'))dots.push('water');if(ps.length&&!dots.includes('plan'))dots.push('plan');const total=ls.length+ps.length;return`<button type="button" class="calendar-day ${d.getMonth()!==m?'muted':''} ${iso===selected?'selected':''}" data-date="${iso}"><strong>${d.getDate()}</strong><div class="day-label">${iso===todayISO()?'TODAY':total?`${total} ITEM${total===1?'':'S'}`:''}</div><div class="day-dots">${dots.map(type=>`<span class="day-dot ${type==='movement'?'move':(type==='fast'||type==='fast-start')?'fast':type==='restaurant'?'restaurant':type==='water'?'water':type==='plan'?'plan':''}" title="${esc(type)}"></span>`).join('')}</div></button>`}).join('');qsa('[data-date]',grid).forEach(b=>b.onclick=()=>{selected=b.dataset.date;qsa('[data-date]',grid).forEach(x=>x.classList.toggle('selected',x===b));renderDay()});renderDay()}
 function deleteLog(id){if(!confirm('DELETE THIS LOG?'))return;mutate(s=>{s.logs=(s.logs||[]).filter(x=>x.id!==id)});syncLogDelete(id);render();toast('LOG DELETED.')}
 function openLogEditor(id){const x=getState().logs.find(v=>v.id===id);if(!x)return;editingId=id;qs('#calendarEditHeading').textContent=`EDIT ${String(x.type||'LOG').toUpperCase()}`;qs('#editLogName').value=x.name||'';qs('#editLogDate').value=x.date||selected;qs('#editLogTime').value=x.time||x.startTime||'';qs('#editLogCalories').value=x.nutrition?.calories??'';qs('#editLogBurn').value=x.burn??'';qs('#editLogProtein').value=x.nutrition?.protein??'';qs('#editLogCarbs').value=x.nutrition?.carbs??'';qs('#editLogFat').value=x.nutrition?.fat??'';qs('#editLogFiber').value=x.nutrition?.fiber??'';qs('#editLogNote').value=x.notes||'';qs('#calendarEditDialog').showModal()}
 qs('#saveEditedLogBtn').onclick=()=>{const s=getState(),x=s.logs.find(v=>v.id===editingId);if(!x)return;const nv=(id)=>qs(id).value;x.name=nv('#editLogName').trim()||x.name;x.date=nv('#editLogDate')||x.date;x.time=nv('#editLogTime').trim()||x.time;x.notes=nv('#editLogNote').trim();if(x.nutrition||nv('#editLogCalories')!==''){x.nutrition=x.nutrition||{};[['calories','#editLogCalories'],['protein','#editLogProtein'],['carbs','#editLogCarbs'],['fat','#editLogFat'],['fiber','#editLogFiber']].forEach(([k,id])=>{if(nv(id)!=='')x.nutrition[k]=+nv(id)})}if(nv('#editLogBurn')!=='')x.burn=+nv('#editLogBurn');saveState(s);syncLogUpdate(x);selected=x.date;closeDialogById('calendarEditDialog');render();toast('LOG UPDATED ✨')};
 function deletePlan(id){if(!confirm('DELETE THIS PLAN?'))return;mutate(s=>{s.plans=(s.plans||[]).filter(x=>x.id!==id)});render();toast('PLAN DELETED.')}
 function editPlan(id){const s=getState(),p=s.plans.find(x=>x.id===id);if(!p)return;qs('#planTitle').value=p.title;qs('#planType').value=p.type;qs('#planTime').value=p.time||'';qs('#planNote').value=p.note||'';qs('#savePlanBtn').dataset.editPlan=id;toast('PLAN LOADED INTO THE EDITOR ✨')}
 qs('#savePlanBtn').onclick=()=>{const title=qs('#planTitle').value.trim();if(!title)return toast('ADD A PLAN TITLE.');const editId=qs('#savePlanBtn').dataset.editPlan||'',row={id:editId||uid(),date:selected,title,type:qs('#planType').value,time:qs('#planTime').value,note:qs('#planNote').value.trim(),createdAt:new Date().toISOString()};mutate(s=>{s.plans=s.plans||[];if(editId)s.plans=s.plans.filter(x=>x.id!==editId);s.plans.push(row)});delete qs('#savePlanBtn').dataset.editPlan;qs('#planTitle').value='';qs('#planTime').value='';qs('#planNote').value='';render();toast(editId?'PLAN UPDATED ✨':'PLAN ADDED ✨')};
 qs('#waterDayPlus').onclick=()=>{mutate(s=>{s.water=s.water||{};s.water[selected]=(s.water[selected]||0)+1});renderDay();render()};qs('#waterDayMinus').onclick=()=>{mutate(s=>{s.water=s.water||{};s.water[selected]=Math.max(0,(s.water[selected]||0)-1)});renderDay();render()};
 const calendarPhotoInput=qs('#calendarFoodPhotoInput'),calendarPhotoPreview=qs('#calendarFoodPhotoPreview');
 calendarPhotoInput?.addEventListener('change',()=>{const f=calendarPhotoInput.files[0];if(calendarPhotoPreview)calendarPhotoPreview.innerHTML=f?`<img src="${URL.createObjectURL(f)}" alt="Food photo preview">`:''});
 qs('#saveCalendarFoodPhotoBtn')?.addEventListener('click',async()=>{const f=calendarPhotoInput?.files?.[0];if(!f)return toast('CHOOSE A FOOD PHOTO FIRST 📸');const title=(qs('#calendarFoodPhotoName')?.value||'').trim()||'FOOD I MADE';toast('SAVING PHOTO…');const photo=await uploadFile(f,'calendar-food');logEntry({type:'food',name:title,date:selected,time:'PHOTO',photo,notes:'PHOTO ADDED FROM CALENDAR'});if(qs('#calendarFoodPhotoName'))qs('#calendarFoodPhotoName').value='';calendarPhotoInput.value='';if(calendarPhotoPreview)calendarPhotoPreview.innerHTML='';render();toast('FOOD PHOTO ADDED TO THIS DAY ✨📸')});qs('#calPrev').onclick=()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);render()};qs('#calNext').onclick=()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);render()};render()
}
function initBattle(){
 const left=qs('#battleLeft'),right=qs('#battleRight');if(!left||!right)return;const foods=allFoods();if(foods.length<2)return;
 const opts=foods.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('');left.innerHTML=opts;right.innerHTML=opts;right.value=Math.min(1,foods.length-1);let metric='calories';
 const rules={calories:'lower',protein:'higher',fiber:'higher',carbs:'lower',fat:'lower'};
 const fmt=(m,v)=>m==='calories'?`${round(v)} KCAL`:`${round(v,1)} G`;
 const pair=()=>{let ai=+left.value||0,bi=+right.value||0;if(ai===bi){bi=(bi+1)%foods.length;right.value=bi}const a=foods[ai],b=foods[bi];return{a,b,na:estimatedNutrition(a),nb:estimatedNutrition(b)}};
 function winnerFor(m,na,nb){const va=+na[m]||0,vb=+nb[m]||0;if(va===vb)return 0;return rules[m]==='higher'?(va>vb?1:2):(va<vb?1:2)}
 function fighterHtml(x,n,i,winner=0){return`<article class="fighter fighter-v6 ${winner===i?'winner':winner&&winner!==i?'loser':''}"><div class="fighter-image-wrap"><img src="${photoFor(x)}" alt="${esc(x.name)}"><span class="fighter-number">0${i}</span></div><div class="fighter-body"><div class="section-kicker">FIGHTER ${i}</div><h2>${esc(x.name)}</h2><div class="fighter-feature-stat"><span>${metric.toUpperCase()}</span><strong>${fmt(metric,n[metric])}</strong></div><div class="mini-macros">${miniMacros(n)}</div></div></article>`}
 function scoreboard(na,nb,activeMetric=metric){const metrics=['calories','protein','fiber','carbs','fat'];return`<div class="battle-score-head"><span>FIGHTER 1</span><strong>STAT RADAR</strong><span>FIGHTER 2</span></div>${metrics.map(m=>{const va=+na[m]||0,vb=+nb[m]||0,max=Math.max(1,va,vb),wa=winnerFor(m,na,nb);return`<div class="battle-stat-row ${m===activeMetric?'active':''}"><span>${m.toUpperCase()}</span><div class="battle-stat-meter"><i style="width:${clamp(va/max*100,0,100)}%"></i></div><b>${fmt(m,va)}</b><b>${fmt(m,vb)}</b><div class="battle-stat-meter right-meter"><i style="width:${clamp(vb/max*100,0,100)}%"></i></div></div>`}).join('')}`}
 function render(winner=0){const {a,b,na,nb}=pair();qs('#battleArena').innerHTML=fighterHtml(a,na,1,winner)+fighterHtml(b,nb,2,winner);qs('#battleScoreboard').innerHTML=scoreboard(na,nb);if(!winner)qs('#battleWinner').innerHTML='<div class="battle-ready">CHOOSE A STAT AND HIT <strong>BATTLE!</strong> ⚡</div>'}
 function confetti(){const c=qs('#battleConfetti');if(!c)return;c.innerHTML=Array.from({length:34},(_,i)=>`<i style="--x:${(i*29)%100}%;--delay:${(i%8)*.035}s;--spin:${i%2?1:-1}">${['✨','⚡','👑','🍓','💥'][i%5]}</i>`).join('');c.classList.remove('go');void c.offsetWidth;c.classList.add('go');setTimeout(()=>c.classList.remove('go'),2200)}
 function runBattle(){const {a,b,na,nb}=pair(),w=winnerFor(metric,na,nb),stage=qs('#battleWinner'),consoleEl=qs('.battle-console-v6');consoleEl?.classList.add('battle-active');stage.innerHTML='<div class="battle-countdown"><span>3</span><span>2</span><span>1</span><b>FIGHT!</b></div>';setTimeout(()=>{render(w);stage.innerHTML=w?`<span class="crown">👑</span><div class="section-kicker">${metric.toUpperCase()} · ${rules[metric].toUpperCase()} WINS</div><strong>${esc(w===1?a.name:b.name)}</strong><p>${fmt(metric,w===1?na[metric]:nb[metric])} TAKES THIS ROUND.</p>`:`<span class="crown">🤝</span><strong>IT'S A TIE</strong><p>${fmt(metric,na[metric])} EACH.</p>`;confetti();consoleEl?.classList.remove('battle-active')},650)}
 function gauntlet(){const {a,b,na,nb}=pair(),metrics=['calories','protein','fiber','carbs','fat'];let sa=0,sb=0;const rows=metrics.map(m=>{const w=winnerFor(m,na,nb);if(w===1)sa++;if(w===2)sb++;return`<div class="gauntlet-round"><span>${m.toUpperCase()}</span><strong>${fmt(m,na[m])}</strong><b>${w===0?'TIE':w===1?'← WIN':'WIN →'}</b><strong>${fmt(m,nb[m])}</strong></div>`}).join(''),overall=sa===sb?0:(sa>sb?1:2);render(overall);qs('#battleWinner').innerHTML=`<div class="gauntlet-score"><div><span>${esc(a.name)}</span><strong>${sa}</strong></div><b>BEST OF 5</b><div><strong>${sb}</strong><span>${esc(b.name)}</span></div></div>${rows}<span class="crown">${overall?'👑':'🤝'}</span><strong>${overall?esc(overall===1?a.name:b.name):'GAUNTLET TIE'}</strong>`;confetti()}
 qsa('[data-battle-metric]').forEach(b=>b.onclick=()=>{metric=b.dataset.battleMetric;qsa('[data-battle-metric]').forEach(x=>x.classList.toggle('active',x===b));render()});left.onchange=()=>render();right.onchange=()=>render();qs('#battleStartBtn')?.addEventListener('click',runBattle);qs('#battleRandomBtn')?.addEventListener('click',()=>{const a=Math.floor(Math.random()*foods.length);let b=Math.floor(Math.random()*foods.length);if(b===a)b=(b+1)%foods.length;left.value=a;right.value=b;render();toast('NEW FIGHTERS ENTERED THE ARENA 🎲')});qs('#battleSwapBtn')?.addEventListener('click',()=>{const v=left.value;left.value=right.value;right.value=v;render();toast('FIGHTERS SWAPPED ⇄')});qs('#battleGauntletBtn')?.addEventListener('click',gauntlet);render()
}

function dailySeed(){const d=new Date();return d.getFullYear()*372+(d.getMonth()+1)*31+d.getDate()}

function moveFacts(m){return [`${m.name} uses a preset MET estimate so burn updates automatically from duration and profile weight.`,`The movement log keeps estimated burn separate from the 2,100–2,150 kcal maintenance reference.`,m.note||'This preset is part of the recovered CCD movement list.']}

function initFacts(){
 const target=qs('#dailyLogFacts');if(!target)return;
 const dateInput=qs('#factDate'),dayLabel=qs('#factDayLabel'),countLabel=qs('#factLogCount'),sourceLabel=qs('#factSourceSummary');
 let selected=todayISO();
 const fmtDay=iso=>new Date(`${iso}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase();
 const fmtMins=mins=>{mins=Math.max(0,Math.round(+mins||0));const h=Math.floor(mins/60),m=mins%60;return h&&m?`${h} HR ${m} MIN`:h?`${h} HR`: `${m} MIN`};
 const nutritionTotal=rows=>rows.reduce((o,x)=>{const n=x.nutrition||{};['calories','carbs','protein','fat','fiber'].forEach(k=>o[k]+=+(n[k]||0));return o},{calories:0,carbs:0,protein:0,fat:0,fiber:0});
 const card=(f,i)=>`<article class="daily-log-fact-card fact-${i+1}"><div class="daily-fact-number">0${i+1}</div><div class="daily-fact-icon">${f.icon||'✨'}</div><div class="daily-fact-copy"><span>${esc(f.label||'TODAY')}</span><h3>${esc(f.title||'YOUR LOG FACT')}</h3><p>${esc(f.text||'')}</p>${f.meta?`<small>${esc(f.meta)}</small>`:''}</div></article>`;
 function buildFacts(iso){
  const state=getState(),logs=(state.logs||[]).filter(x=>x.date===iso),water=+(state.water?.[iso]||0);
  const foods=logs.filter(x=>['food','restaurant','sotd'].includes(x.type));
  const movements=logs.filter(x=>x.type==='movement');
  const fastBreaks=logs.filter(x=>x.type==='fast'||x.event==='break'||/FAST BROKEN/i.test(String(x.name||'')));
  const fastStarts=logs.filter(x=>x.type==='fast-start'||x.event==='start');
  const facts=[];
  if(foods.length){
   const total=nutritionTotal(foods),highest=[...foods].sort((a,b)=>(+(b.nutrition?.calories||0))-(+(a.nutrition?.calories||0)))[0];
   const highestCal=round(+(highest?.nutrition?.calories||0));
   facts.push({icon:'🍽️',label:'FOOD LOG',title:`${foods.length} FOOD ${foods.length===1?'ENTRY':'ENTRIES'} · ${round(total.calories)} KCAL`,text:`${highest?.name||'YOUR FOOD'} was the highest-calorie logged item${highestCal?` at ${highestCal} kcal`:''}.`,meta:`PROTEIN ${round(total.protein,1)} G · CARBS ${round(total.carbs,1)} G · FAT ${round(total.fat,1)} G · FIBER ${round(total.fiber,1)} G`});
  }
  const modified=foods.find(x=>x.recipeModification?.changes);
  if(modified){
   const r=modified.recipeModification,delta=+(r.calorieDelta||0),direction=delta>0?'MORE':delta<0?'LESS':'THE SAME';
   facts.push({icon:'✏️',label:'RECIPE REMIX',title:`${esc(modified.name||'MODIFIED RECIPE')} · ${round(r.modifiedCalories??modified.nutrition?.calories)} KCAL`,text:`Your modification came out ${Math.abs(round(delta))} kcal ${direction.toLowerCase()} than the original${r.baseCalories!=null?` (${round(r.baseCalories)} → ${round(r.modifiedCalories)} kcal)`:''}.`,meta:r.changes||'MODIFIED RECIPE LOGGED'});
  }
  if(movements.length){
   const mins=movements.reduce((n,x)=>n+(+x.minutes||+x.durationMinutes||0),0),burn=movements.reduce((n,x)=>n+(+x.burn||0),0),names=[...new Set(movements.map(x=>x.name).filter(Boolean))];
   const first=movements[0],range=movements.length===1&&first.startTime&&first.endTime?`${first.startTime} → ${first.endTime}`:`${movements.length} MOVEMENT LOG${movements.length===1?'':'S'}`;
   facts.push({icon:'💃🏽',label:'MOVEMENT LOG',title:`${fmtMins(mins)} · ~${round(burn)} KCAL BURN`,text:`${names.slice(0,3).join(', ')}${names.length>3?` + ${names.length-3} more`:''}.`,meta:range});
  }
  if(fastBreaks.length){
   const rows=fastBreaks.map(x=>({x,mins:+x.durationMinutes||Math.round((+x.durationHours||0)*60)})).filter(r=>r.mins>0),total=rows.reduce((n,r)=>n+r.mins,0),longest=[...rows].sort((a,b)=>b.mins-a.mins)[0];
   if(rows.length)facts.push({icon:'⏳',label:'FASTING LOG',title:`${fmtMins(total)} FASTED`,text:`${rows.length===1?'Your completed fast':`${rows.length} completed fasts`} ${rows.length===1?'was':'totaled'} ${fmtMins(total)}${longest?.x?.lastMealName?` after ${longest.x.lastMealName}`:''}.`,meta:longest?.x?`${longest.x.startDate||''} ${longest.x.startTime||''} → ${longest.x.breakDate||iso} ${longest.x.breakTime||''}`:''});
  }else if(fastStarts.length){
   const x=fastStarts[0];facts.push({icon:'⏳',label:'FASTING LOG',title:'FAST STARTED',text:`You started ${x.preset||'a'} fast at ${x.startTime||x.time||'your logged time'}${x.lastMealName?` after ${x.lastMealName}`:''}.`,meta:x.status==='completed'?'COMPLETED FAST START LOG':'ACTIVE FAST START LOG'});
  }
  if(water>0)facts.push({icon:'💧',label:'HYDRATION LOG',title:`${water} BOTTLE${water===1?'':'S'} LOGGED`,text:`You logged ${water} bottle${water===1?'':'s'} of water on this day.`,meta:water>=5?'HYDRATION GOAL HIT ✨':water>=3?'SOLID HYDRATION FLOW': 'WATER IS ON THE BOARD'});
  const drinks=foods.filter(x=>x.drink).map(x=>x.drink?.name).filter(Boolean);
  if(drinks.length&&facts.length<3)facts.push({icon:'🥤',label:'DRINK LOG',title:`${drinks.length} DRINK ${drinks.length===1?'PAIRING':'PAIRINGS'}`,text:`You paired ${[...new Set(drinks)].slice(0,3).join(', ')} with your food logs.`,meta:'DRINKS ARE COUNTED WITH THEIR FOOD ENTRY'});
  if(foods.length&&facts.length<3){
   const total=nutritionTotal(foods),proteinTop=[...foods].sort((a,b)=>(+(b.nutrition?.protein||0))-(+(a.nutrition?.protein||0)))[0];
   facts.push({icon:'💪🏽',label:'MACRO SNAPSHOT',title:`${round(total.protein,1)} G PROTEIN · ${round(total.fiber,1)} G FIBER`,text:`${proteinTop?.name||'Your food'} contributed the most protein among your logged foods today.`,meta:`${round(total.carbs,1)} G CARBS · ${round(total.fat,1)} G FAT`});
  }
  if(logs.length&&facts.length<3){
   const times=logs.map(x=>x.time||x.startTime).filter(Boolean),types=[...new Set(logs.map(x=>x.type).filter(Boolean))];
   facts.push({icon:'📓',label:'DAY LOG STORY',title:`${logs.length} TOTAL LOG${logs.length===1?'':'S'}`,text:`Your day includes ${types.map(x=>x.replace('fast-start','fasting')).join(', ')}.`,meta:times.length?`LOGGED TIMES INCLUDE ${times.slice(0,4).join(' · ')}`:'SAVED TO THIS DATE'});
  }
  const emptyFacts=[
   {icon:'🍽️',label:'FOOD',title:'NO FOOD LOGGED YET',text:'Log food or a restaurant meal and this card will turn into a fact from what you actually ate.',meta:'WAITING FOR A FOOD LOG'},
   {icon:'💃🏽',label:'MOVEMENT',title:'NO MOVEMENT LOGGED YET',text:'Log a walk, Pilates, dance, or another movement and this card will use your real duration and burn.',meta:'WAITING FOR A MOVEMENT LOG'},
   {icon:'⏳',label:'FASTING / WATER',title:'NO FAST OR WATER LOGGED YET',text:'Start or break a fast, or add water, and this card will update from the saved log.',meta:'WAITING FOR A DAILY LOG'}
  ];
  while(facts.length<3)facts.push(emptyFacts[facts.length]);
  return {facts:facts.slice(0,3),logs,water,foods,movements,fastBreaks,fastStarts};
 }
 function render(){
  if(dateInput)dateInput.value=selected;if(dayLabel)dayLabel.textContent=selected===todayISO()?'TODAY · '+fmtDay(selected):fmtDay(selected);
  const built=buildFacts(selected),sourceTypes=[];if(built.foods.length)sourceTypes.push('FOOD');if(built.movements.length)sourceTypes.push('MOVE');if(built.fastBreaks.length||built.fastStarts.length)sourceTypes.push('FASTING');if(built.water)sourceTypes.push('WATER');
  if(countLabel)countLabel.textContent=`${built.logs.length} SAVED LOG${built.logs.length===1?'':'S'}${built.water?` · ${built.water} WATER BOTTLE${built.water===1?'':'S'}`:''}`;
  if(sourceLabel)sourceLabel.textContent=sourceTypes.length?`BUILT FROM ${sourceTypes.join(' + ')}`:'WAITING FOR LOGS';
  target.innerHTML=built.facts.map(card).join('');
 }
 function shiftDay(delta){const d=new Date(`${selected}T12:00:00`);d.setDate(d.getDate()+delta);selected=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;render()}
 dateInput?.addEventListener('change',()=>{if(dateInput.value){selected=dateInput.value;render()}});
 qs('#factPrevDay')?.addEventListener('click',()=>shiftDay(-1));qs('#factNextDay')?.addEventListener('click',()=>shiftDay(1));qs('#factToday')?.addEventListener('click',()=>{selected=todayISO();render()});
 render();
}

function getPeriod(){try{const p=JSON.parse(localStorage.getItem(K.period)||'{}')||{};return{days:Array.isArray(p.days)?p.days:[],ranges:Array.isArray(p.ranges)?p.ranges:[],settings:{cycleLength:28,periodLength:5,...(p.settings||{})}}}catch{return{days:[],ranges:[],settings:{cycleLength:28,periodLength:5}}}}
function savePeriod(p){localStorage.setItem(K.period,JSON.stringify(p))}
function isoAddDays(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function daysBetween(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5)}
function initPeriod(){const grid=qs('#periodCalendarGrid');if(!grid)return;let p=getPeriod(),selectedSymptoms=new Set(),cursor=new Date();cursor=new Date(cursor.getFullYear(),cursor.getMonth(),1);const dateInput=qs('#periodLogDate');dateInput.value=todayISO();qs('#periodStartDate').value=todayISO();qs('#averageCycleLength').value=p.settings.cycleLength;qs('#averagePeriodLength').value=p.settings.periodLength;
 function lastStart(){const starts=[...p.ranges.map(r=>r.start),...p.days.filter(d=>d.flow&&d.flow!=='none').map(d=>d.date)].filter(Boolean).sort();return starts.at(-1)||''}
 function estimatedNext(){const start=lastStart();if(!start)return'';let next=isoAddDays(start,+p.settings.cycleLength||28),guard=0;while(next<todayISO()&&guard<12){next=isoAddDays(next,+p.settings.cycleLength||28);guard++}return next}
 function renderStatus(){const start=lastStart(),next=estimatedNext();let cycle='—',status='NO PERIOD DATA YET';if(start){const diff=daysBetween(start,todayISO());cycle=diff>=0?diff+1:'—';status=next&&todayISO()===next?'ESTIMATED PERIOD DAY':next&&todayISO()<next?`${daysBetween(todayISO(),next)} DAYS TO ESTIMATE`:'CYCLE IN PROGRESS'}qs('#periodStatusCards').innerHTML=`<div class="period-stat"><span>CYCLE DAY</span><strong>${cycle}</strong></div><div class="period-stat"><span>LAST START</span><strong>${start||'—'}</strong></div><div class="period-stat"><span>NEXT ESTIMATE</span><strong>${next||'—'}</strong></div><div class="period-stat"><span>STATUS</span><strong>${status}</strong></div>`}
 function periodDates(){const set=new Set();p.ranges.forEach(r=>{let cur=r.start;while(cur&&cur<=r.end){set.add(cur);cur=isoAddDays(cur,1)}});p.days.filter(d=>d.flow&&d.flow!=='none').forEach(d=>set.add(d.date));return set}
 function renderCalendar(){const y=cursor.getFullYear(),m=cursor.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),periodSet=periodDates(),next=estimatedNext(),estimateSet=new Set();if(next)for(let i=0;i<(+p.settings.periodLength||5);i++)estimateSet.add(isoAddDays(next,i));qs('#periodCalTitle').textContent=cursor.toLocaleDateString(undefined,{month:'long',year:'numeric'}).toUpperCase();grid.innerHTML=Array.from({length:42},(_,i)=>{const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,entry=p.days.find(x=>x.date===iso);return`<button class="calendar-day period-day ${d.getMonth()!==m?'muted':''} ${periodSet.has(iso)?'is-period':''} ${estimateSet.has(iso)?'is-estimate':''} ${iso===dateInput.value?'selected':''}" data-period-date="${iso}"><strong>${d.getDate()}</strong><div class="day-label">${iso===todayISO()?'TODAY':periodSet.has(iso)?'PERIOD':estimateSet.has(iso)?'EST.':''}</div><div class="day-dots">${entry?.pain?`<span class="period-pain-dot" title="Pain ${entry.pain}/10">${entry.pain}</span>`:''}</div></button>`}).join('');qsa('[data-period-date]').forEach(b=>b.onclick=()=>{dateInput.value=b.dataset.periodDate;loadDay(b.dataset.periodDate);renderCalendar()})}
 function loadDay(date){const e=p.days.find(x=>x.date===date);qs('#periodFlow').value=e?.flow||'none';qs('#periodMood').value=e?.mood||'';qs('#periodPain').value=e?.pain||0;qs('#periodPainLabel').textContent=`${e?.pain||0} / 10`;qs('#periodNotes').value=e?.notes||'';selectedSymptoms=new Set(e?.symptoms||[]);qsa('[data-symptom]').forEach(b=>b.classList.toggle('active',selectedSymptoms.has(b.dataset.symptom)))}
 function renderHistory(){const entries=[...p.ranges.map(r=>({...r,kind:'range'})),...p.days.map(d=>({...d,kind:'day'}))].sort((a,b)=>String(b.start||b.date).localeCompare(String(a.start||a.date))).slice(0,30);qs('#periodHistory').innerHTML=entries.length?entries.map(e=>e.kind==='range'?`<article class="log-card period-history-card"><strong>PERIOD · ${e.start} → ${e.end}</strong><span>${daysBetween(e.start,e.end)+1} DAYS</span><button class="btn tiny ghost" data-delete-period-range="${e.id}">DELETE</button></article>`:`<article class="log-card period-history-card"><strong>${e.date} · ${esc((e.flow||'none').toUpperCase())}</strong><span>${e.mood?esc(e.mood)+' · ':''}PAIN ${e.pain||0}/10${e.symptoms?.length?' · '+e.symptoms.map(esc).join(', '):''}</span><div class="log-actions"><button class="btn tiny ghost" data-edit-period-day="${e.id}">EDIT</button><button class="btn tiny ghost" data-delete-period-day="${e.id}">DELETE</button></div></article>`).join(''):'<div class="empty-state">NO CYCLE DATA SAVED YET.</div>';qsa('[data-edit-period-day]').forEach(b=>b.onclick=()=>{const e=p.days.find(x=>x.id===b.dataset.editPeriodDay);if(e){dateInput.value=e.date;loadDay(e.date);scrollTo({top:0,behavior:'smooth'})}});qsa('[data-delete-period-day]').forEach(b=>b.onclick=()=>{if(!confirm('DELETE THIS CYCLE-DAY ENTRY?'))return;p.days=p.days.filter(x=>x.id!==b.dataset.deletePeriodDay);savePeriod(p);refresh()});qsa('[data-delete-period-range]').forEach(b=>b.onclick=()=>{if(!confirm('DELETE THIS SAVED PERIOD RANGE?'))return;p.ranges=p.ranges.filter(x=>x.id!==b.dataset.deletePeriodRange);savePeriod(p);refresh()})}
 function refresh(){p=getPeriod();renderStatus();renderCalendar();renderHistory()}
 qsa('[data-symptom]').forEach(b=>b.onclick=()=>{selectedSymptoms.has(b.dataset.symptom)?selectedSymptoms.delete(b.dataset.symptom):selectedSymptoms.add(b.dataset.symptom);b.classList.toggle('active',selectedSymptoms.has(b.dataset.symptom))});qs('#periodPain').oninput=e=>qs('#periodPainLabel').textContent=`${e.target.value} / 10`;dateInput.onchange=()=>{loadDay(dateInput.value);renderCalendar()};qs('#savePeriodDay').onclick=()=>{const date=dateInput.value;if(!date)return toast('CHOOSE A DATE.');const row={id:p.days.find(x=>x.date===date)?.id||uid(),date,flow:qs('#periodFlow').value,mood:qs('#periodMood').value,pain:+qs('#periodPain').value||0,symptoms:[...selectedSymptoms],notes:qs('#periodNotes').value.trim(),updatedAt:new Date().toISOString()};p.days=p.days.filter(x=>x.date!==date);p.days.push(row);savePeriod(p);refresh();toast('CYCLE DAY SAVED 🌸')};qs('#savePeriodRange').onclick=()=>{const start=qs('#periodStartDate').value,end=qs('#periodEndDate').value||start;if(!start)return toast('CHOOSE A START DATE.');if(end<start)return toast('END DATE MUST BE ON OR AFTER START.');p.settings.cycleLength=clamp(+qs('#averageCycleLength').value||28,20,45);p.settings.periodLength=clamp(+qs('#averagePeriodLength').value||5,1,10);p.ranges.push({id:uid(),start,end,createdAt:new Date().toISOString()});savePeriod(p);refresh();toast('PERIOD RANGE SAVED 🌸')};qs('#periodCalPrev').onclick=()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);renderCalendar()};qs('#periodCalNext').onclick=()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);renderCalendar()};loadDay(dateInput.value);refresh()}

function initGetStarted(){
 const shell=qs('#onboardingApp');if(!shell)return;let step=0,p=getProfile();const newFlow=sessionStorage.getItem(`${PREFIX}:newAccountOnboarding`)==='1'||!p.onboardingComplete;if(p.onboardingComplete&&!newFlow){location.replace('index.html');return}const answers={goal:p.goal||'',heightInches:p.heightInches||65,age:p.age||25,activity:p.activity||''};
 const panels=qsa('[data-onboard-step]',shell),next=qs('#onboardNext'),back=qs('#onboardBack'),skip=qs('#onboardSkip'),progress=qs('#onboardProgress'),label=qs('#onboardStepLabel');
 const labels=['01 · YOUR GOAL','02 · KNOW YOUR BODY','03 · ABOUT YOU','04 · YOUR RHYTHM','05 · READY'];
 function heightText(inches){const ft=Math.floor(inches/12),inch=inches%12;return `${ft}'${inch}\"`}
 function paintHeight(){const input=qs('#onboardHeight'),out=qs('#onboardHeightDisplay'),cm=qs('#onboardHeightCm');if(!input)return;answers.heightInches=+input.value||62;if(out)out.textContent=heightText(answers.heightInches);if(cm)cm.textContent=`${Math.round(answers.heightInches*2.54)} CM`;const pct=(answers.heightInches-48)/(84-48)*100;shell.style.setProperty('--height-progress',`${pct}%`)}
 function paintAge(){const v=answers.age||23;[-2,-1,0,1,2].forEach((off,i)=>{const el=qs(`[data-age-row=\"${i}\"]`);if(el){el.textContent=v+off;el.classList.toggle('selected',off===0)}});qs('#onboardAgeRange')&&(qs('#onboardAgeRange').value=v)}
 function valid(){return step===0?!!answers.goal:step===1?answers.heightInches>=48:step===2?answers.age>=13:step===3?!!answers.activity:true}
 function updateNextState(){if(next){next.textContent=step===panels.length-1?'ENTER BERRY VIBES ✨':'NEXT';next.disabled=!valid()}}
 function render(){panels.forEach((pnl,i)=>{pnl.classList.remove('step-live');pnl.classList.toggle('active',i===step)});if(progress)progress.style.width=`${((step+1)/panels.length)*100}%`;if(label)label.textContent=labels[step];if(back)back.hidden=step===0;updateNextState();shell.dataset.step=step;const active=panels[step];if(active){requestAnimationFrame(()=>requestAnimationFrame(()=>active.classList.add('step-live')))}}
 qsa('[data-goal-choice]',shell).forEach(b=>b.onclick=()=>{answers.goal=b.dataset.goalChoice;qsa('[data-goal-choice]',shell).forEach(x=>x.classList.toggle('selected',x===b));updateNextState()});
 const h=qs('#onboardHeight');if(h){
  h.value=answers.heightInches;
  h.oninput=()=>{paintHeight();updateNextState()};
  const hx=qs('.height-experience');
  if(hx){
   hx.tabIndex=0;
   let wheelDelta=0,wheelRaf=0;
   const nudge=d=>{const nextVal=clamp((+h.value||65)+d,+h.min,+h.max);if(nextVal===+h.value)return;h.value=nextVal;paintHeight();updateNextState()};
   hx.addEventListener('wheel',e=>{e.preventDefault();wheelDelta+=e.deltaY;if(wheelRaf)return;wheelRaf=requestAnimationFrame(()=>{const threshold=34;const steps=Math.trunc(wheelDelta/threshold);if(steps!==0){nudge(-Math.sign(steps)*Math.min(Math.abs(steps),3));wheelDelta-=steps*threshold}else{wheelDelta*=.55}wheelRaf=0})},{passive:false});
   hx.addEventListener('keydown',e=>{if(['ArrowUp','ArrowRight'].includes(e.key)){e.preventDefault();nudge(1)}if(['ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();nudge(-1)}});
   let dragY=null,dragValue=0,lastDragValue=null,dragRaf=0,pendingY=0;
   hx.addEventListener('pointerdown',e=>{dragY=e.clientY;pendingY=e.clientY;dragValue=+h.value||65;lastDragValue=dragValue;hx.setPointerCapture?.(e.pointerId)});
   hx.addEventListener('pointermove',e=>{if(dragY==null)return;pendingY=e.clientY;if(dragRaf)return;dragRaf=requestAnimationFrame(()=>{const delta=Math.round((dragY-pendingY)/12);const nextVal=clamp(dragValue+delta,+h.min,+h.max);if(nextVal!==lastDragValue){lastDragValue=nextVal;h.value=nextVal;paintHeight();updateNextState()}dragRaf=0})});
   const stop=()=>{dragY=null;lastDragValue=null;if(dragRaf){cancelAnimationFrame(dragRaf);dragRaf=0}};hx.addEventListener('pointerup',stop);hx.addEventListener('pointercancel',stop)
  }
  paintHeight()
 }
 const age=qs('#onboardAgeRange');if(age){
  age.value=answers.age;
  age.oninput=()=>{answers.age=+age.value;paintAge();updateNextState()};
  const aw=qs('.age-wheel-shell');
  if(aw){
   let ageDelta=0,ageRaf=0;
   const setAge=v=>{const nextAge=clamp(v,+age.min,+age.max);if(nextAge===answers.age)return;answers.age=nextAge;age.value=nextAge;paintAge();updateNextState()};
   aw.addEventListener('wheel',e=>{e.preventDefault();ageDelta+=e.deltaY;if(ageRaf)return;ageRaf=requestAnimationFrame(()=>{const threshold=40;const steps=Math.trunc(ageDelta/threshold);if(steps!==0){setAge((+age.value||25)+Math.sign(steps)*Math.min(Math.abs(steps),3));ageDelta-=steps*threshold}else{ageDelta*=.55}ageRaf=0})},{passive:false});
   let ageDragY=null,ageDragValue=0,agePendingY=0,ageDragRaf=0,lastAge=null;
   aw.addEventListener('pointerdown',e=>{if(e.target===age)return;ageDragY=e.clientY;agePendingY=e.clientY;ageDragValue=+age.value||25;lastAge=ageDragValue;aw.setPointerCapture?.(e.pointerId)});
   aw.addEventListener('pointermove',e=>{if(ageDragY==null)return;agePendingY=e.clientY;if(ageDragRaf)return;ageDragRaf=requestAnimationFrame(()=>{const delta=Math.round((ageDragY-agePendingY)/28);const nextAge=clamp(ageDragValue+delta,+age.min,+age.max);if(nextAge!==lastAge){lastAge=nextAge;setAge(nextAge)}ageDragRaf=0})});
   const stopAge=()=>{ageDragY=null;lastAge=null;if(ageDragRaf){cancelAnimationFrame(ageDragRaf);ageDragRaf=0}};aw.addEventListener('pointerup',stopAge);aw.addEventListener('pointercancel',stopAge)
  }
  paintAge()
 }
 qsa('[data-activity-choice]',shell).forEach(b=>b.onclick=()=>{answers.activity=b.dataset.activityChoice;qsa('[data-activity-choice]',shell).forEach(x=>x.classList.toggle('selected',x===b));updateNextState()});
 function finish(){p={...p,goal:answers.goal,height:heightToDisplay(answers.heightInches),heightInches:answers.heightInches,age:answers.age,activity:answers.activity,onboardingComplete:true};saveProfile(p);sessionStorage.removeItem(`${PREFIX}:newAccountOnboarding`);if(token()&&!token().startsWith('local:')&&backendConfigured())api('/api/profile',{method:'PUT',body:JSON.stringify(p)}).catch(()=>{});markLoginIntro();document.body.classList.add('onboarding-finish');setTimeout(()=>location.href='index.html',720)}
 next.onclick=()=>{if(!valid())return;if(step>=panels.length-1)return finish();step++;render()};back.onclick=()=>{if(step>0){step--;render()}};if(skip)skip.onclick=()=>{if(confirm('SKIP THE REST OF GET STARTED? YOU CAN CHANGE THESE DETAILS LATER IN SETTINGS.'))finish()};
 render()
}

function initSettings(){
 if(!qs('#saveSettingsBtn'))return;
 let s=getSettings();
 const fill=()=>{qs('#settingMotion').checked=!!s.motion;qs('#settingGallerySpeed').value=s.gallerySpeed;qs('#settingDailyRecipes').checked=!!s.dailyRecipes;qs('#settingStartPage').value=s.startPage||'index.html'};
 fill();
 qsa('#settingsThemeDeck [data-theme-choice]').forEach(b=>b.onclick=()=>{localStorage.setItem(K.theme,b.dataset.themeChoice);applyTheme();toast('THEME CHANGED ✨')});
 qs('#saveSettingsBtn').onclick=()=>{s={...s,motion:qs('#settingMotion').checked,gallerySpeed:qs('#settingGallerySpeed').value,dailyRecipes:qs('#settingDailyRecipes').checked,startPage:qs('#settingStartPage').value};saveSettings(s);toast('SETTINGS SAVED ✨')};
 qs('#exportDataBtn').onclick=()=>{const keys=[K.state,K.profile,K.theme,K.settings,K.grocery,K.period,K.accounts];const data={version:6,exportedAt:new Date().toISOString(),storage:{}};keys.forEach(k=>data.storage[k]=localStorage.getItem(k));const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`berry-vibes-backup-${todayISO()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 qs('#importDataInput').onchange=async()=>{const f=qs('#importDataInput').files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.storage)throw new Error('INVALID BACKUP FILE.');Object.entries(data.storage).forEach(([k,v])=>{if(v===null||v===undefined)localStorage.removeItem(k);else localStorage.setItem(k,v)});toast('BACKUP IMPORTED · RELOADING ✨');setTimeout(()=>location.reload(),700)}catch(e){toast(e.message||'IMPORT FAILED.')}};
 qsa('[data-reset-scope]').forEach(b=>b.onclick=()=>{const scope=b.dataset.resetScope;if(!confirm(`CLEAR ${scope.toUpperCase()} DATA?`))return;if(scope==='logs'){const st=getState();st.logs=[];st.water={};st.plans=[];st.activeFast=null;saveState(st);sessionStorage.removeItem(`${PREFIX}:pendingFast`)}if(scope==='grocery')localStorage.removeItem(K.grocery);if(scope==='period')localStorage.removeItem(K.period);toast(`${scope.toUpperCase()} DATA CLEARED.`)});
 const clearCache=qs('#clearCacheBtn');if(clearCache)clearCache.onclick=async()=>{if(!confirm('CLEAR TEMPORARY BERRY VIBES CACHE? YOUR SAVED DATA AND ACCOUNT WILL STAY.'))return;try{if('caches'in window){const names=await caches.keys();await Promise.all(names.map(n=>caches.delete(n)))}}catch{}const preserveNew=sessionStorage.getItem(`${PREFIX}:newAccountOnboarding`);sessionStorage.clear();if(preserveNew)sessionStorage.setItem(`${PREFIX}:newAccountOnboarding`,preserveNew);toast('CACHE CLEARED ✨');setTimeout(()=>location.reload(),600)};
 const clearData=qs('#clearAllDataBtn');if(clearData)clearData.onclick=async()=>{if(!confirm('CLEAR ALL OF YOUR BERRY VIBES DATA? THIS REMOVES LOGS, CUSTOM RECIPES, GROCERY, PERIOD DATA, PROFILE SETTINGS, AND SAVED RECIPES. YOUR LOGIN ACCOUNT WILL STAY.'))return;if(!confirm('FINAL CHECK: CLEAR ALL SAVED CCD DATA AND START GET STARTED AGAIN?'))return;const localAcct=currentLocalAccount();if(token()&&!token().startsWith('local:')&&backendConfigured()){try{await api('/api/account/data',{method:'DELETE',body:'{}'})}catch(e){return toast(e.message||'COULD NOT CLEAR SERVER DATA.')}}if(localAcct)resetLocalAccountData(localAcct);else{clearUserDataStorage();saveProfile(freshProfile('BERRY FRIEND'))}sessionStorage.setItem(`${PREFIX}:newAccountOnboarding`,'1');toast('ALL CCD DATA CLEARED · STARTING FRESH ✨');setTimeout(()=>location.href='get-started.html',700)};
 const del=qs('#deleteAccountBtn');if(del)del.onclick=async()=>{if(!confirm('DELETE YOUR BERRY VIBES ACCOUNT? THIS PERMANENTLY DELETES THE ACCOUNT AND SAVED DATA.'))return;const phrase=prompt('TYPE DELETE TO CONFIRM ACCOUNT DELETION:');if(String(phrase||'').trim().toUpperCase()!=='DELETE')return toast('ACCOUNT DELETION CANCELLED.');const localAcct=currentLocalAccount();if(token()&&!token().startsWith('local:')&&backendConfigured()){try{await api('/api/account',{method:'DELETE',body:'{}'})}catch(e){return toast(e.message||'COULD NOT DELETE ACCOUNT.')}}if(localAcct){const accounts=getLocalAccounts().filter(x=>x.id!==localAcct.id);saveLocalAccounts(accounts)}clearUserDataStorage();localStorage.removeItem(K.token);localStorage.removeItem(K.reset);sessionStorage.clear();toast('ACCOUNT DELETED.');setTimeout(()=>location.href='signup.html',800)}
}
function safeInit(name,fn){try{fn()}catch(err){console.error(`[CCD] ${name} failed`,err)}}


/* V7.5.1 RECOVERY: restored site modules accidentally dropped by a prior merge. */
function initProfile(){if(!qs('#profileName'))return;let p=getProfile();const img=qs('#profilePhotoPreview');function fill(){qs('#profileName').value=p.name||'';qs('#profileHeight').value=heightToDisplay(p.height||p.heightInches||"5'2");qs('#profileWeight').value=p.weight||'';if(qs('#profileAge'))qs('#profileAge').value=p.age||23;if(qs('#profileActivity'))qs('#profileActivity').value=p.activity||'';if(qs('#profileGoal'))qs('#profileGoal').value=p.goal||'';qs('#profileReason').value=p.reason||'';img.src=p.photo||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" rx="70" fill="#ffe6ef"/><text x="50%" y="56%" text-anchor="middle" font-size="120">🍓</text></svg>`)}fill();qs('#profilePhotoInput').onchange=async()=>{const f=qs('#profilePhotoInput').files[0];if(f){p.photo=await uploadFile(f,'profile');img.src=p.photo}};qs('#saveProfileBtn').onclick=async()=>{const heightText=(qs('#profileHeight').value||p.height||"5'5").trim(),weightText=(qs('#profileWeight').value||'').trim(),ageText=(qs('#profileAge')?.value||'').trim();p={...p,name:qs('#profileName').value.trim()||p.name||'BERRY FRIEND',height:heightToDisplay(heightText),heightInches:heightToInches(heightText),weight:weightText===''?'':(+weightText||''),age:ageText===''?(p.age||25):(+ageText||25),activity:qs('#profileActivity')?.value||p.activity||'',goal:qs('#profileGoal')?.value||p.goal||'',reason:qs('#profileReason').value.trim(),onboardingComplete:p.onboardingComplete||false};saveProfile(p);if(token())try{await api('/api/profile',{method:'PUT',body:JSON.stringify(p)})}catch{}toast('PROFILE SAVED ✨')};qsa('[data-theme-choice]').forEach(b=>b.onclick=()=>{localStorage.setItem(K.theme,b.dataset.themeChoice);applyTheme();toast('THEME CHANGED ✨')});qs('#accountStatus').innerHTML=hasSession()?`<strong>SIGNED IN</strong><div class="card-meta">${token().startsWith('local:')?'GITHUB PAGES BROWSER ACCOUNT · PRIVATE MENU UNLOCKED.':'SERVER ACCOUNT · PRIVATE MENU UNLOCKED.'}</div>`:'<strong>NOT SIGNED IN</strong>';qs('#signOutBtn').onclick=async()=>{stashCurrentLocalAccountData();if(token())try{await api('/api/auth/logout',{method:'POST',body:'{}'})}catch{}localStorage.removeItem(K.token);authNav();toast('SIGNED OUT');setTimeout(()=>location.href='login.html',500)};initMovingGallery()}

function initHeroGallery(){
 const wrap=qs('#homepageCinematic'),slidesRoot=qs('#heroGallerySlides');if(!wrap||!slidesRoot)return;
 const pool=allFoods();const picks=[pool[0],pool[18],pool[42],pool[86],pool[130]].filter(Boolean);if(!picks.length)return;
 let active=0,timer=null,dragX=null;
 slidesRoot.innerHTML=picks.map((x,i)=>`<article class="hero-gallery-slide ${i===0?'is-active':''}" data-hero-index="${i}"><img src="${photoFor(x)}" alt="${esc(x.name)}"><div class="hero-slide-label">${esc(x.group||'CCD RECIPE')}</div></article>`).join('');
 const dots=qs('#heroGalleryDots');if(dots)dots.innerHTML=picks.map((_,i)=>`<button aria-label="Go to image ${i+1}" data-hero-dot="${i}" class="${i===0?'active':''}"></button>`).join('');
 const show=i=>{active=(i+picks.length)%picks.length;qsa('.hero-gallery-slide',slidesRoot).forEach((s,n)=>s.classList.toggle('is-active',n===active));qsa('[data-hero-dot]').forEach((d,n)=>d.classList.toggle('active',n===active));const x=picks[active];qs('#heroGalleryNumber').textContent=String(active+1).padStart(2,'0');qs('#heroGalleryTotal').textContent=String(picks.length).padStart(2,'0');qs('#heroGalleryTitle').textContent=(x.name||'YOUR DAY, BUT VISUAL.').toUpperCase();qs('#heroGalleryMeta').textContent=`${String(x.group||'CCD FAVORITE').toUpperCase()} · ${estimatedNutrition(x).calories} KCAL · TAP INTO YOUR DAY`};
 const autoplay=()=>{clearInterval(timer);if(getSettings().motion)timer=setInterval(()=>show(active+1),5200)};
 qs('#heroGalleryPrev')?.addEventListener('click',()=>{show(active-1);autoplay()});qs('#heroGalleryNext')?.addEventListener('click',()=>{show(active+1);autoplay()});qsa('[data-hero-dot]').forEach(b=>b.onclick=()=>{show(+b.dataset.heroDot);autoplay()});
 wrap.addEventListener('pointermove',e=>{if(!getSettings().motion)return;const r=wrap.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;const img=qs('.hero-gallery-slide.is-active img',slidesRoot);if(img)img.style.transform=`scale(1.075) translate(${x*-10}px,${y*-7}px)`});wrap.addEventListener('pointerleave',()=>{qsa('.hero-gallery-slide img',slidesRoot).forEach(i=>i.style.transform='');dragX=null});wrap.addEventListener('pointerdown',e=>dragX=e.clientX);wrap.addEventListener('pointerup',e=>{if(dragX==null)return;const dx=e.clientX-dragX;if(Math.abs(dx)>55){show(active+(dx<0?1:-1));autoplay()}dragX=null});
 show(0);autoplay();
}

function initMovingGallery(){const tracks=[qs('#movingGalleryTrack'),qs('#movingGalleryTrackHome')].filter(Boolean);if(!tracks.length)return;const base=allFoods().slice(0,10).map(x=>({name:x.name,image:photoFor(x)})).filter(x=>x.image);if(!base.length)return;const items=[...base,...base];const html=items.map((x,i)=>`<article class="gallery-tile" ${i<base.length?'':'aria-hidden="true"'}><img src="${x.image}" alt="${esc(x.name)}"><div class="gallery-tile-copy"><strong>${esc(x.name)}</strong></div></article>`).join('');tracks.forEach(t=>t.innerHTML=html)}

function groceryCategoryFor(name=''){const s=String(name).toLowerCase();if(/flour|cornstarch|baking|cocoa|chocolate|maple|flax|chia/.test(s))return'BAKING';if(/milk|cream|cheese|yogurt/.test(s))return'DAIRY';if(/egg|steak|chicken/.test(s))return'PROTEIN';if(/rice|pasta|bread|bagel|oat/.test(s))return'GRAINS';if(/avocado|pumpkin|orange/.test(s))return'PRODUCE';if(/juice|coffee|tea|water/.test(s))return'DRINKS';return'PANTRY'}

function groceryPriceFor(item){if(item.price!=null)return +item.price;const c=groceryCategoryFor(item.name);const base={BAKING:3.49,DAIRY:4.29,PROTEIN:6.99,GRAINS:3.79,PRODUCE:2.99,DRINKS:3.49,PANTRY:3.99}[c]||3.99;let h=0;for(const ch of String(item.id||item.name))h=(h+ch.charCodeAt(0))%5;return round(base+h*.35,2)}

function groceryImageFor(item){const s=String(item.name||'').toLowerCase();if(item.photo)return item.photo;if(/egg|chicken|steak/.test(s))return PHOTO_BANK.chicken;if(/bread|bagel/.test(s))return PHOTO_BANK.sandwich;if(/rice/.test(s))return PHOTO_BANK.rice;if(/pasta/.test(s))return PHOTO_BANK.pasta;if(/milk|coffee|juice/.test(s))return PHOTO_BANK.coffee;if(/cocoa|chocolate/.test(s))return PHOTO_BANK.chocolate;if(/flour|oat/.test(s))return PHOTO_BANK.pancake;return PHOTO_BANK.default}

function getGrocery(){try{const g=JSON.parse(localStorage.getItem(K.grocery)||'{}')||{};return{custom:Array.isArray(g.custom)?g.custom:[],cart:g.cart&&typeof g.cart==='object'?g.cart:{},wishlist:Array.isArray(g.wishlist)?g.wishlist:[],saved:Array.isArray(g.saved)?g.saved:[],purchases:Array.isArray(g.purchases)?g.purchases:[]}}catch{return{custom:[],cart:{},wishlist:[],saved:[],purchases:[]}}}

function saveGrocery(g){localStorage.setItem(K.grocery,JSON.stringify(g))}

function groceryCatalog(){const base=(D.PANTRY||[]).map(x=>({...x,category:groceryCategoryFor(x.name),price:groceryPriceFor(x),description:`CCD pantry ingredient · ${x.unit||'serving'} nutrition is available for recipe building.`,photo:groceryImageFor(x),source:'CCD PANTRY'}));return[...base,...getGrocery().custom]}

function initGrocery(){const grid=qs('#groceryGrid');if(!grid)return;bindDialogClosers();let view='store',detailId='';const search=qs('#grocerySearch'),cat=qs('#groceryCategory');
 function getItem(id){return groceryCatalog().find(x=>x.id===id)}
 function render(){const g=getGrocery(),all=groceryCatalog();let ids=null;if(view==='wishlist')ids=new Set(g.wishlist);if(view==='saved')ids=new Set(g.saved);if(view==='cart')ids=new Set(Object.keys(g.cart));const q=(search.value||'').trim().toLowerCase(),c=cat.value;let items=all.filter(x=>(!ids||ids.has(x.id))&&(!q||`${x.name} ${x.category} ${x.description||''}`.toLowerCase().includes(q))&&(c==='all'||x.category===c));if(view==='store'){const loved=new Set([...g.wishlist,...Object.keys(g.cart)]);items.sort((a,b)=>Number(loved.has(b.id))-Number(loved.has(a.id)))}
 qs('#groceryViewTitle').textContent=view==='store'?'INGREDIENT MARKET':view.toUpperCase();grid.innerHTML=items.length?items.map(x=>{const cart=g.cart[x.id],wish=g.wishlist.includes(x.id),saved=g.saved.includes(x.id);return`<article class="grocery-card"><img src="${groceryImageFor(x)}" alt="${esc(x.name)}"><div class="card-body"><div class="grocery-card-top"><span class="pill">${esc(x.category)}</span><strong>$${groceryPriceFor(x).toFixed(2)}</strong></div><h3>${esc(x.name)}</h3><div class="card-meta">${esc(x.unit||'ITEM')} · ${x.calories||0} KCAL / UNIT</div><div class="grocery-card-actions"><button class="btn tiny primary" data-grocery-cart="${x.id}">${cart?`CART ×${cart.qty}`:'ADD CART'}</button><button class="icon-btn ${wish?'on':''}" data-grocery-wish="${x.id}" title="Wishlist">♥</button><button class="icon-btn ${saved?'on':''}" data-grocery-save="${x.id}" title="Save">🔖</button><button class="btn tiny ghost" data-grocery-view-item="${x.id}">VIEW</button></div></div></article>`}).join(''):'<div class="empty-state">NO INGREDIENTS IN THIS VIEW YET.</div>';
 qs('#groceryWishCount').textContent=g.wishlist.length;qs('#grocerySavedCount').textContent=g.saved.length;qs('#groceryCartCount').textContent=Object.values(g.cart).reduce((a,b)=>a+(+b.qty||0),0);renderCartSummary();renderHistory();renderRecommendations();bindCards()}
 function bindCards(){qsa('[data-grocery-cart]').forEach(b=>b.onclick=()=>{const g=getGrocery(),id=b.dataset.groceryCart;g.cart[id]=g.cart[id]||{qty:0,quality:'STANDARD'};g.cart[id].qty+=1;saveGrocery(g);render();toast('ADDED TO GROCERY CART 🛒')});qsa('[data-grocery-wish]').forEach(b=>b.onclick=()=>toggleList('wishlist',b.dataset.groceryWish));qsa('[data-grocery-save]').forEach(b=>b.onclick=()=>toggleList('saved',b.dataset.grocerySave));qsa('[data-grocery-view-item]').forEach(b=>b.onclick=()=>openDetail(b.dataset.groceryViewItem))}
 function toggleList(key,id){const g=getGrocery(),a=g[key],i=a.indexOf(id);i>=0?a.splice(i,1):a.unshift(id);saveGrocery(g);render()}
 function renderCartSummary(){const g=getGrocery(),rows=Object.entries(g.cart).map(([id,row])=>[getItem(id),row]).filter(x=>x[0]);const total=rows.reduce((sum,[x,r])=>sum+groceryPriceFor(x)*(+r.qty||0)*(r.quality==='ORGANIC'?1.35:r.quality==='PREMIUM'?1.2:1),0);qs('#groceryCartSummary').innerHTML=rows.length?rows.map(([x,r])=>`<div class="cart-line"><span>${esc(x.name)} × ${r.qty}<small>${esc(r.quality||'STANDARD')}</small></span><strong>$${(groceryPriceFor(x)*r.qty*(r.quality==='ORGANIC'?1.35:r.quality==='PREMIUM'?1.2:1)).toFixed(2)}</strong><button data-cart-minus="${x.id}" class="icon-btn">−</button><button data-cart-plus="${x.id}" class="icon-btn">+</button></div>`).join('')+`<div class="cart-total"><span>PLANNED TOTAL</span><strong>$${total.toFixed(2)}</strong></div>`:'<div class="empty-state">YOUR CART IS EMPTY.</div>';qsa('[data-cart-plus]').forEach(b=>b.onclick=()=>changeCart(b.dataset.cartPlus,1));qsa('[data-cart-minus]').forEach(b=>b.onclick=()=>changeCart(b.dataset.cartMinus,-1))}
 function changeCart(id,d){const g=getGrocery();if(!g.cart[id])return;g.cart[id].qty=Math.max(0,g.cart[id].qty+d);if(!g.cart[id].qty)delete g.cart[id];saveGrocery(g);render()}
 function openDetail(id){detailId=id;const x=getItem(id);if(!x)return;const g=getGrocery(),row=g.cart[id]||{qty:1,quality:'STANDARD'};qs('#groceryDetailContent').innerHTML=`<div class="dialog-hero"><img src="${groceryImageFor(x)}" alt="${esc(x.name)}"><div><div class="section-kicker">${esc(x.category)}</div><h2>${esc(x.name)}</h2><p>${esc(x.description||'CCD ingredient')}</p><div class="mini-macros">${miniMacros({calories:+x.calories||0,carbs:+x.carbs||0,protein:+x.protein||0,fat:+x.fat||0,fiber:+x.fiber||0})}</div></div></div><div class="form-grid gap-top"><label>QUANTITY<input id="detailGroceryQty" class="input" type="number" min="1" max="99" value="${row.qty||1}"></label><label>QUALITY<select id="detailGroceryQuality" class="input"><option ${row.quality==='STANDARD'?'selected':''}>STANDARD</option><option ${row.quality==='PREMIUM'?'selected':''}>PREMIUM</option><option ${row.quality==='ORGANIC'?'selected':''}>ORGANIC</option></select></label></div><div class="segmented gap-top"><button id="detailAddCart" class="btn primary">ADD / UPDATE CART</button><button id="detailBuyNow" class="btn secondary">BUY NOW</button><button id="detailWish" class="btn ghost">♥ WISHLIST</button><button id="detailSave" class="btn ghost">🔖 SAVE</button></div><p class="tiny-note">BUY NOW CREATES A LOCAL PURCHASE RECORD. NO PAYMENT OR RETAILER ORDER IS PLACED.</p>`;qs('#detailAddCart').onclick=()=>{const gg=getGrocery();gg.cart[id]={qty:Math.max(1,+qs('#detailGroceryQty').value||1),quality:qs('#detailGroceryQuality').value};saveGrocery(gg);closeDialogById('groceryDetailDialog');render();toast('CART UPDATED 🛒')};qs('#detailBuyNow').onclick=()=>{purchase([{item:x,qty:Math.max(1,+qs('#detailGroceryQty').value||1),quality:qs('#detailGroceryQuality').value}]);closeDialogById('groceryDetailDialog')};qs('#detailWish').onclick=()=>toggleList('wishlist',id);qs('#detailSave').onclick=()=>toggleList('saved',id);qs('#groceryDetailDialog').showModal()}
 function purchase(rows){const g=getGrocery(),items=rows.map(r=>({id:r.item.id,name:r.item.name,qty:r.qty,quality:r.quality,unitPrice:groceryPriceFor(r.item),lineTotal:round(groceryPriceFor(r.item)*r.qty*(r.quality==='ORGANIC'?1.35:r.quality==='PREMIUM'?1.2:1),2)})),total=round(items.reduce((a,b)=>a+b.lineTotal,0),2);g.purchases.unshift({id:uid(),date:new Date().toISOString(),items,total});saveGrocery(g);render();toast(`PURCHASE SAVED · $${total.toFixed(2)} ✨`)}
 function renderHistory(){const h=getGrocery().purchases.slice(0,8);qs('#groceryPurchaseHistory').innerHTML=h.length?h.map(r=>`<article class="log-card"><strong>${new Date(r.date).toLocaleDateString()} · $${r.total.toFixed(2)}</strong><span>${r.items.map(x=>`${esc(x.name)} ×${x.qty}`).join(' · ')}</span></article>`).join(''):'<div class="empty-state">NO PURCHASES SAVED YET.</div>'}
 function renderRecommendations(){const target=qs('#groceryRecipeRecommendations');if(!target)return;if(!getSettings().dailyRecipes){target.innerHTML='<div class="empty-state">DAILY RECOMMENDATIONS ARE OFF IN SETTINGS.</div>';return}const recipes=D.CCD_RECIPES||[],seed=dailySeed(),picks=[0,11,37].map((off,i)=>recipes[(seed+off+i*7)%recipes.length]).filter(Boolean);target.innerHTML=picks.map(r=>`<article class="recommendation-card"><img src="${photoFor(r)}" alt="${esc(r.name)}"><div><strong>${esc(r.name)}</strong><span>${estimatedNutrition(r).calories} KCAL · DAILY PICK</span><a href="recipes.html" class="text-link">OPEN RECIPE →</a></div></article>`).join('');const rec=qs('#groceryItemRecommendations');if(rec){const g=getGrocery(),all=groceryCatalog(),interest=[...g.wishlist,...Object.keys(g.cart),...g.saved],cats=new Set(interest.map(id=>all.find(x=>x.id===id)?.category).filter(Boolean));let items=all.filter(x=>!interest.includes(x.id)&&(cats.size?cats.has(x.category):true));items=items.slice((dailySeed()%Math.max(1,items.length))%Math.max(1,items.length),999).concat(items).slice(0,3);rec.innerHTML=items.length?items.map(x=>`<article class="recommendation-card"><img src="${groceryImageFor(x)}" alt="${esc(x.name)}"><div><strong>${esc(x.name)}</strong><span>${esc(x.category)} · $${groceryPriceFor(x).toFixed(2)}</span><button class="text-link grocery-rec-add" data-rec-add="${x.id}">ADD TO CART →</button></div></article>`).join(''):'<div class="card-meta">ADD OR SAVE ITEMS TO PERSONALIZE RECOMMENDATIONS.</div>';qsa('[data-rec-add]').forEach(b=>b.onclick=()=>{const gg=getGrocery(),id=b.dataset.recAdd;gg.cart[id]=gg.cart[id]||{qty:0,quality:'STANDARD'};gg.cart[id].qty+=1;saveGrocery(gg);render();toast('RECOMMENDATION ADDED 🛒')})}}
 qsa('[data-grocery-view]').forEach(b=>b.onclick=()=>{view=b.dataset.groceryView;qsa('[data-grocery-view]').forEach(x=>{x.classList.toggle('primary',x===b);x.classList.toggle('ghost',x!==b)});render()});search.oninput=render;cat.onchange=render;qs('#openIngredientForm').onclick=()=>qs('#ingredientDialog').showModal();qs('#saveIngredientBtn').onclick=async()=>{const name=qs('#ingredientName').value.trim();if(!name)return toast('ADD AN INGREDIENT NAME.');const photo=await uploadFile(qs('#ingredientPhoto').files[0],'grocery');const item={id:`custom-${uid()}`,name:name.toUpperCase(),category:qs('#ingredientCategory').value,unit:qs('#ingredientUnit').value.trim()||'ITEM',price:+qs('#ingredientPrice').value||0,calories:+qs('#ingredientCalories').value||0,protein:+qs('#ingredientProtein').value||0,carbs:+qs('#ingredientCarbs').value||0,fat:+qs('#ingredientFat').value||0,fiber:+qs('#ingredientFiber').value||0,description:qs('#ingredientDescription').value.trim()||'CUSTOM CCD INGREDIENT',photo,source:'CUSTOM'};const g=getGrocery();g.custom.unshift(item);saveGrocery(g);closeDialogById('ingredientDialog');['ingredientName','ingredientUnit','ingredientPrice','ingredientCalories','ingredientProtein','ingredientCarbs','ingredientFat','ingredientFiber','ingredientDescription'].forEach(id=>qs('#'+id).value='');qs('#ingredientPhoto').value='';render();toast('INGREDIENT ADDED ✨')};qs('#groceryCheckoutBtn').onclick=()=>{const g=getGrocery(),rows=Object.entries(g.cart).map(([id,r])=>({item:getItem(id),...r})).filter(r=>r.item);if(!rows.length)return toast('YOUR CART IS EMPTY.');purchase(rows);const gg=getGrocery();gg.cart={};saveGrocery(gg);render()};render()}

function boot(){applyTheme();applySettings();if(!ensureAccess())return;if(isAuthPage()){safeInit('auth',()=>initAuth());return}authNav();activateNav();initHamburgerMenu();bindDialogClosers();safeInit('onboarding',initGetStarted);safeInit('loginIntro',initLoginMotionIntro);safeInit('calendar',initCalendar);safeInit('wheels',initWheels);safeInit('tilt',bindTilt);safeInit('today',initToday);safeInit('heroGallery',initHeroGallery);safeInit('gallery',initMovingGallery);safeInit('foods',initFoods);safeInit('recipes',initRecipes);safeInit('movement',initMovement);safeInit('fasting',initFasting);safeInit('restaurants',initRestaurants);safeInit('grocery',initGrocery);safeInit('battle',initBattle);safeInit('facts',initFacts);safeInit('period',initPeriod);safeInit('profile',initProfile);safeInit('settings',initSettings);safeInit('kineticText',initKineticText)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
