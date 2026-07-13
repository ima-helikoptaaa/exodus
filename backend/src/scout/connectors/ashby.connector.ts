import type { RawJob } from '../scout.config.js';

interface AshbyJobPosting {
  id: string;
  title: string;
  locationName?: string;
}

interface AshbyResponse {
  data?: {
    jobBoard?: {
      jobPostings?: AshbyJobPosting[];
    };
  };
  errors?: Array<{ message: string }>;
}

export async function fetchAshbyJobs(
  slug: string,
  companyName: string,
): Promise<RawJob[]> {
  const url =
    'https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardMain';

  const body = JSON.stringify({
    operationName: 'ApiJobBoardMain',
    variables: { organizationHostedJobsPageName: slug },
    query: `query ApiJobBoardMain($organizationHostedJobsPageName: String!) { jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobPostings { id title locationName } } }`,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    console.warn(`Ashby[${slug}]: HTTP ${res.status}`);
    return [];
  }

  const data = (await res.json()) as AshbyResponse;

  if (data.errors?.length) {
    console.warn(`Ashby[${slug}]: ${data.errors[0].message}`);
    return [];
  }

  const postings = data.data?.jobBoard?.jobPostings || [];

  return postings.map((p) => ({
    title: p.title,
    company: companyName,
    url: `https://jobs.ashbyhq.com/${slug}/${p.id}`,
    description: '', // Ashby board API only returns brief info; full JD fetched on page visit
    location: p.locationName || '',
    source: 'ashby',
  }));
}
