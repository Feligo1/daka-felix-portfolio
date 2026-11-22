import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicPages=['index.html','about.html','certificates.html','expertise.html','contact.html','projects.html','project.html','journal.html','article.html','recommendations.html'];
const errors=[];
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
for(const page of publicPages){
 const html=read(page);
 if(!html.includes('editorial-v5.css'))errors.push(page+': missing editorial style');
 if(html.includes('class="stat-card"')||html.includes('class="stat-item"')||html.includes('class="career-facts"'))errors.push(page+': decorative metric cards remain');
 if(!html.includes('site-polish-v4.css'))errors.push(page+': missing shared navigation design');
}
const home=read('index.html'),about=read('about.html'),certs=read('certificates.html'),admin=read('admin.html');
if(!home.includes('class="career-credentials"'))errors.push('Home: credentials are not inline');
if(home.includes('<section class="home-highlights"'))errors.push('Home: old boxed credential section remains');
if(about.includes('<div class="stats-bar"'))errors.push('About: duplicated stat bar remains');
if(!certs.includes('id="totalCerts"')||!certs.includes('id="thisYearCerts"')||!certs.includes('id="totalIssuers"'))errors.push('Certificates: lost statistics script targets');
for(const id of ['readerStage','previousCertificateBtn','nextCertificateBtn','certificatePosition','certificateCount','certificateProgress','certificateFileActions','modalDetails']){
 if(!certs.includes('id="'+id+'"'))errors.push('Certificate viewer missing '+id);
}
if(!certs.includes('class="certificate-viewer-toolbar"'))errors.push('Certificate viewer missing concise toolbar');
if(!certs.includes('class="certificate-viewer-details"'))errors.push('Certificate viewer missing collapsible details');
if(!admin.includes('admin-editorial-v5.css'))errors.push('Admin: missing new editorial design');
const css=read('editorial-v5.css');
for(const rule of ['.career-credentials','.certificate-row','.contact-grid','.timeline-item','.certificate-viewer-toolbar','.reader-stage','@media(max-width:650px)']){
 if(!css.includes(rule))errors.push('Missing CSS rule '+rule);
}
if(errors.length){console.error('Editorial design audit FAILED:\n'+errors.map(e=>' - '+e).join('\n'));process.exitCode=1}
else console.log('Editorial design audit passed for '+publicPages.length+' pages and the admin dashboard.');
