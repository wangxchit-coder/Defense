# 地球保卫战：星际对决 (Earth Defense: Star Wars)

这是一个使用 React + Vite + Tailwind CSS 开发的高性能星际塔防游戏，向经典游戏《导弹指令》致敬并融入了现代游戏元素。

## 游戏特性
- **路飞彩蛋**：每击落 5 个 UFO，海贼王路飞就会现身为你加油鼓劲！
- **太阳大招 (Solar Ultimate)**：点击右上角太阳图标释放全屏熔化射线，摧毁所有敌军（30秒冷却）。
- **金币系统**：击落 UFO 会掉落金币，收集金币获得额外战功。
- **高科技防线**：拥有 3 座高科技炮塔和 6 座地球城市，保卫地球不被沦陷。
- **失败条件**：3 座炮台全部炸毁 或 6 座城市全部炸毁。
- **三倍弹药**：大幅提升防御火力，应对更猛烈的波次攻势。
- **高性能渲染**：基于 Canvas API 优化，确保 60FPS 流畅运行。

## 部署到 Vercel 指南

### 1. 准备 GitHub 仓库
1. 在 GitHub 上创建一个新的仓库（例如 `earth-defense`）。
2. 在本地终端执行以下命令将代码推送到 GitHub：
   ```bash
   git init
   git add .
   git commit -m "feat: 升级路飞彩蛋与太阳大招系统"
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
5. 点击 **"Deploy"**。

### 3. 自动同步
Vercel 已与 GitHub 深度集成。每当你通过 `git push` 提交新代码到 `main` 分支时，Vercel 会自动抓取更新并重新部署，无需手动操作。

## 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```
