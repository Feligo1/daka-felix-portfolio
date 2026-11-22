import {supabase} from './supabase-client.js';
const escape = value => String(value??'');
export async function loadPublished(table, order='created_at'){const {data,error}=await supabase.from(table).select('*').eq('is_published',true).order(order,{ascending:false});if(error)throw error;return data??[]}
export function el(tag,text='',attrs={}){const node=document.createElement(tag);node.textContent=escape(text);Object.entries(attrs).forEach(([key,value])=>{if(value!=null)node.setAttribute(key,escape(value))});return node}
export function appendTextCard(parent,item,href){const article=el('article','',{class:'card'}),body=el('div','',{class:'body'});if(item.cover_url){const img=el('img','',{src:item.cover_url,alt:item.cover_alt||item.title||'Project image',loading:'lazy'});article.append(img)}body.append(el('h3',item.title),el('p',item.summary||''));const link=el('a','Read more',{href,class:'button secondary'});body.append(link);article.append(body);parent.append(article)}
export function showError(node,message){node.replaceChildren(el('p',message,{class:'empty'}))}
