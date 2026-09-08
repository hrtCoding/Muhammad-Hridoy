export const categories = ['Portfolio','Dashboard','Restaurant','E-commerce','Business','Landing Page','Other'];
const legacyCategories = {'11111111-1111-4111-8111-111111111111':'Portfolio','22222222-2222-4222-8222-222222222222':'Dashboard','33333333-3333-4333-8333-333333333333':'Restaurant'};
export function categoryOf(entry) { return entry.category || legacyCategories[entry.id] || 'Other'; }
export function filterProjects(entries, category='All') { return entries.filter(e=>e.kind==='project' && e.status==='published' && (category==='All'||categoryOf(e)===category)); }

// Most recently created published projects first; keep source order for tied or missing dates.
export function latestProjects(entries, limit=3) {
  const timestamp=e=>Number.isFinite(Date.parse(e.created_at))?Date.parse(e.created_at):0;
  return filterProjects(entries).sort((a,b)=>timestamp(b)-timestamp(a)).slice(0,limit);
}

export function normalizeCategory(value){
 const name=String(value||'').trim().replace(/\s+/g,' ');
 if(!name || name.length>40 || name.toLowerCase()==='all' || /[<>\x00-\x1f]/.test(name))throw new Error('Use 1–40 characters. All is reserved; angle brackets and control characters are not allowed.');
 return name;
}
