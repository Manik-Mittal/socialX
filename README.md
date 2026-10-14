<<<<<<< HEAD
# SocialX

Expo / React Native social app with Supabase authentication and account-backed data.

## Run

```bash
npm install
npx expo start --web --clear
```

Copy `.env.example` to `.env.local` and enter the project URL and publishable key.
Never use a secret or service-role key in the app.
Follow [the Supabase setup guide](supabase/README.md) and run the five SQL migrations in order.
Native users need a development build when introducing new native modules.

## Connected features

- Email signup, confirmation, login and session restoration.
- Profile name and bio saved to Supabase.
- Photo/video uploads to a private Supabase Storage bucket, with a 25 MB file limit.
- Published posts, saves and follows persisted in database tables with row-level security.
- Saves visible only to their account owner; signed-in members can read published posts and follow relationships.
- Saved collection includes older saved posts, independent of the current feed page.
- Discover and Reels load posts in batches of 30, with load-more and refresh controls.
- Profile follower/following lists and counts come from account data.
- Creator Studio lives under Profile and shows actual post, reel, saved-post and relationship counts.
- No sample posts, guest demo mode, simulated earnings or campaign figures.
- Chats tab: search people by display name, send text and share reels with an optional message.
- Conversations are persisted with participant-only read access and sender-only inserts.
- Reel sharing stores a post reference, not a duplicate video. Tap a shared reel to watch it.
- Like/unlike and comment counts on feed cards and the reel viewer, with chat sharing alongside them.
- Comments saved with author names, newest-first pagination, and draft-preserving retries.

Likes/comments require `202610140001_engagement.sql`. Counts load from the database on screen focus;
pull to refresh comments to see new entries. One like per account/post is enforced by a primary key.
Comments are visible to signed-in members, limited to 1,000 characters, and deduplicated on retries.
No placeholder counts are used when requests fail. Comment replies, editing and deletion are not included.
After migration, verify like/unlike persistence and comment visibility with two accounts, plus
rejection of writes impersonating another user. Live authorization and persistence are not yet verified.

Chat requires `202610130001_messages.sql`. Open chats poll for new messages every 5 seconds;
the inbox refreshes every 15 seconds while focused and the app is active. There are no push
notifications, read receipts, group chats or end-to-end encryption in this first version.
Failed sends retain the draft and reuse an idempotency nonce on retry. Search returns up to
30 people; history loads in pages of 50. Account search exposes only existing public profile fields.

These features require `202610110001_social.sql` to be applied after the profile migration.
If setup or a request fails, the app displays an error and retry control rather than sample data.
A Save label changes only after the database accepts the write. Uploads must succeed before publication.
Private media links expire after an hour; account refresh, app foregrounding and a 45-minute refresh interval renew them.

## Reel views

Run `supabase/migrations/202610140002_reel_views.sql` once to enable tracking.
Creators see unique view counts on their video cards (including Profile) and in the reel viewer.
Tap the count or return to the screen to refresh it. Other accounts cannot read counts or raw viewer rows.
The client records a view after three accumulated seconds of foreground, focused playback progress;
paused/buffering time and seek jumps do not qualify. The database counts each signed-in viewer once
per reel across devices, excluding the creator. Short videos need enough replay time to qualify.
Tracking begins after setup; historical playback cannot be recovered. This is client-reported beta
analytics, not fraud-resistant evidence for creator payouts.

Verify with two accounts: B watches A's reel for three seconds, A refreshes the count, then B
replays/reloads and the count stays unchanged. A's own plays must not increment it. Verify B cannot
call the creator-count function for A or select viewer rows. Live database/device checks are pending.

## Camera effects

Create → Record reel opens the web camera studio. Color filters and sparkle/heart/vignette
layers are composited into the video. Requires HTTPS or localhost and browser support
for MediaRecorder and canvas capture. Unsupported color filters are disabled.
The native app uses its standard camera; face tracking and native recording effects
are not implemented. Recordings become persistent only after Post reel succeeds.

## Verification

```bash
npx expo lint
npx tsc --noEmit
node --test scripts/social.test.cjs
node --test scripts/chat.test.cjs
```

The local tests use simulated service responses and never access real accounts.
They cover failed saves, idempotency, media validation, and cleanup after ambiguous uploads.
They do not replace live authorization and device tests.

After applying SQL, test with two accounts:

1. Publish a small photo and video as A. Refresh and sign back in; both must remain.
2. As B, view A's posts, save one, follow A, refresh, and verify both persist.
3. As A, refresh Profile and verify B appears as a follower.
4. As B, unsave/unfollow; refresh and verify removal.
5. Test with networking disabled: failed writes must not show success.
6. Verify direct API requests cannot read another user's saves or write on another user's behalf.
7. Verify anonymous requests are denied; oversized/unsupported uploads fail.
8. Apply the chat migration. As A, find B by name and send text. As B, open Chats,
   reply and verify both sides retain the conversation after reload.
9. Share an uploaded reel to B, with and without text; open it from B's chat, save it,
   and verify it appears in Saved. Sharing must not create another storage object.
10. As an unrelated account C, attempt to select the A/B messages by ID through the client API;
    no rows should be returned. Attempts to impersonate A or edit messages must fail.
11. Test a failed send and retry, checking only one row is committed. Load more than 50
    messages and verify earlier-history pagination. Delete a disposable test reel as its owner
    only in a test project; its shared message should remain with an unavailable label.

Chat implementation checks: lint and TypeScript passed. The automated chat tests were blocked
by sandbox subprocess permissions and the escalation request was declined; they were not executed.
Live two-account and third-account authorization checks remain required after migration.

## Remaining work

Live migration and two-account tests must pass before calling the feature verified.
Video transcoding, server-side duration/content inspection, moderation, resumable large uploads,
notifications, brand campaigns and payouts are not implemented.
Uploaded codecs must be supported by the viewing device. Use MP4/H.264 for broad compatibility.
This upload path is intended for a small controlled beta, not an unrestricted public launch.
=======
# socialX
>>>>>>> origin/main
