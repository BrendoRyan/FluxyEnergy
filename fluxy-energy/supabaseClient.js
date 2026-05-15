import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yaikuzgtcgmkzvhwuorn.supabase.co'
const SUPABASE_KEY = 'sb_publishable_TtlSmxnnfkAm7tx_uqzy7w_6IrRkUQk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)