-- bytea round-trips awkwardly through PostgREST (manual \x hex prefixing on
-- write, hex-decoding on read). Storing the Yjs snapshot as base64 text
-- avoids that entirely and is trivial to encode/decode in the browser.
alter table documents
  alter column yjs_state type text using encode(yjs_state, 'base64');
