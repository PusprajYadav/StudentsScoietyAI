import{aI as s}from"./index-DDYduDT4.js";function c(e){return!!(e&&typeof e=="object"&&"code"in e&&e.code==="23505")}async function d(e){const{data:r,error:t}=await s.from("account_deletion_requests").select("*").eq("user_id",e).order("created_at",{ascending:!1}).limit(1).maybeSingle();if(t)throw t;return r}async function _({userId:e,email:r,usernameSnapshot:t,fullNameSnapshot:n,reason:a}){const o=(a==null?void 0:a.trim())||null,{data:u,error:i}=await s.from("account_deletion_requests").insert({user_id:e,email:(r==null?void 0:r.trim().toLowerCase())||null,username_snapshot:t,full_name_snapshot:n.trim(),reason:o}).select("*").single();if(i)throw c(i)?new Error("You already have a pending delete request."):i;return u}async function f(e,r){const{data:t,error:n}=await s.from("account_deletion_requests").delete().eq("id",e).eq("user_id",r).select("id");if(n)throw n;if(!(t!=null&&t.length))throw new Error("That delete request could not be removed.")}async function m(e=120){const{data:r,error:t}=await s.from("account_deletion_requests").select(`
        *,
        user:profiles!account_deletion_requests_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        ),
        reviewed_by:profiles!account_deletion_requests_reviewed_by_user_id_fkey(
          id,
          username,
          full_name
        )
      `).order("created_at",{ascending:!1}).limit(e);if(t)throw t;return r||[]}async function w(e){var n;const{data:r,error:t}=await s.from("account_deletion_requests").update({status:e.nextStatus,review_note:((n=e.reviewNote)==null?void 0:n.trim())||null,reviewed_by_user_id:e.adminUserId,reviewed_at:new Date().toISOString(),cancelled_at:e.nextStatus==="cancelled"?new Date().toISOString():null}).eq("id",e.requestId).select(`
        *,
        user:profiles!account_deletion_requests_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        ),
        reviewed_by:profiles!account_deletion_requests_reviewed_by_user_id_fkey(
          id,
          username,
          full_name
        )
      `).single();if(t)throw t;return r}export{m as a,_ as c,f as d,d as l,w as r};
