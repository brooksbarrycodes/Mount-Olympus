import { config } from "../config.ts";

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  state: string;
  priority: number;
  dueDate: string | null;
  url: string;
  assignee: string | null;
}

const MOCK_ISSUES: LinearIssue[] = [
  {
    id: "mock-1",
    identifier: "OLY-1",
    title: "Wire treasury to HUD coin ticker",
    description: "Replace simulated drachmas with real project costs.",
    state: "In Progress",
    priority: 2,
    dueDate: null,
    url: "#",
    assignee: null,
  },
  {
    id: "mock-2",
    identifier: "OLY-2",
    title: "Linear integration smoke test",
    description: "Verify create/complete from desk and Zeus.",
    state: "Todo",
    priority: 3,
    dueDate: null,
    url: "#",
    assignee: null,
  },
];

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: config.linear.apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear API ${res.status}`);
  const data = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (data.errors?.length) throw new Error(data.errors[0]!.message);
  return data.data as T;
}

export function linearIsConfigured(): boolean {
  return config.linear.apiKey.length > 0;
}

export async function listTeams(): Promise<Array<{ id: string; name: string; key: string }>> {
  if (!linearIsConfigured()) {
    return [{ id: "mock", name: "Olympus", key: "OLY" }];
  }
  const data = await gql<{ teams: { nodes: Array<{ id: string; name: string; key: string }> } }>(
    `query { teams { nodes { id name key } } }`,
  );
  return data.teams.nodes;
}

export async function listIssues(teamId?: string): Promise<LinearIssue[]> {
  if (!linearIsConfigured()) return [...MOCK_ISSUES];
  const tid = teamId ?? config.linear.defaultTeamId;
  const filter = tid ? `, filter: { team: { id: { eq: "${tid}" } } }` : "";
  const data = await gql<{
    issues: {
      nodes: Array<{
        id: string;
        identifier: string;
        title: string;
        description: string | null;
        priority: number;
        dueDate: string | null;
        url: string;
        state: { name: string };
        assignee: { name: string } | null;
      }>;
    };
  }>(
    `query { issues(first: 50${filter}) { nodes { id identifier title description priority dueDate url state { name } assignee { name } } } }`,
  );
  return data.issues.nodes.map((n) => ({
    id: n.id,
    identifier: n.identifier,
    title: n.title,
    description: n.description ?? "",
    state: n.state.name,
    priority: n.priority,
    dueDate: n.dueDate,
    url: n.url,
    assignee: n.assignee?.name ?? null,
  }));
}

export async function getIssue(id: string): Promise<LinearIssue | undefined> {
  if (!linearIsConfigured()) return MOCK_ISSUES.find((i) => i.id === id);
  const data = await gql<{
    issue: {
      id: string;
      identifier: string;
      title: string;
      description: string | null;
      priority: number;
      dueDate: string | null;
      url: string;
      state: { name: string };
      assignee: { name: string } | null;
    } | null;
  }>(
    `query($id: String!) { issue(id: $id) { id identifier title description priority dueDate url state { name } assignee { name } } }`,
    { id },
  );
  if (!data.issue) return undefined;
  const n = data.issue;
  return {
    id: n.id,
    identifier: n.identifier,
    title: n.title,
    description: n.description ?? "",
    state: n.state.name,
    priority: n.priority,
    dueDate: n.dueDate,
    url: n.url,
    assignee: n.assignee?.name ?? null,
  };
}

export async function createIssue(opts: {
  title: string;
  description?: string;
  teamId?: string;
  priority?: number;
  dueDate?: string;
}): Promise<LinearIssue> {
  if (!linearIsConfigured()) {
    const issue: LinearIssue = {
      id: `mock-${Date.now()}`,
      identifier: `OLY-${MOCK_ISSUES.length + 1}`,
      title: opts.title,
      description: opts.description ?? "",
      state: "Todo",
      priority: opts.priority ?? 0,
      dueDate: opts.dueDate ?? null,
      url: "#",
      assignee: null,
    };
    MOCK_ISSUES.unshift(issue);
    return issue;
  }
  const teamId = opts.teamId ?? config.linear.defaultTeamId;
  const data = await gql<{
    issueCreate: {
      success: boolean;
      issue: {
        id: string;
        identifier: string;
        title: string;
        description: string | null;
        priority: number;
        dueDate: string | null;
        url: string;
        state: { name: string };
        assignee: { name: string } | null;
      };
    };
  }>(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier title description priority dueDate url state { name } assignee { name } }
      }
    }`,
    {
      input: {
        teamId,
        title: opts.title,
        description: opts.description,
        priority: opts.priority,
        dueDate: opts.dueDate,
      },
    },
  );
  const n = data.issueCreate.issue;
  return {
    id: n.id,
    identifier: n.identifier,
    title: n.title,
    description: n.description ?? "",
    state: n.state.name,
    priority: n.priority,
    dueDate: n.dueDate,
    url: n.url,
    assignee: n.assignee?.name ?? null,
  };
}

export async function updateIssue(
  id: string,
  patch: { title?: string; description?: string; state?: string; priority?: number; dueDate?: string },
): Promise<LinearIssue | undefined> {
  if (!linearIsConfigured()) {
    const issue = MOCK_ISSUES.find((i) => i.id === id);
    if (!issue) return undefined;
    if (patch.title) issue.title = patch.title;
    if (patch.description != null) issue.description = patch.description;
    if (patch.state) issue.state = patch.state;
    if (patch.priority != null) issue.priority = patch.priority;
    if (patch.dueDate != null) issue.dueDate = patch.dueDate;
    return issue;
  }
  const input: Record<string, unknown> = {};
  if (patch.title) input.title = patch.title;
  if (patch.description != null) input.description = patch.description;
  if (patch.priority != null) input.priority = patch.priority;
  if (patch.dueDate != null) input.dueDate = patch.dueDate;
  if (patch.state) {
    const states = await gql<{ workflowStates: { nodes: Array<{ id: string; name: string }> } }>(
      `query { workflowStates { nodes { id name } } }`,
    );
    const st = states.workflowStates.nodes.find(
      (s) => s.name.toLowerCase() === patch.state!.toLowerCase(),
    );
    if (st) input.stateId = st.id;
  }
  const data = await gql<{
    issueUpdate: {
      success: boolean;
      issue: {
        id: string;
        identifier: string;
        title: string;
        description: string | null;
        priority: number;
        dueDate: string | null;
        url: string;
        state: { name: string };
        assignee: { name: string } | null;
      };
    };
  }>(
    `mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { id identifier title description priority dueDate url state { name } assignee { name } }
      }
    }`,
    { id, input },
  );
  const n = data.issueUpdate.issue;
  return {
    id: n.id,
    identifier: n.identifier,
    title: n.title,
    description: n.description ?? "",
    state: n.state.name,
    priority: n.priority,
    dueDate: n.dueDate,
    url: n.url,
    assignee: n.assignee?.name ?? null,
  };
}

export async function completeIssue(id: string): Promise<LinearIssue | undefined> {
  return updateIssue(id, { state: "Done" });
}

export async function addComment(issueId: string, body: string): Promise<{ ok: boolean }> {
  if (!linearIsConfigured()) return { ok: true };
  await gql(
    `mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
    { input: { issueId, body } },
  );
  return { ok: true };
}
