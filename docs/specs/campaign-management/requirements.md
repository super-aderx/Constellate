# Campaign Management Page (MVP) — Requirements

Status: confirmed
Last updated: 2026-10-19

## Problem
constella-ai generates campaign proposals (a product bundle, a discount, a slogan and a target customer segment), but marketing specialists have no place in Constellate to see them or act on them. Proposals have no lifecycle: nobody can tell which ones are running and which were dropped. This MVP gives them one page to review proposals and move them through a simple lifecycle.

## Users
- **Marketing specialist** (primary): reviews constella-ai proposals, decides which to run, and closes finished or rejected ones. A handful of users for the MVP.

## Goals & success metrics
- A marketing specialist can see every campaign and its status on one page without asking anyone.
- A marketing specialist can activate or close a campaign in one or two clicks, and the change persists across reloads.
- MVP success: the page is demoable end to end with seeded campaigns (list → filter → activate → close) and no manual data fixes.

## Core user flows
### Flow 1: Review campaigns
1. The specialist opens the Campaigns page.
2. They see campaigns as cards, newest first. Each card shows title, status badge, product combination, slogan, discount (% off), discount code and target customer segment.
3. They switch between the All / Proposed / Active / Closed tabs to narrow the list.

### Flow 2: Activate a proposal
1. On a Proposed card, the specialist clicks **Activate**.
2. The status changes to Active immediately, and the change persists.
3. If the update fails, an error message appears and the card stays Proposed.

### Flow 3: Close a campaign
1. On a Proposed or Active card, the specialist clicks **Close**.
2. A confirmation asks them to confirm, because closing is final.
3. On confirm, the status changes to Closed and persists. On cancel, nothing changes.
4. If the update fails, an error message appears and the card keeps its previous status.

### Flow 4: Manage (placeholder)
1. The specialist clicks **Manage** on any card.
2. A "coming soon" message appears. Nothing else happens.

## Functional requirements
- FR1: Campaigns are stored persistently, each with: title, product combination (one or more products), slogan, discount percentage, discount code, target customer segment, status (Proposed / Active / Closed) and creation time.
- FR2: The system ships with mock campaigns (at least 6, covering all three statuses) standing in for constella-ai output.
- FR3: The Campaigns page shows all campaigns as cards, newest first, each displaying the fields in FR1 except creation time.
- FR4: Status filter tabs (All / Proposed / Active / Closed) show only matching cards. All is the default.
- FR5: **Activate** moves a Proposed campaign to Active and persists the change. It is disabled on Active and Closed cards.
- FR6: **Close** moves a Proposed or Active campaign to Closed after the user confirms, and persists the change. It is disabled on Closed cards. Closed is final.
- FR7: **Manage** shows a "coming soon" message on every card.
- FR8: When loading or a status change fails, the user sees an error message, and the affected card keeps its previous status.
- FR9: While campaigns are loading, the page shows a loading state. When there are no campaigns (overall or under the selected tab), the page shows an empty state.

## Out of scope
- Integration with constella-ai (data is seeded mock data), including saving Constella AI drafts into the new list.
- Migrating the existing mock campaign detail, results, form and pause/resume onto the database.
- Creating, editing or deleting campaigns. The management page behind **Manage**.
- Reopening closed campaigns.
- Search, sorting options, pagination.
- Applying discount codes at checkout, campaign analytics.
- Roles and permissions beyond the app's existing access.

## Edge cases & error handling
- Clicking a disabled action does nothing.
- Activating a campaign that someone else already changed is rejected with an error. The card then shows its real current status.
- Loading fails → error message instead of cards.
- Status change fails → error message, card unchanged.
- Empty tab (e.g. no Closed campaigns) → an empty state for that tab.
- A campaign with many products → all products are listed; the card stays readable.

## Constraints
- Must live in the existing Constellate app (frontend, backend and database). Delivered as an MVP.
- The new card grid **replaces the list view of the existing Campaigns page** (`#/campaigns`). The existing in-memory mock (detail with results, create/edit form, pause/resume/end, drafts saved from Constella AI) is left in the code but is no longer what the Campaigns page opens on. Drafts saved from Constella AI won't appear in the new list until real integration lands.

## Acceptance criteria
- AC1 (FR1, FR2): Given a fresh setup, when the seed runs, then at least 6 campaigns exist covering Proposed, Active and Closed, each with every FR1 field filled.
- AC2 (FR3): Given seeded campaigns, when the specialist opens the Campaigns page, then every campaign appears as a card, newest first, showing title, status badge, products, slogan, "<n>% off", discount code and target segment.
- AC3 (FR4): Given the page is open, when the specialist selects the Active tab, then only Active campaigns are shown. When they select All, every campaign is shown again.
- AC4 (FR5): Given a Proposed card, when the specialist clicks Activate, then the card shows Active, and after a reload it still shows Active.
- AC5 (FR5, FR6): Given an Active card, then Activate is disabled. Given a Closed card, then both Activate and Close are disabled.
- AC6 (FR6): Given a Proposed or Active card, when the specialist clicks Close and confirms, then the card shows Closed, and after a reload it still shows Closed.
- AC7 (FR6): Given the Close confirmation is open, when the specialist cancels, then the status is unchanged.
- AC8 (FR7): Given any card, when the specialist clicks Manage, then a "coming soon" message is shown and the status is unchanged.
- AC9 (FR8): Given a status change fails, when the specialist clicks Activate or confirms Close, then an error message is shown and the card keeps its previous status.
- AC10 (FR8): Given an invalid transition is requested (e.g. activating a Closed campaign), then it is rejected and nothing changes.
- AC11 (FR8, FR9): Given loading fails, then an error message is shown instead of cards. Given loading is in progress, then a loading state is shown.
- AC12 (FR9): Given a tab with no matching campaigns, then an empty state is shown.

## Assumptions (accepted by user)
- Discounts are a percentage off.
- Mock campaigns are seeded once, and status changes persist on top of them.
- Desktop browser first. The card grid should still wrap reasonably on narrow screens.
- No new roles. Anyone with access to the app can use the page.

## Open questions
- None blocking the MVP.

## Notes for tech plan
- The user asked for: a database table for campaigns, a backend that serves them, and a frontend page. Status changes persist, so there's a write path too.
- Shape the table after the constella-ai proposal (product combination, discount, slogan, target segment) so real integration can replace the seed later.
