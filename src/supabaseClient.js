import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://njqmyegvczsnajratjnp.supabase.co';
const supabaseKey = 'sb_publishable_xAEflwp9pcEsIUqWC9nVBA_mMhjME7l';

export const supabase = createClient(supabaseUrl, supabaseKey);
