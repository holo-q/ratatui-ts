#!/usr/bin/env node
// Lightweight CI monitor for GitHub Actions runs.
// Usage examples:
//   node scripts/ci-monitor.js --repo holo-q/ratatui-ts --workflow release.yml --ref v0.1.1 --token $GITHUB_TOKEN --poll 15
//   node scripts/ci-monitor.js --repo holo-q/ratatui-ts --run-id 123456789 --token $GITHUB_TOKEN
// Notes: Requires Node 18+ (global fetch). Token needs repo read permissions.

const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
}

const repo = getArg('repo'); // e.g. 'holo-q/ratatui-ts'
const workflow = getArg('workflow'); // e.g. 'release.yml' or workflow_id
const ref = getArg('ref'); // branch or tag name (e.g. 'v0.1.1')
const runId = getArg('run-id');
const token = getArg('token', process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.NODE_AUTH_TOKEN);
let poll = parseInt(getArg('poll', '15'), 10);
const maxPoll = parseInt(getArg('max-poll', '60'), 10);
if (!repo) {
  console.error('Missing --repo <owner/repo>');
  process.exit(2);
}
if (!token) {
  console.error('Missing --token <GITHUB_TOKEN>.');
  process.exit(2);
}

const headers = {
  'Accept': 'application/vnd.github+json',
  'Authorization': `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

async function fetchJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function resolveWorkflowId() {
  if (!workflow) return null;
  if (/^\d+$/.test(workflow)) return workflow;
  const url = `https://api.github.com/repos/${repo}/actions/workflows`;
  const data = await fetchJson(url);
  const wf = data.workflows.find(w => w.path.endsWith(`/${workflow}`) || w.name === workflow);
  if (!wf) throw new Error(`Workflow not found: ${workflow}`);
  return wf.id;
}

async function findRunIdByRef(workflowId) {
  // List runs for workflow
  const runsUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflowId}/runs?per_page=50`;
  const data = await fetchJson(runsUrl);
  const list = data.workflow_runs || [];
  // Filter by head_branch (for tags, GitHub sets head_branch to tag name)
  const filtered = ref ? list.filter(r => r.head_branch === ref) : list;
  if (!filtered.length) throw new Error('No runs found for given ref.');
  // Latest by created_at
  filtered.sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
  return filtered[0].id;
}

async function getRun(run) {
  const url = `https://api.github.com/repos/${repo}/actions/runs/${run}`;
  return fetchJson(url);
}

async function getJobs(run) {
  const url = `https://api.github.com/repos/${repo}/actions/runs/${run}/jobs?per_page=100`;
  return fetchJson(url);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  try {
    let id = runId;
    if (!id) {
      const wfId = await resolveWorkflowId();
      if (!wfId) throw new Error('Provide --run-id or --workflow.');
      id = await findRunIdByRef(wfId);
    }
    console.log(`Monitoring run ${id} on ${repo} (poll=${poll}s)`);
    let lastStatus = '';
    while (true) {
      const run = await getRun(id);
      const status = `${run.status}/${run.conclusion || 'n/a'}`;
      if (status !== lastStatus) {
        console.log(`[${new Date().toISOString()}] ${status}`);
        lastStatus = status;
      }
      if (run.status === 'completed') {
        const jobs = await getJobs(id);
        for (const j of jobs.jobs) {
          console.log(` - ${j.name}: ${j.status}/${j.conclusion}`);
        }
        if (run.conclusion !== 'success') process.exit(1);
        return;
      }
      // adaptive polling: increase up to max while in_progress/queued
      await sleep(poll * 1000);
      if (poll < maxPoll) poll = Math.min(maxPoll, poll + 5);
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(2);
  }
})();

