import client from '../client.js';

// For own account: GET /api/v1/twitter/frontrunpro/username-history
// For other user: GET /api/v1/twitter/{username}/username-history
export default async function fetchUsernameHistory(username) {
  const path = username
    ? `/api/v1/twitter/${username}/username-history`
    : '/api/v1/twitter/frontrunpro/username-history';

  const { data: envelope } = await client.get(path);
  return {
    _meta: { code: envelope.code, status: envelope.status, message: envelope.message },
    ...envelope.data
  };
}
