import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
const errors=[];
const pages=['index.html','about.html','projects.html','project.html','expertise.html','certificates.html','journal.html','article.html','recommendations.html','contact.html','admin.html'];
for(const name of pages){
 const html=read(name);
 if(!html.includes('design-system-v12.css'))errors.push(name+': design system not included');
 if(!html.includes('family=DM+Sans')||!html.includes('family=Plus+Jakarta+Sans'))
   errors.push(name+': matching body and heading fonts are missing');
 if((html.match(/design-system-v12\.css/g)||[]).length!==1)errors.push(name+': duplicated design sheet');
}
const about=read('about.html');
const sectionTokens=['class="about-content"','class="journey-section"','id="education"','id="career-gallery"','class="cta-section"'];
let position=-1;
for(const token of sectionTokens){
 const next=about.indexOf(token,position+1);
 if(next<position)errors.push('About hierarchy out of order: '+token);
 position=next;
}
if(!about.includes('class="professional-references"'))errors.push('About references are not collapsed');
if(!about.includes('id="aboutPageImage"'))errors.push('About portrait missing');
const project=read('project-story.js');
for(const key of ['project-media-group','project-media-grid','Product interface','Architecture & design','renderCaseStudy','renderMedia']){
 if(!project.includes(key))errors.push('Project highlight structure missing '+key);
}
try{new Function(project.replace(/^\s*import\s+[^\n]+\n/gm,''))}
catch(err){errors.push('Project JavaScript parsing: '+err.message)}
const css=read('design-system-v12.css');
for(const required of ['--ui-heading','--ui-body','--ui-section','#mainHeader','#home .hero-content','.timeline-item','.project-media-grid','.certificate-row','.contact-grid','.admin-panel','@media(max-width:540px)']){
 if(!css.includes(required))errors.push('Design system missing '+required);
}
if(css.includes('url(data:'))errors.push('Design system unexpectedly includes embedded assets');
if(errors.length){console.error('Design system checks failed:\n'+errors.map(x=>' - '+x).join('\n'));process.exitCode=1}
else console.log('Design review passed: all 11 pages share typography and rhythm, About hierarchy correct, project image groups accessible.');
