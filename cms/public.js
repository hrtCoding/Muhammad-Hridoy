import {categories,categoryOf,filterProjects,latestProjects} from './categories.js?v=category-bar-6';
import {configured,listEntries,listCategories,escapeHTML as esc,imageUrl,safeLink} from './api.js?v=category-bar-6';
import {seed} from './seed.js?v=category-bar-6';
let categoryNames=[...categories];
const containers=[...document.querySelectorAll('[data-hc-kind]')];
function card(e){
  const project=e.kind==='project',image=imageUrl(e.image_url),demo=safeLink(e.demo_url),source=safeLink(e.source_url);
  return `<article class="hc-card">${project&&image?`<a class="hc-cover" href="${esc(image)}" target="_blank" rel="noopener" aria-label="View ${esc(e.title)} image"><img src="${esc(image)}" alt="${esc(e.title)}" loading="lazy" decoding="async"></a>`:''}<div class="hc-copy">${project?`<span class="hc-category">${esc(categoryOf(e))}</span>`:''}${!project?'<div class="hc-service-mark" aria-hidden="true">&lt;/&gt;</div>':''}<h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><div class="hc-tags">${e.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div><div class="hc-links">${project?`${demo?`<a href="${esc(demo)}" target="_blank" rel="noopener">Live demo ↗</a>`:''}${source?`<a href="${esc(source)}" target="_blank" rel="noopener">Purchase / source ↗</a>`:''}`:'<a href="index.html#contact">Let’s talk →</a>'}</div></article>`;
}
function renderEntries(c,rows){
  const items=rows.filter(e=>e.kind===c.dataset.hcKind&&e.status==='published');
  if(c.dataset.hcKind!=='project'){
    c.innerHTML=items.length?items.map(card).join(''):'<p class="hc-empty">For project enquiries, get in touch below.</p>';return;
  }
  let bar=c.previousElementSibling;
  if(!bar?.matches('.hc-filter-area')){bar=document.createElement('div');bar.className='hc-filter-area';c.before(bar);}
  const options=['All',...categoryNames];
  const selected=options.includes(c.dataset.category)?c.dataset.category:'All';
  const filtered=filterProjects(items,selected);
  const matches=c.dataset.hcLatest?latestProjects(filtered,Number(c.dataset.hcLatest)):filtered;
  c.dataset.category=selected;
  bar.innerHTML='<div class="hc-filters" role="group" aria-label="Filter websites by category">'+options.map(cat=>`<button type="button" class="hc-filter" data-category="${esc(cat)}" aria-pressed="${cat===selected}">${esc(cat)}</button>`).join('')+'</div><p class="hc-results" role="status" aria-live="polite">'+matches.length+' website'+(matches.length===1?'':'s')+' · '+esc(selected)+'</p>';
  bar.onclick=e=>{const button=e.target.closest('button[data-category]');if(!button)return;c.dataset.category=button.dataset.category;renderEntries(c,rows);bar.querySelectorAll('button').forEach(b=>{if(b.dataset.category===c.dataset.category)b.focus();});};
  c.innerHTML=matches.length?matches.map(card).join(''):'<p class="hc-empty">New websites are on the way.</p>';
}
async function load(){
  for(const c of containers)c.innerHTML='<p class="hc-loading" role="status">Loading…</p>';
  try{
    let rows;
    if(configured){const result=await Promise.all([listEntries(),listCategories()]);rows=result[0];categoryNames=result[1].map(c=>c.name);}else{rows=seed;categoryNames=[...categories];}
    for(const c of containers)renderEntries(c,rows);
  }catch{
    for(const c of containers){c.innerHTML='<div class="hc-empty"><p>Content is temporarily unavailable. Please try again.</p><button class="hc-retry">Try again</button></div>';c.querySelector('button').onclick=load;}
  }
}
if(containers.length)load();
// Keep the existing contact feature honest: compose an email instead of reporting
// a simulated submission. Sending happens in the visitor's own email application.
document.querySelectorAll('[data-hc-contact]').forEach(form=>form.addEventListener('submit',e=>{
  e.preventDefault();const data=new FormData(form),name=String(data.get('name')).trim(),email=String(data.get('email')).trim(),message=String(data.get('message')).trim();
  if(!name||!email||!message)return;
  location.href='mailto:heartcoding294@gmail.com?subject='+encodeURIComponent('Portfolio enquiry from '+name)+'&body='+encodeURIComponent('Name: '+name+'\nReply to: '+email+'\n\n'+message);
  form.querySelector('[role="status"]').textContent='Your email app should open. Review the message and press Send there.';
}));

// Clipboard fallback lets visitors send from webmail without a desktop mail app.
document.querySelectorAll('[data-hc-copy]').forEach(button=>button.addEventListener('click',async()=>{
  const form=button.closest('form');
  if(!form.reportValidity())return;
  const data=new FormData(form);
  const text='To: heartcoding294@gmail.com\nSubject: Portfolio enquiry from '+String(data.get('name')).trim()+'\n\nName: '+String(data.get('name')).trim()+'\nReply to: '+String(data.get('email')).trim()+'\n\n'+String(data.get('message')).trim();
  const status=form.querySelector('[role="status"]');
  try{await navigator.clipboard.writeText(text);status.textContent='Copied. Paste into your email app and send to heartcoding294@gmail.com.';}
  catch{let fallback=form.querySelector('[data-hc-copy-text]');if(!fallback){fallback=document.createElement('textarea');fallback.dataset.hcCopyText='';fallback.readOnly=true;fallback.setAttribute('aria-label','Message to copy');fallback.className='w-full p-3 bg-gray-800 text-white rounded-lg';form.append(fallback);}fallback.value=text;fallback.focus();fallback.select();status.textContent='Copy the selected text, then paste it into your email app.';}
}));
