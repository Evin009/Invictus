-- 20260709184741_fix_rls_and_security.sql pinned match_bullets' search_path
-- to '' (correctly, to prevent search-path hijacking), but a later migration
-- moved the vector extension into its own `extensions` schema — with an
-- empty search_path, Postgres can no longer resolve the pgvector `<=>`
-- operator, breaking every resume-tailoring RAG lookup ("operator does not
-- exist: extensions.vector <=> extensions.vector"). Re-pin search_path to
-- extensions + public (still not wide open — just the two schemas this
-- function actually needs).
create or replace function match_bullets(query_embedding extensions.vector(1536), match_count int)
returns table (bullet_text text, similarity float)
language plpgsql
set search_path = extensions, public
as $$
begin
    return query
    select rb.bullet_text, 1 - (rb.embedding <=> query_embedding) as similarity
    from public.resume_bullets rb
    order by rb.embedding <=> query_embedding
    limit match_count;
end;
$$;
