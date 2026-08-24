-- Content width is a property of the document (shared across everyone
-- viewing it), not a per-viewer preference. Null means "use the default".
alter table documents add column width integer;
