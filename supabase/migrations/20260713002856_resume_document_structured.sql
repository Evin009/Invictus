-- Structured resume data (name, contact, education, condensed work-history
-- bullets, skills) alongside the LaTeX. Previously only tex_content was
-- kept, so the Resume page had no reliable way to show "your resume" other
-- than embedding the original upload or displaying raw LaTeX — neither of
-- which reflects what actually got converted. This is the same data used
-- to build tex_content, kept in sync at generation time.
alter table resume_document
  add column if not exists structured jsonb;
