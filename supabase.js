
const SUPABASE_URL = "https://mewsyurhvbvyucbnwtdk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ld3N5dXJodmJ2eXVjYm53dGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODkwODcsImV4cCI6MjA4ODI2NTA4N30.JEcHfLtBmH6I5PR6g2WBXz9w1UBDZ2LD4M2FUTGviWA";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// make it global
window.supabaseClient = supabaseClient;




