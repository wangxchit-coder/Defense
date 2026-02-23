# eason&nalu 星际防御 (Nova Space Defense)

这是一个使用 React + Vite + Tailwind CSS 开发的高性能星际塔防游戏。

## 游戏特性
- **星空背景**：沉浸式的外太空战场，带有动态星辰和星云效果。
- **真实弹道**：敌方火箭拥有真实的物理外观、尾焰和烟雾轨迹。
- **三连发系统**：防守炮塔现在支持三连发模式，大幅提升防御火力。
- **强化爆炸**：拦截弹爆炸范围扩大一倍，支持连锁反应。
- **特殊技能**：按下 `E` 键召唤 UFO 清屏（1分钟冷却）。
- **关卡系统**：难度随关卡提升，挑战你的反应极限。
- **高性能渲染**：基于 Canvas API 优化，确保 60FPS 流畅运行。

## 部署到 Vercel 指南

### 1. 准备 GitHub 仓库
1. 在 GitHub 上创建一个新的仓库（例如 `nova-defense`）。
2. 在本地终端执行以下命令将代码推送到 GitHub：
   ```bash
   git init
   git add .
   git commit -m "feat: 升级星空背景与三连发系统"
   git remote add origin <你的 GitHub 仓库地址>
   git branch -M main
   git push -u origin main
   ```

### 2. 在 Vercel 上部署
1. 登录 [Vercel 控制台](https://vercel.com/)。
2. 点击 **"Add New"** -> **"Project"**。
3. 导入你刚刚创建的 GitHub 仓库。
4. **项目配置：**
   - **Framework Preset:** 自动识别为 `Vite`。
   - **Build Command:** `npm run build`。
   - **Output Directory:** `dist`。
5. **环境变量 (可选)：**
   - 如果你后续集成了 Gemini AI 功能，请在 "Environment Variables" 中添加 `GEMINI_API_KEY`。
6. 点击 **"Deploy"**。

### 3. 自动同步
Vercel 已与 GitHub 深度集成。每当你通过 `git push` 提交新代码到 `main` 分支时，Vercel 会自动抓取更新并重新部署，无需手动操作。

## 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```
