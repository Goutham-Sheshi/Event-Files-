# Sheshi Frame to PPTX - Figma Plugin

Convert your Figma frames into Microsoft PowerPoint (`.pptx`) presentations in one click with pixel-perfect resolution, custom slide layouts, and automatic updates via GitHub Pages.

---

## 🚀 10-Second Setup in Figma Desktop

1. Open the **Figma Desktop App**.
2. Open any design file or create a new file.
3. Right-click anywhere on the canvas and navigate to:
   **Plugins** ➔ **Development** ➔ **Import plugin from manifest...**
4. Select the `manifest.json` file inside this `figma-plugin/` folder.
5. That's it! The plugin is now permanently added under **Plugins** ➔ **Development** ➔ **Sheshi Frame to PPTX**.

---

## 💡 How Updates Work (No Reinstalls Required!)

Because the user interface and converter engine are hosted on GitHub Pages:

- **Any time updates are pushed to GitHub**:
  The new features, styling, aspect ratios, and bugfixes become live automatically.
- **Do you need to reinstall?**
  **NO.** Every time you open the plugin in Figma, it loads the fresh version from GitHub Pages.
- **When is a quick reload needed?**
  If the plugin is already open in Figma when code is pushed, press `Cmd + Option + P` (Mac) or right click ➔ `Plugins` ➔ `Development` ➔ `Reload plugin` to refresh.
- **When is a reinstall needed?**
  Only if `manifest.json` permissions change or you move this local directory on your machine.

---

## 🎯 How to Use

1. Select one or more **Frames** on your Figma canvas (or don't select anything to list all frames on the active page).
2. Run **Sheshi Frame to PPTX**.
3. Choose your presentation preferences:
   - **Aspect Ratio**: 16:9 (Widescreen), 4:3 (Standard), or Custom Frame Match.
   - **Quality**: 1x (Fast), 2x (Retina HD - Recommended), or 3x (Ultra HD).
   - Reorder or toggle slides on/off.
4. Click **Convert & Download PPTX**.
5. Your `.pptx` file will download directly to your computer!
