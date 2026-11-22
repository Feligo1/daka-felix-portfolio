/**
 * Static integrity check for GitHub Pages.
 * No external dependencies or network access required: node scripts/verify-site.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html','about.html','expertise.html','certificates.html','contact.html','projects.html','project.html','journal.html','article.html','recommendations.html','admin.html'];
const failures=[];
function checkFile(spec,source){
 if(!spec||spec.startsWith('#')||/^(https?:|mailto:|tel:|data:|blob:|javascript:|\/\/)/i.test(spec)||spec.includes('${')||spec.includes('{{'))return;
 let clean;
 try{clean=decodeURIComponent(spec.split(/[?#]/)[0])}catch{failures.push(source+': invalid URL '+spec);return}
 if(!clean||clean.startsWith('/'))return; // site absolute paths are separately checked in deployment.
 const full=path.resolve(root,path.dirname(source),clean);
 if(!full.startsWith(root+path.sep) && full!==root){failures.push(source+': path escapes repository: '+spec);return}
 if(!fs.existsSync(full))failures.push(source+': missing referenced file '+clean);
}
for(const page of pages){
 const full=path.join(root,page);
 if(!fs.existsSync(full)){failures.push('Missing page '+page);continue}
 const text=fs.readFileSync(full,'utf8');
 for(const m of text.matchAll(/\b(?:href|src|poster)\s*=\s*["']([^"']*)["']/g))checkFile(m[1],page);
 for(const m of text.matchAll(/\b(?:import|from)\s*["'](\.[^"']+)["']/g))checkFile(m[1],page);
}
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.css'))){
 const css=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g))checkFile(m[1],file);
}
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js'))){
 const js=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of js.matchAll(/\bfrom\s*["'](\.[^"']+)["']/g))checkFile(m[1],file);
}
const cv=path.join(root,'assets/documents/Felix_Daka_CV.pdf');
if(!fs.existsSync(cv))failures.push('CV asset missing: assets/documents/Felix_Daka_CV.pdf');
if(failures.length){console.error('Reference check failed:\n'+failures.map(e=>' - '+e).join('\n'));process.exitCode=1}
else console.log('Reference check passed: all checked pages, local files, stylesheets and modules exist.');
