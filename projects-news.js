import {supabase} from './supabase-client.js';
const root=document.getElementById('projects');
const search=document.getElementById('search');
const filter=document.getElementById('filter');
let projects=[];
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
   if(p.cover_url){
    const img=el('img','','project-image');img.src=p.cover_url;img.alt=p.cover_alt||p.title;img.loading='lazy';media.append(img);
   }else media.append(el('div','Project highlight','project-image-placeholder'));
   const body=el('div','','project-story-text');
   body.append(el('span',p.category||'Technology','project-overline'),el('h3',p.title),el('p',p.summary||'An overview of the work and its technical focus.'),el('span','Read project story','read-more'));
   link.append(media,body);article.append(link);root.append(article);
 });
}
async function load(){
 try{
  const {data,error}=await supabase.from('portfolio_projects').select('slug,title,summary,description,category,cover_url,cover_alt,technologies,is_featured,display_order,created_at')
   .eq('is_published',true).order('is_featured',{ascending:false}).order('display_order',{ascending:true}).order('created_at',{ascending:false});
  if(error)throw error;projects=data||[];
  const categories=[...new Set(projects.map(x=>x.category).filter(Boolean))].sort();
  categories.forEach(name=>{const option=el('option',name);option.value=name;filter.append(option)});
  display();
 }catch(error){console.error(error);root.replaceChildren(el('p','Projects could not load. Please check your connection and try again.','story-empty'))}
}
search.addEventListener('input',display);filter.addEventListener('change',display);load();
