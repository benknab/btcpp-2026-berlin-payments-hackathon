#!/usr/bin/env bash
set -euo pipefail
umask 077

# Install a root-owned copy outside the checkout as the SSH key's forced command.
# Never evaluate SSH_ORIGINAL_COMMAND: the only accepted input is a commit hash.
if [[ ! ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  echo "Expected: deploy <40-character commit hash>." >&2
  exit 1
fi
commit=${BASH_REMATCH[1]}
directory=${BARK_PAYMENTS_DEPLOY_DIR:-/var/lib/bark-payments-deploy}
environment=${BARK_PAYMENTS_DEPLOY_ENV:-/etc/bark-payments/compose.env}
repository="$directory/repository.git"
release="$directory/releases/$commit"
state="$directory/deployed-commit"

if [[ ! -f "$environment" ]]; then
  echo "Missing deployment configuration: $environment" >&2
  exit 1
fi
mkdir -p "$directory/releases"
exec 9> "$directory/deploy.lock"
flock --wait 1800 9
docker info --format '{{.ServerVersion}}' > /dev/null

if [[ ! -d "$repository" ]]; then
  git init --bare "$repository"
fi
git --git-dir="$repository" fetch --no-tags \
  https://github.com/benknab/btcpp-2026-berlin-payments-hackathon.git \
  +refs/heads/master:refs/heads/master
latest=$(git --git-dir="$repository" rev-parse refs/heads/master)
if [[ "$commit" != "$latest" ]]; then
  echo "Skipping stale deployment: master is now $latest."
  exit 0
fi
if [[ -f "$state" ]]; then
  previous=$(cat "$state")
  if [[ "$commit" == "$previous" ]]; then
    echo "Commit $commit is already deployed."
    exit 0
  fi
  if ! git --git-dir="$repository" merge-base --is-ancestor "$previous" "$commit"; then
    echo "Refusing a non-fast-forward deployment; inspect database migration compatibility." >&2
    exit 1
  fi
fi

if [[ ! -d "$release" ]]; then
  git --git-dir="$repository" worktree add --detach "$release" "$commit"
fi
if [[ $(git -C "$release" rev-parse HEAD) != "$commit" || -n $(git -C "$release" status --porcelain) ]]; then
  echo "Refusing to overwrite an unexpected or modified release: $release" >&2
  exit 1
fi

# Use the existing project's named volume, not the worktree's directory name.
# Force the checked-out commit to be the build context; keep host configuration separate.
export BARK_PAYMENTS_SOURCE_DIR="$release"
compose=(docker compose --project-name bark-payments --project-directory "$release"
  --env-file "$environment" -f "$release/compose.yaml")
"${compose[@]}" config --quiet
"${compose[@]}" build app
if ! "${compose[@]}" up --detach --no-build --wait --wait-timeout 180 app; then
  "${compose[@]}" ps
  echo "Deployment failed. Database and wallets were preserved; inspect app logs before retrying." >&2
  exit 1
fi
printf '%s\n' "$commit" > "$state.next"
mv "$state.next" "$state"
echo "Deployed $commit."
