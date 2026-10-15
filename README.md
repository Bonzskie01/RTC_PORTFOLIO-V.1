# Portfolio Studio

A separate, editable portfolio version for OJT applications. The original portfolio files are untouched.

## Run locally

Serve the parent folder with any local web server, then open `portfolio-studio/index.html`.

The public portfolio has a discreet owner-access link in the footer. When Supabase is configured, `login.html` uses the owner account from Supabase Auth and `admin.html` reads and writes the shared PostgreSQL database. Profile details, skills, projects, draft status, and uploaded project images are available across devices.

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to create the database and connect the project. Until valid credentials are placed in `supabase-config.js`, the editor keeps its original browser-local fallback mode.

## Security note

Database mode uses Supabase Auth and PostgreSQL Row-Level Security. Public visitors can read published content, while only a user listed in `portfolio_admins` can modify content or upload images. Never place a Supabase secret or `service_role` key in the frontend.

The browser-local fallback password is only for offline development and is not a replacement for database mode.

## Content backups

Use **Export JSON** in the Content Studio before clearing browser data or moving to another device. Use **Import JSON** to restore that content.

In database mode, importing a backup loads it into the editor; click **Save changes** to publish it to Supabase.
