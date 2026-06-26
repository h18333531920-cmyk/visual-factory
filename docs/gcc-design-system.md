# GCC Design Lightweight UI System

Version: 2026-06-26

This document archives the lightweight UI direction for GCC Design. Use it as the baseline for future UI work unless a new direction is explicitly approved.

## Core Direction

- Keep the product layout stable. Do not change information architecture for visual decoration.
- Use a white product workspace as the default background.
- Visual upgrades should come from typography, spacing, radius, hierarchy, icon consistency, and card quality.
- Avoid unrelated decorative graphics, floating blobs, random abstract shapes, and oversized ornamental elements.
- The product should feel like a mature creative workspace, not a marketing landing page and not a prototype.

## Color

- Page background: `#ffffff`
- Soft section background: `#F6F7F3`
- Primary text: `#101318`
- Secondary text: `#69717C`
- Muted text: `#9AA1AA`
- Border: `rgba(16, 19, 24, 0.09)`
- Primary action: `#101318` with white text
- Accent: `#D8FF4F`
- Accent usage: only for small status hints, badges, or meaningful emphasis. Do not use large decorative accent areas.

## Typography

- Page title in product workspace: 36-48px, weight 800-880, line-height around 1.06-1.12.
- Large marketing-scale titles above 56px are not allowed inside tool/workspace screens unless a dedicated landing page is explicitly approved.
- Module title: 20-28px, weight 760-850.
- Card title: 15-17px, weight 760-850.
- Button and filter text: 13-14px, weight 680-780.
- Helper text: 12-13px, weight 600-680.
- Use only a few weight levels: 500, 650, 780, 900.
- Do not use oversized text inside compact cards, panels, or sidebars.

## Radius

- Page-level panels: 24px.
- Hero/search panels: 20-28px depending on size.
- Tool cards: 18-20px.
- Inputs and regular buttons: 12-14px.
- Pills and chips: 999px.
- Keep radius consistent within a screen.

## Spacing

- Page horizontal padding: 32-48px on desktop.
- Large module gap: 24-32px.
- Card grid gap: 12-16px.
- Control strip padding: 18-22px.
- Button horizontal padding: 16-20px.
- Filter row gap: 8-10px.
- Keep screens relaxed but not sparse.

## Icons

- Use one icon style per screen.
- Preferred style: simple line icons, 1.75-2px stroke.
- Tool-card icon size: 20-24px.
- Button icon size: 16-18px.
- Icon container: soft square, usually 38-48px with 12-15px radius.
- Do not mix emoji, random symbols, and line icons in the same control group.

## Components

### Primary Button

- Background: `#101318`
- Text: `#ffffff`
- Radius: 12-14px
- Height: 40-48px
- Hover: slight lift or stronger shadow, not a color jump.

### Secondary Button

- Background: `#ffffff`
- Border: subtle neutral border
- Text: `#101318`
- Radius: 12-14px
- Hover: stronger border and light shadow.

### Tool Cards

- White background.
- 18-20px radius.
- Subtle border and shadow.
- Structure: icon, title, helper text, optional arrow.
- No abstract decorative images unless they directly preview real content.

### Filters

- Main library tabs are primary pills.
- Tags are secondary pills.
- Selected state can be black with white text.
- Unselected state should be quiet, not table-like.

### Search

- White or soft-gray surface.
- Stable width and height.
- Rounded 14-20px.
- Internal icon/button aligned to the same height rhythm.

## Homepage Rules

- Keep the current homepage layout unless a layout redesign is explicitly approved.
- Keep the homepage background white.
- Remove unrelated decorative graphics.
- Hero should focus on title and command/search.
- Homepage hero title and search should be treated as one command group: title first, search 16-20px below it, no oversized blank spacing.
- Tool entry cards should use consistent icon, type, spacing, radius, and hover.
- Control strip should feel like a polished command panel, not a raw form/table.

## Change Policy

- Test all UI changes on the test branch first.
- Do not deploy to `gccdesign.app` until the user explicitly approves.
- After every test or official deployment, provide the URL and version.

## Rollout Notes

- 2026-06-26 `20260626-global-ui1`: applied these tokens and component rules to the main app shell, login, library/home, upload/edit modals, admin/request pages, and the Static Designer shell. Production remains frozen unless explicitly approved.
