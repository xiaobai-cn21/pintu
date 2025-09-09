# 拼图大师 (Puzzle Master)

一个复古像素风格的拼图游戏，使用 Flask 开发。

## 🚀 快速开始

### 在新电脑上运行项目：

1. **克隆项目**
   ```bash
   git clone <项目地址>
   cd pintu
   ```

2. **运行初始化脚本**
   ```bash
   python setup.py
   ```
   这个脚本会自动：
   - 安装 Python 依赖包
   - 下载像素字体文件到本地

3. **启动项目**
   ```bash
   python app.py
   ```

4. **访问游戏**
   打开浏览器访问：http://localhost:5000

## 📁 项目结构

```
pintu/
├── app.py                 # Flask 主应用
├── setup.py              # 项目初始化脚本
├── download_fonts.py     # 字体下载脚本
├── requirements.txt      # Python 依赖
├── static/              # 静态文件
│   ├── fonts/           # 本地字体文件
│   ├── css/             # 样式文件
│   ├── js/              # JavaScript 文件
│   └── images/          # 图片资源
├── templates/           # HTML 模板
└── views/              # 后端视图
```

## 🎮 功能特性

- ✅ 复古像素风格界面
- ✅ 用户注册/登录系统
- ✅ 拼图游戏（3x3, 4x4, 5x5）
- ✅ 排行榜系统
- ✅ AI 图片生成
- ✅ 自定义拼图编辑器
- ✅ 实时对战功能

## 🎨 像素字体

项目使用本地字体文件，确保在任何电脑上都能正常显示像素风格：

- **Press Start 2P**: 英文和数字的像素字体
- **Zpix**: 中文的像素字体

字体文件自动下载到 `static/fonts/` 目录，无需手动配置。

## 🛠️ 技术栈

- **后端**: Flask, SQLAlchemy, JWT
- **前端**: HTML5, CSS3, JavaScript
- **数据库**: MySQL
- **实时通信**: Socket.IO
- **AI 集成**: 图片生成 API

## 📝 开发说明

### 手动安装依赖：
```bash
pip install -r requirements.txt
```

### 手动下载字体：
```bash
python download_fonts.py
```

### 数据库配置：
确保 MySQL 服务运行，并在 `config.py` 中配置数据库连接。

## 🎯 部署

1. 确保服务器已安装 Python 3.8+
2. 运行 `python setup.py` 初始化项目
3. 配置数据库连接
4. 运行 `python app.py` 启动服务

---

🎮 享受复古像素风格的拼图游戏吧！
