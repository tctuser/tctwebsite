-- Optional matching details for the member-only tennis partner board.
alter table public.partner_requests
  add column if not exists age_group text
    check (age_group is null or char_length(age_group) between 1 and 40),
  add column if not exists team text
    check (team is null or char_length(team) between 1 and 100);
