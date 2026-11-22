import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const js=read('project-story.js'),html=read('project.html'),css=read('farmconnect-case-study-v11.css');
const errors=[];
if(!js.includes('renderCaseStudy'))errors.push('Project JS missing section renderer');
for(const phrase of ['project-chapter-title','project-chapter-paragraph','project-chapter-list']){
 if(!js.includes(phrase))errors.push('Project JS missing '+phrase);
 if(!css.includes(phrase))errors.push('Project stylesheet missing '+phrase);
}
for(const phrase of ['id="details"','farmconnect-case-study-v11.css','project-story.js?v=11']){
 if(!html.includes(phrase))errors.push('Project HTML missing '+phrase);
}
if(html.includes('<p id="details">'))errors.push('Invalid nested paragraph container remains');
try{new Function(js.replace(/^\s*import[^\n]+\n/gm,''))}catch(e){errors.push('Project JS syntax: '+e.message)}
const manifest=read('docs/farmconnect-media-manifest.md');
if(!manifest.includes('03_price_forecasting.png')||!manifest.includes('portfolio media checklist'))errors.push('Report media manifest missing entries');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}
else console.log('Capstone case study content viewer and media upload checklist verified.');
