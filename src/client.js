import axios from 'axios';
import 'dotenv/config';
import chalk from 'chalk';

const BASE_URL = process.env.FRONTRUN_BASE_URL || 'https://loadbalance.frontrun.pro';
const SESSION_TOKEN = process.env.FRONTRUN_SESSION_TOKEN;
const EXT_ORIGIN = process.env.FRONTRUN_EXTENSION_ORIGIN || 'chrome-extension://kifcalgkjaphbpbcgokommchjiimejah';

if (!SESSION_TOKEN) {
  console.error(chalk.red('✗ FRONTRUN_SESSION_TOKEN not set in .env'));
  console.error(chalk.yellow('  Copy your session cookie value into .env'));
  process.exit(1);
}

// Browser-like user agent
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'content-type': 'application/json',
    'x-copilot-client-language': 'EN_US',
    'x-copilot-client-version': '0.0.221',
    'cookie': `__Secure-frontrun.session_token=${SESSION_TOKEN}; __Secure-frontrun.session_token_domain_migrated=1`,
    'user-agent': USER_AGENT,
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9,id;q=0.8'
  }
});

// Helper: create a client with extra origin header (for batch-query etc)
export function clientWithOrigin() {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
      'content-type': 'application/json',
      'x-copilot-client-language': 'EN_US',
      'x-copilot-client-version': '0.0.221',
      'cookie': `__Secure-frontrun.session_token=${SESSION_TOKEN}; __Secure-frontrun.session_token_domain_migrated=1`,
      'user-agent': USER_AGENT,
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9,id;q=0.8',
      'origin': EXT_ORIGIN
    }
  });
}

// Response interceptor for error handling
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const data = err.response?.data;

    if (status === 401 || status === 403) {
      const errorMsg = data?.message || data?.error || 'Unauthorized';
      err.message = `Session token expired or invalid (${status}: ${errorMsg}). Update FRONTRUN_SESSION_TOKEN in .env`;
      console.error(chalk.red('✗ Session token expired or invalid.'));
      console.error(chalk.yellow('  Update FRONTRUN_SESSION_TOKEN in .env with a fresh token from frontrun.pro'));
      throw err;
    }

    if (status === 429) {
      const retryAfter = err.response.headers['retry-after'] || 'unknown';
      err.message = `Rate limited (429). Retry after: ${retryAfter}s`;
      console.error(chalk.red(`✗ Rate limited. Retry after: ${retryAfter}s`));
      throw err;
    }

    if (status >= 500) {
      err.message = `Server error (${status}): ${data?.message || err.message}`;
      console.error(chalk.red(`✗ Server error [${status}]: ${data?.message || err.message}`));
      throw err;
    }

    err.message = `API Error [${status || 'NETWORK'}]: ${data?.message || err.message}`;
    console.error(chalk.red(`✗ ${err.message}`));
    throw err;
  }
);

export default client;
