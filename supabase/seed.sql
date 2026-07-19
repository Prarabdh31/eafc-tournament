-- Dev dummy data: 8 players, skill ranked 1 (lowest) - 8 (highest), and an FC26 club pool.
-- Safe to re-run: clears existing rows first.

truncate table draft_picks, matches, awards restart identity cascade;
delete from players;
delete from teams;
update tournament_state set phase = 'pre_draft', current_match_id = null where id = 1;

insert into players (name, skill_rank) values
  ('Aarav', 1),
  ('Kabir', 2),
  ('Rohan', 3),
  ('Vikram', 4),
  ('Ishaan', 5),
  ('Dev', 6),
  ('Arjun', 7),
  ('Sameer', 8);

insert into teams (name) values
  ('Real Madrid'),
  ('Manchester City'),
  ('Bayern Munich'),
  ('Paris Saint-Germain'),
  ('Liverpool'),
  ('Barcelona'),
  ('Inter Milan'),
  ('Arsenal');
