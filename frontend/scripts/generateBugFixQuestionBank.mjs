import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const repoRoot = path.resolve(currentDir, "..");
const outputDir = path.join(repoRoot, "docs", "bugfix-question-bank");

const LANGUAGE_CONFIGS = [
  {
    id: "javascript",
    label: "JavaScript",
    buildBrokenCode: (suffix) => `function solveExample${suffix}(values) {
  const cleaned = values.filter(Boolean)
  return cleaned.lenght
}
`,
    buildSolutionCode: (suffix) => `function solveExample${suffix}(values) {
  const cleaned = values.filter(Boolean);
  return cleaned.length;
}
`,
  },
  {
    id: "python",
    label: "Python",
    buildBrokenCode: (suffix) => `def solve_example_${suffix}(values):
    cleaned = [value for value in values if value]
    return len(cleaned
`,
    buildSolutionCode: (suffix) => `def solve_example_${suffix}(values):
    cleaned = [value for value in values if value]
    return len(cleaned)
`,
  },
  {
    id: "java",
    label: "Java",
    buildBrokenCode: (suffix) => `class SolveExample${suffix} {
    static int solve(int[] values) {
        int total = 0;
        for (int value : values) {
            total += value;
        }
        return total / values.lenght;
    }
}
`,
    buildSolutionCode: (suffix) => `class SolveExample${suffix} {
    static int solve(int[] values) {
        int total = 0;
        for (int value : values) {
            total += value;
        }
        return total / values.length;
    }
}
`,
  },
  {
    id: "cpp",
    label: "C++",
    buildBrokenCode: (suffix) => `#include <vector>

int solveExample${suffix}(const std::vector<int>& values) {
    int total = 0;
    for (int value : values) {
        total += value;
    }
    return total / value.size();
}
`,
    buildSolutionCode: (suffix) => `#include <vector>

int solveExample${suffix}(const std::vector<int>& values) {
    int total = 0;
    for (int value : values) {
        total += value;
    }
    return values.empty() ? 0 : total / static_cast<int>(values.size());
}
`,
  },
  {
    id: "csharp",
    label: "C#",
    buildBrokenCode: (suffix) => `using System.Linq;

public static class SolveExample${suffix}
{
    public static int Solve(int[] values)
    {
        var cleaned = values.Where(value => value > 0).ToArray();
        return cleaned.Lenght;
    }
}
`,
    buildSolutionCode: (suffix) => `using System.Linq;

public static class SolveExample${suffix}
{
    public static int Solve(int[] values)
    {
        var cleaned = values.Where(value => value > 0).ToArray();
        return cleaned.Length;
    }
}
`,
  },
  {
    id: "c",
    label: "C",
    buildBrokenCode: (suffix) => `#include <stddef.h>

int solve_example_${suffix}(const int values[], size_t length) {
    int total = 0;
    for (size_t index = 0; index < length; index++) {
        total += values[index];
    }
    return length == 0 ? 0 : total / lenght;
}
`,
    buildSolutionCode: (suffix) => `#include <stddef.h>

int solve_example_${suffix}(const int values[], size_t length) {
    int total = 0;
    for (size_t index = 0; index < length; index++) {
        total += values[index];
    }
    return length == 0 ? 0 : total / (int) length;
}
`,
  },
  {
    id: "ruby",
    label: "Ruby",
    buildBrokenCode: (suffix) => `def solve_example_${suffix}(values)
  cleaned = values.compact
  cleaned.lenght
end
`,
    buildSolutionCode: (suffix) => `def solve_example_${suffix}(values)
  cleaned = values.compact
  cleaned.length
end
`,
  },
  {
    id: "php",
    label: "PHP",
    buildBrokenCode: (suffix) => `<?php

function solveExample${suffix}(array $values): int
{
    $cleaned = array_filter($values);
    return count($valuess);
}
`,
    buildSolutionCode: (suffix) => `<?php

function solveExample${suffix}(array $values): int
{
    $cleaned = array_filter($values);
    return count($cleaned);
}
`,
  },
  {
    id: "html",
    label: "HTML",
    buildBrokenCode: (suffix) => `<section class="bugfix-card" data-question="${suffix}">
  <h1>Placeholder Challenge ${suffix}</h1>
  <p>Replace this placeholder HTML question with the real prompt.
</section>
`,
    buildSolutionCode: (suffix) => `<section class="bugfix-card" data-question="${suffix}">
  <h1>Placeholder Challenge ${suffix}</h1>
  <p>Replace this placeholder HTML question with the real prompt.</p>
</section>
`,
  },
  {
    id: "css",
    label: "CSS",
    buildBrokenCode: (suffix) => `.bugfix-card-${suffix} {
  display: flex;
  justify-content: center;
  align-item: center;
  padding: 16px;
}
`,
    buildSolutionCode: (suffix) => `.bugfix-card-${suffix} {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
}
`,
  },
];

const TOPICS = [
  "Function Return Logic",
  "Loop Boundary",
  "Conditional Branch",
  "Array Indexing",
  "String Formatting",
  "Null Handling",
  "Input Validation",
  "Variable Naming",
  "State Reset",
  "Counter Update",
  "List Filtering",
  "Sorting Output",
  "Accumulator Logic",
  "Boolean Toggle",
  "Duplicate Removal",
  "Average Calculation",
  "Edge Case Handling",
  "Search Result Match",
  "Nested Condition",
  "Data Mapping",
  "Object Property Access",
  "Form Submission",
  "Date Formatting",
  "Timer Display",
  "Collection Length",
  "Math Expression",
  "Merge Logic",
  "Fallback Value",
  "Whitespace Trim",
  "Case Conversion",
  "Visibility Toggle",
  "Responsive Layout",
  "Button State",
  "Card Rendering",
  "Error Message",
  "Table Summary",
  "Score Calculation",
  "URL Handling",
  "Event Listener",
  "Markup Nesting",
  "Selector Targeting",
  "Spacing Rules",
  "Alignment Fix",
  "Theme Switch",
  "Pagination State",
  "Search Highlight",
  "Validation Message",
  "Accessibility Label",
  "Export Action",
  "Final Review Flow",
];

const DIFFICULTY_CONFIG = {
  easy: {
    timeLimitSeconds: 90,
    points: 100,
  },
  medium: {
    timeLimitSeconds: 150,
    points: 160,
  },
  hard: {
    timeLimitSeconds: 240,
    points: 240,
  },
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDifficulty(questionNumber) {
  if (questionNumber <= 20) {
    return "easy";
  }

  if (questionNumber <= 40) {
    return "medium";
  }

  return "hard";
}

function buildQuestion(languageConfig, questionNumber) {
  const suffix = String(questionNumber).padStart(3, "0");
  const topic = TOPICS[questionNumber - 1];
  const difficulty = getDifficulty(questionNumber);
  const difficultyConfig = DIFFICULTY_CONFIG[difficulty];

  return {
    title: `${languageConfig.label} Placeholder ${suffix} - ${topic}`,
    language: languageConfig.id,
    difficulty,
    prompt: `Replace this placeholder ${languageConfig.label} BugFix prompt with your real challenge. Suggested topic: ${topic}. Describe the bug, the expected behavior, and any rules or examples the learner should follow.`,
    brokenCode: languageConfig.buildBrokenCode(suffix),
    solutionCode: languageConfig.buildSolutionCode(suffix),
    hint: `Replace this hint. Nudge the learner toward the ${topic.toLowerCase()} issue without giving away the full fix.`,
    explanation: `Replace this explanation with the exact reason the bug happens and why the final fix works for ${topic.toLowerCase()}.`,
    tags: [languageConfig.id, slugify(topic), difficulty, "placeholder"],
    timeLimitSeconds: difficultyConfig.timeLimitSeconds,
    points: difficultyConfig.points,
    status: "published",
  };
}

function buildReadme() {
  return `# BugFix Question Bank

This folder contains 50 placeholder BugFix questions for each supported language.

## Languages included

- javascript
- python
- java
- cpp
- csharp
- c
- ruby
- php
- html
- css

## Structure

- Each language has its own folder.
- Each folder contains 50 JSON files named \`question-001.json\` through \`question-050.json\`.
- All files are ready to import as \`published\` questions in the admin panel.

## How to edit

1. Open any JSON file and replace the placeholder text, broken code, solution code, hint, and explanation.
2. Keep the field names the same so the admin importer can read them.
3. Leave \`status\` as \`published\` if you want the imported questions to go live right away, or change it before importing.

## How to import

1. Open the admin panel.
2. Go to the BugFix management section.
3. Use \`Import folder\` to select this full \`bugfix-question-bank\` folder, or use \`Import JSON\` for individual files.
4. The importer will skip non-JSON files like this README automatically.

## Supported JSON shape

\`\`\`json
{
  "title": "JavaScript Placeholder 001 - Function Return Logic",
  "language": "javascript",
  "difficulty": "easy",
  "prompt": "Replace this placeholder prompt with your real challenge.",
  "brokenCode": "function solveExample001(values) {\\n  const cleaned = values.filter(Boolean)\\n  return cleaned.lenght\\n}\\n",
  "solutionCode": "function solveExample001(values) {\\n  const cleaned = values.filter(Boolean);\\n  return cleaned.length;\\n}\\n",
  "hint": "Replace this hint.",
  "explanation": "Replace this explanation.",
  "tags": ["javascript", "function-return-logic", "easy", "placeholder"],
  "timeLimitSeconds": 90,
  "points": 100,
  "status": "published"
}
\`\`\`
`;
}

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "README.md"), buildReadme(), "utf8");

  let fileCount = 0;

  for (const languageConfig of LANGUAGE_CONFIGS) {
    const languageDir = path.join(outputDir, languageConfig.id);
    await mkdir(languageDir, { recursive: true });

    for (let questionNumber = 1; questionNumber <= TOPICS.length; questionNumber += 1) {
      const question = buildQuestion(languageConfig, questionNumber);
      const fileName = `question-${String(questionNumber).padStart(3, "0")}.json`;
      await writeFile(path.join(languageDir, fileName), `${JSON.stringify(question, null, 2)}\n`, "utf8");
      fileCount += 1;
    }
  }

  console.log(`Generated ${fileCount} BugFix placeholder question files in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
