# Kanban Board

A lightweight, modern, and accessible Kanban Board web application built using **Semantic HTML5**, **Modern CSS3**, and **Vanilla JavaScript**. It leverages the native **HTML5 Drag and Drop API** and persists all board data seamlessly using the browser's **localStorage**.

---

## 🚀 Features

- **Three Kanban Columns**:
  - **To-Do**: Newly created or queued tasks.
  - **Doing**: Tasks actively in progress.
  - **Done**: Completed tasks.
- **Native HTML5 Drag & Drop**:
  - Drag cards freely between any of the three columns.
  - Reorder cards inside columns with real-time drop position calculation.
  - Visual cues for active drag operations (`is-dragging` state and `.drag-over` dotted target borders).
- **Task Management**:
  - Add tasks with title validation (prevent empty titles) and optional description.
  - New tasks default to the **To-Do** column.
  - Delete individual tasks with an accessible confirmation modal.
  - Real-time task counter badges for each column and overall board summary.
- **Accessible & Mobile-Friendly**:
  - Quick-move directional buttons (`←` and `→`) for mobile touch devices and keyboard navigation.
  - Fully responsive grid layout: 3 side-by-side columns on desktop, clean vertical stack on mobile/tablet.
  - Accessible focus outlines, ARIA roles, and labels.
- **Persistent Storage**:
  - Automatic `localStorage` persistence on add, delete, and drag-and-drop moves.
  - Graceful error handling for corrupted data.
  - "Reset Demo" button to restore initial sample tasks at any time.
- **Zero External Dependencies**:
  - Pure HTML5, CSS3, and Vanilla JavaScript.
  - No React, no TypeScript, no Tailwind, and no backend server required.

---

## 📁 Project Structure

```text
kanban-board/
├── index.html     # Semantic structure & accessible markup
├── style.css      # Modern responsive styling & CSS custom properties
├── script.js      # Vanilla JavaScript logic, Drag & Drop API, localStorage
└── README.md      # Documentation and run instructions
```

---

## 🛠️ Technologies Used

- **HTML5**: Semantic tags (`<header>`, `<main>`, `<section>`, `<article>`, `<form>`, `<button>`).
- **CSS3**: CSS Variables, CSS Grid, Flexbox, custom transitions, responsive media queries.
- **Vanilla JavaScript (ES6+)**:
  - Native Drag and Drop API (`dragstart`, `dragover`, `dragenter`, `dragleave`, `drop`, `dragend`).
  - Web Storage API (`localStorage.getItem`, `localStorage.setItem`).
  - DOM Event Delegation and DOM manipulation (`createElement`, `dataset`, etc.).

---

## 💻 How to Run Locally

1. Clone or download this repository.
2. Open the project folder in **Visual Studio Code** (or your preferred editor).
3. Open `index.html` in any modern web browser:
   - Double-click `index.html`, OR
   - Use the **Live Server** extension in VS Code by right-clicking `index.html` and selecting **Open with Live Server**.

---

## 📦 How localStorage Works

All board state is saved under the key:
```javascript
const STORAGE_KEY = 'kanban_board_tasks_v1';
```

Each task is stored as a structured JSON object:
```json
{
  "id": "task-1718000000000-abcde",
  "title": "Implement authentication flow",
  "description": "Optional notes or requirements",
  "status": "todo",
  "createdAt": 1718000000000
}
```

- When the application starts, it checks `localStorage.getItem(STORAGE_KEY)`.
- If no data is found (first visit), initial demo tasks are loaded and saved.
- When tasks are added, deleted, reordered, or moved between columns, `localStorage.setItem()` updates immediately.

---

## 🎯 Drag-and-Drop Implementation

The application uses standard browser Drag and Drop events without third-party libraries:
1. **`dragstart`**: Attaches the task ID to `dataTransfer` with `e.dataTransfer.setData('text/plain', taskId)` and sets `e.dataTransfer.effectAllowed = 'move'`.
2. **`dragover`**: Prevents browser default (`e.preventDefault()`) to allow dropping, applies `.drag-over` visual highlight, and calculates insertion ordering.
3. **`dragleave`**: Removes column highlight when the cursor moves outside the drop container.
4. **`drop`**: Retrieves task ID from `dataTransfer`, updates the task status in the data model, saves state to `localStorage`, and triggers a fresh render.
5. **`dragend`**: Cleans up dragging styles and indicators.

---

## 🌐 Deployment

This project is completely client-side and can be deployed instantly to:
- **GitHub Pages**
- **Vercel**
- **Netlify**
- Any static web hosting service
