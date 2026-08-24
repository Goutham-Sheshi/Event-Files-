import { supabase } from './lib/supabase';

function isImageResource(row:any):boolean{
  const format=String(row.file_format||'').toLowerCase().replace(/^\./,'');
  if(['png','jpg','jpeg','gif','webp','svg','avif'].includes(format))return true;
  return /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#].*)?$/i.test(String(row.source_url||''));
}

export async function getManagedResources():Promise<any[]>{
  const {data,error}=await supabase.from('vault_resources').select('*').order('created_at',{ascending:false});
  if(error){console.error('Could not load managed resources:',error.message);return [];}
  return (data||[]).map((row:any)=>({
    id:row.id,title:row.title,description:row.description||undefined,
    type:row.type==='document'?'other':row.type,productId:row.product_id,
    thumbnail:row.thumbnail||(isImageResource(row)?row.source_url:undefined),
    sourceUrl:row.source_url,fileFormat:row.file_format||undefined,fileSize:row.file_size||undefined,
    tags:row.tags||[],viewCount:row.view_count||0,downloadCount:row.download_count||0,
    featured:row.featured||false,createdAt:row.created_at,
  }));
}
