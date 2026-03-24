import axios from 'axios';

const ETHOS_BASE = 'https://api.ethos.network/api/v2';

// Fetch Ethos score by Twitter username
export default async function fetchEthosScore(username) {
  if (!username) return null;

  try {
    const userkey = `service:x.com:username:${username}`;
    const { data } = await axios.get(`${ETHOS_BASE}/score/userkey`, {
      params: { userkey },
      timeout: 10000,
      headers: { 'content-type': 'application/json' }
    });

    return {
      score: data.score,
      level: data.level,
      userkey,
      profileUrl: `https://app.ethos.network/profile/${userkey}`
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return { score: null, level: 'not_found', error: 'No Ethos profile' };
    }
    return { error: err.response?.data?.message || err.message };
  }
}

// Bulk fetch Ethos scores by Twitter usernames
export async function fetchEthosScoresBulk(usernames) {
  if (!usernames || usernames.length === 0) return {};

  try {
    const userkeys = usernames.map(u => `service:x.com:username:${u}`);
    const { data } = await axios.post(`${ETHOS_BASE}/score/userkeys`, {
      userkeys
    }, {
      timeout: 10000,
      headers: { 'content-type': 'application/json' }
    });

    // Transform: { "service:x.com:username:zachxbt": { score, level } }
    // → { "zachxbt": { score, level } }
    const result = {};
    for (const [key, val] of Object.entries(data)) {
      const handle = key.replace('service:x.com:username:', '');
      result[handle] = { score: val.score, level: val.level };
    }
    return result;
  } catch (err) {
    return { error: err.response?.data?.message || err.message };
  }
}
