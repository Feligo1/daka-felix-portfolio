import {supabase} from './supabase-client.js';
const $=id=>document.getElementById(id);
const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n};
const slug=new URLSearchParams(location.search).get('slug');
const root=$('media');
const dialog=$('viewer');
const holder=$('viewer-body');
const addLink=(name,url,cls)=>{try{const u=new URL(url);if(u.protocol!=='https:')return;const a=el('a',name,cls);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';$('links').append(a)}catch{}};
function embedUrl(link){try{const u=new URL(link);return u.protocol==='https:'&&u.hostname==='www.youtube.com'&&/^\/embed\/[A-Za-z0-9_-]{11}$/.test(u.pathname)?u.origin+u.pathname:null}catch{return null}}
function renderCaseStudy(raw) {
 const container=$('details');
 container.replaceChildren();
 const sections=String(raw||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 let list=null;
 for(const section of sections){
  if(section.startsWith('## ')){
   list=null;
   const h=el('h3',section.slice(3),'project-chapter-title');
   container.append(h);
  }else{
   const lines=section.split('\n').map(x=>x.trim()).filter(Boolean);
   for(const line of lines){
    if(line.startsWith('• ')||line.startsWith('- ')){
     if(!list){list=el('ul','','project-chapter-list');container.append(list)}
     list.append(el('li',line.slice(2)));
    }else{
     list=null;
     container.append(el('p',line,'project-chapter-paragraph'));
    }
   }
  }
 }
 if(!sections.length)container.append(el('p','The detailed case study will be added soon.'));
}
function renderMedia(media){
 root.replaceChildren();
 if(!media.length){root.append(el('p','Screenshots and video demonstrations will be published as they become available.','story-empty'));return}
 media.forEach(item=>{
  const article=el('article','','project-media-item');
  const caption=el('p',item.caption||'Project demonstration','media-caption');
  if(item.media_type==='image'){
   const button=el('button');button.type='button';
   const image=el('img');image.src=item.media_url;image.alt=item.alt_text||item.caption||'Project screenshot';image.loading='lazy';
   button.append(image);button.setAttribute('aria-label','Open '+(item.caption||'project image'));
   button.addEventListener('click',()=>{
     const full=el('img');full.src=item.media_url;full.alt=image.alt;
     holder.replaceChildren(full,el('p',item.caption||''));dialog.showModal();
   });article.append(button,caption);
  }else if(item.media_type==='video'){
   const video=el('video');video.controls=true;video.preload='metadata';video.playsInline=true;video.src=item.media_url;
   video.setAttribute('aria-label',item.caption||'Project demonstration video');article.append(video,caption);
  }else if(item.media_type==='external_video'){
   const url=embedUrl(item.media_url);if(!url)return;
   const iframe=el('iframe');iframe.src=url;iframe.title=item.caption||'Project demonstration video';iframe.loading='lazy';
   iframe.setAttribute('allow','accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');iframe.allowFullscreen=true;
   article.append(iframe,caption);
  }else return;
  root.append(article);
 });
}
async function load(){
 if(!slug){$('title').textContent='Select a project';return}
 const {data:p,error}=await supabase.from('portfolio_projects').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();
 if(error||!p){$('title').textContent='Project unavailable';$('summary').textContent='This project may be unpublished or the link may have changed.';return}
 document.title=p.title+' | Felix Daka';$('title').textContent=p.title;$('summary').textContent=p.summary||'';
 renderCaseStudy(p.description);
 $('tags').replaceChildren();(p.technologies||[]).forEach(t=>$('tags').append(el('span',t,'pill')));
 if(p.cover_url){const img=$('cover');img.src=p.cover_url;img.alt=p.cover_alt||p.title;img.hidden=false}
 if(p.github_url)addLink('GitHub repository',p.github_url,'button secondary');
 if(p.demo_url)addLink('Live demonstration',p.demo_url,'button');
 const {data:media,error:mediaError}=await supabase.from('portfolio_project_media')
 .select('media_type,media_url,caption,alt_text,sort_order').eq('project_id',p.id).order('sort_order');
 if(mediaError){root.replaceChildren(el('p','Media could not load right now.','story-empty'));return}
 renderMedia(media||[]);
}
$('close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>holder.replaceChildren());
load().catch(error=>{console.error(error);$('title').textContent='Unable to load project'});
