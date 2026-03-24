import { clientWithOrigin } from '../client.js';

export default async function batchQuery(usernames) {
  if (!usernames || usernames.length === 0) {
    throw new Error('At least one username is required');
  }

  const client = clientWithOrigin();
  const { data: envelope } = await client.post('/api/v2/twitter/info/batch-query-light', {
    twitterUsernames: usernames
  });
  return {
    _meta: { code: envelope.code, status: envelope.status, message: envelope.message },
    results: envelope.data
  };
}
