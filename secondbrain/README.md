# timetrack Second Brain

This folder is the persistent project memory for the `timetrack` HR / attendance / payroll system.

## Mandatory rule

**Every project change must be recorded in Second Brain in the same session.**

This includes code, config, dependencies, database/schema, tests, business rules, bug fixes, refactors, deployment/runtime behavior, discovered risks, and important operational findings.

At minimum, every change must add a dated entry to [[notes/Session-Log]]. Update the related durable note as well whenever the change affects decisions, architecture, runbook, backlog, or current state.

A change is not considered complete until its Second Brain record is updated.

## How to use

1. Open this folder directly in Obsidian if desired.
2. Start from [[00-Start-Here]].
3. Before changing payroll or attendance logic, read [[notes/Decisions]] and [[notes/Runbook]].
4. After **every** project change, update [[notes/Session-Log]] and any affected notes in the same session.
5. Commit the relevant Second Brain notes together with the change whenever practical.

## Structure

- `00-Start-Here.md` — launch point for future sessions.
- `notes/Project-Overview.md` — project purpose, stack, and major areas.
- `notes/Architecture.md` — important code paths and calculation flow.
- `notes/Decisions.md` — durable business and engineering decisions.
- `notes/Runbook.md` — commands and verification workflow.
- `notes/Backlog.md` — known follow-ups and risks.
- `notes/Session-Log.md` — chronological work log.
- `templates/Session-Note.md` — reusable session template.

Keep entries concise, dated, and tied to code/commit references when possible.
