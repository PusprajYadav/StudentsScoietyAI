CREATE OR REPLACE FUNCTION public.list_visible_community_member_counts()
RETURNS TABLE (
  community_id UUID,
  member_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS community_id,
    COUNT(cm.id)::BIGINT AS member_count
  FROM public.communities AS c
  LEFT JOIN public.community_members AS cm
    ON cm.community_id = c.id
   AND cm.status = 'active'
  WHERE public.can_discover_community(c.id)
  GROUP BY c.id;
$$;

GRANT EXECUTE ON FUNCTION public.list_visible_community_member_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_visible_community_member_counts() TO anon;
