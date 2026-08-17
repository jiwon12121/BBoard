-- Kakao logins without business verification can't request account_email,
-- so profiles.email must tolerate no email at all.
alter table profiles alter column email drop not null;
