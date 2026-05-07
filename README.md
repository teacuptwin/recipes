# 🍴 Recipe Book

A beautiful, password-protected recipe app hosted on GitHub Pages — powered by a Google Sheet you can edit any time.

---

## 🚀 Setup (one-time, ~10 minutes)

### Step 1 — Set up your Google Sheet

1. Create a new Google Sheet at [sheets.new](https://sheets.new)
2. Set up these **exact column headers** in row 1 (copy-paste this row):

   | Title | Category | Description | Prep Time | Cook Time | Servings | Ingredients | Steps | Notes | Image URL | Emoji |
   |-------|----------|-------------|-----------|-----------|----------|-------------|-------|-------|-----------|-------|

3. Fill in a few recipes. Tips:
   - **Ingredients**: one per line, or separated by semicolons (`;`)
   - **Steps**: one per line, or numbered `1. ... 2. ...`
   - **Image URL**: paste a direct image link (e.g. from Unsplash), or leave blank and use an Emoji instead
   - **Emoji**: used as a fallback if no Image URL (e.g. `🍝`)

4. **Publish the sheet**: go to **File → Share → Publish to web**
   - Select your sheet tab
   - Choose **CSV** format
   - Click **Publish** and confirm

5. Copy your **Sheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/` **`← THIS PART →`** `/edit`

---

### Step 2 — Configure the app

Open `js/config.js` and edit these three values:

```js
const CONFIG = {
  PASSWORD: "your-shared-password",   // what friends type to enter
  SHEET_ID: "paste-your-sheet-id",    // from step 1
  SHEET_TAB: "Sheet1",                // your sheet tab name
};
```

---

### Step 3 — Push to GitHub & enable Pages

```bash
# Clone your repo (if you haven't already)
git clone https://github.com/teacuptwin/recipes.git
cd recipes

# Copy these files in, then:
git add .
git commit -m "Initial recipe app"
git push
```

Then in GitHub:
1. Go to your repo → **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Choose **main** branch, **/ (root)** folder
4. Click **Save**

Your site will be live at:
**`https://teacuptwin.github.io/recipes`**

(Takes ~2 minutes to deploy the first time.)

---

## ✏️ Adding / editing recipes

Just edit your Google Sheet! Changes appear in the app within a few seconds — no code changes needed.

---

## 📁 File structure

```
recipes/
├── index.html        # The app
├── css/
│   └── style.css     # All styles
├── js/
│   ├── config.js     # ← YOUR SETTINGS (password, sheet ID)
│   └── app.js        # App logic
└── README.md
```

---

## 🔒 A note on the password

The password lives in `js/config.js` which is public on GitHub. This is a **"shared secret"** — it stops casual visitors, but it's not high security. Don't use a password you use elsewhere. It's perfect for sharing with friends.

---

## 💡 Tips

- To change the password, update `js/config.js`, commit, and push. Friends will be asked again on their next visit.
- To add a new category, just type it in the Category column — it appears automatically in the filter.
- Blank rows in the sheet are ignored.
