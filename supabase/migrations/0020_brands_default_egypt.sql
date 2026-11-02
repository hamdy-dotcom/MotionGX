-- =====================================================================
-- MotionGX — 0020_brands_default_egypt.sql
-- Every brand must have its countries now. Brands made before that, with none set, operate in Egypt until edited.
-- =====================================================================
update public.companies set countries = '{EG}' where countries is null or countries = '{}';
