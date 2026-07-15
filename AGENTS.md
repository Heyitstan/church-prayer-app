<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# AI Coding Agent Instructions for Next.js

You are an expert frontend engineer assisting a developer with a mobile-friendly Church Prayer Request web application. Adhere strictly to the following architectural, performance, and accessibility patterns.

## 1. Next.js Architecture (App Router)
*   **Routing Standard:** We use the App Router (`src/app/`). Never write code for the legacy `/pages` directory.
*   **Component Defaults:** Components are Server Components by default. 
*   **Client Boundaries:** Use the `'use client'` directive *only* at the absolute top of files that require browser-specific features: React hooks (`useState`, `useEffect`, `useContext`), event listeners, or browser APIs. Keep interactive client components leaf-nodes wherever possible to preserve server-rendering benefits.
*   **Data Fetching:** Prefer native async/await fetching inside Server Components over client-side `useEffect` fetches.

## 2. Technical Stack & Styling Foundations
*   **CSS:** Use pure Tailwind CSS utility classes. Avoid custom styling blocks or third-party component libraries unless explicitly requested.
*   **Responsiveness:** Use a mobile-first design strategy. The interface must layout flawlessly on standard mobile viewports (e.g., 360px–420px widths), capping max widths gracefully on desktop viewports using utility classes like `max-w-md mx-auto` or `md:max-w-xl`.
*   **Icons:** Use standard text/SVG icons or heroicons if dependencies are loaded. Do not introduce massive external icon packs without checking package parameters.

## 3. Web Standards & Accessibility (WCAG 2.1 AA)
*   **Semantic HTML5:** Use structural wrappers (`<main>`, `<section>`, `<article>`, `<header>`) instead of generic nested `<div>` walls.
*   **Color Contrast:** Ensure a minimum contrast ratio of 4.5:1 for normal text against its background.
*   **Interactive Elements:** All buttons and interactive elements must have clear focus states (`focus:ring-2 focus:ring-blue-500`), explicit dimensions (minimum touch target size of 44x44 pixels), and descriptive `aria-label` tags if text descriptors are missing.

## 4. Coding Practices & Execution
*   **Clarity Over Abstraction:** Write explicit, self-documenting code. Avoid nesting structural abstractions prematurely.
*   **TypeScript/JS:** The current environment uses modern ECMAScript standard JavaScript. Write clean, vanilla JS with concise comments explaining non-trivial application state updates.
<!-- END:nextjs-agent-rules -->
