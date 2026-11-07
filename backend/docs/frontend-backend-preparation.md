# Backend preparation for the supplied frontend

Date: 7 November 2026.

**Update:** the user supplied `Navigator app (interactive)-html-v1.zip`. Its local source resolves the original reference blocker. The feature implementation is described in `navigator-feature-design.md` and the frontend contract in `navigator-api-contract.md`; the access investigation below is historical.

The user wants the backend to support mostly the features in the supplied Claude prototype, while allowing the frontend design to change later. Reference: https://claude.ai/artifact/KZx8dThEU6VoqVfBF79nrx#play-15dd8cd198dd.

The reference is not yet inspectable here: the web reader failed, the public HTTP response contained only the Claude runtime shell, and a temporary isolated browser reached Cloudflare verification rather than the application. No feature list or screen behavior has been inferred from that shell. The user has been asked to paste the source or describe its screens, filters and actions.

## Approach

Extend the existing FastAPI service with stable domain operations once the prototype's actual interactions are known. A visual redesign should consume the same source-linked domain results. Keep calculations and persisted decisions independent of layout, labels and component structure. Replacing the service or introducing another framework would add migration work without resolving the missing feature details.

## Work that can proceed now

Resolve the four reproduced findings in `backend-health-review-2026-11-07.md`: regional climate master coverage, missing framework digest, malformed provider URLs and malformed bearer credentials. Preserve the synthetic-data and prototype-review boundaries, immutable old snapshots, existing API routes and local default behavior. Importing the expanded corpus creates a new snapshot rather than rewriting old evidence.

## Input needed for feature alignment

The prototype's source or an explicit account of its screens, filters, buttons, editable values and save/export flows. After that input arrives, map each visible interaction to existing or new routes, request fields, response fields, persistence and source evidence. Only then specify and implement missing product features. Prototype demonstration numbers must not silently become model assumptions or computed business results.

Authority: the user's instruction authorizes backend preparation. Routine fixes proceed without reopening prior backend architecture decisions. The feature-specific implementation depends on the reference content.
