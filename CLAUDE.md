# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Constellate is in early scaffolding — `backend/` has only a `pyproject.toml`/`uv.lock` (FastAPI dependency declared, no application code yet), and `frontend/` is an empty directory. Update this file as real structure gets added.

## Setup

```bash
brew install uv    # Python package/env manager for backend/
brew install prek  # git hook runner (Rust rewrite of pre-commit)
```

## Backend (`backend/`)

- Managed with `uv`; dependencies declared in `backend/pyproject.toml`, lockfile in `backend/uv.lock`.
- Runtime dependency: FastAPI (`>=0.141,<0.142`).
- Dev dependency: `ruff` (`>=0.16,<0.17`) for linting.
- Run commands from within `backend/`, e.g. `uv run <command>`.
- Lint: `uv run ruff check --fix`
- Format: `uv run ruff format`

## Git hooks (prek)

`prek.toml` configures hooks run via `prek`:
- `trailing-whitespace`, `end-of-file-fixer`, `check-added-large-files` (builtin hooks)
- `ruff check --fix` and `ruff format`, triggered by changes under `backend/**/*.py`. They run as `uv run --directory backend ...` because the uv project lives in `backend/`, not the repo root.

Install the hooks with `prek install`; run them on everything with `prek run --all-files`.
