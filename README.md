# UNSIAO HiCore 数据登记系统

一个基于 Web 的众包数据采集平台，用于将 PDF 文档中的数据结构化录入。

## 功能特性

- 📄 PDF 自动转图片，支持多页分任务
- 🔒 任务锁定机制，WebSocket 心跳保活
- 👥 多用户协作，贡献积分排行榜
- 📊 管理后台，实时统计监控
- 📝 Excel 自动生成，支持数据修改
- 🔍 智能补全，基于历史数据

## 快速开始

### Docker 部署（推荐）

```bash
# 克隆项目
git clone <repo-url>
cd hicore

# 启动服务
docker-compose up -d --build

# 访问 http://localhost:8000
```

### 手动部署

```bash
# 安装依赖
pip install -r requirements.txt

# Linux 需安装 poppler
sudo apt install poppler-utils

# 启动服务
python main.py
```

## 项目结构

```
├── main.py              # 入口文件
├── app/
│   ├── config.py        # 配置
│   ├── database.py      # 数据库操作
│   ├── models.py        # 数据模型
│   ├── routers/         # API 路由
│   ├── services/        # 业务逻辑
│   └── websocket/       # WebSocket 心跳
├── web/                 # 前端 (React)
│   └── dist/            # 构建产物
├── work/                # 工作目录
│   └── work_{项目ID}/
│       ├── pdf/         # 原始 PDF
│       ├── tmp/         # 转换图片
│       └── data.xlsx    # 输出数据
└── database.db          # SQLite 数据库
```

## 添加任务

1. 创建项目目录：`work/work_20250111/pdf/`
2. 放入 PDF 文件（文件名即机台ID）
3. 重启服务，自动扫描创建任务

## 使用流程

1. 首次访问创建管理员账号
2. 管理员在后台添加普通用户
3. 用户登录后领取任务
4. 查看图片，填写表单，提交数据
5. 数据自动写入 Excel

## 技术栈

- 后端：FastAPI + SQLite + WebSocket
- 前端：React + TypeScript + Tailwind CSS
- PDF：pdf2image + poppler

## License

MIT
