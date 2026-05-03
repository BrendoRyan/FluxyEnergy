import { createClient } from '@supabase/supabase-js'

// Substitua pelas chaves reais do seu projeto no Supabase
const supabaseUrl = 'SUA_PROJECT_URL_AQUI'
const supabaseKey = 'SUA_ANON_PUBLIC_KEY_AQUI'

export const supabase = createClient(supabaseUrl, supabaseKey)