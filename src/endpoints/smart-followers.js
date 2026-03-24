import client from '../client.js';

// For own account: GET /api/v1/twitter/frontrunpro/smart-followers
// For other user: GET /api/v1/twitter/{username}/smart-followers
export default async function fetchSmartFollowers(limit, username) {
  const path = username
    ? `/api/v1/twitter/${username}/smart-followers`
    : '/api/v1/twitter/frontrunpro/smart-followers';

  const params = {};
  if (limit) params.limit = limit;

  const { data: envelope } = await client.get(path, { params });
  return {
    _meta: { code: envelope.code, status: envelope.status, message: envelope.message },
    ...envelope.data
  };
}
