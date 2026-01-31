
import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase URL and Key
const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Storage Helper for replacement of Firebase Storage
 */
export const uploadImage = async (file: File, bucket: string = 'products') => {
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);
    
  return publicUrl;
};
