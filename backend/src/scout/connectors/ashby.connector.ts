import type { RawJob } from '../scout.config.js';
import {
  fetchJson,
  mapWithConcurrency,
  stripHtml,
  toRawJob,
} from './shared.js';

const GQL_URL = 'https://jobs.ashbyhq.com/api/non-user-graphql';

interface AshbyListPosting {
  id: string;
  title: string;
  locationName?: string;
  employmentType?: string;
}

interface AshbyListResponse {
  data?: { jobBoard?: { jobPostings?: AshbyListPosting[] } };
  errors?: Array<{ message: string }>;
}

interface AshbyDetailResponse {
  data?: {
    jobPosting?: {
      id: string;
      descriptionHtml?: string;
      locationName?: string;
      employmentType?: string;
    };
  };
  errors?: Array<{ message: string }>;
}

const LIST_QUERY = `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
  jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
    jobPostings { id title locationName employmentType }
  }
}`;

const DETAIL_QUERY = `query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
  jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) {
    id descriptionHtml locationName employmentType
  }
}`;

async function fetchDetail(slug: string, id: string): Promise<string> {
  const data = await fetchJson<AshbyDetailResponse>(
    `${GQL_URL}?op=ApiJobPosting`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationName: 'ApiJobPosting',
        variables: {
          organizationHostedJobsPageName: slug,
          jobPostingId: id,
        },
        query: DETAIL_QUERY,
      }),
      label: `Ashby[${slug}]/detail`,
    },
  );
  const html = data?.data?.jobPosting?.descriptionHtml;
  return html ? stripHtml(html) : '';
}

export async function fetchAshbyJobs(
  slug: string,
  companyName: string,
): Promise<RawJob[]> {
  const list = await fetchJson<AshbyListResponse>(
    `${GQL_URL}?op=ApiJobBoardWithTeams`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationName: 'ApiJobBoardWithTeams',
        variables: { organizationHostedJobsPageName: slug },
        query: LIST_QUERY,
      }),
      label: `Ashby[${slug}]`,
    },
  );

  if (list?.errors?.length) {
    console.warn(`Ashby[${slug}]: ${list.errors[0].message}`);
    return [];
  }

  const postings = list?.data?.jobBoard?.jobPostings ?? [];
  if (postings.length === 0) return [];

  // Fetch full JD per posting so scoring + experience filters have text to work with.
  const descriptions = await mapWithConcurrency(postings, 5, (p) =>
    fetchDetail(slug, p.id),
  );

  return postings.map((p, i) =>
    toRawJob({
      title: p.title,
      company: companyName,
      url: `https://jobs.ashbyhq.com/${slug}/${p.id}`,
      description: descriptions[i],
      location: p.locationName ?? '',
      source: 'ashby',
    }),
  );
}
