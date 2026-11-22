import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const errors=[];
const pages=['index.html','about.html','projects.html','project.html','expertise.html','certificates.html','journal.html','article.html','recommendations.html','contact.html','admin.html'];
for(const file of pages){
 const source=read(file);
 if(!source.includes('newsroom-theme-v6.css'))errors.push(file+': original palette missing');
}
const about=read('about.html');
if(!about.includes("setting_key', 'profile_image_url'"))errors.push('About must load main portrait from profile_image_url');
if(about.includes("setting_key', 'about_image_url'"))errors.push('About loads the wrong photo setting');
for(const id of ['careerGalleryGrid','careerGalleryFilters','careerGalleryDialog','careerGalleryModalMedia','careerGalleryClose']){
 if(!about.includes('id="'+id+'"'))errors.push('About media component missing '+id);
}
const project=read('projects.html');
if(!project.includes('projects-news-list')||!project.includes('projects-news.js'))errors.push('Projects page missing editorial news feed');
const detail=read('project.html');
if(!detail.includes('project-feature-media')||!detail.includes('project-story.js'))errors.push('Project case study missing video/image features');
const admin=read('admin.html');
if(!admin.includes('name="external_video"'))errors.push('Admin gallery missing external video field');
if(!admin.includes('video/mp4,video/webm'))errors.push('Admin gallery missing video upload types');
const scripts=['about-gallery.js','projects-news.js','project-story.js','admin-v2.js'];
for(const file of scripts){
 const code=read(file).replace(/^\s*import\s+[^\n]+\n/gm,'').replace(/^\s*export\s+/gm,'');
 try{new Function('return (async()=>{'+code+'})();')}catch(error){errors.push(file+' syntax: '+error.message)}
}
const app=read('admin-v2.js');
if(!app.includes("data.media_type='external_video'")||!app.includes("data.media_type=file.type.startsWith('video/')"))
 errors.push('Admin must save the selected media_type');
const sql=read('supabase-editorial-media-v6.sql');
if(!sql.includes('portfolio_gallery_media_type_check')||!sql.includes('video/mp4'))errors.push('Gallery media migration incomplete');
const css=read('newsroom-theme-v6.css');
for(const rule of ['.newsroom-feed','.story-lead','.projects-news-list','.newsroom-lightbox','.project-feature-media']){
 if(!css.includes(rule))errors.push('Missing theme layout '+rule);
}
if(errors.length){console.error('Newsroom checks failed:\n'+errors.map(x=>' - '+x).join('\n'));process.exitCode=1}
else console.log('Newsroom v6 checks passed: palette, profile image, editorial stories, media publishing and modules.');
