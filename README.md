# eason&nalu 新星防御 (Nova Defense)

这是一个使用 React + Vite + Tailwind CSS 开发的高性能塔防游戏。

## 部署到 Vercel 指南

### 1. 准备 GitHub 仓库
1. 在 GitHub 上创建一个新的仓库。
2. 将此项目的所有代码推送到该仓库：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <你的仓库地址>
   git branch -M main
   git push -u origin main
   ```

### 2. 在 Vercel 上部署
1. 登录 [Vercel](https://vercel.com/)。
2. 点击 **"Add New"** -> **"Project"**。
3. 导入你刚刚创建的 GitHub 仓库。
4. **重要配置：**
   - **Framework Preset:** 选择 `Vite`。
   - **Build Command:** `npm run build`。
   - **Output Directory:** `dist`。
5. **环境变量 (Environment Variables):**
   - 如果你的游戏使用了 Gemini API 或其他 API，请在 Vercel 的项目设置中添加对应的环境变量（例如 `GEMINI_API_KEY`）。
6. 点击 **"Deploy"**。

### 3. 自动同步
一旦部署完成，每当你向 GitHub 仓库的 `main` 分支推送代码时，Vercel 都会自动触发重新构建和部署。

## 游戏特性
- **高性能渲染**：使用 Canvas API 和优化的游戏循环，确保流畅体验。
- **响应式设计**：适配手机和电脑屏幕。
- **中英双语**：支持一键切换语言。
- **特殊技能**：按下 `E` 键召唤 UFO 清屏（1分钟冷却）。
- **关卡系统**：难度随关卡提升，挑战你的反应极限。

## 开发
```bash
npm install
npm run dev
```
