# Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**, paste `supabase/migrations/001_portfolio.sql`, and run it once.
3. In **Authentication > Users**, create the single portfolio owner account.
4. Copy that user's UUID and run:

   ```sql
   insert into public.portfolio_admins (user_id)
   values ('PASTE_AUTH_USER_UUID_HERE');
   ```

5. From **Project Settings > API**, copy the Project URL and the publishable key.
6. Put those two public values in `supabase-config.js`. Never place the `service_role` or secret key in this folder.
7. Serve the project over HTTP and open `login.html`. Sign in with the owner account created in step 3.

The public site may read the profile, skills, and published projects. Only a UUID listed in `portfolio_admins` can write content or upload project images.
