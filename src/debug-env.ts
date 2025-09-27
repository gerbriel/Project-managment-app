// Debug environment variables for GitHub Pages deployment
console.log('=== Environment Debug ===');
console.log('Mode:', import.meta.env.MODE);
console.log('Prod:', import.meta.env.PROD);
console.log('Dev:', import.meta.env.DEV);
console.log('Base URL:', import.meta.env.BASE_URL);
console.log('Supabase URL exists:', !!(import.meta.env.VITE_SUPABASE_URL));
console.log('Supabase Key exists:', !!(import.meta.env.VITE_SUPABASE_ANON_KEY));
console.log('Current Origin:', typeof window !== 'undefined' ? window.location.origin : 'server-side');
console.log('========================');

export {}; // Make it a module