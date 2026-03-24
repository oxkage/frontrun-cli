#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import fetchInfo from './endpoints/info.js';
import fetchUsernameHistory from './endpoints/username-history.js';
import fetchSmartFollowers from './endpoints/smart-followers.js';
import batchQuery from './endpoints/batch-query.js';
import fetchTweetsCA from './endpoints/tweets-ca.js';
import fetchEthosScore from './endpoints/ethos.js';

const program = new Command();

program
  .name('frontrun')
  .description('CLI wrapper for FrontRun Pro API')
  .version('1.0.0');

// ─── GLOBAL OPTIONS ──────────────────────────────────────
program.option('-j, --json', 'Output raw JSON (for AI agents / piping)');
program.option('--no-color', 'Disable colored output');

// ─── HELPERS ─────────────────────────────────────────────

function getJsonMode() {
  return program.opts().json === true;
}

function log(msg) {
  if (!getJsonMode()) console.error(msg);
}

function printResult(data, label) {
  if (getJsonMode()) {
    const output = {
      ok: true,
      endpoint: label,
      timestamp: new Date().toISOString(),
      data
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const meta = data?._meta;
  delete data?._meta;

  console.error(chalk.green(`\n✓ ${label}`) + (meta ? chalk.gray(` [${meta.code} ${meta.message}]`) : ''));

  if (data === null || data === undefined) {
    console.error(chalk.yellow('  (no data)'));
    return;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.error(chalk.yellow('  (empty)'));
      return;
    }
    if (typeof data[0] === 'object' && data[0] !== null) {
      const keys = Object.keys(data[0]).slice(0, 8);
      const table = new Table({ head: keys.map(k => chalk.cyan(k)) });
      for (const row of data) {
        table.push(keys.map(k => {
          const val = row[k];
          if (val === null || val === undefined) return chalk.gray('—');
          if (typeof val === 'boolean') return val ? chalk.green('✓') : chalk.red('✗');
          if (typeof val === 'number') return chalk.yellow(val);
          if (Array.isArray(val)) return `[${val.length}]`;
          if (typeof val === 'object') return JSON.stringify(val).slice(0, 60);
          return String(val).slice(0, 60);
        }));
      }
      console.error(table.toString());
      console.error(chalk.gray(`  Total: ${data.length} items`));
    } else {
      data.forEach((item, i) => console.error(`  ${chalk.cyan(i + '.')} ${item}`));
    }
    return;
  }

  if (typeof data === 'object') {
    const maxKeyLen = Math.max(...Object.keys(data).map(k => k.length));
    for (const [key, val] of Object.entries(data)) {
      const paddedKey = chalk.cyan(key.padEnd(maxKeyLen));
      if (val === null || val === undefined) {
        console.error(`  ${paddedKey}: ${chalk.gray('—')}`);
      } else if (typeof val === 'object') {
        console.error(`  ${paddedKey}: ${JSON.stringify(val, null, 2).split('\n').map((l, i) => i === 0 ? l : ' '.repeat(maxKeyLen + 4) + l).join('\n')}`);
      } else {
        console.error(`  ${paddedKey}: ${val}`);
      }
    }
    return;
  }

  console.error(data);
}

function printError(err, context) {
  if (getJsonMode()) {
    const output = {
      ok: false,
      endpoint: context || 'unknown',
      timestamp: new Date().toISOString(),
      error: {
        message: err.message || String(err),
        status: err.response?.status || null,
        data: err.response?.data || null
      }
    };
    console.log(JSON.stringify(output, null, 2));
  }
}

// ─── COMMANDS ─────────────────────────────────────────────

// ── overview: full snapshot of a user ─────────────────────
program
  .command('overview')
  .alias('ov')
  .description('Full overview: info + smart followers + CA tweets + username history')
  .argument('[username]', 'Twitter username (default: your own account)')
  .option('-d, --depth <level>', 'Data depth: light | normal | full', 'normal')
  .option('-l, --followers-limit <n>', 'Max smart followers to return', parseInt)
  .option('-c, --ca-limit <n>', 'Max tweets with CA to return', parseInt)
  .action(async (username, opts) => {
    const depth = opts.depth;
    const followersLimit = opts.followersLimit || (depth === 'light' ? 20 : depth === 'full' ? null : 50);
    const caLimit = opts.caLimit || (depth === 'light' ? 10 : depth === 'full' ? null : 30);

    const target = username || 'your account';
    log(chalk.cyan(`⏳ Fetching overview for ${target}...`));
    log(chalk.gray(`  depth=${depth} followers_limit=${followersLimit ?? 'all'} ca_limit=${caLimit ?? 'all'}`));

    // Phase 1: parallel fetch of FrontRun data
    const results = await Promise.allSettled([
      fetchInfo(username),
      fetchSmartFollowers(followersLimit, username),
      fetchTweetsCA(caLimit, username),
      fetchUsernameHistory(username)
    ]);

    const [infoRes, sfRes, tcRes, uhRes] = results;

    const accountData = infoRes.status === 'fulfilled' ? infoRes.value : { error: infoRes.reason?.message };

    // Phase 2: Ethos score by Twitter username (not wallet)
    const resolvedUsername = username || accountData.twitterUsername;
    const ethosRes = await fetchEthosScore(resolvedUsername);

    const overview = {
      _meta: { depth, username: resolvedUsername || 'frontrunpro', timestamp: new Date().toISOString() },
      account: accountData,
      smartFollowers: sfRes.status === 'fulfilled' ? sfRes.value : { error: sfRes.reason?.message },
      tweetsWithCA: tcRes.status === 'fulfilled' ? tcRes.value : { error: tcRes.reason?.message },
      usernameHistory: uhRes.status === 'fulfilled' ? uhRes.value : { error: uhRes.reason?.message },
      ethos: ethosRes
    };

    if (getJsonMode()) {
      printResult(overview, 'overview');
      return;
    }

    // Human mode
    console.error(chalk.green(`\n✓ Full Overview`) + chalk.gray(` [${target}, depth=${depth}]`));

    const acc = overview.account;
    const sf = overview.smartFollowers;
    const tc = overview.tweetsWithCA;
    const uh = overview.usernameHistory;

    // ── Profile Header ───────────────────────────────────
    if (!acc.error) {
      console.error('');
      console.error(chalk.bold(`  ${acc.name} @${acc.twitterUsername}`));
      if (acc.bio) console.error(`  ${acc.bio.split('\n')[0]}`);
      if (acc.position) console.error(`  ${chalk.gray(acc.position)}`);
      console.error(`  ${chalk.yellow(acc.followingsCount)} Following  ${chalk.yellow(acc.followersCount.toLocaleString())} Followers  ${chalk.yellow(sf.totalCount || 0)} Smart Followers`);
    }

    // ── Wallets Summary Bar ──────────────────────────────
    const linkedCount = acc.wallets?.length || 0;
    // Count unique mentioned wallets from tweets
    const allWalletTweets = [...(tc.topUndeletedTweetForWallets || []), ...(tc.topDeletedTweetForWallets || [])];
    const mentionedWallets = new Set(allWalletTweets.map(t => t.ca).filter(Boolean));
    const mentionedCount = mentionedWallets.size;

    console.error('');
    console.error(chalk.cyan('  💰 Wallets'));
    console.error(`  Linked: ${chalk.yellow(linkedCount)}  ${chalk.gray('|')}  Mentioned: ${chalk.yellow(mentionedCount)}`);
    if (linkedCount > 0) {
      for (const w of acc.wallets) {
        console.error(`    [${chalk.gray(w.chain)}] ${w.address.slice(0, 8)}...${w.address.slice(-6)} ${w.verified ? chalk.green('✓') : ''} ${(w.activeChains || []).join(', ')}`);
      }
    }

    // ── History Summary Bar ──────────────────────────────
    const caUndeleted = tc.undeletedCACount || 0;
    const caDeleted = tc.deletedCACount || 0;
    const profileChanges = uh.usernameHistory?.length || 0;

    console.error('');
    console.error(chalk.cyan('  📜 History'));
    console.error(`  CA: ${chalk.green(caUndeleted)} ${chalk.gray('|')} ${chalk.red(caDeleted)}   Profile: ${chalk.yellow(profileChanges)}`);
    // Show CA tweets (compact)
    const topCA = tc.topUndeletedTweets || [];
    if (topCA.length > 0) {
      for (const t of topCA.slice(0, depth === 'light' ? 2 : 5)) {
        const time = t.tweetTime ? new Date(t.tweetTime).toISOString().slice(0, 10) : '?';
        console.error(`    ${chalk.gray(time)} [${chalk.gray(t.chain)}] ${t.ca?.slice(0, 20)}...`);
      }
    }
    if (profileChanges > 0) {
      for (const h of uh.usernameHistory) {
        const time = h.changedAt ? new Date(h.changedAt).toISOString().slice(0, 10) : '?';
        console.error(`    ${chalk.gray(time)} @${h.oldTwitterUsername} → @${uh.currentTwitterUsername}`);
      }
    }

    // ── Ethos Trust Score ────────────────────────────────
    const ethos = overview.ethos;
    if (ethos && !ethos.error && ethos.score !== null) {
      const levelColors = {
        untrusted: chalk.red, questionable: chalk.redBright,
        neutral: chalk.yellow, known: chalk.greenBright,
        established: chalk.green, reputable: chalk.cyan,
        exemplary: chalk.cyanBright, distinguished: chalk.blueBright,
        revered: chalk.magenta, renowned: chalk.magentaBright
      };
      const colorFn = levelColors[ethos.level] || chalk.gray;

      console.error('');
      console.error(chalk.cyan('  🛡️ Ethos Trust'));
      console.error(`  Score: ${colorFn.bold(ethos.score)} ${chalk.gray('/ 2800')}  Level: ${colorFn(ethos.level)}`);
    } else if (ethos?.error) {
      console.error('');
      console.error(chalk.cyan('  🛡️ Ethos Trust') + chalk.gray(` — ${ethos.error || 'not found'}`));
    }

    // ── Smart Followers (compact, like extension) ────────
    const sfList = sf.smartFollowers || [];
    const showCount = depth === 'light' ? 10 : 20;
    if (sfList.length > 0) {
      console.error('');
      console.error(chalk.cyan(`  🧠 Smart Followers`) + chalk.gray(` (${sf.totalCount || sfList.length} total, showing ${Math.min(sfList.length, showCount)})`));
      for (const f of sfList.slice(0, showCount)) {
        const label = f.compactLabel || f.primaryLabel || '';
        console.error(`    ${chalk.bold('@' + f.twitter.padEnd(18))} ${chalk.yellow(String(f.smartFollowersCount).padStart(5))}  ${chalk.gray(label)}`);
      }
    }
  });

// ── individual commands (support optional username) ──────

program
  .command('info')
  .argument('[username]', 'Twitter username (default: your own account)')
  .description('Get account info')
  .action(async (username) => {
    try {
      log(chalk.cyan(`⏳ Fetching account info${username ? ` for @${username}` : ''}...`));
      const data = await fetchInfo(username);
      printResult(data, 'info');
    } catch (e) {
      printError(e, 'info');
      process.exit(1);
    }
  });

program
  .command('username-history')
  .alias('uh')
  .argument('[username]', 'Twitter username (default: your own account)')
  .description('Get username change history')
  .action(async (username) => {
    try {
      log(chalk.cyan(`⏳ Fetching username history${username ? ` for @${username}` : ''}...`));
      const data = await fetchUsernameHistory(username);
      printResult(data, 'username-history');
    } catch (e) {
      printError(e, 'username-history');
      process.exit(1);
    }
  });

program
  .command('smart-followers')
  .alias('sf')
  .argument('[username]', 'Twitter username (default: your own account)')
  .description('Get smart followers list')
  .option('-l, --limit <n>', 'Limit results', parseInt)
  .action(async (username, opts) => {
    try {
      log(chalk.cyan(`⏳ Fetching smart followers${username ? ` for @${username}` : ''}...`));
      const data = await fetchSmartFollowers(opts.limit, username);
      printResult(data, 'smart-followers');
    } catch (e) {
      printError(e, 'smart-followers');
      process.exit(1);
    }
  });

program
  .command('batch-query')
  .alias('bq')
  .description('Batch query Twitter usernames for light info')
  .argument('<usernames...>', 'Twitter usernames to query')
  .action(async (usernames) => {
    try {
      log(chalk.cyan(`⏳ Batch querying ${usernames.length} username(s)...`));
      const data = await batchQuery(usernames);
      printResult(data, 'batch-query');
    } catch (e) {
      printError(e, 'batch-query');
      process.exit(1);
    }
  });

program
  .command('tweets-ca')
  .alias('tc')
  .argument('[username]', 'Twitter username (default: your own account)')
  .description('Get tweets containing contract addresses')
  .option('-l, --limit <n>', 'Limit results', parseInt)
  .action(async (username, opts) => {
    try {
      log(chalk.cyan(`⏳ Fetching tweets with CA${username ? ` for @${username}` : ''}...`));
      const data = await fetchTweetsCA(opts.limit, username);
      printResult(data, 'tweets-ca');
    } catch (e) {
      printError(e, 'tweets-ca');
      process.exit(1);
    }
  });

program.parse();
