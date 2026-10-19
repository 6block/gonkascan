// Source of truth: wallet address + amount + currency, as paid on chain by the upgrade handler
// (inference-chain/app/upgrades/vX_Y_Z) or the governance proposal referenced by `proposalId`.
// GitHub / Discord handles are secondary attribution taken from the Discord announcements.

// GNK payouts (v0.2.11 and earlier) came from the community pool in ngonka.
// USDT payouts (v0.2.12 and later) are IBC USDT withdrawn from the community-sale contract.
export type PayoutCurrency = 'GNK' | 'USDT'

export interface RewardRecord {
  address: string
  amount: number
  githubUsername?: string
  task?: string
  taskUrl?: string
  discord?: string
}

export interface RewardGroup {
  title: string
  // Date the paying governance proposal passed on chain (UTC)
  time: string
  currency: PayoutCurrency
  proposalId: number
  records: RewardRecord[]
}

// GitHub username → URL overrides (only for usernames where slug differs from display name)
// Default resolution: https://github.com/{githubUsername}
export const GITHUB_URL_OVERRIDES: Record<string, string> = {
  'Mfursov': 'https://github.com/mfursov',
  'Evgenii Maksimenkov': 'https://github.com/maksimenkoff',
}

// Discord display name → user ID, used to link Discord handles
export const DISCORD_USER_IDS: Record<string, string> = {
  '@Ouicate': '1427291039949127690',
  '@x0152': '782297186939568128',
  '@Blizko': '770691223618453574',
  '@Alexander Kuprin': '1346953106365354035',
  '@yapion.': '705885531174600845',
  '@Eugene Maksimenkov': '984962691502333993',
  '@Lelouch33': '340894273379762177',
  '@Rufat': '1197782508318756944',
  '@Huxuxuya': '213375632808083467',
  '@AlexeySamosadov': '1018163277706051595',
}

export const REWARD_DATA: RewardGroup[] = [
  {
    title: 'Upgrade v0.2.16, Bug bounty awards (pull requests review, security, and correctness fixes)',
    time: '2026-10-08',
    currency: 'USDT',
    proposalId: 113,
    records: [
      { githubUsername: 'kaitakuai, clanster, baychak', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 20000, task: 'Decode-PoC experiments: vLLM port and re-evaluation on all hardware schemes and models', taskUrl: 'https://github.com/kaitakuai/experiments/blob/main/reports/2026-06-decode-poc-research-and-integration.md' },
      { githubUsername: 'Red-Caesar', address: 'gonka1yhdhp4vwsvdsplv4acksntx0zxh8saueq6lj9m', amount: 18000, task: 'Decode-PoC CUDA graph support (Axel-t team). Issue: #1135', taskUrl: 'https://github.com/gonka-ai/gonka/issues/1135' },
      { githubUsername: 'kaitakuai, clanster, baychak', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 12000, task: 'ML-node observability: development (4,000) and hosting and maintenance (8,000)', taskUrl: 'https://github.com/kaitakuai/experiments/blob/main/reports/2026-07-mlnode-observability.md' },
      { githubUsername: 'kaitakuai, clanster, baychak', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 9600, task: 'GPU rental reimbursement for model and PoC experiments since 2026-06-01' },
      { githubUsername: 'staaason, zpoken', address: 'gonka1s8zggm642e3kncy48c7vxwmeclt2wxyyd8qtdt', amount: 8050, task: 'review of 115 HackerOne reports and fixes for genesis-transfer status reporting and PoC submission permissions. PRs: #1767, #1552 (incorporated into #1623)', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1767' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 8000, task: 'Trainshards v0 development (eight weeks, part-time). PRs: #1350, #1618. v0.2.16 upgrade review under release management', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1350', discord: '@x0152' },
      { githubUsername: 'kaitakuai, clanster, baychak', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 5000, task: 'gonka-poc as a vLLM plugin', taskUrl: 'https://github.com/kaitakuai/experiments/blob/main/reports/2026-07-gonka-poc-plugin-and-residual.md' },
      { githubUsername: 'kaitakuai, clanster, baychak', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 5000, task: 'DeepSeek-V4-Flash experiments and model proposal', taskUrl: 'https://github.com/kaitakuai/experiments/blob/main/reports/2026-07-deepseek-v4-flash-integration.md' },
      { githubUsername: 'vitaly-andr', address: 'gonka1uqt4hue8tljwwgdkvtthyl3n8kkkqtydyns4cm', amount: 5000, task: 'high-severity vulnerability report that could halt the chain. Issue: #1205. Fix: cosmos-sdk#16', taskUrl: 'https://github.com/gonka-ai/gonka/issues/1205' },
      { githubUsername: 'kaitakuai, clanster, baychak', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 4000, task: 'GLM-5.3-Flash experiments and model proposal', taskUrl: 'https://github.com/kaitakuai/experiments/blob/main/reports/2026-09-glm-5-3-flash-integration.md' },
      { githubUsername: 'cyberdelamain', address: 'gonka15u0r3mf6t7zsfuslusnyt7hsjrq357yumpe8st', amount: 3000, task: 'v0.2.16 upgrade review and fixes. PRs: #1828, #1846, #1845, #1859', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1828' },
      { githubUsername: 'kaitakuai, clanster, baychak', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 2000, task: 'GLM-5.2 experiments, images for B300/B200/H200', taskUrl: 'https://github.com/kaitakuai/experiments/blob/main/reports/2026-06-glm-5-2-bring-up.md' },
      { githubUsername: 'kaitakuai, clanster, baychak', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 2000, task: 'Hy3 evaluation', taskUrl: 'https://github.com/kaitakuai/experiments/blob/main/reports/2026-08-hy3-evaluation.md' },
      { githubUsername: 'vitaly-andr', address: 'gonka1uqt4hue8tljwwgdkvtthyl3n8kkkqtydyns4cm', amount: 1000, task: 'v0.2.16 upgrade review' },
      { githubUsername: 'bonujel', address: 'gonka1zqss46r6jf6dhhyaa777kc2ppvjhn0ufkx4y57', amount: 1000, task: 'v0.2.16 upgrade review' },
      { githubUsername: 'qdanik', address: 'gonka1j3f2xkapx8cmczpjqcsrh7cc3peyj3ngkjv4p8', amount: 500, task: 'ML-node observability', taskUrl: 'https://github.com/kaitakuai/experiments/blob/main/reports/2026-07-mlnode-observability.md' },
    ],
  },
  {
    title: 'Devshard v5, Bug bounty awards (pull requests review, security, and correctness fixes)',
    time: '2026-09-18',
    currency: 'USDT',
    proposalId: 105,
    records: [
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 36000, task: 'devshard v4.0.1, v4.0.2, v4.0.3, v4.1.0, v5 and height-sync', discord: '@Alexander Kuprin' },
      { githubUsername: 'qdanik', address: 'gonka1j3f2xkapx8cmczpjqcsrh7cc3peyj3ngkjv4p8', amount: 23000, task: 'validation and HackerOne report fixes (token floor, logprob distance, n>1), payload compression and logprobs gating, gateway accounting and delivered-answer serving, Kimi/DeepSeek and stop_reason fixes, gateway v4 release, review of the previous release, HackerOne reviews. PRs: #1391, #1436, #1676, #1650, #1686, #1581, #1682, #1595, #1563, #1613, #1713', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1391' },
      { githubUsername: 'snevolin', address: 'gonka1vnupswg7qz2w5k5ax6zrp02mxmln6arnvjc87h', amount: 12000, task: 'high-availability: HAProxy versiond router, fail-closed Postgres HA, versiond/edge-api drain, crash-safe TLS, safe migrate to HA layout. PRs: #1599, #1606, #1610, #1642, #1601, #1602, #1603, #1607, #1730, #1604, #1605, #1609, #1661, #1611', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1599' },
      { githubUsername: 'shd', address: 'gonka1p2hjjf63dqhpf5qmyaaq6u73zrzsrf3ra3qxk2', amount: 11500, task: 'devshard protocol review and formalization, including height-sync. Discussion: #1340. Includes devshard v4', taskUrl: 'https://github.com/gonka-ai/gonka/discussions/1340' },
      { githubUsername: 'aikuznetsov', address: 'gonka1frlfyz2wtltdy47dq3w9pwc8ruvjvlthp2lh53', amount: 6500, task: 'testing. PRs: #1508, #1547, #1564, #1562, #1631, #1649, #1651, #1653, #1555, #1571', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1508' },
      { githubUsername: 'Ryanchen911', address: 'gonka1zqss46r6jf6dhhyaa777kc2ppvjhn0ufkx4y57', amount: 2000, task: 'dial-time SSRF guard for participant InferenceUrl. PR: #1491. Issue: #1470', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1491' },
      { githubUsername: 'redstartechno', address: 'gonka105ce4495mj0mwkxqeasgdzqfq5jjrfq32eza5l', amount: 300, task: 'devshard reliability fixes. PRs: #1336, #1512, #1460', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1336' },
    ],
  },
  {
    title: 'Upgrade v0.2.15, Bug bounty awards (pull requests review, security, and correctness fixes)',
    time: '2026-07-30',
    currency: 'USDT',
    proposalId: 92,
    records: [
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 22000, task: 'v0.2.15 / devshard v4 release management', discord: '@Alexander Kuprin' },
      { githubUsername: 'pixelplex', address: 'gonka1vu28c7w5zxqe28lakrrfdrkvscft326rxur3dv', amount: 7000, task: 'devshard contribution. PRs: #1144, #1152, #1126, #1154', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1144' },
      { githubUsername: 'aikuznetsov', address: 'gonka1frlfyz2wtltdy47dq3w9pwc8ruvjvlthp2lh53', amount: 3125, task: 'testing proposal and implementation. PRs: #1332, #1295', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1332' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 3000, task: 'report and fix of medium severity vulnerability. PR: #1283', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1283', discord: '@yapion.' },
      { githubUsername: 'snevolin', address: 'gonka1vnupswg7qz2w5k5ax6zrp02mxmln6arnvjc87h', amount: 3000, task: 'devshard contribution. PRs: #1437, #1490', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1437' },
      { githubUsername: 'Ryanchen911', address: 'gonka1zqss46r6jf6dhhyaa777kc2ppvjhn0ufkx4y57', amount: 1000, task: 'v0.2.15 / devshard v4 upgrade review' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 500, task: 'report and fix of low severity vulnerability. PR: #1311', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1311', discord: '@yapion.' },
      { githubUsername: 'redstartechno', address: 'gonka105ce4495mj0mwkxqeasgdzqfq5jjrfq32eza5l', amount: 200, task: 'devshard contribution. PR: #1308', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1308' },
    ],
  },
  {
    title: 'Upgrade v0.2.14, Bug bounty awards (pull requests review, security, and correctness fixes)',
    time: '2026-07-23',
    currency: 'USDT',
    proposalId: 89,
    records: [
      { githubUsername: 'qdanik', address: 'gonka1j3f2xkapx8cmczpjqcsrh7cc3peyj3ngkjv4p8', amount: 11500, task: 'release management, HackerOne reviews, R&D for MiniMax M2.7, Inference During PoC (including cost of GPUs for testing) and SMST optimization. PR: #1432', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1432' },
      { githubUsername: 'Ryanchen911', address: 'gonka1zqss46r6jf6dhhyaa777kc2ppvjhn0ufkx4y57', amount: 7500, task: 'implementing maintenance windows. PR: #998', taskUrl: 'https://github.com/gonka-ai/gonka/pull/998' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 6000, task: 'release management, HackerOne reviews', discord: '@x0152' },
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 5000, task: 'devshards v3 release management, review of 0.2.14 upgrade, HackerOne reviews', discord: '@Alexander Kuprin' },
      { githubUsername: 'Lelouch33', address: 'gonka128nd36m2pz5qcs4q6rd69622flyls05nleazqq', amount: 5000, task: 'vulnerability report for #1378', taskUrl: 'https://github.com/gonka-ai/gonka/issues/1378', discord: '@Lelouch33' },
      { githubUsername: 'alancapex', address: 'gonka10mmdjau4dnj8krs7sh7t7635ttnmq9u3vqgz09', amount: 3000, task: 'on-chain configurable reward claim recipients. PR: #889', taskUrl: 'https://github.com/gonka-ai/gonka/pull/889' },
      { githubUsername: 'maksimenkoff', address: 'gonka1gmuxdcxlsxn5z72elx77w9zym7yrgfxqgzg6ry', amount: 3000, task: 'vulnerability report and fix. PR: #1415', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1415' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 2000, task: 'vulnerability finding (bridge block sync). PR: #1376', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1376', discord: '@yapion.' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 1000, task: 'stop stale PoC validation promptly. PR: #1253', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1253', discord: '@Ouicate' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 1000, task: 'settle accounts before releasing matured unbonding collateral. PR: #1255', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1255', discord: '@Ouicate' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 1000, task: 'bound event-listener tx queue to stop a single zero-fee attacker from OOMing validator nodes. PR: #1278', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1278', discord: '@Ouicate' },
      { githubUsername: 'Lelouch33', address: 'gonka128nd36m2pz5qcs4q6rd69622flyls05nleazqq', amount: 1000, task: 'vulnerability report for reward power-cap', discord: '@Lelouch33' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 1000, task: 'review of upgrade v0.2.13', discord: '@Blizko' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 750, task: 'widen ShouldValidate to uint64 to prevent silent validation skip. PR: #1101', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1101', discord: '@yapion.' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 500, task: 'prevent uint64 wrap in settle amount sums. PR: #1100', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1100', discord: '@yapion.' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 500, task: 'distribute unsettled escrow per slot, not per unique address. PR: #1347', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1347', discord: '@yapion.' },
      { githubUsername: 'redstartechno', address: 'gonka105ce4495mj0mwkxqeasgdzqfq5jjrfq32eza5l', amount: 500, task: 'avoid query-gas-limit on grant check. PR: #1307', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1307' },
    ],
  },
  {
    title: 'Devshard v2, Bug bounty awards (pull requests review, security, and correctness fixes)',
    time: '2026-06-17',
    currency: 'USDT',
    proposalId: 76,
    records: [
      { githubUsername: 'Red-Caesar', address: 'gonka1yhdhp4vwsvdsplv4acksntx0zxh8saueq6lj9m', amount: 30000, task: 'PoC Decode (Axel-t team). Issue: #1135', taskUrl: 'https://github.com/gonka-ai/gonka/issues/1135' },
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 17000, task: 'Devshard 0.2.13 v2 release implementation and management. PR: #1298', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1298', discord: '@Alexander Kuprin' },
      { githubUsername: 'kaitakuai, clanster, baychak', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 17000, task: 'emergency troubleshooting (schema bomb and B200 investigation) and MiniMax integration, post-deploy bug-fixing, additional benchmarks, community FAQ' },
      { githubUsername: 'qdanik', address: 'gonka1j3f2xkapx8cmczpjqcsrh7cc3peyj3ngkjv4p8', amount: 14000, task: 'observability implementation, emergency troubleshooting, and gateway implementation work. PR: #1046', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1046' },
      { githubUsername: 'fedor-konovalenko', address: 'gonka1m96zrcwsw0wrzw20mxala4gp8r6lju2ewtjd62', amount: 10000, task: 'VLM inference and validation in Gonka (MIL team). Issue: #1026, and TOPLOC as a validation mechanism (gonka-ai/vllm#34)', taskUrl: 'https://github.com/gonka-ai/gonka/issues/1026' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 3000, task: 'Certik security audit fixes (GEB-62, GEB-59, GEB-60). PRs: #1114, #1115. Issue: #1109', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1114', discord: '@x0152' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 2000, task: 'observability implementation. PR: #1046', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1046', discord: '@Blizko' },
      { githubUsername: 'Dolper', address: 'gonka1ppn53fu8q3pxvwwf8ycjf3c6nzlugs3hmw6a3q', amount: 500, task: 'docs: restructure governance section and expand guidance; add MiniMax-M2.7 and Kimi K2.6 model licenses; update host hardware specifications. PRs: gonka-docs #1093, #1134, #992, #1094' },
      { githubUsername: 'unameisfine', address: 'gonka16k7nzvlheye8zhtyykcanxz0hldnfkmaedye8d', amount: 100, task: 'propagate fatal HTTP errors instead of waiting on timeout. PR: #1035', taskUrl: 'https://github.com/gonka-ai/gonka/pull/1035' },
    ],
  },
  {
    title: 'Upgrade v0.2.13, Bug bounty awards (pull requests review, security, and correctness fixes)',
    time: '2026-05-22',
    currency: 'USDT',
    proposalId: 54,
    records: [
      { githubUsername: 'kaitakuai', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 10000, task: 'Kimi experiments', taskUrl: 'https://github.com/kaitakuai/experiments/blob/main/reports/2026-04-kimi-qwen-experiments.md' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 8000, task: 'Prompt of death: report and investigation of prompts causing vLLM crashes around structured outputs / tool handling', discord: '@Blizko' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 500, task: 'Partial Payment on Claim Failure Causes Permanent Reward Loss. PR: #826', taskUrl: 'https://github.com/gonka-ai/gonka/pull/826', discord: '@Ouicate' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 375, task: 'Underfunded Work Payout Still Removes Settle Amount. PR: #826', taskUrl: 'https://github.com/gonka-ai/gonka/pull/826', discord: '@Ouicate' },
    ],
  },
  {
    title: 'Upgrade v0.2.12, Bug bounty awards (pull requests review, security, and correctness fixes)',
    time: '2026-04-30',
    currency: 'USDT',
    proposalId: 44,
    records: [
      { githubUsername: 'Red-Caesar', address: 'gonka1yhdhp4vwsvdsplv4acksntx0zxh8saueq6lj9m', amount: 9000, task: 'Inference validation optimization (Axel-t team). Issue: #929', taskUrl: 'https://github.com/gonka-ai/gonka/issues/929' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 6000, task: 'CertiK audit fixes (GEB-29, GEB-35, GEB-44, GEB-45, GEB-51). PRs: #988, #1020, #1021', taskUrl: 'https://github.com/gonka-ai/gonka/pull/988', discord: '@x0152' },
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 5000, task: 'v0.2.12 release management', discord: '@Alexander Kuprin' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 3000, task: 'DKG dealer consensus. PR: #825', taskUrl: 'https://github.com/gonka-ai/gonka/pull/825', discord: '@x0152' },
      { address: 'gonka1vu28c7w5zxqe28lakrrfdrkvscft326rxur3dv', amount: 3000, task: 'Acquire node gRPC. PR: #945', taskUrl: 'https://github.com/gonka-ai/gonka/pull/945', discord: 'pixelplex' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 2500, task: 'v0.2.12 release management', discord: '@x0152' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 2000, task: 'Fund atomicity error safety. PR: #789', taskUrl: 'https://github.com/gonka-ai/gonka/pull/789', discord: '@yapion.' },
      { githubUsername: 'qdanik', address: 'gonka1j3f2xkapx8cmczpjqcsrh7cc3peyj3ngkjv4p8', amount: 1500, task: 'Align validator slashing with required collateral. PR: #940', taskUrl: 'https://github.com/gonka-ai/gonka/pull/940' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 1000, task: 'Developer inference access / account API changes. PR: #750', taskUrl: 'https://github.com/gonka-ai/gonka/pull/750', discord: '@x0152' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 1000, task: 'Review of upgrade v0.2.11', discord: '@Blizko' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 500, task: 'OpenAI compatibility and API error handling. PR: #614', taskUrl: 'https://github.com/gonka-ai/gonka/pull/614', discord: '@x0152' },
      { githubUsername: 'rufatpro', address: 'gonka1c34w3r45f0uftjckt2yy4k22vnc3zqjnp0umyz', amount: 500, task: 'Report of free inference vulnerability (fixed by devshards release)', discord: '@Rufat' },
      { githubUsername: 'pentoxine', address: 'gonka139f7x4gur2yuyty64dkqxep8jk3d7ku8ayjaqg', amount: 200, task: 'Chat completions fix (missed from v0.2.10). Issue: #499', taskUrl: 'https://github.com/gonka-ai/gonka/issues/499', discord: '@Pento' },
    ],
  },
  {
    title: 'Upgrade v0.2.11, Bug bounty awards (pull requests review, security, and correctness fixes)',
    time: '2026-03-20',
    currency: 'GNK',
    proposalId: 31,
    records: [
      { githubUsername: 'Red-Caesar', address: 'gonka1yhdhp4vwsvdsplv4acksntx0zxh8saueq6lj9m', amount: 25000, task: 'PoC integration into vllm v0.11.1 report', taskUrl: 'https://github.com/gonka-ai/gonka/issues/628' },
      { githubUsername: 'kaitakuai, clanster, baychak', address: 'gonka1x45hruazmcqxslj3g8a08988hr5fr3wx33drhp', amount: 22500, task: 'vLLM 0.15.1 Compatibility Experiments, basis for next ML node version', taskUrl: 'https://github.com/gonka-ai/gonka/issues/730' },
      { githubUsername: 'qdanik', address: 'gonka1j3f2xkapx8cmczpjqcsrh7cc3peyj3ngkjv4p8', amount: 15000, task: 'vLLM 0.15.1 Compatibility Experiments, basis for next ML node version, covering simultaneous PoC and inference', taskUrl: 'https://github.com/qdanik/vllm/pull/6' },
      { githubUsername: 'qdanik', address: 'gonka1j3f2xkapx8cmczpjqcsrh7cc3peyj3ngkjv4p8', amount: 12000, task: 'vLLM 0.15.1 Compatibility Experiments, basis for next ML node version', taskUrl: 'https://github.com/qdanik/vllm/pull/5' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 10000, task: 'report of series of prompts resulting in vllm HTTP 502 response, significant impact, was already used for intentional griefing', discord: '@Blizko' },
      { githubUsername: 'Lelouch33', address: 'gonka128nd36m2pz5qcs4q6rd69622flyls05nleazqq', amount: 7500, task: 'important issue that affected many participants, not a vulnerability, fairly easy fix; adding extra payment for fully testing and providing results of the test together with the fix', taskUrl: 'https://github.com/gonka-ai/gonka/issues/819', discord: '@Lelouch33' },
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 7500, task: 'release management', discord: '@Alexander Kuprin' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 7500, task: 'release management', discord: '@x0152' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 5000, task: 'report of Remote DoS of Validator PoC Software via dist Assertion', discord: '@Ouicate' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 5000, task: 'report of State Bloat PoC and End-Block DoS via Unbounded Batch / Validation Payloads', discord: '@Ouicate' },
      { githubUsername: 'qdanik', address: 'gonka1j3f2xkapx8cmczpjqcsrh7cc3peyj3ngkjv4p8', amount: 5000, task: 'report of wind down window vulnerability fixed in PR #767' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 5000, task: 'collective solving StartInference and FinishInference issue', taskUrl: 'https://github.com/gonka-ai/gonka/issues/781', discord: '@x0152' },
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 5000, task: 'collective solving StartInference and FinishInference issue', taskUrl: 'https://github.com/gonka-ai/gonka/issues/781', discord: '@Alexander Kuprin' },

      { githubUsername: 'huxuxuya', address: 'gonka100s7x2t0npruu9ta02306qfmaened3vg3a9dn6', amount: 5000, task: 'Batch Transfer With Vesting implementation, huge kudos for figuring out how to use testnet', taskUrl: 'https://github.com/gonka-ai/gonka/issues/834', discord: '@Huxuxuya' },
      { githubUsername: 'qdanik', address: 'gonka1j3f2xkapx8cmczpjqcsrh7cc3peyj3ngkjv4p8', amount: 5000, task: 'collateral slashing vulnerability and fix; low severity: low risk, medium likelihood, organic', taskUrl: 'https://github.com/gonka-ai/gonka/pull/868' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 3000, task: 'collective solving of nodes unable to join from snapshots, found source problem', taskUrl: 'https://github.com/gonka-ai/gonka/issues/797', discord: '@x0152' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 2500, task: 'extra bounty for a comprehensive review of all cases where the data race conditions fix was needed', taskUrl: 'https://github.com/gonka-ai/gonka/pull/543', discord: '@x0152' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 2500, task: 'upgrade review', discord: '@yapion.' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 2500, task: 'upgrade review', discord: '@Blizko' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 2500, task: 'upgrade review', discord: '@x0152' },

      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 1250, task: 'Add a transaction for deleting the governance model. It needs to be added and verified to ensure it does not affect operations in the current epoch', taskUrl: 'https://github.com/gonka-ai/gonka/issues/465', discord: '@x0152' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 1000, task: 'report of dust transaction vulnerability extending blocks', discord: '@Blizko' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 1000, task: 'Slashed coins should not be burned', taskUrl: 'https://github.com/gonka-ai/gonka/issues/772', discord: '@x0152' },
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 1000, task: 'collective solving of nodes unable to join from snapshots, proposed valuable hypothesis',taskUrl: 'https://github.com/gonka-ai/gonka/issues/797', discord: '@Alexander Kuprin' },
      { githubUsername: 'hleb-albau', address: 'gonka17kmfwzthep3alxt57vqcqr48uv7swp0u63gcnj', amount: 750, task: 'collective solving StartInference and FinishInference issue', taskUrl: 'https://github.com/gonka-ai/gonka/issues/780' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 750, task: 'report of Bridge Ethereum Address Parsing Silently Falls Back to Zero Bytes (Loss/Misdirection of Funds)', discord: '@Ouicate' },
    ],
  },
  {
    title: 'Upgrade v0.2.10, Bug bounty awards (security and correctness fixes)',
    time: '2026-02-18',
    currency: 'GNK',
    proposalId: 27,
    records: [
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 10000, task: 'Detailed report and fix for a Medium risk vulnerability', taskUrl: 'https://github.com/gonka-ai/gonka/pull/659', discord: '@Alexander Kuprin' },
      { githubUsername: 'rufatpro', address: 'gonka1c34w3r45f0uftjckt2yy4k22vnc3zqjnp0umyz', amount: 5000, task: 'First report of the vulnerability fixed in #659', taskUrl: 'https://github.com/gonka-ai/gonka/pull/659', discord: '@Rufat' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 5000, task: 'Independent report on the issue addressed by PR #710', taskUrl: 'https://github.com/gonka-ai/gonka/pull/710', discord: '@Ouicate' },
      { githubUsername: 'AlexeySamosadov', address: 'gonka1jkydytz99gkh0t42gjj4lz0mmdeumqp7mtzke3', amount: 1500, task: 'Add MsgTransferWithVesting for vesting transfers', taskUrl: 'https://github.com/gonka-ai/gonka/pull/641', discord: '@AlexeySamosadov' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 1500, task: 'Dynamic table selection', taskUrl: 'https://github.com/gonka-ai/gonka/pull/688', discord: '@yapion.' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 1000, task: 'Report and fix of low risk vulnerability. Extra appreciation for discovering and reporting it during the review of another PR.', taskUrl: 'https://github.com/gonka-ai/gonka/pull/545', discord: '@x0152' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 700, task: 'Fix(inference): propagate refund error in InvalidateInference', taskUrl: 'https://github.com/gonka-ai/gonka/pull/622', discord: '@yapion.' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 700, task: 'Fix: avoid rewriting config on every startup (Planned task, not a vulnerability, important for the network)', taskUrl: 'https://github.com/gonka-ai/gonka/pull/644', discord: '@x0152' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 500, task: 'Valid fix for minor vulnerability that was previously reported in issue #422', taskUrl: 'https://github.com/gonka-ai/gonka/pull/661', discord: '@x0152' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 500, task: 'Report and fix of low risk vulnerability', taskUrl: 'https://github.com/gonka-ai/gonka/pull/643', discord: '@x0152' },
      { githubUsername: 'Mfursov', address: 'gonka123khww9elhtj49zumz0daleaudl6jn9y87tf23', amount: 500, task: 'First report and suggested fix (PR #661)', taskUrl: 'https://github.com/gonka-ai/gonka/issues/422' },
      { githubUsername: 'AlexeySamosadov', address: 'gonka1jkydytz99gkh0t42gjj4lz0mmdeumqp7mtzke3', amount: 100, task: 'Valid minor bug fix PR #640', taskUrl: 'https://github.com/gonka-ai/gonka/pull/640', discord: '@AlexeySamosadov' },
      { githubUsername: 'AlexeySamosadov', address: 'gonka1jkydytz99gkh0t42gjj4lz0mmdeumqp7mtzke3', amount: 100, task: 'Valid minor bug fix PR #638', taskUrl: 'https://github.com/gonka-ai/gonka/pull/638', discord: '@AlexeySamosadov' },
      { githubUsername: 'AlexeySamosadov', address: 'gonka1jkydytz99gkh0t42gjj4lz0mmdeumqp7mtzke3', amount: 100, task: 'Valid minor bug fix PR #634', taskUrl: 'https://github.com/gonka-ai/gonka/pull/634', discord: '@AlexeySamosadov' },
    ],
  },
  {
    title: 'Upgrade v0.2.10, PR review of upgrade v0.2.9',
    time: '2026-02-18',
    currency: 'GNK',
    proposalId: 27,
    records: [
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 2500, task: 'PR review of upgrade v0.2.9', discord: '@Blizko' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 2500, task: 'PR review of upgrade v0.2.9', discord: '@x0152' },
    ],
  },
  {
    title: 'Upgrade v0.2.10, PR review of upgrade v0.2.8',
    time: '2026-02-18',
    currency: 'GNK',
    proposalId: 27,
    records: [
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 2500, discord: '@Blizko' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 2500, discord: '@x0152' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 2500, discord: '@Ouicate' },
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 2500, discord: '@Alexander Kuprin' },
      { address: 'gonka1zqss46r6jf6dhhyaa777kc2ppvjhn0ufkx4y57', amount: 2500 },
    ],
  },
  {
    title: 'Upgrade v0.2.8',
    time: '2026-01-29',
    currency: 'GNK',
    proposalId: 25,
    records: [
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 25000, task: 'Inference: Defense-in-depth against int overflow', taskUrl: 'https://github.com/gonka-ai/gonka/pull/544', discord: '@Ouicate' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 12500, task: 'Security Fixes for v0.2.7', taskUrl: 'https://github.com/gonka-ai/gonka/pull/505', discord: '@Ouicate' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 11988, task: 'Non Determinism in denom (included in 0.2.7)', taskUrl: 'https://github.com/gonka-ai/gonka/commit/a0cdbf64f6ac05f86f9edede1770c614a4cfc228', discord: '@Ouicate' },
      { githubUsername: 'Red-Caesar', address: 'gonka1yhdhp4vwsvdsplv4acksntx0zxh8saueq6lj9m', amount: 10000, task: 'vLLM 0.11.0 migration (Axel-t team)', taskUrl: 'https://github.com/gonka-ai/gonka/issues/647' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 5000, task: 'Auth Bypass & Replay', taskUrl: 'https://github.com/gonka-ai/gonka/commit/8853af800a88c170d06f560e8a1a28de9c45ea61', discord: '@Ouicate' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 5000, task: 'Reject duplicate slot indices in partial signatures', taskUrl: 'https://github.com/gonka-ai/gonka/pull/551', discord: '@yapion.' },
      { githubUsername: 'VVSMEN', address: 'gonka1wpan224906ant68frjd8vqreaxr87hudy2wvd9', amount: 3497, task: 'Low-VRAM GPUs (included in 0.2.7)' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 2498, task: 'CICD Vulnerability (included in 0.2.7)', taskUrl: 'https://github.com/gonka-ai/gonka/pull/509', discord: '@Ouicate' },
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 2000, task: 'Request timestamp is in the future leads to missed inferences', taskUrl: 'https://github.com/gonka-ai/gonka/issues/518', discord: '@Alexander Kuprin' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 500, task: 'Update totalDistributed after debt deduction', taskUrl: 'https://github.com/gonka-ai/gonka/pull/607', discord: '@yapion.' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 500, task: 'Security: Prevent SSRF via executor redirect', taskUrl: 'https://github.com/gonka-ai/gonka/pull/534', discord: '@x0152' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 500, task: 'Perf: Optimize /v1/participants with single balance query (~500x speedup)', taskUrl: 'https://github.com/gonka-ai/gonka/pull/536', discord: '@x0152' },
    ],
  },
  {
    title: 'Upgrade v0.2.7, Bug bounty awards (security and correctness fixes)',
    time: '2026-01-08',
    currency: 'GNK',
    proposalId: 19,
    records: [
      { address: 'gonka1z0phwa33ggyzs4djmntsahcjjrjqjyyjsg8f86', amount: 12, task: 'Non Determinism in denom (paid 1000x too low; remainder paid in v0.2.8)' },
      { address: 'gonka1z0phwa33ggyzs4djmntsahcjjrjqjyyjsg8f86', amount: 2.5, task: 'CICD Vulnerability (paid 1000x too low; remainder paid in v0.2.8)' },
      { address: 'gonka1wpan224906ant68frjd8vqreaxr87hudy2wvd9', amount: 3.5, task: 'Low-VRAM GPUs (paid 1000x too low; remainder paid in v0.2.8)' },
    ],
  },
  {
    title: 'Bounty awards (security and correctness fixes)',
    time: '2025-12-20',
    currency: 'GNK',
    proposalId: 16,
    records: [
      { githubUsername: 'Evgenii Maksimenkov', address: 'gonka1gmuxdcxlsxn5z72elx77w9zym7yrgfxqgzg6ry', amount: 20000, task: 'Vulnerability in Confirmation PoC', discord: '@Eugene Maksimenkov' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 10000, task: 'Bridge Exchange Double Vote Case Bypass', discord: '@yapion.' },
    ],
  },
  {
    title: 'Upgrade v0.2.5 and Review',
    time: '2025-12-20',
    currency: 'GNK',
    proposalId: 16,
    records: [
      { githubUsername: 'iamoeco', address: 'gonka1d9cewcmhq4ez9xgld54qgee06fhk3qy4tqza88', amount: 12052.68, task: 'review (weight 36964 + 4225 + 25344)' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 4925.74, task: 'review', discord: '@Blizko' },
      { address: 'gonka18lluv53n4h9z34qu20vxcvypgdkhsg6nn2cl2d', amount: 2400, task: 'PR authors (reduced)' },
      { githubUsername: 'Pegasus-starry', address: 'gonka1vhprg9epy683xghp8ddtdlw2y9cycecmm64tje', amount: 2251.19, task: 'review (weight 12427)' },
      { githubUsername: 'AnzeKovac', address: 'gonka1ktl3kkn9l68c9amanu8u4868mcjmtsr5tgzmjk', amount: 1181.66, task: 'review (weight 6523)' },
      { githubUsername: 'Pegasus-starry', address: 'gonka1p2lhgng7tcqju7emk989s5fpdr7k2c3ek6h26m', amount: 562.84, task: 'review (weight 3107)' },
      { githubUsername: 'Pegasus-starry', address: 'gonka1d7p03cu2y2yt3vytq9wlfm6tlz0lfhlgv9h82p', amount: 561.21, task: 'review (weight 3098)' },
      { address: 'gonka15p7s7w2hx0y8095lddd4ummm2y0kwpwljk00aq', amount: 64.67, task: 'review (weight 357)' },
    ],
  },
  {
    title: 'Upgrade v0.2.4 and PR Review',
    time: '2025-12-20',
    currency: 'GNK',
    proposalId: 16,
    records: [
      { githubUsername: 'iamoeco', address: 'gonka1d9cewcmhq4ez9xgld54qgee06fhk3qy4tqza88', amount: 6056.90, task: 'review (weight 27320)' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 5964.16, task: 'review + potential issue (weight 13370)', discord: '@Blizko' },
      { githubUsername: 'scuwan', address: 'gonka1p2lhgng7tcqju7emk989s5fpdr7k2c3ek6h26m', amount: 3124.45, task: 'review (weight 14093)' },
      { address: 'gonka18lluv53n4h9z34qu20vxcvypgdkhsg6nn2cl2d', amount: 3000, task: 'PR authors (reduced)' },
      { githubUsername: 'scuwan', address: 'gonka1d7p03cu2y2yt3vytq9wlfm6tlz0lfhlgv9h82p', amount: 2628.50, task: 'review (weight 11856)' },
      { githubUsername: 'AnzeKovac', address: 'gonka1ktl3kkn9l68c9amanu8u4868mcjmtsr5tgzmjk', amount: 1451.93, task: 'review (weight 6549)' },
      { githubUsername: 'scuwan', address: 'gonka1vhprg9epy683xghp8ddtdlw2y9cycecmm64tje', amount: 1231.78, task: 'review (weight 5556)' },
      { address: 'gonka15p7s7w2hx0y8095lddd4ummm2y0kwpwljk00aq', amount: 68.73, task: 'review (weight 310)' },
      { githubUsername: 'Pawel-TU', address: 'gonka19e5cl3ukk9yjmeza53eapnhwqqytelh77sq6gv', amount: 473.56, task: 'review (weight 2136)' },
    ],
  },
]

