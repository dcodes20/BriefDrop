# BriefDrop

Practice playground for creators. The static site can connect to Supabase for
email authentication, a shared brief catalog, private saved briefs and
reflections, and private practice-journal check-ins.

## Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In the Supabase SQL Editor, run the complete
   [`supabase/schema.sql`](supabase/schema.sql) script. It creates the tables,
   row-level security policies, and three starter briefs.
3. In **Project Settings → API**, copy the Project URL and the public
   anon/publishable key into [`supabase-config.js`](supabase-config.js):

   ```js
   export const SUPABASE_URL = 'https://your-project.supabase.co';
   export const SUPABASE_ANON_KEY = 'your-public-anon-or-publishable-key';
   ```

   These values are intended for the browser. Never put a service-role key or
   database password in frontend code.
4. In **Authentication → URL Configuration**, set the site URL to your
   deployment (for example, `https://briefdrop-site.vercel.app`) and add the
   full URLs below to the allowed redirect URLs, replacing the host with your
   deployed domain as needed:

   - `https://your-site.example/index.html` for completed sign-in and OAuth
   - `https://your-site.example/signin.html` for email confirmation
   - `https://your-site.example/signin.html?mode=recovery` for password resets
   - `http://localhost:8000/index.html`
   - `http://localhost:8000/signin.html`
   - `http://localhost:8000/signin.html?mode=recovery`

   Email confirmation is enabled by default; new users will need to confirm
   their email before signing in. The sign-in and sign-up pages use Supabase
   Auth directly, including password-reset emails and password updates.
5. If you want Google or Apple sign-in, enable and configure those providers
   under **Authentication → Providers** in Supabase. Their buttons report a
   configuration error until the provider is enabled.
6. Redeploy the static site. The page must be served over HTTP(S); opening
   `index.html` directly as a `file://` URL will not load JavaScript modules.

For local development, serve this folder with `python -m http.server 8000` and
open `http://localhost:8000`. Add that URL to Supabase's allowed redirect URLs.

The starter catalog remains visible before setup, but account features require
the database and public browser credentials. Supabase row-level security keeps
each user's saved briefs, reflections, and journal entries private.
