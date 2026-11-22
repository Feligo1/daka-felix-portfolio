import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const pages=['index.html','about.html','projects.html','project.html','expertise.html','certificates.html','journal.html','article.html','recommendations.html','contact.html','admin.html'];
const problems=[];
for(const page of pages){
 const html=read(page);
 if(!html.includes('natural-media-v7.css'))problems.push(page+': image scaling stylesheet not loaded');
}
const css=read('natural-media-v7.css');
for(const selector of [
 'body .newsroom-feed .story-thumb img','body .projects-news-list .project-image',
 'body .project-feature-media .project-media-item img','body .feature-image',
 'body #homeFeaturedProjects .feature-card img','body #certModal .reader-stage img',
 'body .newsroom-modal-media img','body .admin-story-preview img'
])if(!css.includes(selector))problems.push('Missing image selector '+selector);
if(!css.includes('object-fit:contain!important'))problems.push('Missing proportional contain behavior');
if(!css.includes('aspect-ratio:auto!important'))problems.push('Missing natural ratio override');
if(css.includes('body .about-image img{')||css.includes('body .hero .profile-img{'))problems.push('Profile portraits must not be modified');
if(problems.length){console.error('Media checks failed:\n'+problems.map(p=>' - '+p).join('\n'));process.exitCode=1}
else console.log('Natural media check passed: '+pages.length+' pages share uncropped image styles, profile styling unchanged.');
