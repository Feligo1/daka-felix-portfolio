import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const failures=[];
const admin=read('admin.html'),certs=read('certificates.html'),forms=read('admin-smart-forms.js'),author=read('admin-v2.js'),sql=read('supabase-smart-form-options.sql');
for(const name of ['certName','certIssuer','certNamePreset','certIssuerPreset','galleryTitlePreset','journalTitlePreset','journalTopic','galleryCategory','adminOptionForm','adminOptionList','certLocalPreview','v2-journal-form','v2-gallery-form']){
 if(!admin.includes('id="'+name+'"'))failures.push('Admin missing field/control: '+name);
}
for(const name of ['certificateFileActions','readerStage','modalTitle','certModal','reader-controls','certificatePosition']){
 if(!certs.includes('id="'+name+'"')&&!certs.includes('class="'+name+'"'))failures.push('Certificate viewer missing: '+name);
}
for(const term of ['safeCertificateUrl','renderCertificateViewer','document.createElement(\'iframe\')','document.createElement(\'img\')','Open original document','Open original image','View details','URLSearchParams']){
 if(!certs.includes(term))failures.push('Preview behavior missing: '+term);
}
for(const term of ['fixedPhotoCategories','journalExcerptHelper','slugify','portfolio_form_options','adminOptionForm','certImageFile']){
 if(!forms.includes(term))failures.push('Admin smart form functionality missing: '+term);
}
for(const value of ['Graduation','At Work','Personal','Events']){
 if(!admin.includes('value="'+value+'"'))failures.push('Gallery dropdown missing exact allowed value '+value);
 if(!sql.includes("'"+value+"'"))failures.push('Database options missing photo category '+value);
}
for(const term of ['portfolio_form_options','public.is_portfolio_admin()','enable row level security','on conflict(section,field_name,label)']){
 if(!sql.includes(term))failures.push('Migration is missing: '+term);
}
for(const path of ['admin-smart-forms.js','admin-v2.js']){
 const code=read(path).replace(/^\s*import\s+[^\n]+\n/gm,'').replace(/^\s*export\s+/gm,'');
 try{new Function('return (async()=>{'+code+'})();')}catch(error){failures.push(path+': '+error.message)}
}
for(const match of certs.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
 if(!match[1].trim())continue;
 const code=match[1].replace(/^\s*import\s+[^\n]+\n/gm,'');
 try{new Function('return (async()=>{'+code+'})();')}catch(error){failures.push('Certificate inline script syntax: '+error.message)}
}
const certificateFileCount=(certs.match(/renderCertificateViewer\(/g)||[]).length;
if(certificateFileCount<2)failures.push('Certificate view navigation is not wired');
if(failures.length){console.error('Certificate/admin checks failed:\n'+failures.map(x=>' - '+x).join('\n'));process.exitCode=1}
else console.log('Certificate/admin contract passed: document/image viewer, smart dropdowns, SQL and module syntax verified.');
