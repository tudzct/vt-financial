# GENERAL

## ⚙️ 1. General Rules

### ✅ Coding Convention
- **camelCase** → variable, function.
- **PascalCase** → class, component, entity.
- **kebab-case** → folder, file (except React component).
- API prefix: `/api/...`
- Standard JSON response format: 
```json 
{ "success": true, "message": "OK", "data": { ... } }
````

### 🧾 Git & Environment

* Do not commit `.env`, `node_modules/`, `dist/`.
* Use `.env.example` as template.
* Each feature is created in a separate branch, committed in the following format:

```
feat(user): add user registration API
fix(order): correct total calculation

```

### 🧰 Error & Logging

* Handle errors via `GlobalExceptionFilter` (NestJS).

* Do not log sensitive information.

* All API errors return:

```json

{ "success": false, "message": "Error message" }

```

## 🚀 2. Codex AI Rules

> Rules specific to **Codex** for generating standard code automatically.

### 🧠 General Behavior

* When creating a new module (NestJS): always generate all of the following:

`controller`, `service`, `entity`, `dto`, `module`.

* When creating a CRUD API: generate all the following functions:

`create`, `findAll`, `findOne`, `update`, `delete`.

* When creating a React component: export defaults, use Tailwind, and place them in the correct folder.

* When creating a React API: generate functions in `src/api/` and call them using AxiosInstance.

* Do not place business logic in controllers or UI components.

* If unsure of the requirements, **ask the user instead of guessing**.

* Always add short comments describing the meaning of the class/function.

### ⚡ Example Prompts

* “Create NestJS module for user management (CRUD).”

* “Add authentication module with JWT in NestJS.”

* “Generate React page to list users with pagination.”

* “Connect React form to NestJS endpoint via Axios.”

---

## 🔄 3. API Convention

* All backend APIs start with `/api/...`
* Standard Response:

```json

{ "success": true, "message": "Fetched successfully", "data": [...] }

```
* Error Return:

```json

{ "success": false, "message": "Resource not found" }

```
* Use appropriate HTTP statuses:

* `200 OK`
* `201 Created`
* `400 Bad Request`
* `401 Unauthorized`
* `404 Not Found`
* `500 Internal Server Error`

---
## 📦 4. Extension Ideas

As the project expands, you can add:

* **Swagger** (API Docs) → NestJS `@nestjs/swagger`
* **Docker Compose** → to quickly deploy both backend + frontend
* **ESLint + Prettier** → enforce code style

---

## 🧭 5. Summary

| Layers | Frameworks | Folder Root | Style Guide |
| -------- | ------------------------------------------ | -------------------------- | ---------------------- |
| Backend | NestJS | `/server` or `/backend` | Modular Architecture |
| Frontend | React 
| `/client` or `/frontend` | Component-Based |
| Shared | `.env`, `.cursorrules`, `PROJECT_RULES.md` | Root | DRY, Clean, Consistent |


# FRONTEND

## 💻 1. Frontend Rules (React + TailwindCSS + Typescripts)

### 📁 Folder Structure

```
src/ 
├── api/              # axios instance, endpoint functions 
├── assets/           # images, icons 
├── components/       # reusable components 
├── hooks/            # custom hooks 
├── pages/            # main pages (Home, Login, Dashboard, ...) 
├── context/          # React context (auth, theme, ...) 
├── router/           # route definition 
├── utils/            # helper functions 
├── App.jsx 
└── main.jsx

```
### 🧩 Detailed Rules

* Use functional components + React Hooks.

* Manage state using the Context API or Zustand.

* Call APIs via the Axios instance in `src/api/`.

* Do not call URLs directly in components.

* Use TailwindCSS for UI, avoid inline styles.

* Each page/component has a clear role:

* UI component → display only.

* Logic component → process data, call APIs.

* Use PropTypes or TypeScript to define props.

* Routing using React Router v6.

* Always handle loading and error state.

* Separate UI and logic if the component is complex.

## 2. Figma UI Implementation Rules

These rules apply whenever an active task requires creating or updating
frontend UI from a supplied Figma design, file, page, frame, node, URL, or
selection ID.

### 2.1. Scope

* The target Figma frame or frames identified for the active task and their
  relevant nested nodes are the authoritative design scope.
* Implement only the identified target frames. Do not implement, modify, or
  infer other screens, flows, frames, or use cases.
* Shared design-system components may be inspected and reused only when they
  are directly used by an identified target frame.
* Render every visual element shown in each identified target frame, even if
  it belongs to another use case. Reproduce its appearance and shown state
  only; do not implement its missing functionality.
* Implement only the frontend behavior, data integration, and business logic
  required for the active use case supplied by the task.
* Do not create or modify backend functionality unless explicitly required by
  the active use case.

### 2.2. Design Inspection — Required Before Coding

Before making code changes:

1. Inspect every identified target Figma frame and its relevant nested nodes
   through Figma MCP.

2. Inspect the design properties required for accurate implementation,
   including:

   * Layout, hierarchy, dimensions, spacing, padding, and alignment
   * Auto Layout, sizing, constraints, and responsive behavior
   * Typography, colors, borders, radii, shadows, and effects
   * Components, variants, icons, imagery, and relevant design tokens
   * Interaction or visual states explicitly shown in the design

3. Treat the inspected Figma nodes as the source of truth for the UI.

4. Do not begin implementation until the target design is sufficiently
   understood.

### 2.3. Existing Implementation Review

If the target UI already exists:

1. Inspect the current implementation before editing.

2. Compare it with the relevant nodes of every identified target Figma frame.

3. Identify discrepancies in structure, layout, styling, components, states,
   and responsive behavior.

4. Change only what is necessary to match the identified target Figma frames.

5. Preserve existing correct functionality and UI behavior.

### 2.4. Implementation Requirements

* Follow the identified target Figma frames as faithfully as technically
  possible.
* Preserve the exact visual hierarchy and element order shown in the
  identified target frames.
* Do not approximate, simplify, reinterpret, or redesign details explicitly
  specified by the identified target frames.
* Do not replace provided icons, logos, illustrations, or imagery with
  arbitrary alternatives.
* Reuse existing project components, styling systems, utilities, design
  tokens, and implementation patterns whenever applicable.
* Follow the existing project architecture, routing, and coding conventions.
* Project conventions must not override visual details explicitly specified by
  the identified target frames.
* For behavior not specified by Figma, follow existing project conventions.
* Preserve unrelated functionality and do not modify unrelated files.
* Make only the changes necessary for the active use case.
* Do not add functionality that is not required by the active use case.
* Do not add UI that is not shown in the identified target frames unless it is
  explicitly required by the active use case or its business rules.
* Use existing project data, props, types, services, and API integrations when
  available instead of hardcoded mock values.

### 2.5. Validation — Required After Implementation

After coding:

1. Re-inspect every identified target Figma frame and its relevant nested nodes
   through Figma MCP.

2. Compare the implementation against the same identified Figma targets used
   before coding.

3. Verify visible elements, layout, dimensions, spacing, typography, colors,
   components, states, and responsive behavior.

4. Fix all known discrepancies within the identified target scope.

5. Verify that existing correct functionality remains unchanged.

6. Run the relevant build or validation checks permitted by the active task.

7. Do not claim the implementation matches Figma exactly if a known
   discrepancy remains. Document any unavoidable discrepancy and its
   technical reason.


---

# BACKEND

## 🧱 1. Backend Rules (NestJS)

### 📁 Folder Structure

```
src/ 
├── main.ts 
├── app.module.ts 
├── config/           # DB, CORS, env config 
├── common/           # Decorators, guards, interceptors, utils 
├── modules/          # Each feature is a separate module 
│ ├── user/ 
│ │ ├── user.module.ts 
│ │ ├── user.controller.ts 
│ │ ├── user.service.ts 
│ │ ├── user.entity.ts 
│ │ ├── dto/ 
│ │ └── interfaces/ 
├── filters/          # Exception filters 
├── interceptors/     # Logging, response transform 
├── database/         # ormconfig.ts 
└── main.ts
```

### 🧩 Detailed rules

* Each module includes: 

* `controller.ts`: handle HTTP request, call service. 
* `service.ts`: contains business logic. 
* `entity.ts`: database table mapping. 
* `dto/`: defines request/response (using `class-validator`).

* Business logic **is only in the service**.

* Controller only **receives requests → calls the service → returns a response**.

* Uses the `Repository` pattern of TypeORM.

* Modules only import necessary modules (avoiding import loops).

* Configure `.env` via `@nestjs/config`.

* Consistent response format:

```ts

return { success: true, message: 'User created', data: user };

```
* Write basic unit tests for the service and controller.

# Additional notes

* Remember to read Database_summary.md. This is a description of the project database, which is mandatory before doing anything else.
