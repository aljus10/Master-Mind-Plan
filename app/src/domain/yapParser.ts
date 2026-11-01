import { CalendarDate } from './types';
import { getTodayDate } from './dates';

export interface ParsedYapItem {
  title: string;
  date: CalendarDate;
  notes?: string;
}

/**
 * Normalizes and parses rapid user voice typing, dictation, multi-line notes,
 * and bulleted checklists into clean, structured to-do items.
 */
export function parseYapInput(rawText: string, defaultDate?: CalendarDate): ParsedYapItem[] {
  const targetDefaultDate = defaultDate || getTodayDate();
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();

  // Pattern 1: Check if the text is a Single Item with a large Body/Email/Draft attached
  // e.g. Title on line 1, and subsequent lines contain email headers (To:, Subject:, Dear) or markdown fences
  const lines = text.split(/\r?\n/);
  if (lines.length > 2) {
    const rest = lines.slice(1).join('\n');
    const isEmailDraft = /\b(To:|Subject:|Hello|Dear|Hi)\b/i.test(rest);
    const hasCodeFence = /```/i.test(rest);

    if (isEmailDraft || hasCodeFence) {
      const firstLineClean = cleanBullet(lines[0]);
      const { title, date } = extractInlineDate(firstLineClean, targetDefaultDate);
      return [
        {
          title: title || 'Draft item',
          date,
          notes: rest.trim()
        }
      ];
    }
  }

  // Pattern 2: Multi-line list or voice dictation breakdown
  const items: ParsedYapItem[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const cleaned = cleanBullet(trimmed);
    if (!cleaned) continue;

    const { title, date } = extractInlineDate(cleaned, targetDefaultDate);
    if (title) {
      items.push({
        title,
        date
      });
    }
  }

  return items;
}

/**
 * Strips bullet marks, numbering, and checkboxes from line starts.
 */
function cleanBullet(line: string): string {
  return line
    .replace(/^(\s*[-*•]\s*(\[[ xX]\]\s*)?)/, '') // '- [ ] ', '* ', '• '
    .replace(/^(\s*\d+[\.\)]\s*)/, '')            // '1. ', '2) '
    .trim();
}

/**
 * Detects common inline date prefixes like:
 * - '2026-11-06: follow up on payout'
 * - 'Nov 6: follow up on payout'
 * - 'Tomorrow: study binary math'
 */
function extractInlineDate(
  line: string,
  defaultDate: CalendarDate
): { title: string; date: CalendarDate } {
  // Check ISO format YYYY-MM-DD
  const isoMatch = line.match(/^(\d{4}-\d{2}-\d{2})[:\s-]+(.*)$/i);
  if (isoMatch) {
    return {
      date: isoMatch[1],
      title: isoMatch[2].trim()
    };
  }

  // Check 'Tomorrow: ...'
  const tomorrowMatch = line.match(/^tomorrow[:\s-]+(.*)$/i);
  if (tomorrowMatch) {
    const today = new Date(defaultDate);
    today.setDate(today.getDate() + 1);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return {
      date: `${yyyy}-${mm}-${dd}`,
      title: tomorrowMatch[1].trim()
    };
  }

  // Check 'Nov 6' or 'November 6'
  const monthMatch = line.match(/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[:\s-]+(.*)$/i);
  if (monthMatch) {
    const monthNames: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const prefix = monthMatch[1].toLowerCase().slice(0, 3);
    const monthNum = monthNames[prefix];
    const dayNum = parseInt(monthMatch[2], 10);

    if (monthNum !== undefined && !isNaN(dayNum)) {
      const year = new Date(defaultDate).getFullYear();
      const mm = String(monthNum + 1).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      return {
        date: `${year}-${mm}-${dd}`,
        title: monthMatch[3].trim()
      };
    }
  }

  return {
    title: line,
    date: defaultDate
  };
}
