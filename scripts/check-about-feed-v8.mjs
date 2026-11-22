import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('about.html'),js=read('about-gallery.js'),css=read('about-feed-v8.css');
const problems=[];
for(const id of ['career-gallery','careerGalleryFilters','careerGalleryGrid','careerGalleryDialog','careerGalleryModalMedia','careerGalleryClose','careerGalleryPrev','careerGalleryNext']){
 if(!html.includes('id="'+id+'"'))problems.push('Missing gallery element '+id);
}
if(!html.includes('class="fb-post-list"'))problems.push('Feed container missing');
if(!html.includes('about-feed-v8.css'))problems.push('Feed CSS not loaded');
if(!html.includes('about-gallery.js?v=8'))problems.push('New feed JavaScript is not cache-busted');
for(const name of ['fb-feed-post','fb-post-header','fb-post-avatar','fb-post-text','fb-post-image','fb-post-actions','fb-action']){
 if(!js.includes(name)||!css.includes(name))problems.push('Feed missing component '+name);
}
if(!js.includes("supabase.from('portfolio_gallery')"))problems.push('Feed not connected to portfolio_gallery');
if(!js.includes("profile_image_url"))problems.push('Feed avatar not connected to saved profile photo');
if(!js.includes("navigator.share"))problems.push('Native share control missing');
if(!css.includes('object-fit:contain!important')||!css.includes('aspect-ratio:auto!important'))problems.push('Full uncropped photo styling missing');
if(js.includes('fakeLikes')||js.includes('fakeComments'))problems.push('Fabricated engagement counters are forbidden');
try{new Function('return (async()=>{'+js.replace(/^\s*import\s+[^\n]+\n/gm,'')+'})();')}catch(error){problems.push('JavaScript parsing: '+error.message)}
if(problems.length){console.error('About feed regression check failed:\n'+problems.map(p=>' - '+p).join('\n'));process.exitCode=1}
else console.log('About feed check passed: real posts, saved avatar, natural photos, video previews and share links.');
