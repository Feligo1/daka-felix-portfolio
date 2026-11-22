import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('admin.html'),js=read('admin-v2.js'),slugs=read('admin-smart-forms.js'),css=read('admin-projects-v10.css');
const errors=[];
for(const marker of ['v2-showcase-form','v2-showcase-list','v2-media-project','v2-project-media-form','v2-media-list','project-editor-group','project-field-grid']){
 if(!html.includes('id="'+marker+'"')&&!html.includes('class="'+marker+'"'))errors.push('Missing project editor '+marker);
}
for(const field of ['title','slug','summary','description','category','technologies','github_url','demo_url','media_file','is_published']){
 if(!html.includes('name="'+field+'"'))errors.push('Missing expected field '+field);
}
if(!html.includes('admin-projects-v10.css'))errors.push('Missing project editor CSS');
for(const phrase of ["for(const p of data??[])","p.is_published?' · Published':' · Draft'","Choose a saved project","if(section==='showcase')","refreshProjectMedia()","project-media-preview","query.select('id').single()"]){
 if(!js.includes(phrase))errors.push('Missing draft-media workflow: '+phrase);
}
if(!slugs.includes("const projectForm=get('#v2-showcase-form')"))errors.push('Project slugs not automatic');
if(!css.includes('@media(max-width:740px)'))errors.push('Missing responsive layout');
for(const file of ['admin-v2.js','admin-smart-forms.js']){
 const code=read(file).replace(/^\s*import\s+[^\n]+\n/gm,'').replace(/^\s*export\s+/gm,'');
 try{new Function('return (async()=>{'+code+'})();')}catch(e){errors.push(file+' syntax: '+e.message)}
}
if(errors.length){console.error('Project editor checks failed:\n'+errors.map(e=>' - '+e).join('\n'));process.exitCode=1}
else console.log('Project editor check passed: drafts, upload selection, project form, mobile styles and scripts.');
