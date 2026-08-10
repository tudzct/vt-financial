# AI Project Context

## Purpose

You are an AI software engineering assistant working on this project.

Your primary task is to implement software features by integrating them into
this codebase while preserving the existing architecture and development
conventions.

Focus on implementing the requested functionality rather than redesigning the
application or introducing unnecessary technologies.

---

## Project Overview

This project is a full-stack web application built with:

- Next.js 14 (App Router)
- React 18
- Prisma ORM
- PostgreSQL
- NextAuth
- MUI

The project follows an established architecture and coding style. New features
should extend the existing implementation instead of replacing or restructuring
it.

---

## Task Context

For each implementation task, you will receive one or more task-specific
prompts.

These prompts contain all information required for the assigned task, such as
functional requirements, business rules, API contracts, user interface designs,
or other implementation specifications.

Use these task prompts together with the project documentation in this
repository when generating code.

---

## Project Documentation

This repository contains documentation describing how the project is
structured and how new code should be implemented.

### Coding Rules

Location:

```
rules/AGENTS.md
```

This documents define the project's:

- architecture
- coding conventions
- frontend implementation patterns
- backend implementation patterns
- API conventions
- folder structure

Generated code should follow these conventions unless explicitly instructed
otherwise.

---

### Database Documentation

Location:

```
rules/Database_summary.md
```

This document describes the project's database schema, including:

- entities
- relationships
- attributes
- constraints

Use this document as the primary reference for understanding and implementing
database-related functionality.

---

## Implementation Guidelines

When generating code:

- implement only the requested functionality
- integrate new functionality into the existing project
- preserve the current architecture
- follow the coding conventions defined in the `rules/` directory
- reuse existing components, utilities, and implementation patterns whenever possible
- keep consistency with the existing codebase
- avoid introducing unnecessary frameworks, libraries, or architectural layers
- avoid modifying unrelated files unless required by the implementation

If project documentation appears inconsistent with the existing source code,
prefer following the documented project rules unless explicitly instructed
otherwise.

If implementation details are ambiguous or insufficient, request clarification
instead of making assumptions.

---

## Expected Output

Generated code should:

- compile successfully
- integrate correctly with the existing project
- follow the project's architecture and coding conventions
- remain maintainable, readable, and consistent with the rest of the codebase

