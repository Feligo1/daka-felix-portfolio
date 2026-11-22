import { supabase } from './supabase-client.js';

const root = document.getElementById('careerGalleryGrid');
const filters = document.getElementById('careerGalleryFilters');
const dialog = document.getElementById('careerGalleryDialog');
const viewer = document.getElementById('careerGalleryModalMedia');
const viewerTitle = document.getElementById('careerGalleryModalTitle');
const viewerCaption = document.getElementById('careerGalleryModalCaption');
const previousButton = document.getElementById('careerGalleryPrev');
const nextButton = document.getElementById('careerGalleryNext');
const closeButton = document.getElementById('careerGalleryClose');
const profile = document.getElementById('aboutPageImage')?.src ||
  'https://pthcviwhcsluovdekjub.supabase.co/storage/v1/object/public/portfolio-images/profile_image_url/1794735080386_7mvk2.webp';
let profileUrl = profile;
let posts = [];
let visible = [];
let category = 'All';
let currentIndex = 0;
let returnFocus = null;

const elem = (tag, text = '', className = '') => {
  const e = document.createElement(tag);
  if (text !== '') e.textContent = String(text);
  if (className) e.className = className;
  return e;
};
const youtubeEmbed = (value) => {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return null;
    if ((u.hostname === 'youtube.com' || u.hostname === 'www.youtube.com') &&
        /^\/embed\/[a-zA-Z0-9_-]{11}$/.test(u.pathname)) return u.origin + u.pathname;
    if (u.hostname === 'youtu.be' && /^\/[a-zA-Z0-9_-]{11}$/.test(u.pathname))
      return 'https://www.youtube.com/embed/' + u.pathname.slice(1);
  } catch {}
  return null;
};
const readableDate = (value) => {
  if (!value) return '';
  const d = new Date(value.length === 10 ? value + 'T12:00:00' : value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-ZM', {day:'numeric', month:'long', year:'numeric'}).format(d);
};
const mediaType = (post) => ['image','video','external_video'].includes(post.media_type) ? post.media_type : 'image';
const safeUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch { return '' }
};
function makePicture(post, expanded = false) {
  const img = elem('img','','feed-post-image');
  img.src = safeUrl(post.media_url);
  img.alt = post.alt_text || post.title || 'Career photograph';
  img.loading = expanded ? 'eager' : 'lazy';
  img.decoding = 'async';
  return img;
}
function makeVideo(post) {
  const video = elem('video','','feed-post-video');
  video.src = safeUrl(post.media_url);
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;
  video.setAttribute('aria-label', post.title + ' — video');
  return video;
}
function makeEmbed(post) {
  const embed = youtubeEmbed(post.media_url);
  if (!embed) return elem('p','This video link is unavailable.','feed-video-error');
  const frame = elem('iframe','','feed-post-embed');
  frame.src = embed;
  frame.title = post.title + ' — video';
  frame.loading = 'lazy';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.allowFullscreen = true;
  frame.setAttribute('allow','accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
  return frame;
}
function renderViewerMedia(post) {
  viewer.replaceChildren();
  switch(mediaType(post)) {
    case 'image': viewer.append(makePicture(post,true)); break;
    case 'video': viewer.append(makeVideo(post)); break;
    case 'external_video': viewer.append(makeEmbed(post)); break;
  }
}
function showMedia(position) {
  if (!visible[position]) return;
  const opening = !dialog.open;
  if (opening) returnFocus = document.activeElement;
  currentIndex = position;
  const post = visible[position];
  viewerTitle.textContent = post.title;
  viewerCaption.textContent = [post.caption,readableDate(post.event_date||post.created_at)].filter(Boolean).join(' · ');
  renderViewerMedia(post);
  previousButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex === visible.length - 1;
  if (opening) dialog.showModal();
}
function postCard(post, index) {
  const article = elem('article','','fb-feed-post');
  article.id = 'story-' + post.id;
  const header = elem('div','','fb-post-header');
  const avatar = elem('img','','fb-post-avatar');
  avatar.src = profileUrl;
  avatar.alt = '';
  avatar.loading = 'lazy';
  const identity = elem('div','','fb-post-identity');
  identity.append(elem('strong','Felix Daka'));
  const detail = elem('div','','fb-post-meta');
  const dateText = readableDate(post.event_date || post.created_at);
  detail.append(elem('span',[dateText,post.category].filter(Boolean).join(' · ')));
  const globe = elem('span','◉','fb-post-public');
  globe.title = 'Public portfolio update';
  globe.setAttribute('aria-label','Public post');
  detail.append(globe);
  identity.append(detail);
  header.append(avatar,identity);
  article.append(header);

  const content = elem('div','','fb-post-text');
  const headline = elem('h3',post.title);
  content.append(headline);
  if (post.caption) content.append(elem('p',post.caption));
  article.append(content);

  const media = elem('div','','fb-post-media');
  if (mediaType(post)==='image') {
    const open = elem('button','','fb-photo-open');
    open.type='button';
    open.setAttribute('aria-label','View full photo: '+post.title);
    open.append(makePicture(post));
    open.addEventListener('click',()=>showMedia(index));
    media.append(open);
  } else if (mediaType(post)==='video') {
    media.append(makeVideo(post));
  } else {
    media.append(makeEmbed(post));
  }
  article.append(media);

  const footer = elem('div','','fb-post-actions');
  const view = elem('button',mediaType(post)==='image'?'View full photo':'Open media viewer','fb-action');
  view.type='button';
  view.addEventListener('click',()=>showMedia(index));
  const share = elem('button','Share post','fb-action');
  share.type='button';
  share.addEventListener('click',async()=>{
    const link=location.origin+location.pathname+'#story-'+encodeURIComponent(post.id);
    try{
      if(navigator.share) await navigator.share({title:post.title,url:link});
      else if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(link);
        share.textContent='Link copied';
        setTimeout(()=>share.textContent='Share post',2500);
      } else {
        const a=elem('a','Open post link','fb-action');
        a.href=link;footer.replaceChild(a,share);
      }
    }catch(error){if(error.name!=='AbortError')console.warn('Share unavailable',error)}
  });
  footer.append(view,share);
  article.append(footer);
  return article;
}
function render() {
  visible = category === 'All' ? posts : posts.filter(post=>post.category===category);
  root.replaceChildren();
  if (!visible.length) {
    root.append(elem('p','No posts in this category yet. New stories will appear here when published.','fb-feed-empty'));
    return;
  }
  visible.forEach((post,index)=>root.append(postCard(post,index)));
  const fragment = decodeURIComponent(location.hash.slice(1));
  if (fragment.startsWith('story-')) {
    const target = document.getElementById(fragment);
    target?.scrollIntoView({block:'center'});
  }
}
function setFilter(value) {
  category=value;
  filters.querySelectorAll('button').forEach(button=>{
    const selected=button.dataset.category===value;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  render();
}
for(const name of ['All','Graduation','At Work','Personal','Events']) {
  const b=elem('button',name,'gallery-filter');
  b.type='button';b.dataset.category=name;
  b.setAttribute('aria-pressed',String(name==='All'));
  b.addEventListener('click',()=>setFilter(name));
  filters.append(b);
}
closeButton.addEventListener('click',()=>dialog.close());
previousButton.addEventListener('click',()=>showMedia(currentIndex-1));
nextButton.addEventListener('click',()=>showMedia(currentIndex+1));
dialog.addEventListener('close',()=>{
  viewer.replaceChildren();
  returnFocus?.focus?.({preventScroll:true});
});
dialog.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'&&currentIndex>0){event.preventDefault();showMedia(currentIndex-1)}
  if(event.key==='ArrowRight'&&currentIndex<visible.length-1){event.preventDefault();showMedia(currentIndex+1)}
});
try {
  const [{data,error},{data:picture}] = await Promise.all([
    supabase.from('portfolio_gallery').select('id,title,caption,alt_text,category,event_date,created_at,media_type,media_url,sort_order')
      .eq('is_published',true).order('created_at',{ascending:false}),
    supabase.from('site_settings').select('setting_value').eq('setting_key','profile_image_url').maybeSingle()
  ]);
  if(error) throw error;
  if(safeUrl(picture?.setting_value)) profileUrl=picture.setting_value;
  posts=(data||[]).filter(post=>Boolean(safeUrl(post.media_url)));
  render();
} catch(error) {
  console.error('Could not load the public gallery feed',error);
  root.replaceChildren(elem('p','The photo and video feed is temporarily unavailable.','fb-feed-empty'));
}
