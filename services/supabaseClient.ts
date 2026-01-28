import { createClient } from '@supabase/supabase-js';

// Credentials provided by the user
const supabaseUrl = 'https://dsrvebvjqslshyaoinlt.supabase.co';
const supabaseKey = 'sb_publishable_-T27UVP1yO66pHswqID5gA_bCe0UPtf'; 

export const supabase = createClient(supabaseUrl, supabaseKey);