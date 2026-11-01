import { describe, expect, it } from 'vitest';
import { parseYapInput } from '../domain/yapParser';

describe('Yap Voice & Multi-line Parser', () => {
  it('parses single clean task line', () => {
    const res = parseYapInput('Review upcoming priorities', '2026-11-01');
    expect(res).toHaveLength(1);
    expect(res[0].title).toBe('Review upcoming priorities');
    expect(res[0].date).toBe('2026-11-01');
  });

  it('strips bullet points, numbered lists, and checkboxes', () => {
    const input = `
- [ ] Open mouse bot
* Engineering skills
1. Open WebUI and uncensored AI
• 2) Study computer architecture
`;
    const res = parseYapInput(input, '2026-11-01');
    expect(res).toHaveLength(4);
    expect(res[0].title).toBe('Open mouse bot');
    expect(res[1].title).toBe('Engineering skills');
    expect(res[2].title).toBe('Open WebUI and uncensored AI');
    expect(res[3].title).toBe('Study computer architecture');
  });

  it('detects inline dates and Tomorrow tags', () => {
    const input = `
Tomorrow: Study binary addition and subtraction
Nov 6: Follow up on Loggy3 payout
2026-11-10: Check server metrics
`;
    const res = parseYapInput(input, '2026-11-01');
    expect(res).toHaveLength(3);
    expect(res[0].title).toBe('Study binary addition and subtraction');
    expect(res[0].date).toBe('2026-11-02');

    expect(res[1].title).toBe('Follow up on Loggy3 payout');
    expect(res[1].date).toBe('2026-11-06');

    expect(res[2].title).toBe('Check server metrics');
    expect(res[2].date).toBe('2026-11-10');
  });

  it('preserves multi-line email drafts attached to a task', () => {
    const input = `Follow up on Loggy3 payout
To: support@loggy3.com
Subject: First Payout Follow-Up

Hello Loggy3 Support,
I would like to follow up on my payout.
Thank you.`;

    const res = parseYapInput(input, '2026-11-06');
    expect(res).toHaveLength(1);
    expect(res[0].title).toBe('Follow up on Loggy3 payout');
    expect(res[0].date).toBe('2026-11-06');
    expect(res[0].notes).toContain('To: support@loggy3.com');
    expect(res[0].notes).toContain('Subject: First Payout Follow-Up');
  });
});
