export interface RewardRecord {
  username?: string
  githubUsername?: string
  address?: string
  amount: number
  task?: string
  taskUrl?: string
  discord?: string
}

export interface RewardGroup {
  title: string
  time: string
  records: RewardRecord[]
}

export interface ContributorRank {
  name?: string
  github?: string
  discord?: string
  total: number
}

// GitHub username → URL overrides (only for usernames where slug differs from display name)
// Default resolution: https://github.com/{githubUsername}
export const GITHUB_URL_OVERRIDES: Record<string, string> = {
  'Mfursov': 'https://github.com/mfursov',
  'Evgenii Maksimenkov': 'https://github.com/maksimenkoff',
  'Tania Charchian': 'https://github.com/tcharchian',
}

export const REWARD_DATA: RewardGroup[] = [
  {
    title: 'Upgrade v0.2.11, Bug bounty awards (pull requests review, security, and correctness fixes)',
    time: '2026-03-21',
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
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzh7fmjxhach7w8', amount: 2500, task: 'upgrade review', discord: '@yapion.' },
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
    time: '2026-03-05 08:27 UTC',
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
      { githubUsername: 'Mfursov', amount: 500, task: 'First report and suggested fix (PR #661)', taskUrl: 'https://github.com/gonka-ai/gonka/issues/422' },
      { githubUsername: 'AlexeySamosadov', address: 'gonka1jkydytz99gkh0t42gjj4lz0mmdeumqp7mtzke3', amount: 100, task: 'Valid minor bug fix PR #640', taskUrl: 'https://github.com/gonka-ai/gonka/pull/640', discord: '@AlexeySamosadov' },
      { githubUsername: 'AlexeySamosadov', address: 'gonka1jkydytz99gkh0t42gjj4lz0mmdeumqp7mtzke3', amount: 100, task: 'Valid minor bug fix PR #638', taskUrl: 'https://github.com/gonka-ai/gonka/pull/638', discord: '@AlexeySamosadov' },
      { githubUsername: 'AlexeySamosadov', address: 'gonka1jkydytz99gkh0t42gjj4lz0mmdeumqp7mtzke3', amount: 100, task: 'Valid minor bug fix PR #634', taskUrl: 'https://github.com/gonka-ai/gonka/pull/634', discord: '@AlexeySamosadov' },
    ],
  },
  {
    title: 'Upgrade v0.2.10, PR review of upgrade v0.2.9',
    time: '2026-03-05 08:14 UTC',
    records: [
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 2500, task: 'PR review of upgrade v0.2.9', discord: '@Blizko' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 2500, task: 'PR review of upgrade v0.2.9', discord: '@x0152' },
    ],
  },
  {
    title: 'Upgrade v0.2.10, PR review of upgrade v0.2.8',
    time: '2026-03-05 08:12 UTC',
    records: [
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 2500, discord: '@Blizko' },
      { githubUsername: 'x0152', address: 'gonka18enyz7h6hh5zjveee5wnhkhrcexamfz0zdxxqe', amount: 2500, discord: '@x0152' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 2500, discord: '@Ouicate' },
      { githubUsername: 'akup', address: 'gonka1ejkupq3cy6p8xd64ew2wlzveml86ckpzn9dl56', amount: 2500, discord: '@Alexander Kuprin' },
      { username: '6block team', address: 'gonka1zqss46r6jf6dhhyaa777kc2ppvjhn0ufkx4y57', amount: 2500 },
    ],
  },
  {
    title: 'Upgrade v0.2.8',
    time: '2026-03-05 07:52 UTC',
    records: [
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 25000, task: 'Inference: Defense-in-depth against int overflow', taskUrl: 'https://github.com/gonka-ai/gonka/pull/544', discord: '@Ouicate' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 12500, task: 'Security Fixes for v0.2.7', taskUrl: 'https://github.com/gonka-ai/gonka/pull/505', discord: '@Ouicate' },
      { githubUsername: 'ouicate', address: 'gonka1f0elpwnx7ezytdlck35003nz6qk8kzvurvnj4a', amount: 11988, task: 'Non Determinism in denom (included in 0.2.7)', taskUrl: 'https://github.com/gonka-ai/gonka/commit/a0cdbf64f6ac05f86f9edede1770c614a4cfc228', discord: '@Ouicate' },
      { githubUsername: 'Tania Charchian', address: 'gonka1yhdhp4vwsvdsplv4acksntx0zxh8saueq6lj9m', amount: 10000, task: 'vLLM 0.11.0 — Migration Proposal', taskUrl: 'https://github.com/gonka-ai/gonka/issues/647' },
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
    title: 'Bounty awards (security and correctness fixes)',
    time: '2026-03-05 07:44 UTC',
    records: [
      { githubUsername: 'Evgenii Maksimenkov', address: 'gonka1gmuxdcxlsxn5z72elx77w9zym7yrgfxqgzg6ry', amount: 20000, task: 'Vulnerability in Confirmation PoC', discord: '@Eugene Maksimenkov' },
      { githubUsername: '0xMayoor', address: 'gonka1s8szs7n43jxgz4a4xaxmzm5emh7fmjxhach7w8', amount: 10000, task: 'Bridge Exchange Double Vote Case Bypass', discord: '@yapion.' },
    ],
  },
  {
    title: 'Upgrade v0.2.5 and Review',
    time: '2026-03-05 07:42 UTC',
    records: [
      { githubUsername: 'iamoeco', address: 'gonka1d9cewcmhq4ez9xgld54qgee06fhk3qy4tqza88', amount: 12052.68, task: 'review (weight 36964 + 4225 + 25344)' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 4925.74, task: 'review', discord: '@Blizko' },
      { address: 'gonka18lluv53n4h9z34qu20vxcvypgdkhsg6nn2cl2d', amount: 2400 },
      { githubUsername: 'Pegasus-starry', address: 'gonka1vhprg9epy683xghp8ddtdlw2y9cycecmm64tje', amount: 2251.19, task: 'review (weight 12427)' },
      { githubUsername: 'AnzeKovac', address: 'gonka1ktl3kkn9l68c9amanu8u4868mcjmtsr5tgzmjk', amount: 1181.66, task: 'review (weight 6523)' },
      { githubUsername: 'Pegasus-starry', address: 'gonka1p2lhgng7tcqju7emk989s5fpdr7k2c3ek6h26m', amount: 562.84, task: 'review (weight 3107)' },
      { githubUsername: 'Pegasus-starry', address: 'gonka1d7p03cu2y2yt3vytq9wlfm6tlz0lfhlgv9h82p', amount: 561.21, task: 'review (weight 3098)' },
    ],
  },
  {
    title: 'Upgrade v0.2.4 and PR Review',
    time: '2026-03-05 08:36 UTC',
    records: [
      { githubUsername: 'iamoeco', address: 'gonka1d9cewcmhq4ez9xgld54qgee06fhk3qy4tqza88', amount: 6056.90, task: 'review (weight 27320)' },
      { githubUsername: 'blizko', address: 'gonka12jaf7m4eysyqt32mrgarum6z96vt55tckvcleq', amount: 5964.16, task: 'review + potential issue (weight 13370)', discord: '@Blizko' },
      { githubUsername: 'scuwan', address: 'gonka1p2lhgng7tcqju7emk989s5fpdr7k2c3ek6h26m', amount: 3124.45, task: 'review (weight 14093)' },
      { address: 'gonka18lluv53n4h9z34qu20vxcvypgdkhsg6nn2cl2d', amount: 3000 },
      { githubUsername: 'scuwan', address: 'gonka1d7p03cu2y2yt3vytq9wlfm6tlz0lfhlgv9h82p', amount: 2628.50, task: 'review (weight 11856)' },
      { githubUsername: 'AnzeKovac', address: 'gonka1ktl3kkn9l68c9amanu8u4868mcjmtsr5tgzmjk', amount: 1451.93, task: 'review (weight 6549)' },
      { githubUsername: 'scuwan', address: 'gonka1vhprg9epy683xghp8ddtdlw2y9cycecmm64tje', amount: 1231.78, task: 'review (weight 5556)' },
      { githubUsername: 'Pawel-TU', address: 'gonka19e5cl3ukk9yjmeza53eapnhwqqytelh77sq6gv', amount: 473.56, task: 'review (weight 2136)' },
    ],
  },
]

export const CONTRIBUTOR_SUMMARY: ContributorRank[] = [
  { discord: '@Ouicate["1427291039949127690"]', total: 75250.00 },
  { github: 'Daniil Yankouski["https://github.com/qdanik"]', total: 37000.00 },
  { github: 'Axel-T["https://github.com/Red-Caesar"]', total: 35000.00 },
  { discord: '@x0152["782297186939568128"]', total: 31450.00 },
  { discord: '@Blizko["770691223618453574"]', total: 29389.90 },
  { discord: '@Alexander Kuprin["1346953106365354035"]', total: 28000.00 },
  { github: 'kaitaku.ai["https://github.com/kaitakuai"]', total: 22500.00 },
  { discord: '@yapion.["705885531174600845"]', total: 20200.00 },
  { github: 'Eugene Maksimenkov["https://github.com/maksimenkoff"]', discord: '@Eugene Maksimenkov["984962691502333993"]', total: 20000.00 },
  { github: 'Ilia Astafev["https://github.com/iamoeco"]', total: 18109.58 },
  { name: '6block team', github: 'scuwan["https://github.com/scuwan"], Pegasus-starry["https://github.com/Pegasus-starry"]', total: 12993.37 },
  { discord: '@Lelouch33["340894273379762177"]', total: 7500.00 },
  { name: 'PS', total: 5400.00 },
  { discord: '@Rufat["1197782508318756944"]', total: 5000.00 },
  { discord: '@Huxuxuya["213375632808083467"]', total: 5000.00 },
  { github: 'VVSMEN["https://github.com/VVSMEN"]', total: 3500.00 },
  { github: 'AnzeKovac["https://github.com/AnzeKovac"]', total: 2633.59 },
  { github: 'Alexey Samosadov["https://github.com/AlexeySamosadov"]', discord: '@AlexeySamosadov["1018163277706051595"]', total: 1800.00 },
  { github: 'Hleb Albau["https://github.com/hleb-albau"]', total: 750.00 },
  { github: 'Mikhail Fursov["https://github.com/mfursov"]', total: 500.00 },
  { github: 'Pawel-TU["https://github.com/Pawel-TU"]', total: 473.56 },
]
