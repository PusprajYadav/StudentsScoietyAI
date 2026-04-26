-- Student Society: BugFix Lab question bank for app and PHP-backed admin delivery

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bugfix_language') THEN
    CREATE TYPE public.bugfix_language AS ENUM (
      'javascript',
      'python',
      'java',
      'cpp',
      'csharp',
      'c',
      'ruby',
      'php',
      'html',
      'css'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bugfix_difficulty') THEN
    CREATE TYPE public.bugfix_difficulty AS ENUM ('easy', 'medium', 'hard');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bugfix_question_status') THEN
    CREATE TYPE public.bugfix_question_status AS ENUM ('draft', 'published', 'archived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bugfix_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  language public.bugfix_language NOT NULL,
  difficulty public.bugfix_difficulty NOT NULL DEFAULT 'easy',
  prompt TEXT NOT NULL,
  broken_code TEXT NOT NULL,
  solution_code TEXT NOT NULL,
  hint TEXT,
  explanation TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  time_limit_seconds INTEGER NOT NULL DEFAULT 90 CHECK (time_limit_seconds BETWEEN 15 AND 1800),
  points INTEGER NOT NULL DEFAULT 100 CHECK (points BETWEEN 10 AND 5000),
  status public.bugfix_question_status NOT NULL DEFAULT 'draft',
  reference_pdf_url TEXT,
  reference_pdf_name TEXT,
  reference_pdf_storage_path TEXT,
  reference_pdf_size_bytes BIGINT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(title)) BETWEEN 3 AND 160),
  CHECK (char_length(btrim(prompt)) BETWEEN 8 AND 12000),
  CHECK (char_length(btrim(broken_code)) BETWEEN 4 AND 40000),
  CHECK (char_length(btrim(solution_code)) BETWEEN 4 AND 40000)
);

CREATE INDEX IF NOT EXISTS idx_bugfix_questions_status_language_difficulty
ON public.bugfix_questions(status, language, difficulty, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_bugfix_questions_updated_at
ON public.bugfix_questions(updated_at DESC);

DROP TRIGGER IF EXISTS bugfix_questions_set_updated_at ON public.bugfix_questions;
CREATE TRIGGER bugfix_questions_set_updated_at
BEFORE UPDATE ON public.bugfix_questions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bugfix_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bugfix_questions_read_published_or_admin" ON public.bugfix_questions;
CREATE POLICY "bugfix_questions_read_published_or_admin"
ON public.bugfix_questions FOR SELECT
USING (
  status = 'published'
  OR public.is_admin()
);

DROP POLICY IF EXISTS "bugfix_questions_insert_admins" ON public.bugfix_questions;
CREATE POLICY "bugfix_questions_insert_admins"
ON public.bugfix_questions FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "bugfix_questions_update_admins" ON public.bugfix_questions;
CREATE POLICY "bugfix_questions_update_admins"
ON public.bugfix_questions FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "bugfix_questions_delete_admins" ON public.bugfix_questions;
CREATE POLICY "bugfix_questions_delete_admins"
ON public.bugfix_questions FOR DELETE
USING (public.is_admin());

INSERT INTO public.bugfix_questions (
  id,
  title,
  language,
  difficulty,
  prompt,
  broken_code,
  solution_code,
  hint,
  explanation,
  tags,
  time_limit_seconds,
  points,
  status
)
VALUES
  (
    '1d56fb11-97e7-4a4b-8c03-5f14866ff101',
    'JavaScript Sum Function',
    'javascript',
    'easy',
    'Fix the syntax errors so the function correctly accepts two numbers and returns their sum.',
    E'function calculateSum(a b) {\n  return a + b\n}',
    E'function calculateSum(a, b) {\n  return a + b;\n}',
    'Look at the parameter list first, then finish the statement.',
    'This challenge checks basic JavaScript function syntax: parameters need commas and statements should be terminated consistently.',
    ARRAY['functions', 'syntax', 'basics'],
    60,
    100,
    'published'
  ),
  (
    'f8ad4433-4a97-4a96-8b8a-1dd547f2c102',
    'Python Average Calculator',
    'python',
    'easy',
    'Repair the function so it returns the average of the list instead of throwing a syntax error.',
    E'def average(values)\n    return sum(values) / len(values)',
    E'def average(values):\n    return sum(values) / len(values)',
    'Python function definitions require a trailing character after the parameter list.',
    'The only bug is the missing colon after the function signature.',
    ARRAY['python', 'functions'],
    45,
    90,
    'published'
  ),
  (
    '65be1d48-5fb4-4d1d-9826-6b4b3ffec103',
    'Java Loop Printer',
    'java',
    'medium',
    'Fix the loop and class syntax so the code prints numbers from 0 to 4.',
    E'public class Main {\n  public static void main(String[] args) {\n    for(int i = 0; i < 5; i++ {\n      System.out.println(i);\n    }\n  }\n}',
    E'public class Main {\n  public static void main(String[] args) {\n    for (int i = 0; i < 5; i++) {\n      System.out.println(i);\n    }\n  }\n}',
    'Focus on the loop header.',
    'Java for-loops need parentheses around the initializer, condition, and increment clauses.',
    ARRAY['java', 'loops'],
    75,
    130,
    'published'
  ),
  (
    '24fe8fb4-3737-4560-9a8a-f732ec21d104',
    'CSS Card Shadow',
    'css',
    'easy',
    'Make the card shadow declaration valid CSS.',
    E'.card {\n  box-shadow 0 10px 24px rgba(15, 23, 42, 0.18);\n  border-radius: 18px;\n}',
    E'.card {\n  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);\n  border-radius: 18px;\n}',
    'CSS property names must be followed by punctuation before the value.',
    'The fix is a missing colon in the property declaration.',
    ARRAY['css', 'ui'],
    35,
    80,
    'published'
  ),
  (
    '9fa4d587-fd8e-4a7a-aa83-1f250f13c105',
    'HTML Login Form',
    'html',
    'medium',
    'Correct the markup so the password input and button render properly inside the form.',
    E'<form>\n  <input type="email" placeholder="Email">\n  <input type="password" placeholder="Password"\n  <button type="submit">Sign in</button>\n</form>',
    E'<form>\n  <input type="email" placeholder="Email" />\n  <input type="password" placeholder="Password" />\n  <button type="submit">Sign in</button>\n</form>',
    'One input element is never closed.',
    'The password input needs a closing bracket, and self-closing inputs make the markup clearer.',
    ARRAY['html', 'forms'],
    55,
    100,
    'published'
  ),
  (
    'c8dc5162-0545-467f-9ba3-aa4446cff106',
    'PHP Array Count',
    'php',
    'medium',
    'Fix the PHP syntax so the script can count the items in the array.',
    E'<?php\n$items = ["pen", "book", "bag"]\necho count($items);\n',
    E'<?php\n$items = ["pen", "book", "bag"];\necho count($items);\n',
    'The array declaration is missing statement punctuation.',
    'PHP statements must end with semicolons.',
    ARRAY['php', 'arrays'],
    45,
    95,
    'published'
  )
ON CONFLICT (id) DO NOTHING;
