import { supabase } from './supabase-client.js';

const root=document.getElementById('careerGalleryGrid');
const filters=document.getElementById('careerGalleryFilters');
const dialog=document.getElementById('careerGalleryDialog');
const viewer=document.getElementById('careerGalleryModalMedia');
const title=document.getElementById('careerGalleryModalTitle');
const caption=document.getElementById('careerGalleryModalCaption');
let all=[],shown=[],active='All',index=0,previousFocus=null;

const node=(tag,text='',className='')=>{
 const element=document.createElement(tag);
 if(text)element.textContent=text;
 if(className)element.className=className;
 return element;
};
const youtubeEmbed=(value)=>{
 try{
  const url=new URL(value);
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:')return null;
  if((host==='youtube.com'||host==='www.youtube.com')&&/^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname))
   return url.origin+url.pathname;
  if(host==='youtu.be'&&/^\/[A-Za-z0-9_-]{11}$/.test(url.pathname))
   return 'https://www.youtube.com/embed/'+url.pathname.slice(1);
 }catch{}
 return null;
};
function isVideo(item){return item.media_type==='video'||item.media_type==='external_video'}
function makeMedia(item,preview=false){
 if(item.media_type==='external_video'){
  const wrap=node('div','','story-media video-thumbnail');
  const icon=node('span','▶','play-symbol');icon.setAttribute('aria-hidden','true');
  wrap.append(icon);
  return wrap;
 }
 if(item.media_type==='video'){
  const wrap=node('div','','story-media video-thumbnail');
  const video=node('video');
  video.src=item.media_url;
  video.muted=true;video.playsInline=true;video.preload='metadata';
  if(preview)video.controls=true;
  wrap.append(video);
  if(!preview){const play=node('span','▶','play-symbol');play.setAttribute('aria-hidden','true');wrap.append(play)}
  return wrap;
 }
 const img=node('img');
 img.src=item.media_url;img.alt=item.alt_text||item.title;
 img.loading=preview?'eager':'lazy';img.decoding='async';
 img.className='story-photo';
 return img;
}
function openAt(n){
 if(!shown[n])return;
 index=n;const item=shown[index];
 previousFocus=document.activeElement;
 viewer.replaceChildren();
 if(item.media_type==='external_video'){
  const embed=youtubeEmbed(item.media_url);
  if(embed){
   const iframe=node('iframe');iframe.src=embed;iframe.title=item.title+' video';
   iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
   iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
   viewer.append(iframe);
  }
 }else viewer.append(makeMedia(item,true));
 title.textContent=item.title;
 caption.textContent=[item.caption,item.category,item.event_date].filter(Boolean).join(' · ');
 if(!dialog.open)dialog.showModal();
}
function story(item,position){
 const article=node('article','','story-item '+(position===0?'story-lead':'story-brief'));
 const button=node('button','','story-open');
 button.type='button';
 button.setAttribute('aria-label','View '+(isVideo(item)?'video: ':'photo: ')+item.title);
 const media=node('div','','story-thumb');media.append(makeMedia(item));
 const content=node('div','','story-copy');
 content.append(node('span',item.category+(isVideo(item)?' · Video':' · Photo'),'story-tag'));
 content.append(node('h3',item.title));
 if(item.caption)content.append(node('p',item.caption,'story-caption'));
 if(item.event_date)content.append(node('time',item.event_date,'story-date'));
 button.append(media,content);
 button.addEventListener('click',()=>openAt(position));
 article.append(button);return article;
}
function render(){
 shown=active==='All'?all:all.filter(item=>item.category===active);
 root.replaceChildren();
 if(!shown.length){root.append(node('p','More genuine photographs and video highlights will appear here as they are published.','story-empty'));return}
 shown.forEach((item,i)=>root.append(story(item,i)));
}
function setFilter(category){
 active=category;
 filters.querySelectorAll('button').forEach(button=>{
  const selected=button.dataset.category===category;
  button.classList.toggle('active',selected);
  button.setAttribute('aria-pressed',String(selected));
 });
 render();
}
for(const category of ['All','Graduation','At Work','Personal','Events']){
 const button=node('button',category,'gallery-filter');
 button.type='button';button.dataset.category=category;
 button.setAttribute('aria-pressed',String(category==='All'));
 button.addEventListener('click',()=>setFilter(category));filters.append(button);
}
document.getElementById('careerGalleryClose').addEventListener('click',()=>dialog.close());
document.getElementById('careerGalleryPrev').addEventListener('click',()=>openAt((index-1+shown.length)%shown.length));
document.getElementById('careerGalleryNext').addEventListener('click',()=>openAt((index+1)%shown.length));
dialog.addEventListener('close',()=>{viewer.replaceChildren();previousFocus?.focus?.({preventScroll:true})});
dialog.addEventListener('keydown',event=>{
 if(event.key==='ArrowLeft'){event.preventDefault();openAt((index-1+shown.length)%shown.length)}
 if(event.key==='ArrowRight'){event.preventDefault();openAt((index+1)%shown.length)}
});
try{
 const {data,error}=await supabase.from('portfolio_gallery').select('*')
  .eq('is_published',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
 if(error)throw error;
 all=(data||[]).filter(item=>Boolean(item.media_url));render();
}catch(error){console.error('Gallery unavailable',error);root.replaceChildren(node('p','Gallery highlights are temporarily unavailable.','story-empty'))}
