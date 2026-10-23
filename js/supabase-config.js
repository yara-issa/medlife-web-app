// js/supabase-config.js

// 1. Credentials from your Supabase Dashboard
const supabaseUrl = 'https://fcoozffkzennorscauej.supabase.co';
const supabaseKey = 'sb_publishable_nlcaUGJAtWi9-lxihmhZRg_3PdJ1huQ';

// 2. Initialize the client
// We use 'window.supabase' (the library) to create our 'db' (the connection)
if (window.supabase) {
    window.db = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log("✅ Database Connection Linked to 'window.db'");
} else {
    console.error("❌ Supabase library missing. Check HTML script tags.");
}