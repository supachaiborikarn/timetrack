---
description: How AI should use the memory system before and after responding
---

# AI Memory System Workflow

This workflow defines how to use the memory system in `.agent/memory/` for the HRpayroll/timetrack project.

## Before Answering Any Question

### Step 1: Read the Index
Always start by reading the index to find relevant topics:
```
Read: /Users/benzsuphaudphanich/Desktop/HRpayroll/timetrack/.agent/memory/index.json
```
Match user's keywords/intent to topic `tags` and `summary` fields.

### Step 2: Read TL;DR Only (Efficient)
If a topic matches, read ONLY the TL;DR section of the topic file:
```
Read first ~10 lines of: .agent/memory/topics/<topic_id>.md
```
- If TL;DR is sufficient → answer the user
- If more detail needed → read the full file

### Step 3: Read Full File (Only if Needed)
Read the complete topic file only when TL;DR is insufficient.

---

## After Responding / When New Info is Discussed

### When to Update Memory
Update memory files when:
- A new bug is found and fixed
- A new feature is added/modified
- A design decision is made
- User corrects outdated information
- A new topic emerges that doesn't exist yet

### How to Update

#### Update an Existing Topic
1. Read the current topic file
2. Update the relevant section
3. Add an entry to the `## Changelog` section at the bottom
4. Update `last_updated` date in `index.json`

**Format for changelog entry:**
```
- YYYY-MM-DD: [What changed and why]
```

#### Create a New Topic
1. Create a new file: `.agent/memory/topics/<new_topic_id>.md`
2. Use this template:
```markdown
# [Topic Name]

## TL;DR
[3-5 sentences summarizing the most important facts]

## Full Details
[Detailed information organized with headers]

## Changelog
- YYYY-MM-DD: Initial memory created.
```
3. Add an entry to `index.json` topics array:
```json
{
  "id": "new_topic_id",
  "title": "Topic Title",
  "summary": "One-line summary for index scanning",
  "file": "topics/new_topic_id.md",
  "tags": ["relevant", "tags"],
  "last_updated": "YYYY-MM-DD"
}
```

#### NEVER Duplicate Topics
- Search index.json before creating a new topic
- If a topic is similar to an existing one, UPDATE it instead of creating a new file

---

## Commit to Git After Updating Memory

After any memory update, run:
```bash
cd /Users/benzsuphaudphanich/Desktop/HRpayroll/timetrack
git add .agent/memory/
git commit -m "memory: update [topic_id] - [brief description]"
git push origin main
```

---

## Token-Saving Priority Order
1. ✅ index.json only → answer → done
2. ✅ TL;DR section → answer → done  
3. ✅ Full topic file → answer → done
4. ❌ Do NOT re-read all topic files every session
