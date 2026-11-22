import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','about.html','projects.html','project.html','expertise.html','certificates.html','journal.html','article.html','recommendations.html','contact.html'];
const expected=['index.html','about.html','projects.html','expertise.html','certificates.html','journal.html','contact.html'];
const failures=[];
const textByPage=new Map();
for(const page of pages){
 const source=fs.readFileSync(path.join(root,page),'utf8');
 textByPage.set(page,source);
 const nav=source.match(/<nav class="primary-nav"[^>]*>[\s\S]*?<\/nav>/);
 const footer=source.match(/<footer class="site-footer">[\s\S]*?<\/footer>/);
 if(!nav){failures.push(page+': missing shared main navigation');continue}
 const links=[...nav[0].matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
 if(JSON.stringify(links)!==JSON.stringify(expected))failures.push(page+': inconsistent navigation '+JSON.stringify(links));
 const current=nav[0].match(/href="([^"]+)" class="active" aria-current="page"/)?.[1];
 const expectedActive=page==='project.html'?'projects.html':page==='article.html'?'journal.html':page==='recommendations.html'?'about.html':page;
 if(current!==expectedActive)failures.push(page+': expected current navigation '+expectedActive+' but found '+current);
 if(!footer)failures.push(page+': missing shared footer');
 if(!source.includes('site-polish-v4.css'))failures.push(page+': missing shared responsive stylesheet');
 if(!source.includes('site-navigation.js'))failures.push(page+': missing common mobile navigation script');
 if(!source.includes('id="mainHeader"'))failures.push(page+': missing standard header');
 if(!source.includes('class="skip-link"'))failures.push(page+': missing skip link');
 if((source.match(/<footer\b/g)||[]).length!==1)failures.push(page+': multiple footers');
}
const allFooters=pages.map(p=>textByPage.get(p)?.match(/<div class="site-footer-links"[\s\S]*?<\/div>/)?.[0]||'');
if(allFooters.some(f=>f!==allFooters[0]))failures.push('Footer links vary between pages');
for(const page of pages){
 const s=textByPage.get(page);
 if(!s)continue;
 for(const match of s.matchAll(/href="([^"]+#[^"]*)"/g)){
  const raw=match[1];
  if(/^(https?:|mailto:|tel:)/.test(raw))continue;
  const [filename,fragment]=raw.split('#');
  if(!fragment||fragment.includes('${'))continue;
  const target=filename?decodeURIComponent(filename.split('?')[0]):page;
  if(!pages.includes(target))continue;
  const body=textByPage.get(target);
  if(body&&!body.includes('id="'+fragment+'"')&&!body.includes("id='"+fragment+"'"))
   failures.push(page+': missing anchor '+raw);
 }
}
const css=fs.readFileSync(path.join(root,'site-polish-v4.css'),'utf8');
for(const phrase of ['.primary-nav','.menu-container','.certificate-row','.expertise-row','#projects','#homeFeaturedProjects','@media(max-width:700px)']){
 if(!css.includes(phrase))failures.push('Responsive stylesheet missing '+phrase);
}
if(failures.length){console.error('Design consistency failed:\n'+failures.map(f=>'  - '+f).join('\n'));process.exitCode=1}
else console.log('Design consistency passed for '+pages.length+' pages: identical navigation, matched links, responsive styling and shared footers.');
