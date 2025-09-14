-- Check if the canonical function exists
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname LIKE '%transfer_book_ownership_on_completion%'
ORDER BY proname;

-- Check triggers related to book ownership transfer
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname LIKE '%transfer_ownership%'
ORDER BY t.tgname;
