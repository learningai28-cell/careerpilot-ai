-- Security fixes. Safe to run while the current app is live, and safe to
-- run twice. Run it right after 0009.
--
-- 1. Free Pro via delete + re-insert of your own profile.
--    0008 revoked UPDATE on profiles but 0001 also granted INSERT and
--    DELETE, under a `for all` policy. So any signed-in user could run,
--    from the browser console:
--
--      await supabase.from('profiles').delete().eq('id', me)
--      await supabase.from('profiles').insert({ id: me, plan: 'pro' })
--
--    which gives Pro with pro_expires_at = null (= never expires in
--    consume_usage), and the delete cascades to usage_events so the
--    monthly counters reset too. The app never inserts or deletes profiles
--    from the browser (handle_new_user creates the row, and account
--    deletion cascades from auth.users), so both grants can go.
revoke insert, delete on public.profiles from authenticated;

-- 2. Resume bucket had no server-side size or type limit. The 8 MB / PDF /
--    DOCX check only ran in the browser, so anyone could upload large or
--    arbitrary files straight to Storage (storage cost, and analyze-resume
--    would try to parse them).
update storage.buckets
set file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'resumes';

-- 3. Supabase's default privileges had also granted TRUNCATE, REFERENCES and
--    TRIGGER on every public table to anon and authenticated. TRUNCATE skips
--    RLS entirely (it would wipe every user's rows). The Data API can't issue
--    it today, but nothing in the app needs these, so remove them.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t.tablename);
  end loop;
end $$;
