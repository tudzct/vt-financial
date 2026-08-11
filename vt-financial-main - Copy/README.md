Prompt B: Frontend UI --- Figma-Accurate Implementation

Objective

Build the UI for exactly one use case according to the specified Figma
design.

Create \[COMPONENT NAME\] using \[FRONTEND TECHNOLOGIES\].

Use Case Scope

-   Use Case ID: \[USE CASE ID\]
-   Use Case Name: \[USE CASE NAME\]
-   Target Figma frame: \[FIGMA FRAME NAME\]
-   Figma link / selection ID: \[FIGMA LINK / SELECTION ID\]

1.  Scope

-   The target frame and its relevant nested nodes are the authoritative
    design scope.
-   Implement only "\[FIGMA FRAME NAME\]". Do not implement, modify, or
    infer other screens, flows, or use cases.
-   Do not substitute another frame if the supplied frame name or
    selection ID cannot be matched unambiguously. Stop and report the
    mismatch.
-   Shared design-system components may be inspected and reused only
    when they are directly used by the target frame.
-   Render every visual element shown in the target frame, even if it
    belongs to another use case. Reproduce its appearance and shown
    state only; do not implement its missing functionality.
-   Implement only the frontend behavior, data integration, and business
    logic required for \[USE CASE ID\] --- \[USE CASE NAME\].
-   Do not create or modify backend functionality unless explicitly
    required by this use case.

The component MUST display:

-   \[UI ELEMENT 1\]
-   \[UI ELEMENT 2\]
-   \[UI ELEMENT 3\]
-   \[...\]

2.  Design Inspection --- REQUIRED BEFORE CODING

Before making code changes:

1.  Inspect the target Figma frame and relevant nested nodes through
    Figma MCP.

2.  Inspect the design properties required for accurate implementation,
    including:

    -   Layout, hierarchy, dimensions, spacing, padding, and alignment
    -   Auto Layout, sizing, constraints, and responsive behavior
    -   Typography, colors, borders, radii, shadows, and effects
    -   Components, variants, icons, imagery, and relevant design tokens
    -   Interaction or visual states explicitly shown in the design

3.  Treat the inspected Figma nodes as the source of truth for the UI.

4.  Do not begin implementation until the target design is sufficiently
    understood.

5.  Existing Implementation

If the target UI already exists:

1.  Inspect the current implementation before editing.

2.  Compare it with the target Figma nodes.

3.  Identify discrepancies in structure, layout, styling, components,
    states, and responsive behavior.

4.  Change only what is necessary to match the Figma design.

5.  Preserve existing correct functionality and UI behavior.

6.  Implementation Requirements

-   Follow the selected Figma design as faithfully as technically
    possible.
-   Preserve the exact visual hierarchy and element order shown in
    Figma.
-   Do not approximate, simplify, reinterpret, or redesign details
    explicitly specified by Figma.
-   Do not replace provided icons, logos, illustrations, or imagery with
    arbitrary alternatives.
-   Reuse existing project components, styling systems, utilities,
    design tokens, and implementation patterns whenever applicable.
-   Follow the existing project architecture, routing, and coding
    conventions.
-   Project conventions must not override details explicitly specified
    by the target Figma design.
-   For unspecified behavior, follow existing project conventions.
-   Preserve unrelated functionality and do not modify unrelated files.
-   Make only the changes necessary for this use case.
-   Do not add speculative functionality or UI not required by the use
    case or shown in Figma.
-   Use existing project data, props, types, services, and API
    integrations when available instead of hardcoded mock values.

5.  Validation --- REQUIRED AFTER IMPLEMENTATION

After coding:

1.  Re-inspect the same target Figma frame and relevant nested nodes
    through Figma MCP.
2.  Compare the implementation against the selected Figma design.
3.  Verify visible elements, layout, dimensions, spacing, typography,
    colors, components, states, and responsive behavior.
4.  Fix all known discrepancies within the target scope.
5.  Verify that existing correct functionality remains unchanged.
6.  Run the relevant build, tests, or validation checks.
7.  Do not claim the implementation matches Figma exactly if a known
    discrepancy remains. Document any unavoidable discrepancy and its
    technical reason.

Final Response

Provide:

-   A concise implementation summary
-   Files changed
-   Validation/tests performed
-   Any known design discrepancy and its reason
