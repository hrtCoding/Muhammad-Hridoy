import {normalizeCategory} from './categories.js?v=category-bar-6';
import {config} from './config.js?v=category-bar-6';
export const root = new URL('../', import.meta.url);
export const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.supabaseUrl) && !!config.supabaseKey;
const base = config.supabaseUrl.replace(/\/$/, '');
const sessionKey = 'heart-coding-session:' + base;
let session = null;
try { session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch {}
let refreshPromise = null;
function remember(value) {
  session = value;
  if (value) sessionStorage.setItem(sessionKey, JSON.stringify(value));
  else sessionStorage.removeItem(sessionKey);
}
async function request(path, {method='GET',body,token,headers={}} = {}) {
  if (!configured) throw new Error('Connect your Supabase project first. Open Setup for instructions.');
  const h = {apikey:config.supabaseKey,...headers};
  if (token) h.Authorization = 'Bearer ' + token;
  if (body !== undefined && !(body instanceof Blob)) {h['Content-Type']='application/json';body=JSON.stringify(body);}
  const response = await fetch(base+path,{method,body,headers:h,signal:AbortSignal.timeout(25000)});
  const raw = await response.text();
  let data; try {data=raw?JSON.parse(raw):null;} catch {data=null;}
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || `Request failed (${response.status}). Please try again.`);
  return data;
}
async function token() {
  if (!session) throw new Error('Please sign in again. Your form has been kept open.');
  if (session.expires_at*1000 > Date.now()+60000) return session.access_token;
  if (!refreshPromise) refreshPromise = request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}})
    .then(s=>{remember({...s,expires_at:s.expires_at || Math.floor(Date.now()/1000)+s.expires_in});return s.access_token;})
    .catch(e=>{remember(null);throw e;}).finally(()=>{refreshPromise=null;});
  return refreshPromise;
}
export async function signIn(email,password) {
  const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
  remember({...s,expires_at:s.expires_at || Math.floor(Date.now()/1000)+s.expires_in});
  try {return await getAdmin();} catch(e) {await signOut();throw e;}
}
export async function getAdmin() {
  if (!session) return null;
  const t=await token();
  const user=await request('/auth/v1/user',{token:t});
  const admins=await request('/rest/v1/hc_admins?select=user_id&user_id=eq.'+encodeURIComponent(user.id),{token:t});
  if (!admins?.length) throw new Error('This account is not an admin. Add its User UID using the setup SQL.');
  return user;
}
export async function signOut() {
  const old=session?.access_token;remember(null);
  if (old) try {await request('/auth/v1/logout',{method:'POST',token:old});} catch {}
}
export async function listEntries(admin=false) {
  return await request('/rest/v1/hc_entries?select=*&order=sort_order.asc,created_at.desc'+(admin?'':'&status=eq.published'),{token:admin?await token():undefined});
}
export async function saveEntry(entry,id) {
  const rows=await request('/rest/v1/hc_entries'+(id?'?id=eq.'+encodeURIComponent(id):'?on_conflict=id'),{method:id?'PATCH':'POST',body:entry,token:await token(),headers:{Prefer:id?'return=representation':'return=representation,resolution=merge-duplicates'}});
  if (!rows?.length) throw new Error('Nothing was saved. Check your admin access and refresh the page.');
  return rows[0];
}
export async function deleteEntry(id) {
  const rows=await request('/rest/v1/hc_entries?id=eq.'+encodeURIComponent(id),{method:'DELETE',token:await token(),headers:{Prefer:'return=representation'}});
  if (!rows?.length) throw new Error('This item could not be deleted. Refresh and try again.');
}
export async function uploadImage(blob) {
  const path=crypto.randomUUID()+'.webp';
  await request('/storage/v1/object/hc-projects/'+path,{method:'POST',body:blob,token:await token(),headers:{'Content-Type':'image/webp','x-upsert':'false'}});
  return {image_path:path,image_url:base+'/storage/v1/object/public/hc-projects/'+path};
}
export async function removeImage(path) {
  if (path) await request('/storage/v1/object/hc-projects',{method:'DELETE',body:{prefixes:[path]},token:await token()});
}
export function safeLink(value) {
  if (!value) return '';
  try {const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:'';} catch {return '';}
}
export function imageUrl(value) {
  if (!value) return '';
  if (/^src\/img\/[a-zA-Z0-9_.-]+$/.test(value)) return new URL(value,root).href;
  return safeLink(value);
}
export function escapeHTML(value='') {
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function normalizeEntry(values) {
  const title=String(values.title||'').trim(),description=String(values.description||'').trim();
  if (!title || title.length>100) throw new Error('Enter a title between 1 and 100 characters.');
  if (!description || description.length>350) throw new Error('Enter a description between 1 and 350 characters.');
  const tags=[...new Set(String(values.tags||'').split(',').map(t=>t.trim()).filter(Boolean))];
  if (tags.length>12 || tags.some(t=>t.length>32)) throw new Error('Use up to 12 skills, each 32 characters or less.');
  const sort_order=Number(values.sort_order);
  if (!Number.isInteger(sort_order) || sort_order<0 || sort_order>9999) throw new Error('Display order must be a whole number from 0 to 9999.');
  for (const key of ['demo_url','source_url']) if (values[key] && !safeLink(values[key])) throw new Error('Links must start with https:// or http://.');
  const category=normalizeCategory(values.category||'Other');
  return {title,description,tags,category,sort_order,status:values.status==='published'?'published':'draft',kind:values.kind==='service'?'service':'project',demo_url:safeLink(values.demo_url),source_url:safeLink(values.source_url)};
}

export async function listCategories(){return request('/rest/v1/hc_categories?select=name&order=name.asc');}
export async function saveCategory(name,oldName){
 const value=normalizeCategory(name);
 if(oldName==='Other')throw new Error('Other is the fallback category and cannot be renamed.');
 const rows=await request('/rest/v1/hc_categories'+(oldName?'?name=eq.'+encodeURIComponent(oldName):''),{method:oldName?'PATCH':'POST',body:{name:value},token:await token(),headers:{Prefer:'return=representation'}});
 if(!rows?.length)throw new Error('Category was not saved. Refresh and try again.');
 return rows[0];
}
export async function deleteCategory(name){
 if(name==='Other')throw new Error('Other is the fallback category and cannot be removed.');
 const rows=await request('/rest/v1/hc_categories?name=eq.'+encodeURIComponent(name),{method:'DELETE',token:await token(),headers:{Prefer:'return=representation'}});
 if(!rows?.length)throw new Error('Category was not removed. Refresh and try again.');
}
