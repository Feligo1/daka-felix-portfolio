import {supabase} from './supabase-client.js';
const root=document.getElementById('projects');
const search=document.getElementById('search');
const filter=document.getElementById('filter');
let projects=[];let mediaByProject=new Map();
const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n};
function display(){
 const term=search.value.trim().toLowerCase(),cat=filter.value;
 const visible=projects.filter(p=>(!cat||p.category===cat)&&[p.title,p.summary,p.description,(p.technologies||[]).join(' ')].join(' ').toLowerCase().includes(term));
 root.replaceChildren();
 if(!visible.length){root.append(el('p','No matching published projects. Try another category or search term.','story-empty'));return}
 visible.forEach(p=>{
   const article=el('article','','project-story');
   const link=el('a');link.href='project.html?slug='+encodeURIComponent(p.slug);
   const media=el('div','','project-image-wrap');
   const feature=mediaByProject.get(p.id);
   const actualImage=p.cover_url||(feature?.media_type==='image'?feature.media_url:null);
   if(actualImage){
    const img=el('img','','project-image');img.src=actualImage;img.alt=p.cover_alt||feature?.caption||p.title;img.loading='lazy';media.append(img);
   }else if(feature?.media_type==='video'){
    const video=el('video','','project-image');video.src=feature.media_url;video.muted=true;video.playsInline=true;video.preload='metadata';media.append(video,el('span','▶ Video demonstration','project-video-tag'));
   }else if(feature?.media_type==='external_video')media.append(el('div','▶ View video story','project-image-placeholder'));
   else media.append(el('div','Project highlight','project-image-placeholder'));
   const body=el('div','','project-story-text');
   body.append(el('span',p.category||'Technology','project-overline'),el('h3',p.title),el('p',p.summary||'An overview of the work and its technical focus.'),el('span','Read project story','read-more'));
   link.append(media,body);article.append(link);root.append(article);
 });
}
async function load(){
 try{
  const {data,error}=await supabase.from('portfolio_projects').select('id,slug,title,summary,description,category,cover_url,cover_alt,technologies,is_featured,display_order,created_at')
   .eq('is_published',true).order('is_featured',{ascending:false}).order('display_order',{ascending:true}).order('created_at',{ascending:false});
  if(error)throw error;projects=data||[];
  if(projects.length){
   const ids=projects.map(p=>p.id);
   const {data:gallery,error:mediaError}=await supabase.from('portfolio_project_media')
     .select('project_id,media_type,media_url,caption,sort_order')
     .in('project_id',ids).order('sort_order',{ascending:true});
   if(mediaError)console.warn('Project media highlights unavailable',mediaError);
   for(const item of gallery||[]){
    const previous=mediaByProject.get(item.project_id);
    if(!previous || (previous.media_type!=='image'&&item.media_type==='image'))mediaByProject.set(item.project_id,item);
   }
  }
  const categories=[...new Set(projects.map(x=>x.category).filter(Boolean))].sort();
  categories.forEach(name=>{const option=el('option',name);option.value=name;filter.append(option)});
  display();
 }catch(error){console.error(error);root.replaceChildren(el('p','Projects could not load. Please check your connection and try again.','story-empty'))}
}
search.addEventListener('input',display);filter.addEventListener('change',display);load();
