FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖 (poppler-utils + Node.js)
RUN apt-get update && apt-get install -y \
    poppler-utils \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 配置阿里云 pip 加速源
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ \
    && pip config set global.trusted-host mirrors.aliyun.com

# 配置淘宝 npm 镜像源
RUN npm config set registry https://registry.npmmirror.com

# 复制依赖文件
COPY requirements.txt .
COPY web/package*.json ./web/

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 安装前端依赖并构建
WORKDIR /app/web
RUN npm install

# 复制项目文件
WORKDIR /app
COPY . .

# 构建前端
WORKDIR /app/web
RUN npm run build

# 回到工作目录
WORKDIR /app

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
