import { fetchJson } from '../lib/http.js';
import type { FetcherResult } from '../lib/snapshot.js';
import type { filingsSnapshotSchema } from '../lib/schema.js';
import type { z } from 'zod';
import { loadCompanies } from '../lib/companies.js';
import { FINANCIALS_FOCUS } from './sec.js';

type Filing = z.infer<typeof filingsSnapshotSchema>[number];

const SUBMISSIONS = (cik: string) => `https://data.sec.gov/submissions/CIK${cik}.json`;

/**
 * Forms that carry financing news. S-3 and 424B are shelf registrations and
 * pricing supplements — where debt raises actually surface — and 8-K item 1.01
 * / 2.03 covers material agreements and new debt obligations.
 */
const FORMS_OF_INTEREST = ['8-K', 'S-3', 'S-3ASR', '424B2', '424B5', '10-Q', '10-K', '20-F'];

interface RawSubmissions {
  filings?: {
    recent?: {
      form?: string[];
      filingDate?: string[];
      reportDate?: string[];
      accessionNumber?: string[];
      primaryDocument?: string[];
      items?: string[];
    };
  };
}

export async function fetchFilings(): Promise<FetcherResult<Filing[]>> {
  const companies = await loadCompanies();
  const targets = companies.filter(
    (company) => company.cik && company.ticker && FINANCIALS_FOCUS.includes(company.ticker),
  );

  const filings: Filing[] = [];
  const failures: string[] = [];

  for (const company of targets) {
    try {
      const raw = await fetchJson<RawSubmissions>(SUBMISSIONS(company.cik as string));
      const recent = raw.filings?.recent;
      if (!recent?.form) continue;

      for (let i = 0; i < recent.form.length && i < 120; i++) {
        const form = recent.form[i];
        if (!FORMS_OF_INTEREST.includes(form)) continue;
        const accession = recent.accessionNumber?.[i] ?? '';
        filings.push({
          ticker: company.ticker as string,
          form,
          filed: recent.filingDate?.[i] ?? '',
          reportDate: recent.reportDate?.[i] || null,
          accession,
          primaryDoc: accession
            ? `https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/` +
              `${accession.replace(/-/g, '')}/${recent.primaryDocument?.[i] ?? ''}`
            : '',
          items: recent.items?.[i] || null,
        });
      }
    } catch (error) {
      failures.push(`${company.ticker}: ${error instanceof Error ? error.message : error}`);
    }
  }

  if (filings.length === 0) throw new Error(`No filings retrieved. ${failures[0] ?? ''}`);
  filings.sort((a, b) => b.filed.localeCompare(a.filed));
  return { data: filings.slice(0, 1500), recordCount: filings.length };
}
