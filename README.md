# Early Learning Tracker

A simple, teacher-run web app for tracking early literacy and numeracy checks:

- Uppercase letter recognition (A–Z)
- Lowercase letter recognition (a–z)
- Letter sounds (A–Z)
- Number recognition (1–10)
- 2D shape recognition (circle, square, triangle, rectangle, oval, diamond, star, hexagon)

The teacher adds students by student number (name is optional), runs an assessment
by flashing one item at a time on screen and marking it **Correct** or **Not yet**,
and the app tracks scores over time. Each student can get a printable **family report**
with plain-language recommendations for what to practice at home.

No login, no server, no database — it's a static site. All data is stored privately
in the teacher's own browser (`localStorage`) on the device it's used on. Use the
**Data & backup** page to export a `.json` backup regularly, or to move data to
another computer.

## Running it locally

Just open `index.html` in a browser — no build step needed. Or serve it locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Hosting on GitHub Pages

1. Create a new GitHub repository (e.g. `early-learning-tracker`) and push these
   files (`index.html`, `style.css`, `app.js`, `ui.js`) to the `main` branch.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Choose the `main` branch and the `/ (root)` folder, then **Save**.
5. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/`
   within a minute or two.

Since it's a static site, updates are as simple as pushing new commits — no rebuild
step required.

## A note on data & privacy

This app intentionally has no backend, so it never transmits student data anywhere.
The tradeoff is that data lives only in the browser it was entered in:

- Clearing browser data/history will erase it — export a backup first.
- It won't automatically appear on a different computer or browser — use
  **Export** on one device and **Import** on another to move it.
- Using student numbers rather than full names by default is a deliberate choice
  to keep things low-stakes for casual sharing (e.g., screen mirroring in class).
  A name field is available if you'd prefer to use it.

## File structure

```
index.html   — page shell and navigation
style.css    — visual design
app.js       — data model, categories, storage, recommendations
ui.js        — views, routing, and the assessment flow
```
