import {supabase} from './supabase-client.js';
const tables={showcase:{table:'portfolio_projects',title:'Project',fields:['title','slug','summary','description','category','technologies','github_url','demo_url','display_order','is_featured'],bucket:'portfolio-project-media',media:'cover_url'},gallery:{table:'portfolio_gallery',title:'Gallery photo',fields:['title','category','caption','alt_text','event_date'],bucket:'portfolio-gallery',media:'media_url'},journal:{table:'portfolio_journal',title:'Journal article',fields:['title','slug','summary','body','category'],bucket:'portfolio-journal-media',media:'cover_url'},recommendations:{table:'portfolio_recommendations',title:'Recommendation',fields:['person_name','job_title','organization','quote'],bucket:null,media:null}};
const E=(tag,text='',attrs={})=>{const n=document.createElement(tag);n.textContent=String(text??'');Object.entries(attrs).forEach(([k,v])=>{if(v!=null)n.setAttribute(k,String(v))});return n};
let authorized=false;
const msg=(section,text,err=false)=>{const n=document.querySelector('#v2-'+section+'-status');if(n){n.textContent=text;n.style.borderColor=err?'#d76b74':'#35506a'}};
async function check(){const{data:{user},error}=await supabase.auth.getUser();if(error||!user)throw Error('Sign in to manage portfolio content.');const{data:role,error:roleError}=await supabase.from('portfolio_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(roleError||!role)throw Error('Your account is not authorized to manage portfolio content.');authorized=true}
async function upload(section,file){if(!file)return null;const cfg=tables[section];if(!cfg.bucket)throw Error('This section does not support uploads.');const image=/^image\/(jpeg|png|webp|gif)$/.test(file.type);const video=section==='showcase'&&/^video\/(mp4|webm)$/.test(file.type);if(!image&&!video)throw Error('Unsupported media type. Use JPG, PNG, WebP or GIF'+(section==='showcase'?', MP4 or WebM.':'.'));const max=video?20:10;if(file.size>max*1024*1024)throw Error('File too large (limit '+max+' MB).');const extension=(file.type.split('/')[1]||'bin').replace('jpeg','jpg');const path='published/'+crypto.randomUUID()+'.'+extension;const {error}=await supabase.storage.from(cfg.bucket).upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});if(error)throw error;return supabase.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl}
function validateUrl(value){if(!value)return null;const url=new URL(value);if(url.protocol!=='https:')throw Error('Use an HTTPS URL.');return url.toString()}
function payload(section,form){const cfg=tables[section];const data={};for(const key of cfg.fields){const element=form.elements.namedItem(key);if(!element)continue;const value=element.value.trim();data[key]=key==='technologies'?value.split(',').map(x=>x.trim()).filter(Boolean):key==='display_order'?(Number.parseInt(value,10)||0):key==='is_featured'?element.checked:(['github_url','demo_url'].includes(key)?validateUrl(value):value)}if(section==='showcase'||section==='journal'){data.slug=data.slug.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');if(!data.slug)throw Error('Enter a valid URL slug.')}data.is_published=!!form.elements.namedItem('is_published')?.checked;if(section==='recommendations'){data.permission_confirmed=!!form.elements.namedItem('permission_confirmed')?.checked;if(data.is_published&&!data.permission_confirmed)throw Error('Confirm permission before publishing the recommendation.')}return data}
function setForm(section,data){const form=document.querySelector('#v2-'+section+'-form');form.reset();for(const key of tables[section].fields){const f=form.elements.namedItem(key);if(f){if(f.type==='checkbox')f.checked=!!data[key];else f.value=Array.isArray(data[key])?data[key].join(', '):(data[key]??'')}}form.elements.namedItem('record_id').value=data.id||'';form.elements.namedItem('is_published').checked=!!data.is_published;if(section==='recommendations')form.elements.namedItem('permission_confirmed').checked=!!data.permission_confirmed;form.querySelector('button[type=submit]').textContent=data.id?'Save changes':'Save new '+tables[section].title.toLowerCase();form.scrollIntoView({behavior:'smooth',block:'start'})}
async function refresh(section){if(!authorized)return;const cfg=tables[section],box=document.querySelector('#v2-'+section+'-list');box.replaceChildren(E('p','Loading…'));const{data,error}=await supabase.from(cfg.table).select('*').order('created_at',{ascending:false}).limit(100);if(error){box.replaceChildren(E('p','Could not load data: '+error.message));return}box.replaceChildren();if(!data.length){box.append(E('p','No entries yet. Create the first one.'));return}for(const item of data){const row=E('div','',{class:'v2-row'}),info=E('div'),actions=E('div','',{class:'v2-row-actions'});info.append(E('strong',item.title||item.person_name||'Untitled'),E('small',(item.is_published?'Published':'Draft')+' · '+new Date(item.created_at).toLocaleDateString()));const edit=E('button','Edit',{type:'button'});edit.addEventListener('click',()=>setForm(section,item));const remove=E('button','Delete',{type:'button'});remove.addEventListener('click',async()=>{if(!confirm('Delete this '+cfg.title.toLowerCase()+'? This cannot be undone.'))return;remove.disabled=true;const{error}=await supabase.from(cfg.table).delete().eq('id',item.id);if(error){msg(section,error.message,true);remove.disabled=false}else{msg(section,'Deleted.');refresh(section)}});actions.append(edit,remove);row.append(info,actions);box.append(row)}}
async function submit(section,event){event.preventDefault();if(!authorized){msg(section,'Unauthorized session.',true);return}const cfg=tables[section],form=event.currentTarget,button=form.querySelector('button[type=submit]');button.disabled=true;msg(section,'Saving…');try{const data=payload(section,form),id=form.elements.namedItem('record_id').value;const file=form.elements.namedItem('media_file')?.files?.[0];if(file){if(!data.is_published)throw Error('Media uploads go to public buckets. Publish the entry first or save the draft without media.');if(!cfg.media)throw Error('No media field');data[cfg.media]=await upload(section,file);if(section==='showcase')data.cover_alt=data.title;}let query=id?supabase.from(cfg.table).update(data).eq('id',id):supabase.from(cfg.table).insert(data);const{error}=await query;if(error)throw error;form.reset();form.elements.namedItem('record_id').value='';button.textContent='Save new '+cfg.title.toLowerCase();msg(section,'Saved successfully.');await refresh(section);if(section==='showcase')await refreshProjectOptions()}catch(err){msg(section,err.message||'Save failed.',true)}finally{button.disabled=false}}

async function refreshOverview(){
 try{
 await check();
 const mapping={projects:'portfolio_projects',gallery:'portfolio_gallery',journal:'portfolio_journal',recommendations:'portfolio_recommendations'};
 const counts=await Promise.all(Object.entries(mapping).map(async([key,table])=>{
   let q=supabase.from(table).select('id',{head:true,count:'exact'}).eq('is_published',true);
   if(key==='recommendations')q=q.eq('permission_confirmed',true);
   const{count,error}=await q;return {key,count,error}
 }));
 let failures=0;
 for(const c of counts){const node=document.getElementById('v2-count-'+c.key);if(node)node.textContent=c.error?'—':String(c.count??0);if(c.error)failures++}
 const status=document.getElementById('v2-overview-status');
 if(status)status.textContent=failures?failures+' content area(s) unavailable. Run the Supabase migration and check permissions.':'Published content counts loaded.';
 }catch(err){const status=document.getElementById('v2-overview-status');if(status)status.textContent=err.message}
}
document.getElementById('v2-overview-refresh')?.addEventListener('click',refreshOverview);

async function diagnostics(){const box=document.querySelector('#v2-storage-status');box.replaceChildren(E('p','Checking schema and bucket access…'));try{await check()}catch(e){box.replaceChildren(E('p',e.message));return}const buckets=['portfolio-images','portfolio-certificate-files','portfolio-documents','portfolio-project-media','portfolio-gallery','portfolio-journal-media'];box.replaceChildren();for(const name of buckets){const row=E('div','',{class:'v2-row'}),label=E('strong',name),status=E('small','Checking…');row.append(label,status);box.append(row);const {error}=await supabase.storage.from(name).list('',{limit:1});status.textContent=error?'Cannot verify: '+error.message:'Accessible (list permission verified)'}for(const section of Object.keys(tables)){const {error}=await supabase.from(tables[section].table).select('*',{count:'exact',head:true});const row=E('div','',{class:'v2-row'});row.append(E('strong',tables[section].table),E('small',error?'Not ready: '+error.message:'Accessible'));box.append(row)}box.append(E('p','Checks confirm read/list access only. A successful upload and owner-only authorization test are still required before production.',{class:'v2-notice'}))}

async function activate(section){if(!document.getElementById('v2-'+section+'-form')&&section!=='storage')return;try{await check();if(section==='storage')await diagnostics();else {await refresh(section);if(section==='showcase'){await refreshProjectOptions();await refreshProjectMedia()}}}catch(e){msg(section,e.message,true)}}

async function refreshProjectOptions(){
 if(!authorized)return;
 const sel=document.querySelector('#v2-media-project');if(!sel)return;
 const previous=sel.value;
 const{data,error}=await supabase.from('portfolio_projects').select('id,title,is_published').order('title');
 sel.replaceChildren(E('option','Choose a published project',{value:''}));
 if(error){msg('showcase',error.message,true);return}
 for(const p of data??[]){if(!p.is_published)continue;sel.append(E('option',p.title,{value:p.id}))}
 if(previous&&[...sel.options].some(o=>o.value===previous))sel.value=previous;
}
async function refreshProjectMedia(){
 if(!authorized)return;
 const id=document.querySelector('#v2-media-project')?.value,root=document.querySelector('#v2-media-list');
 if(!root)return;root.replaceChildren();
 if(!id){root.append(E('p','Choose a published project to manage its media.'));return}
 const {data,error}=await supabase.from('portfolio_project_media').select('*').eq('project_id',id).order('sort_order');
 if(error){root.append(E('p',error.message));return}
 if(!data?.length){root.append(E('p','No demonstration media uploaded for this project.'));return}
 for(const m of data){
 const row=E('div','',{class:'v2-row'}),info=E('div'),actions=E('div','',{class:'v2-row-actions'});
 info.append(E('strong',m.caption||m.media_type),E('small',m.media_type+' · '+m.media_url.slice(0,80)));
 const edit=E('button','Edit details',{type:'button'});
 edit.addEventListener('click',async()=>{
   const caption=prompt('Media caption:',m.caption||'');if(caption===null)return;
   const alt=prompt('Image description:',m.alt_text||'');if(alt===null)return;
   const order=prompt('Display order:',String(m.sort_order??0));if(order===null)return;
   const sort_order=Number.parseInt(order,10);
   if(!Number.isInteger(sort_order)){msg('showcase','Enter a valid numeric display order.',true);return}
   edit.disabled=true;
   const{error}=await supabase.from('portfolio_project_media').update({caption:caption.trim().slice(0,200),alt_text:alt.trim().slice(0,300),sort_order}).eq('id',m.id);
   if(error){msg('showcase',error.message,true);edit.disabled=false}
   else {msg('showcase','Media details updated.');await refreshProjectMedia()}
 });
 const del=E('button','Delete',{type:'button'});
 del.addEventListener('click',async()=>{
   if(!confirm('Delete this media entry?'))return;
   del.disabled=true;
   const{error}=await supabase.from('portfolio_project_media').delete().eq('id',m.id);
   if(error){msg('showcase',error.message,true);del.disabled=false}
   else{msg('showcase','Media record deleted. Remove the orphaned storage file using Storage if this was a direct upload.');await refreshProjectMedia()}
 });
 actions.append(edit,del);row.append(info,actions);root.append(row)
}
}
document.querySelector('#v2-media-project')?.addEventListener('change',refreshProjectMedia);
document.querySelector('#v2-project-media-form')?.addEventListener('submit',async e=>{
 e.preventDefault();if(!authorized)return;
 const form=e.currentTarget,button=form.querySelector('button[type=submit]');button.disabled=true;
 try{
 const projectId=form.elements.namedItem('project_id').value,caption=form.elements.namedItem('caption').value.trim(),alt=form.elements.namedItem('alt_text').value.trim(),file=form.elements.namedItem('media_file').files[0],external=form.elements.namedItem('external_video').value.trim();
 if(!projectId)throw Error('Select a published project.');
 if(!!file===!!external)throw Error('Provide either a media upload or a YouTube embed URL, not both.');
 let media_url,media_type;
 if(file){media_url=await upload('showcase',file);media_type=file.type.startsWith('video/')?'video':'image'}
 else{
 const url=new URL(external);
 if(url.protocol!=='https:'||url.hostname!=='www.youtube.com'||!/^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname))throw Error('Use a YouTube embed URL, for example https://www.youtube.com/embed/VIDEO_ID');
 media_url=url.origin+url.pathname;media_type='external_video'
 }
 const{error}=await supabase.from('portfolio_project_media').insert({project_id:projectId,caption,alt_text:alt,media_url,media_type});
 if(error)throw error;
 msg('showcase','Project media saved.');form.elements.namedItem('media_file').value='';form.elements.namedItem('external_video').value='';await refreshProjectMedia()
 }catch(err){msg('showcase',err.message,true)}finally{button.disabled=false}
});

for(const section of Object.keys(tables)){const form=document.querySelector('#v2-'+section+'-form');if(!form)continue;form.addEventListener('submit',e=>submit(section,e));document.querySelector('#v2-'+section+'-reset')?.addEventListener('click',()=>setForm(section,{}))}
document.querySelector('#v2-storage-check')?.addEventListener('click',diagnostics);
document.querySelectorAll('.tab-btn[data-tab]').forEach(b=>b.addEventListener('click',()=>{const tab=b.dataset.tab;if(tab in tables||tab==='storage')activate(tab);if(tab==='overview')refreshOverview()}));
supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN')queueMicrotask(refreshOverview);authorized=false;if(event==='SIGNED_OUT')for(const section of Object.keys(tables))document.querySelector('#v2-'+section+'-list')?.replaceChildren(E('p','Sign in to view records.'))});
