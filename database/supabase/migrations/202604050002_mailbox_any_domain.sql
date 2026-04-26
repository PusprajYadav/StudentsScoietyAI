-- Allow mailbox requests and assignments to use any domain and a wider local-part charset.

ALTER TABLE public.student_mailbox_requests
  DROP CONSTRAINT IF EXISTS student_mailbox_requests_preferred_local_part_check;

ALTER TABLE public.student_mailbox_requests
  ADD CONSTRAINT student_mailbox_requests_preferred_local_part_check
  CHECK (
    char_length(preferred_local_part) >= 1
    AND char_length(preferred_local_part) <= 128
    AND preferred_local_part !~ '\s'
    AND preferred_local_part !~ '@'
  );

ALTER TABLE public.student_mailboxes
  DROP CONSTRAINT IF EXISTS student_mailboxes_local_part_check;

ALTER TABLE public.student_mailboxes
  ADD CONSTRAINT student_mailboxes_local_part_check
  CHECK (
    char_length(local_part) >= 1
    AND char_length(local_part) <= 128
    AND local_part !~ '\s'
    AND local_part !~ '@'
  );
