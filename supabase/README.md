# Connect SocialX to Supabase

The app connects accounts, profiles, posts, saves, follows and media uploads.
All three migrations below must be applied. Creator payments are not implemented.

## 1. Create your project

1. Open https://supabase.com/dashboard and sign in.
2. Create an organization if prompted; choose the Free plan.
3. Choose New project, name it SocialX, and pick a region near your initial users.
4. Generate a strong database password and save it in your password manager. Do not send it in chat or put it in the app.
5. Wait until project provisioning completes.

## 2. Create the profile table

Open SQL Editor → New query. Paste the complete contents of
`migrations/202610050001_profiles.sql` and run it once on the new project.
The migration runs in a transaction and creates the profile table, signup trigger,
row-level security policies, and profiles for any existing accounts.
Do not rerun it after success; subsequent changes belong in a new migration.

Next, open a new SQL query and run `migrations/202610110001_social.sql` once.
This creates posts, private saved-post records, follow relationships and a private
`socialx-media` bucket with a 25 MB per-file limit. Do not rerun the profile migration.
The app shows a setup error until the social tables are present.

For messaging, run `migrations/202610130001_messages.sql` once in a new SQL query.
It creates the messages table and `chat_inbox` function. Only the sender and recipient
can read a message; inserts must use the signed-in sender. Shared videos reference posts,
and deleting a post leaves an unavailable attachment in the conversation. No Realtime
publication setup is required: this version refreshes active chats periodically.

Profiles are readable by signed-in users. Only the owner can edit their name/bio.
Client accounts cannot insert/delete profile rows or change account IDs.
Email and passwords are not copied into the public profile table.

## 3. Add the app connection details

Find the project URL and publishable key in the project's Connect dialog
or Settings → API Keys. Use the publishable key, never a secret/service-role key.
Copy the root `.env.example` to `.env.local` without replacing an existing configuration:

```powershell
Copy-Item .env.example .env.local
```

Fill in `.env.local`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
EXPO_PUBLIC_AUTH_REDIRECT_URL=http://localhost:8081/login
```

The two connection values are public client configuration. Row-level security protects
the database. `.env.local` is ignored by Git.

## 4. Set up email authentication

In Authentication, enable Email sign-in and keep Confirm email enabled.
In URL Configuration, use `http://localhost:8081` for the local Site URL and allow
`http://localhost:8081/login` as a redirect. Match the actual port if Expo uses another one.

For phone or shared testing, use a reachable web URL instead of localhost and update
the allowlist and `EXPO_PUBLIC_AUTH_REDIRECT_URL`. A temporary tunnel may expire.
Native users can confirm in the web page and then log in on their phone.

Supabase's built-in email sender is restricted for testing. Configure a custom SMTP
provider before inviting other users; see https://supabase.com/docs/guides/auth/auth-smtp.
Do not disable email confirmation to work around delivery errors.

## 5. Restart and verify

```powershell
npx expo start --web --clear
```

Create an account, confirm the email, and log in.
Edit the profile name/bio, save, refresh, and confirm both values persist.
Log out and back in to verify persistence again. Test a failed save with networking
disabled: the form must remain open and must not claim success.

Before inviting users, use two test accounts to verify database authorization:

- Account A can select profiles and update its own name/bio.
- Account B cannot update A's row, including through a direct Supabase API request.
- An unauthenticated request cannot read or update profiles.
- A client cannot change its profile ID or insert/delete profiles.

Use signed-in client requests for these checks: SQL Editor runs with administrative
privileges and normal queries there do not test RLS.

Re-export the web app after setting environment variables if using the static sharing
server: `npx expo export --platform web --output-dir dist`.

## Verify social features

Publish a small photo or video, save it, and reload. Verify it remains in Profile and
Saved. Use a second account to verify following and that saves are private. See the
root README for the full live test checklist. Local tests cannot verify hosted RLS.

Use Refresh account on Profile or pull to refresh on Discover/Saved to reload data.
Video processing, moderation and payments need separate implementation.
