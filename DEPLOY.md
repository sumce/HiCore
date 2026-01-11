# UNSIAO HiCore 部署指南

## Docker 部署（推荐）

### 1. 环境准备

确保服务器已安装 Docker 和 Docker Compose：

```bash
# 安装 Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo apt install docker-compose -y
```

### 2. 上传项目

将项目文件上传到服务器：

```bash
# 创建项目目录
mkdir -p /opt/hicore
cd /opt/hicore

# 上传文件（使用 scp 或其他方式）
# scp -r ./* user@server:/opt/hicore/
```

### 3. 构建并启动

```bash
# 构建镜像并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看运行状态
docker-compose ps
```

### 4. 访问系统

浏览器访问：`http://服务器IP:8000`

首次访问会进入初始化页面，创建管理员账号。

---

## 常用命令

```bash
# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f hicore

# 进入容器
docker exec -it unsiao-hicore bash

# 重新构建（代码更新后）
docker-compose up -d --build
```

---

## 数据持久化

以下数据会持久化到宿主机：

- `./database.db` - SQLite 数据库
- `./work/` - 工作目录（PDF、图片、Excel）

### 备份数据

```bash
# 备份数据库
cp database.db database.db.bak

# 备份整个工作目录
tar -czvf work_backup.tar.gz work/
```

---

## 添加新项目

1. 在 `work/` 目录下创建项目文件夹：

```bash
mkdir -p work/work_20250111/pdf
```

2. 将 PDF 文件放入 `pdf/` 目录

3. 重启服务，系统会自动扫描并创建任务：

```bash
docker-compose restart
```

---

## 端口修改

编辑 `docker-compose.yml`，修改端口映射：

```yaml
ports:
  - "80:8000"  # 改为 80 端口
```

然后重启：`docker-compose up -d`

---

## 反向代理（Nginx）

如需配置域名和 HTTPS：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 故障排查

### 查看容器日志
```bash
docker-compose logs -f
```

### PDF 转换失败
确保 poppler-utils 已安装（Docker 镜像已包含）

### 数据库锁定
```bash
# 重启服务
docker-compose restart
```

### 权限问题
```bash
# 确保 work 目录可写
chmod -R 777 work/
```
