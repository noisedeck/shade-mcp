# CI & Vendoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up CI pipelines so portable and shade vendor shade-mcp artifacts, triggered automatically when shade-mcp pushes to main.

**Architecture:** Each downstream repo gets a `pull-shade-mcp` Python script (same pattern as py-noisemaker) and a GitHub Actions workflow triggered by `repository_dispatch`. shade-mcp gets a new trigger workflow that notifies all downstream repos on push to main.

**Tech Stack:** GitHub Actions, Python 3 (pull scripts), peter-evans/repository-dispatch, GitHub App tokens

---

### Task 1: shade-mcp — Upstream trigger workflow

**Files:**
- Create: `shade-mcp/.github/workflows/trigger-downstream.yml`

**Step 1: Create the workflow file**

```yaml
# Trigger downstream repos to pull latest shade-mcp changes
name: Trigger Downstream Updates

on:
  push:
    branches: [main]
    paths-ignore:
      - '*.md'
      - 'docs/**'
  workflow_dispatch:

jobs:
  trigger-downstream:
    runs-on: ubuntu-latest
    steps:
      - name: Generate GitHub App token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.NOISEDECK_APP_ID }}
          private-key: ${{ secrets.NOISEDECK_APP_PRIVATE_KEY }}
          owner: noisedeck

      - name: Trigger noisemaker
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ steps.app-token.outputs.token }}
          repository: noisedeck/noisemaker
          event-type: shade-mcp-updated
          client-payload: '{"ref": "${{ github.ref }}", "sha": "${{ github.sha }}"}'

      - name: Trigger portable
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ steps.app-token.outputs.token }}
          repository: noisedeck/portable
          event-type: shade-mcp-updated
          client-payload: '{"ref": "${{ github.ref }}", "sha": "${{ github.sha }}"}'

      - name: Trigger shade
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ steps.app-token.outputs.token }}
          repository: noisedeck/shade
          event-type: shade-mcp-updated
          client-payload: '{"ref": "${{ github.ref }}", "sha": "${{ github.sha }}"}'
```

**Step 2: Commit**

```bash
git add .github/workflows/trigger-downstream.yml
git commit -m "ci: add trigger-downstream workflow for shade-mcp updates"
```

---

### Task 2: portable — pull-shade-mcp script

**Files:**
- Create: `portable/pull-shade-mcp`

**Reference:** `py-noisemaker/pull-shade-mcp` (same pattern, but copies full dist/ including index.js)

**Step 1: Create the pull script**

```python
#!/usr/bin/env python3
"""
Pull shade-mcp from GitHub, build, and copy dist to vendor directory.
"""
import os
import shutil
import subprocess
import tempfile
import sys

REPO_URL = "https://github.com/noisedeck/shade-mcp.git"
VENDOR_DIR = "vendor/shade-mcp"


def get_authenticated_url(url):
    """Inject GitHub token into URL if present in environment."""
    token = os.environ.get("GITHUB_TOKEN")
    if token and url.startswith("https://github.com/"):
        return url.replace("https://github.com/", f"https://x-access-token:{token}@github.com/")
    return url


def main():
    with tempfile.TemporaryDirectory() as tmpdir:
        print(f"Cloning shade-mcp into {tmpdir}...")

        target_sha = os.environ.get("SHADE_MCP_SHA")
        auth_url = get_authenticated_url(REPO_URL)

        if target_sha:
            print(f"Fetching specific commit: {target_sha}")
            os.makedirs(tmpdir, exist_ok=True)
            subprocess.run(["git", "init"], cwd=tmpdir, check=True)
            subprocess.run(["git", "remote", "add", "origin", auth_url], cwd=tmpdir, check=True)
            subprocess.run(["git", "fetch", "--depth=1", "origin", target_sha], cwd=tmpdir, check=True)
            subprocess.run(["git", "checkout", "FETCH_HEAD"], cwd=tmpdir, check=True)
        else:
            subprocess.run(
                ["git", "clone", "--depth=1", auth_url, tmpdir],
                check=True
            )

        print("Installing dependencies...")
        subprocess.run(
            ["npm", "install"],
            cwd=tmpdir,
            check=True
        )

        print("Building shade-mcp...")
        subprocess.run(
            ["npm", "run", "build"],
            cwd=tmpdir,
            check=True
        )

        print(f"Copying dist to {VENDOR_DIR}...")

        if os.path.exists(VENDOR_DIR):
            shutil.rmtree(VENDOR_DIR)
        os.makedirs(VENDOR_DIR, exist_ok=True)

        dist_dir = os.path.join(tmpdir, "dist")

        # Copy all dist contents (MCP server binary + library entry points)
        for item in os.listdir(dist_dir):
            src = os.path.join(dist_dir, item)
            dst = os.path.join(VENDOR_DIR, item)
            if os.path.isdir(src):
                shutil.copytree(src, dst)
                print(f"  ✓ {item}/")
            else:
                shutil.copy2(src, dst)
                print(f"  ✓ {item}")

    print("Done!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

**Step 2: Make it executable**

```bash
chmod +x portable/pull-shade-mcp
```

**Step 3: Commit**

```bash
cd portable
git add pull-shade-mcp
git commit -m "feat: add pull-shade-mcp vendor script"
```

---

### Task 3: portable — Update package.json and .vscode/mcp.json

**Files:**
- Modify: `portable/package.json` — add shade-mcp runtime deps
- Modify: `portable/.vscode/mcp.json` — point to vendored binary
- Modify: `portable/.gitignore` — un-ignore .vscode/ so mcp.json is tracked

**Step 1: Update package.json**

Add shade-mcp's external runtime dependencies (the ones tsup doesn't bundle):

```json
{
  "name": "portable-viewer-test",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "npx serve . -l 2999",
    "package": "node package-portable.mjs"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@modelcontextprotocol/sdk": "^1.26.0",
    "openai": "^4.77.0"
  },
  "devDependencies": {
    "archiver": "^7.0.0",
    "playwright": "^1.40.0",
    "serve": "^14.2.5"
  }
}
```

**Step 2: Update .vscode/mcp.json**

Change from absolute path to vendored path:

```json
{
  "servers": {
    "portable-shader": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/vendor/shade-mcp/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "${workspaceFolder}/effect",
        "SHADE_PROJECT_ROOT": "${workspaceFolder}",
        "SHADE_VIEWER_ROOT": "${workspaceFolder}",
        "SHADE_VIEWER_PATH": "/viewer/index.html",
        "SHADE_GLOBALS_PREFIX": "__portable"
      }
    }
  }
}
```

**Step 3: Update .gitignore**

Remove `.vscode/` from .gitignore (so mcp.json is tracked), add specific ignores for editor state files only:

Change:
```
.vscode/
```

To:
```
.vscode/settings.json
.vscode/launch.json
```

**Step 4: Commit**

```bash
cd portable
git add package.json .vscode/mcp.json .gitignore
git commit -m "feat: configure shade-mcp vendored MCP server"
```

---

### Task 4: portable — CI workflows

**Files:**
- Create: `portable/.github/workflows/pull-shade-mcp.yml`
- Create: `portable/.github/workflows/pull-noisemaker.yml`

**Step 1: Create pull-shade-mcp workflow**

```yaml
# Pull latest shade-mcp changes when triggered
name: Pull shade-mcp

on:
  repository_dispatch:
    types: [shade-mcp-updated]
  workflow_dispatch:

jobs:
  pull-shade-mcp:
    runs-on: ubuntu-latest
    steps:
      - name: Generate GitHub App token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.NOISEDECK_APP_ID }}
          private-key: ${{ secrets.NOISEDECK_APP_PRIVATE_KEY }}
          owner: noisedeck

      - name: Checkout portable
        uses: actions/checkout@v4
        with:
          token: ${{ steps.app-token.outputs.token }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run pull-shade-mcp
        env:
          SHADE_MCP_SHA: ${{ github.event.client_payload.sha }}
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
        run: python3 pull-shade-mcp

      - name: Check for changes
        id: changes
        env:
          SHADE_MCP_SHA: ${{ github.event.client_payload.sha }}
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
        run: |
          git add -A
          if git diff --staged --quiet; then
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            echo "has_changes=true" >> $GITHUB_OUTPUT
            if [ -n "$SHADE_MCP_SHA" ]; then
              COMMIT_MSG=$(curl -s -H "Authorization: Bearer $GH_TOKEN" "https://api.github.com/repos/noisedeck/shade-mcp/commits/$SHADE_MCP_SHA" | jq -r '.commit.message // "Unable to fetch commit message"')
              echo "SHADE_MCP_COMMIT_MSG<<EOF" >> $GITHUB_ENV
              echo "$COMMIT_MSG" >> $GITHUB_ENV
              echo "EOF" >> $GITHUB_ENV
            fi
          fi

      - name: Commit and push changes
        if: steps.changes.outputs.has_changes == 'true'
        env:
          SHADE_MCP_SHA: ${{ github.event.client_payload.sha }}
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git commit -m "pull upstream shade-mcp dist

          shade-mcp commit: ${SHADE_MCP_SHA:-HEAD}
          Source: https://github.com/noisedeck/shade-mcp/commit/${SHADE_MCP_SHA:-main}

          --- shade-mcp changes ---
          ${SHADE_MCP_COMMIT_MSG:-No commit message available}"
          git push
```

**Step 2: Create pull-noisemaker workflow**

```yaml
# Pull latest noisemaker bundles when triggered
name: Pull Noisemaker

on:
  repository_dispatch:
    types: [noisemaker-updated]
  workflow_dispatch:

jobs:
  pull-noisemaker:
    runs-on: ubuntu-latest
    steps:
      - name: Generate GitHub App token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.NOISEDECK_APP_ID }}
          private-key: ${{ secrets.NOISEDECK_APP_PRIVATE_KEY }}
          owner: noisedeck

      - name: Checkout portable
        uses: actions/checkout@v4
        with:
          token: ${{ steps.app-token.outputs.token }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run pull-noisemaker
        env:
          NOISEMAKER_SHA: ${{ github.event.client_payload.sha }}
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
        run: python3 pull-noisemaker

      - name: Check for changes
        id: changes
        env:
          NOISEMAKER_SHA: ${{ github.event.client_payload.sha }}
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
        run: |
          git add -A
          if git diff --staged --quiet; then
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            echo "has_changes=true" >> $GITHUB_OUTPUT
            if [ -n "$NOISEMAKER_SHA" ]; then
              COMMIT_MSG=$(curl -s -H "Authorization: Bearer $GH_TOKEN" "https://api.github.com/repos/noisedeck/noisemaker/commits/$NOISEMAKER_SHA" | jq -r '.commit.message // "Unable to fetch commit message"')
              echo "NOISEMAKER_COMMIT_MSG<<EOF" >> $GITHUB_ENV
              echo "$COMMIT_MSG" >> $GITHUB_ENV
              echo "EOF" >> $GITHUB_ENV
            fi
          fi

      - name: Commit and push changes
        if: steps.changes.outputs.has_changes == 'true'
        env:
          NOISEMAKER_SHA: ${{ github.event.client_payload.sha }}
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git commit -m "pull upstream noisemaker vendor bundles

          noisemaker commit: ${NOISEMAKER_SHA:-HEAD}
          Source: https://github.com/noisedeck/noisemaker/commit/${NOISEMAKER_SHA:-main}

          --- noisemaker changes ---
          ${NOISEMAKER_COMMIT_MSG:-No commit message available}"
          git push
```

**Step 3: Commit**

```bash
cd portable
git add .github/workflows/pull-shade-mcp.yml .github/workflows/pull-noisemaker.yml
git commit -m "ci: add pull-shade-mcp and pull-noisemaker workflows"
```

---

### Task 5: portable — Run pull-shade-mcp and commit initial vendor

**Step 1: Run the pull script locally**

```bash
cd portable && python3 pull-shade-mcp
```

**Step 2: Verify vendor contents**

```bash
ls -la portable/vendor/shade-mcp/
```

Expected: `index.js`, `index.d.ts`, `index.js.map`, plus directories for `harness/`, `ai/`, `formats/`, `analysis/`, `knowledge/`.

**Step 3: Commit initial vendor**

```bash
cd portable
git add vendor/shade-mcp/
git commit -m "vendor: initial shade-mcp dist"
```

---

### Task 6: shade — pull-shade-mcp script

**Files:**
- Create: `shade/pull-shade-mcp`

**Step 1: Create the pull script**

This script vendors only `dist/knowledge/` since that's all shade imports.

```python
#!/usr/bin/env python3
"""
Pull shade-mcp from GitHub, build, and copy knowledge dist to vendor directory.
"""
import os
import shutil
import subprocess
import tempfile
import sys

REPO_URL = "https://github.com/noisedeck/shade-mcp.git"
VENDOR_DIR = "vendor/shade-mcp"


def get_authenticated_url(url):
    """Inject GitHub token into URL if present in environment."""
    token = os.environ.get("GITHUB_TOKEN")
    if token and url.startswith("https://github.com/"):
        return url.replace("https://github.com/", f"https://x-access-token:{token}@github.com/")
    return url


def main():
    with tempfile.TemporaryDirectory() as tmpdir:
        print(f"Cloning shade-mcp into {tmpdir}...")

        target_sha = os.environ.get("SHADE_MCP_SHA")
        auth_url = get_authenticated_url(REPO_URL)

        if target_sha:
            print(f"Fetching specific commit: {target_sha}")
            os.makedirs(tmpdir, exist_ok=True)
            subprocess.run(["git", "init"], cwd=tmpdir, check=True)
            subprocess.run(["git", "remote", "add", "origin", auth_url], cwd=tmpdir, check=True)
            subprocess.run(["git", "fetch", "--depth=1", "origin", target_sha], cwd=tmpdir, check=True)
            subprocess.run(["git", "checkout", "FETCH_HEAD"], cwd=tmpdir, check=True)
        else:
            subprocess.run(
                ["git", "clone", "--depth=1", auth_url, tmpdir],
                check=True
            )

        print("Installing dependencies...")
        subprocess.run(
            ["npm", "install"],
            cwd=tmpdir,
            check=True
        )

        print("Building shade-mcp...")
        subprocess.run(
            ["npm", "run", "build"],
            cwd=tmpdir,
            check=True
        )

        print(f"Copying knowledge dist to {VENDOR_DIR}...")

        if os.path.exists(VENDOR_DIR):
            shutil.rmtree(VENDOR_DIR)
        os.makedirs(VENDOR_DIR, exist_ok=True)

        # Copy only knowledge (the only shade-mcp module shade imports)
        src = os.path.join(tmpdir, "dist", "knowledge")
        if os.path.exists(src):
            shutil.copytree(src, os.path.join(VENDOR_DIR, "knowledge"))
            print(f"  ✓ knowledge/")

    print("Done!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

**Step 2: Make it executable**

```bash
chmod +x shade/pull-shade-mcp
```

**Step 3: Commit**

```bash
cd shade
git add pull-shade-mcp
git commit -m "feat: add pull-shade-mcp vendor script"
```

---

### Task 7: shade — Update imports and package.json

**Files:**
- Modify: `shade/package.json` — remove `shade-mcp` file: dependency
- Modify: `shade/server/routes/chat.js:26-47` — change import path
- Modify: `shade/server/tools/index.js:1837` — change import path
- Modify: `shade/.gitignore` — add `vendor/shade-mcp/`

**Step 1: Remove shade-mcp from package.json dependencies**

Remove this line from dependencies:
```
"shade-mcp": "file:../shade-mcp"
```

**Step 2: Update import in server/routes/chat.js**

Change line 47:
```javascript
} from 'shade-mcp/knowledge'
```
To:
```javascript
} from '../../vendor/shade-mcp/knowledge/index.js'
```

**Step 3: Update import in server/tools/index.js**

Change line 1837:
```javascript
import { searchShaderKnowledge, getShaderKnowledgeDB } from 'shade-mcp/knowledge'
```
To:
```javascript
import { searchShaderKnowledge, getShaderKnowledgeDB } from '../../vendor/shade-mcp/knowledge/index.js'
```

**Step 4: Add vendor/shade-mcp/ to .gitignore**

Add to `.gitignore`:
```
vendor/shade-mcp/
```

**Step 5: Commit**

```bash
cd shade
git add package.json server/routes/chat.js server/tools/index.js .gitignore
git commit -m "feat: switch shade-mcp imports to vendored knowledge dist"
```

---

### Task 8: shade — Update CI workflows

**Files:**
- Modify: `shade/.github/workflows/deploy-scaffold.yml` — add pull-shade-mcp step
- Create: `shade/.github/workflows/pull-shade-mcp.yml` — dispatch-triggered workflow

**Step 1: Update deploy-scaffold.yml**

Add a `pull-shade-mcp` step after the existing `pull-noisemaker` step (after line 36):

```yaml
      - name: Pull shade-mcp vendor knowledge
        run: ./pull-shade-mcp
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 2: Create pull-shade-mcp.yml**

Same pattern as existing `pull-noisemaker.yml` — SSHes to production and rebuilds:

```yaml
# Pull latest shade-mcp changes (triggered by shade-mcp repo)
name: Pull shade-mcp

on:
  repository_dispatch:
    types: [shade-mcp-updated]
  workflow_dispatch:

jobs:
  pull-shade-mcp:
    runs-on: ubuntu-latest

    steps:
      - name: Pull shade-mcp and rebuild
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: shade.noisedeck.app
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          envs: SHADE_MCP_SHA
          script: |
            cd ~/source/shade
            python3 pull-shade-mcp
        env:
          SHADE_MCP_SHA: ${{ github.event.client_payload.sha }}

      - name: Rebuild container
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: shade.noisedeck.app
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/source/monolith/shade.noisedeck.app
            docker compose up -d --build
```

**Step 3: Commit**

```bash
cd shade
git add .github/workflows/deploy-scaffold.yml .github/workflows/pull-shade-mcp.yml
git commit -m "ci: add shade-mcp vendoring to deploy pipeline"
```

---

### Task 9: shade — Run pull-shade-mcp and verify

**Step 1: Run the pull script locally**

```bash
cd shade && python3 pull-shade-mcp
```

**Step 2: Verify vendor contents**

```bash
ls shade/vendor/shade-mcp/knowledge/
```

Expected: `index.js`, `index.d.ts`, `index.js.map`

**Step 3: Verify the server starts**

```bash
cd shade && npm start
```

Expected: Server starts without import errors.

**Step 4: Run npm install to update package-lock.json**

```bash
cd shade && npm install
```

This removes the shade-mcp file: link from package-lock.json.

**Step 5: Commit package-lock.json update**

```bash
cd shade
git add package-lock.json
git commit -m "chore: update package-lock after removing shade-mcp file: dep"
```

---

### Task 10: py-noisemaker — Add portable to trigger-noisedeck.yml

**Files:**
- Modify: `py-noisemaker/.github/workflows/trigger-noisedeck.yml` — add portable dispatch

**Step 1: Add portable trigger**

Add after the existing `Trigger layers` step:

```yaml
      - name: Trigger portable
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ steps.app-token.outputs.token }}
          repository: noisedeck/portable
          event-type: noisemaker-updated
          client-payload: '{"ref": "${{ github.ref }}", "sha": "${{ github.sha }}"}'
```

**Step 2: Commit**

```bash
cd py-noisemaker
git add .github/workflows/trigger-noisedeck.yml
git commit -m "ci: add portable to downstream trigger list"
```
