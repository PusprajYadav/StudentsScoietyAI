import { normalizeBulkMailerVariableName } from "./helpers";
import type { BulkMailerParsedCsv, BulkMailerRecipientDraft } from "./types";

function parseCsvRows(content: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (!insideQuotes && character === ",") {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (!insideQuotes && (character === "\n" || character === "\r")) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  currentRow.push(currentValue);
  if (currentRow.some((entry) => entry.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

export function parseBulkMailerCsv(content: string): BulkMailerParsedCsv {
  const rows = parseCsvRows(content.trim());

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = rows[0].map((header, index) => {
    const normalized = normalizeBulkMailerVariableName(header);
    return normalized || `column_${index + 1}`;
  });

  const uniqueHeaders = rawHeaders.map((header, index) => {
    const previousMatches = rawHeaders.slice(0, index).filter((entry) => entry === header).length;
    return previousMatches > 0 ? `${header}_${previousMatches + 1}` : header;
  });

  return {
    headers: uniqueHeaders,
    rows: rows.slice(1).map((entry, index) => ({
      id: `csv-row-${index + 1}`,
      values: uniqueHeaders.reduce<Record<string, string>>((accumulator, header, headerIndex) => {
        accumulator[header] = (entry[headerIndex] || "").trim();
        return accumulator;
      }, {}),
    })),
  };
}

export function mapBulkMailerCsvRowsToRecipients(input: {
  parsed: BulkMailerParsedCsv;
  mapping: Record<string, string>;
  defaultNameColumn?: string;
  defaultEmailColumn?: string;
}): BulkMailerRecipientDraft[] {
  return input.parsed.rows
    .map((row, rowIndex) => {
      const emailColumn = input.defaultEmailColumn || "";
      const nameColumn = input.defaultNameColumn || "";
      const variables = Object.entries(input.mapping).reduce<Record<string, string>>((accumulator, [variable, column]) => {
        if (!column) {
          return accumulator;
        }

        accumulator[variable] = row.values[column] || "";
        return accumulator;
      }, {});

      return {
        id: row.id,
        email: emailColumn ? row.values[emailColumn] || "" : "",
        name: nameColumn ? row.values[nameColumn] || "" : "",
        variables,
        sourceIndex: rowIndex,
        sourceLabel: `CSV row ${rowIndex + 2}`,
      };
    })
    .filter((entry) => entry.email.trim());
}
