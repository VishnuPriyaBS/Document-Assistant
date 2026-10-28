
# DocAI — Design System

## Design Approach

DocAI uses a clean, document-focused interface.
The design helps users upload files, find relevant
information, and verify AI-generated answers
without unnecessary distractions.

## Colour Palette

The application uses indigo as its primary accent
colour, with neutral backgrounds and surfaces.

Shared colours are defined as CSS variables in
`src/app/globals.css`.

| Token | Purpose |
| --- | --- |
| background | Main page background |
| foreground | Primary text |
| surface | Cards, navigation and panels |
| surface-muted | Secondary sections |
| primary | Main actions and highlights |
| primary-soft | Active navigation and subtle highlights |
| muted-foreground | Secondary text |
| border-color | Component borders |
| focus-ring | Keyboard focus indicators |

Each colour token has light and dark values.

## Typography

The primary typeface is Geist Sans.

- Page headings: 24–36px, bold
- Section headings: 18–20px, semibold
- Body text: 14–16px
- Supporting text: 12–14px

## Spacing and Components

The interface follows Tailwind's spacing scale.

- Main content uses consistent 16–32px padding.
- Cards use rounded corners and subtle borders.
- Primary buttons use the shared indigo colour.
- Navigation highlights the currently selected page.
- Responsive layouts use Tailwind breakpoints.

## Theme Support

Users can choose Light or Dark mode using
the header button or Settings page.

The application saves this selection in
browser localStorage.

On first visit, DocAI follows the operating
system's appearance preference.

## Accessibility

Current design considerations include:

- Keyboard focus indicators
- Semantic navigation
- Accessible button labels
- Skip-to-content navigation
- Reduced-motion preferences
- Responsive layouts

WCAG 2.1 AA is the accessibility target.
A complete automated and manual audit is
still required.

## Planned Improvements

Some chat and document components still use
older Tailwind colour classes.

Future improvements include migrating these
components to shared design tokens, refining
mobile layouts, adding improved loading states,
and completing accessibility testing.
