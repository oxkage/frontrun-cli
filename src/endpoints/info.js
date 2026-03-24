import client from '../client.js';

// For own account: GET /api/v3/twitter/frontrunpro/info
// For other user: GET /api/v3/twitter/{username}/info
export default async function fetchInfo(username) {
  const path = username
    ? `/api/v3/twitter/${username}/info`
    : '/api/v3/twitter/frontrunpro/info';

  const { data: envelope } = await client.get(path);
  return {
    _meta: { code: envelope.code, status: envelope.status, message: envelope.message },
    ...envelope.data
  };
}
