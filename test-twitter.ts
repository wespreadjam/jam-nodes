/**
 * Quick smoke test for Twitter credentials.
 *
 * Usage:
 *   npx tsx test-twitter.ts
 *
 * This verifies your .env credentials by:
 * 1. Checking the env vars load correctly
 * 2. Calling GET /2/users/me (authenticating you)
 * 3. Optionally posting a test tweet (uncomment the section at the bottom)
 */
import dotenv from 'dotenv';
dotenv.config();

import {
  twitterGetUserByUsernameNode,
  twitterCreateTweetNode,
  twitterSearchTweetsNode,
} from '@jam-nodes/nodes';

// Build a context object from .env credentials
const context = {
  userId: 'test',
  workflowExecutionId: 'test-run-1',
  variables: {},
  resolveNestedPath: () => undefined,
  credentials: {
    twitter: {
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
      consumerKey: process.env.TWITTER_CONSUMER_KEY!,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET!,
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    },
  },
};

async function main() {
  console.log('🐦 Twitter Integration Smoke Test\n');

  // ── 1. Check env vars ────────────────────────────────────────────
  const required = [
    'TWITTER_CONSUMER_KEY',
    'TWITTER_CONSUMER_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Missing env vars: ${missing.join(', ')}`);
    console.error('   Make sure .env is in the project root.');
    process.exit(1);
  }
  console.log('✅ All required env vars loaded\n');

  // ── 2. Look up your own user (read-only, uses OAuth 1.0a) ───────
  console.log('── Test: Get user by username ──');
  try {
    // Replace 'your_twitter_handle' with your real handle (without @)
    const userResult = await twitterGetUserByUsernameNode.executor(
      { username: 'elonmusk' },  // <-- change to your handle
      context,
    );
    if (userResult.success) {
      console.log('✅ User lookup succeeded:', userResult.output);
    } else {
      console.log('⚠️  User lookup failed:', userResult.error);
    }
  } catch (err) {
    console.error('❌ User lookup threw:', err);
  }

  // ── 3. Search tweets (read-only) ────────────────────────────────
  console.log('\n── Test: Search tweets ──');
  try {
    const searchResult = await twitterSearchTweetsNode.executor(
      { query: 'typescript', maxResults: 10 },
      context,
    );
    if (searchResult.success) {
      console.log(`✅ Search returned ${searchResult.output?.tweets?.length ?? 0} tweets`);
    } else {
      console.log('⚠️  Search failed:', searchResult.error);
    }
  } catch (err) {
    console.error('❌ Search threw:', err);
  }

  // ── 4. Post a test tweet (WRITE — uncomment to use) ─────────────
  // console.log('\n── Test: Create tweet ──');
  // try {
  //   const tweetResult = await twitterCreateTweetNode.executor(
  //     { text: '🧪 Test tweet from jam-nodes! ' + new Date().toISOString() },
  //     context,
  //   );
  //   if (tweetResult.success) {
  //     console.log('✅ Tweet posted:', tweetResult.output);
  //   } else {
  //     console.log('⚠️  Tweet failed:', tweetResult.error);
  //   }
  // } catch (err) {
  //   console.error('❌ Tweet threw:', err);
  // }

  console.log('\n🏁 Done.');
}

main();
