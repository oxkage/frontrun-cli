import client from '../client.js';

// For own account: GET /api/v3/twitter/frontrunpro/tweets-with-ca-cache
// For other user: GET /api/v3/twitter/{username}/tweets-with-ca-cache
export default async function fetchTweetsCA(limit, username) {
  const path = username
    ? `/api/v3/twitter/${username}/tweets-with-ca-cache`
    : '/api/v3/twitter/frontrunpro/tweets-with-ca-cache';

  const params = {};
  if (limit) params.limit = limit;

  const { data: envelope } = await client.get(path, { params });
  return {
    _meta: { code: envelope.code, status: envelope.status, message: envelope.message },
    cacheHit: envelope.data?.cacheHit,
    ...envelope.data?.data
  };
}
