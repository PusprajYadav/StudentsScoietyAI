-- Student Society: allow dedicated social reply routes in AI routing admin

ALTER TABLE public.ai_teacher_model_routes
  DROP CONSTRAINT IF EXISTS ai_teacher_model_routes_tool_type_check;

ALTER TABLE public.ai_teacher_model_routes
  ADD CONSTRAINT ai_teacher_model_routes_tool_type_check CHECK (
    tool_type IN (
      'default',
      'ask_question',
      'notes',
      'summary',
      'quiz',
      'mindmap',
      'image_solver',
      'practical_use',
      'social_reply'
    )
  );

ALTER TABLE public.ai_teacher_usage_logs
  DROP CONSTRAINT IF EXISTS ai_teacher_usage_logs_tool_type_check;

ALTER TABLE public.ai_teacher_usage_logs
  ADD CONSTRAINT ai_teacher_usage_logs_tool_type_check CHECK (
    tool_type IN (
      'ask_question',
      'notes',
      'summary',
      'quiz',
      'mindmap',
      'image_solver',
      'practical_use',
      'social_reply'
    )
  );
