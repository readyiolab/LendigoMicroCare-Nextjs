import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadBureauReport } from '../components/admin/application-details/context/utils/loadBureauReport.js';

describe('loadBureauReport', () => {
  it('uses the full report without fetching the redundant summary', async () => {
    const calls = [];
    const detail = { score: 720, tradelines: [] };
    const result = await loadBureauReport({
      fetchDetail: async (options) => {
        calls.push(['detail', options]);
        return detail;
      },
      fetchSummary: async (options) => {
        calls.push(['summary', options]);
        return { score: 720 };
      },
      force: true,
    });

    assert.equal(result, detail);
    assert.deepEqual(calls, [['detail', { force: true }]]);
  });

  it('loads the summary only when no full report is available', async () => {
    const calls = [];
    const summary = { score: null, resultCode: 102 };
    const result = await loadBureauReport({
      fetchDetail: async (options) => {
        calls.push(['detail', options]);
        return null;
      },
      fetchSummary: async (options) => {
        calls.push(['summary', options]);
        return summary;
      },
    });

    assert.equal(result, summary);
    assert.deepEqual(calls, [
      ['detail', { force: false }],
      ['summary', { force: false }],
    ]);
  });
});
