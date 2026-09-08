import {categoryOf,categories,normalizeCategory} from './categories.js?v=category-bar-6';
import {listCategories,saveCategory,deleteCategory,configured,root,signIn,signOut,getAdmin,listEntries,saveEntry,deleteEntry,uploadImage,removeImage,escapeHTML as esc,imageUrl,normalizeEntry} from './api.js?v=category-bar-6';
import {seed} from './seed.js?v=category-bar-6';
const $=s=>document.querySelector(s);
const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',folder:'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',layers:'m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',logout:'M10 3H4v18h6 M14 8l5 4-5 4 M8 12h11',upload:'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6',image:'M3 3h18v18H3z M3 17l6-6 5 5 3-3 4 4 M15 7h.01',edit:'m15 4 5 5 M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',plus:'M12 5v14 M5 12h14',check:'m5 12 4 4L19 6',arrow:'M7 17 17 7 M7 7h10v10',code:'m8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.code}"/></svg>`;
function hydrateIcons(scope=document){scope.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
hydrateIcons();
let categoryNames=[...categories];
let entries=[],page='overview',filter='all',query='',preview=false,user=null,editing=null,kind='project',imageBlob=null,imageObjectUrl='',imageBusy=false,saving=false,loading=false,loadError='',deleteTarget=null,newEntryId='';
const form=$('#entry-form');
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,5000);}
function status(e){return `<span class="status ${e.status==='draft'?'draft':''}">${e.status==='draft'?'Draft':'Published'}</span>`;}
function tags(e){return `<div class="tags">${e.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`;}
function projectCard(e){return `<article class="project-card"><div class="project-cover">${imageUrl(e.image_url)?`<img src="${esc(imageUrl(e.image_url))}" alt="${esc(e.title)}" loading="lazy">`:`<div class="cover-placeholder">${icon('image')}</div>`}${status(e)}</div><div class="project-copy"><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p>${tags(e)}</div><div class="card-actions"><small>Order ${e.sort_order}</small><div><button class="text-button" data-edit="${esc(e.id)}">${icon('edit')}Edit</button><button class="icon-btn" data-delete="${esc(e.id)}" aria-label="Delete ${esc(e.title)}">${icon('trash')}</button></div></div></article>`;}
function serviceRow(e){return `<article class="service-row"><div class="service-symbol">${icon('code')}</div><div class="service-copy"><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p>${tags(e)}</div>${status(e)}<button class="icon-btn" data-edit="${esc(e.id)}" aria-label="Edit ${esc(e.title)}">${icon('edit')}</button><button class="icon-btn" data-delete="${esc(e.id)}" aria-label="Delete ${esc(e.title)}">${icon('trash')}</button></article>`;}
function empty(type,search=false){return `<div class="empty">${icon(type==='project'?'folder':'layers')}<h3>${search?'No matching items':type==='project'?'Make room for your next project.':'What can you help clients with?'}</h3><p>${search?'Try a different title, skill or visibility filter.':type==='project'?'Add a cover, a few skills and a short story about your work.':'Add your first service to show it on your portfolio.'}</p>${search?'':`<button class="btn primary" data-add="${type}">${icon('plus')} Add ${type}</button>`}</div>`;}
function header(title,sub,actions=''){return `<div class="page-head"><div><p class="eyebrow" style="margin:0 0 10px">PORTFOLIO STUDIO</p><h1>${title}</h1><p>${sub}</p></div><div class="head-actions">${actions}</div></div>`;}
function addButton(type){return `<button class="btn primary" data-add="${type}">${icon('plus')}Add ${type}</button>`;}
function setup(){return header('Let’s get connected.','One free account for your data, images and admin sign-in.')+`<div class="setup-grid"><section class="panel"><h2>Go live in four steps</h2><div class="setup-steps"><div class="setup-step"><h3>Create your Supabase project</h3><p>Create a Free project at <a href="https://supabase.com/dashboard" target="_blank" rel="noopener">Supabase</a>. In Authentication → Users, create your own email/password user and confirm it.</p></div><div class="setup-step"><h3>Set up data and admin access</h3><p>Open <a href="setup.sql" download>setup.sql</a>, copy it into the Supabase SQL Editor, and run it. Then run the admin-access command at the end with your user's UID. Disable public sign-ups in Authentication settings.</p></div><div class="setup-step"><h3>Add your public connection settings</h3><p>Use the form here to download <code>config.js</code>. Replace the file in <code>dist/cms/</code>. Use your publishable key or legacy anon key; never a secret or service-role key.</p></div><div class="setup-step"><h3>Upload your website</h3><p>Upload the contents of <code>dist/</code> to Cloudflare Pages using Direct Upload. Visit <code>/admin/</code> and sign in. New content appears on your portfolio when visitors open or refresh it.</p></div></div></section><section class="panel"><h2>Connection settings</h2><p>These are public project settings. Your password stays in Supabase Auth.</p><form id="config-form"><label>Supabase project URL<input name="url" type="url" placeholder="https://your-project.supabase.co" required></label><label>Publishable / anon key<input name="key" placeholder="sb_publishable_... or eyJ..." required autocomplete="off"></label><p id="config-error" class="error" role="alert"></p><button class="btn primary">${icon('upload')}Download config.js</button></form><p class="setup-note">Saving this file does not connect the current page. Replace the bundled config file, then reload or redeploy.</p><div class="notice" style="margin-top:24px">${configured?'Connection settings found. If sign-in fails, check admin access and the SQL setup.':'Not connected yet. The design preview cannot save changes.'}</div><button class="text-button" id="back-login" style="margin-top:20px">← Back to sign in</button></section></div>`;}
function render(){
  const p=entries.filter(e=>e.kind==='project'),s=entries.filter(e=>e.kind==='service'),drafts=entries.filter(e=>e.status==='draft');
  $('#nav-project-count').textContent=p.length;$('#nav-service-count').textContent=s.length;
  $('#breadcrumb').textContent=page[0].toUpperCase()+page.slice(1);
  document.querySelectorAll('.nav-item').forEach(n=>{n.classList.toggle('active',n.dataset.page===page);if(n.dataset.page===page)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
  if(page==='setup'){$('#main').innerHTML=setup();bindSetup();return;}
  if(loading){$('#main').innerHTML='<div class="loading" role="status">Loading your portfolio…</div>';return;}
  if(loadError){$('#main').innerHTML=`<div class="load-error"><h2>Couldn’t load your content.</h2><p>${esc(loadError)}</p><button class="btn" id="retry">Try again</button> <button class="btn" data-page="setup">Open setup</button></div>`;$('#retry').onclick=load;return;}
  if(page==='categories'){renderCategories();return;}
  if(page==='overview'){
    $('#main').innerHTML=header('Your work, at a glance.','A little upkeep. A portfolio that stays fresh.',addButton('project'))+`<div class="stats"><div class="stat"><span class="stat-label">Total projects</span><span class="stat-icon">${icon('folder')}</span><div class="stat-number">${String(p.length).padStart(2,'0')}</div><span class="stat-foot">${p.filter(e=>e.status==='published').length} published on your portfolio</span></div><div class="stat"><span class="stat-label">Services</span><span class="stat-icon">${icon('layers')}</span><div class="stat-number">${String(s.length).padStart(2,'0')}</div><span class="stat-foot">${s.filter(e=>e.status==='published').length} available to clients</span></div><div class="stat"><span class="stat-label">Drafts</span><span class="stat-icon">${icon('edit')}</span><div class="stat-number">${String(drafts.length).padStart(2,'0')}</div><span class="stat-foot">Work in progress, just for you</span></div></div><section><div class="section-head"><div><h2>Your projects</h2><p>The work behind your portfolio.</p></div><button class="text-button" data-page="projects">View all projects →</button></div><div class="project-grid">${p.length?p.slice(0,3).map(projectCard).join(''):empty('project')}</div></section><div class="overview-bottom"><section class="panel"><p class="eyebrow" style="margin-bottom:12px">WHAT YOU OFFER</p><h3>${s.length?s.length+' services in your studio':'Add your first service'}</h3><p>Give clients a clear picture of what you can build for them.</p><button class="btn" data-add="service">${icon('plus')}Add service</button></section><section class="panel tip-panel"><p class="eyebrow" style="margin-bottom:12px">A GOOD PROJECT CARD</p><h3>Let the work do the talking.</h3><p>Choose a clear cover image, add the skills you used, and describe the result in a few lines. Preview every card before you publish.</p><a class="btn" href="../index.html" target="_blank" rel="noopener">View your portfolio ${icon('arrow')}</a></section></div>`;
  }else{
    const type=page==='services'?'service':'project';
    $('#main').innerHTML=header(type==='project'?'Projects.':'Services.',type==='project'?'Your best work, ready to be discovered.':'Show clients what you can do for them.',addButton(type))+`<div class="toolbar"><input class="search" id="search" type="search" aria-label="Search ${page}" placeholder="Search title or skill…" value="${esc(query)}"><div class="filter" role="group" aria-label="Visibility">${['all','published','draft'].map(f=>`<button data-filter="${f}" class="${filter===f?'selected':''}" aria-pressed="${filter===f}">${f[0].toUpperCase()+f.slice(1)}</button>`).join('')}</div></div><div id="items" class="${type==='project'?'project-grid':'service-list'}"></div>`;
    renderItems();$('#search').oninput=e=>{query=e.target.value;renderItems();};
  }
}
function renderItems(){const type=page==='services'?'service':'project',q=query.trim().toLowerCase();const rows=entries.filter(e=>e.kind===type&&(filter==='all'||e.status===filter)&&(!q||(e.title+' '+e.tags.join(' ')).toLowerCase().includes(q)));$('#items').innerHTML=rows.length?rows.map(type==='project'?projectCard:serviceRow).join(''):empty(type,!!q||filter!=='all');}
function bindSetup(){
  $('#back-login').onclick=()=>{if(user){page='overview';render();}else{$('#app').hidden=true;$('#login').hidden=false;}};
  $('#config-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),url=String(f.get('url')).trim().replace(/\/$/,''),key=String(f.get('key')).trim();const error=$('#config-error');
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)){error.textContent='Use your Supabase project URL, ending in .supabase.co.';return;}
    let legacyAnon=false;try{legacyAnon=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{}
    if(!key.startsWith('sb_publishable_')&&!legacyAnon){error.textContent='Use a publishable or legacy anon key. Secret and service-role keys are not allowed.';return;}
    error.textContent='';const blob=new Blob(['// Public settings only.\nexport const config = '+JSON.stringify({supabaseUrl:url,supabaseKey:key},null,2)+';\n'],{type:'text/javascript'}),link=document.createElement('a'),u=URL.createObjectURL(blob);link.href=u;link.download='config.js';link.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('Downloaded. Replace dist/cms/config.js and reload.');
  };
}
async function load(){loading=true;loadError='';render();try{const result=await Promise.all([listEntries(true),listCategories()]);entries=result[0];categoryNames=result[1].map(c=>c.name);}catch(e){loadError=e.message;}finally{loading=false;render();}}
function enter(isPreview=false){preview=isPreview;$('#login').hidden=true;$('#app').hidden=false;$('#preview-banner').hidden=!preview;$('#connection').textContent=preview?'Design preview':'Connected';$('#connection').classList.toggle('live',!preview);$('#account-label').textContent=user?.email||'Design preview';page='overview';if(preview){entries=structuredClone(seed);categoryNames=[...categories];loadError='';render();}else load();}
$('#login-form').onsubmit=async e=>{e.preventDefault();$('#login-error').textContent='';$('#login-button').disabled=true;try{user=await signIn($('#email').value.trim(),$('#password').value);$('#password').value='';enter();}catch(err){$('#login-error').textContent=err.message;}finally{$('#login-button').disabled=false;}};
$('#setup-hint').hidden=configured;$('#login-button').disabled=!configured;
$('#preview-button').onclick=()=>enter(true);
$('#open-setup').onclick=()=>{enter(true);page='setup';render();};
$('#logout').onclick=async()=>{await signOut();user=null;entries=[];$('#app').hidden=true;$('#login').hidden=false;};
document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-page]');if(nav){page=nav.dataset.page;filter='all';query='';render();return;}
  const add=e.target.closest('[data-add]');if(add){openEditor(add.dataset.add);return;}
  const edit=e.target.closest('[data-edit]');if(edit){const item=entries.find(x=>x.id===edit.dataset.edit);if(item)openEditor(item.kind,item);return;}
  const del=e.target.closest('[data-delete]');if(del){deleteTarget=entries.find(x=>x.id===del.dataset.delete);$('#delete-copy').textContent=deleteTarget.title;$('#delete-error').textContent='';$('#delete-dialog').showModal();return;}
  const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;render();}
});
function openEditor(type,item=null){
  editing=item;kind=type;newEntryId=crypto.randomUUID();form.reset();imageBlob=null;revokePreview();$('#image-file').value='';$('#form-error').textContent='';$('#image-label').textContent='';
  for(const name of ['title','description','demo_url','source_url','status','sort_order'])form.elements[name].value=item?.[name]??(name==='status'?'published':name==='sort_order'?Math.max(0,...entries.filter(e=>e.kind===type).map(e=>e.sort_order))+1:'');
  form.elements.tags.value=item?.tags.join(', ')||'';
  form.elements.category.innerHTML=categoryNames.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  form.elements.category.value=item?categoryOf(item):'Other';$('#category-field').hidden=type!=='project';
  $('#editor-title').textContent=(item?'Edit ':'Add ')+type;$('#editor-kicker').textContent=type==='project'?'YOUR WORK':'WHAT YOU OFFER';$('#save-button').textContent='Save '+type;
  $('#image-field').hidden=type!=='project';$('#project-links').hidden=type!=='project';$('#card-image-wrap').hidden=type!=='project';
  previewCard();$('#editor').showModal();form.elements.title.focus();
}
function revokePreview(){if(imageObjectUrl){URL.revokeObjectURL(imageObjectUrl);imageObjectUrl='';}}
function closeEditor(){if(saving||imageBusy)return;$('#editor').close();revokePreview();}
$('#close-editor').onclick=closeEditor;$('#cancel-editor').onclick=closeEditor;
$('#editor').addEventListener('cancel',e=>{if(saving||imageBusy)e.preventDefault();else revokePreview();});
function previewCard(){
  $('#card-title').textContent=form.elements.title.value.trim()||(kind==='project'?'Your next great project':'Your new service');$('#card-description').textContent=form.elements.description.value.trim()||'Your short description will appear here.';$('#char-count').textContent=form.elements.description.value.length;
  $('#card-tags').replaceChildren(...form.elements.tags.value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12).map(t=>{const s=document.createElement('span');s.textContent=t;return s;}));
  const src=imageObjectUrl||imageUrl(editing?.image_url);$('#card-image').hidden=!src;$('#card-placeholder').hidden=!!src;if(src)$('#card-image').src=src;else $('#card-image').removeAttribute('src');
}
form.addEventListener('input',previewCard);
async function chooseImage(file){
  if(!file||saving||imageBusy)return;$('#form-error').textContent='';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){$('#form-error').textContent='Choose a JPG, PNG or WebP image.';return;}
  if(file.size>10*1024*1024){$('#form-error').textContent='Choose an image smaller than 10 MB.';return;}
  imageBusy=true;$('#save-button').disabled=true;$('#image-label').textContent='Preparing your cover…';
  try{
    const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>40000000){bitmap.close();throw new Error('Image is too large. Resize it below 40 megapixels first.');}
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));if(!blob||blob.type!=='image/webp')throw new Error('Your browser could not prepare this image. Try a recent Chrome or Firefox.');if(blob.size>2*1024*1024)throw new Error('This image is still too large. Choose a smaller image.');
    imageBlob=blob;revokePreview();imageObjectUrl=URL.createObjectURL(blob);$('#image-label').textContent=`${file.name} · ${Math.ceil(blob.size/1024)} KB optimized`;previewCard();
  }catch(e){$('#form-error').textContent=e.message||'Could not read this image.';$('#image-label').textContent='Choose a valid image and try again.';}finally{imageBusy=false;$('#save-button').disabled=false;}
}
$('#image-file').onchange=e=>chooseImage(e.target.files[0]);
for(const event of ['dragenter','dragover'])$('#drop-zone').addEventListener(event,e=>{e.preventDefault();$('#drop-zone').classList.add('dragging');});
for(const event of ['dragleave','drop'])$('#drop-zone').addEventListener(event,e=>{e.preventDefault();$('#drop-zone').classList.remove('dragging');if(event==='drop')chooseImage(e.dataTransfer.files[0]);});
form.onsubmit=async e=>{
  e.preventDefault();if(saving||imageBusy)return;$('#form-error').textContent='';
  if(preview){$('#form-error').textContent='This is a design preview. Connect Supabase in Setup and sign in to save.';return;}
  let uploaded=null,saved=false;
  try{
    const values=Object.fromEntries(new FormData(form));values.kind=kind;if(kind==='service'){values.demo_url='';values.source_url='';}
    const data=normalizeEntry(values);if(kind==='project'&&!imageBlob&&!editing?.image_url)throw new Error('Choose a cover image for your project.');
    saving=true;$('#save-button').disabled=true;$('#save-button').textContent=imageBlob?'Uploading cover…':'Saving…';
    if(imageBlob)uploaded=await uploadImage(imageBlob);
    data.image_url=uploaded?.image_url||editing?.image_url||'';data.image_path=uploaded?.image_path||editing?.image_path||'';if(!editing?.id)data.id=newEntryId;
    const row=await saveEntry(data,editing?.id);saved=true;
    const oldImage=editing?.image_path;entries=entries.filter(x=>x.id!==row.id).concat(row).sort((a,b)=>a.sort_order-b.sort_order);$('#editor').close();revokePreview();render();toast(data.status==='published'?'Saved. Your portfolio will show this on refresh.':'Draft saved. Only you can see this item.');
    if(uploaded&&oldImage)try{await removeImage(oldImage);}catch{toast('Saved. The old cover could not be removed; you can remove it in Supabase Storage.');}
  }catch(err){
    // An ambiguous network failure may have committed the row. Keep the uploaded
    // object rather than deleting an image that a saved project could reference.
    if(uploaded&&!saved){editing={...editing,...uploaded};imageBlob=null;$('#image-label').textContent='Cover uploaded. Your entered details are kept; retry Save.';}
    $('#form-error').textContent=err.message;
  }finally{saving=false;$('#save-button').disabled=false;$('#save-button').textContent='Save '+kind;}
};
$('#cancel-delete').onclick=()=>$('#delete-dialog').close();
$('#delete-dialog').addEventListener('cancel',e=>{if($('#confirm-delete').disabled)e.preventDefault();});
$('#confirm-delete').onclick=async()=>{
  if(preview){$('#delete-error').textContent='Connect Supabase and sign in to delete items. Preview data is read-only.';return;}
  const item=deleteTarget;$('#confirm-delete').disabled=true;$('#cancel-delete').disabled=true;
  try{await deleteEntry(item.id);entries=entries.filter(e=>e.id!==item.id);$('#delete-dialog').close();render();toast('Item deleted.');if(item.image_path)try{await removeImage(item.image_path);}catch{toast('Item deleted. Remove its unused cover in Supabase Storage.');}}catch(e){$('#delete-error').textContent=e.message;}finally{$('#confirm-delete').disabled=false;$('#cancel-delete').disabled=false;}
};
if(configured){try{user=await getAdmin();if(user)enter();}catch(e){$('#login-error').textContent=e.message;}}

function renderCategories(){
 $('#main').innerHTML=header('Categories.','Add website types, rename them, or remove categories you no longer need.')+`<section class="panel"><form id="category-add" class="category-edit"><label>New category<input name="name" maxlength="40" required placeholder="e.g. Education"></label><button class="btn primary">Add category</button></form><p id="category-error" class="error" role="alert"></p><p>Removing a category moves its projects to Other. Projects are kept.</p><div class="category-list">${categoryNames.map(name=>`<form class="category-edit" data-old-category="${esc(name)}"><label>Category name<input name="name" aria-label="Rename ${esc(name)}" value="${esc(name)}" maxlength="40" required ${name==='Other'?'disabled':''}></label><span>${entries.filter(e=>e.kind==='project'&&categoryOf(e)===name).length} projects</span>${name==='Other'?'<span class="field-help">Default category</span>':'<button class="btn">Save name</button><button type="button" class="btn" data-remove-category>Remove</button>'}</form>`).join('')}</div></section>`;
 const run=async(form,remove=false)=>{
  const error=$('#category-error');error.textContent='';
  if(preview){error.textContent='Connect Supabase and sign in to save category changes.';return;}
  const old=form.dataset.oldCategory;
  if(remove&&!window.confirm('Remove '+old+'? Its projects will move to Other.'))return;
  const buttons=[...$('#main').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try{
    if(remove)await deleteCategory(old);else await saveCategory(normalizeCategory(form.elements.name.value),old);
    await load();toast(remove?'Category removed. Projects moved to Other.':'Category saved. Refresh your website to see it.');
  }catch(e){error.textContent=e.message;buttons.forEach(b=>b.disabled=false);}
 };
 $('#category-add').onsubmit=e=>{e.preventDefault();run(e.currentTarget);};
 document.querySelectorAll('[data-old-category]').forEach(form=>{form.onsubmit=e=>{e.preventDefault();run(form);};const remove=form.querySelector('[data-remove-category]');if(remove)remove.onclick=()=>run(form,true);});
}
