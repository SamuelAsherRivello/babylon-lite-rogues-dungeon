---
name: ai-skills-create-playtest
description: Use when a human must verify a web app or game behavior, interaction, visual result, or regression; verify or restart its owned Vite server before giving a healthy test URL and exact steps.
---

# AI Skills Create Playtest

Create a focused, executable playtest for a human. Produce instructions and criteria; do not claim a human-observed result passed.

## Resolve the request

- Identify the application, target behavior, and evidence to report. If any are missing, ask what to playtest instead of inventing them.
- Turn the target into observable pass/fail criteria, including relevant negative cases. Keep unrelated exploration out.

## Prepare and verify the application

1. Read `AGENTS.md`, resolve the project root, and identify its authoritative run configuration and browser route.
2. Inspect the project-owned Vite/dev server by root and command context, not port alone. Verify its listener, HTTP route, status, and response identity.
3. If missing or unhealthy, restart only the exact project-owned process tree through the run-start workflow. Never kill unrelated processes, accept an unverified fallback port, or launch a second server. Re-check all route evidence.
4. Give no URL until verification succeeds. You must verify that the link is live immediately before sending it: confirm the project-owned listener, request the exact route over HTTP, verify a successful response and the expected application identity, and only then include the URL in the response. On failure, report the evidence and blocker. Keep a verified server running; tell the human to open it rather than opening a visible browser yourself.

Use the project run-status and run-start workflows when available: `$ai-skills-project-run-status` for inspection and `$ai-skills-project-run-start` for a collision-safe restart. These workflows' one-server-per-project and route-verification requirements apply here.

## Produce the playtest

The response must begin with an instruction to open the application, followed by the verified URL. Read [the output reference](references/output.md) when formatting the final playtest. Include numbered steps in execution order:

1. Open the URL and establish the initial state, viewport/orientation, input device, and reset/reload state.
2. Perform exact actions using concrete labels and controls.
3. State expected observations and explicit pass criteria at each meaningful checkpoint.
4. Tell the human what evidence to report when it fails.

Use exact labels and locations from the application when known. Mark optional exploratory checks separately from required checks. Do not claim that a human-observed result has passed; state that the human should verify it.

If the server could not be verified, replace the playtest instructions with the blocker and the evidence needed to resume. Never fabricate a URL or substitute a different project.
