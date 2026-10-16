-- Word-level timestamps stored with each voice record
-- (ElevenLabs' own for generated voice, Whisper's for uploaded voice).
alter table public.voiceovers add column words jsonb not null;
