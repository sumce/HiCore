# 机台数据人工采集系统 - API 文档

> 版本: 2.0  
> 基础路径: `/api/v1`  
> 数据格式: JSON

---

## 目录

1. [通用说明](#通用说明)
2. [认证接口](#认证接口)
3. [任务接口](#任务接口)
4. [WebSocket 心跳](#websocket-心跳)
5. [静态资源](#静态资源)
6. [错误码说明](#错误码说明)

---

## 通用说明

### 鉴权方式

除登录接口外，所有接口需在 Header 中携带 Token：

```
Authorization: Bearer <token>
```

### 响应格式

成功响应：
```json
{
    "code": 200,
    "msg": "success",
    "data": { ... }
}
```

错误响应：
```json
{
    "detail": "错误描述"
}
```

---

## 认证接口

### 登录

用户登录获取 Token。

**请求**

```
POST /api/v1/auth/login
Content-Type: application/json
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名 |
| password | string | ✅ | 密码 |

**示例**

```json
{
    "username": "admin",
    "password": "123"
}
```

**响应**

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| token | string | 认证令牌 |
| contribution | int | 用户贡献值 |

```json
{
    "code": 200,
    "token": "550e8400-e29b-41d4-a716-446655440000",
    "contribution": 105
}
```

**错误**

| HTTP 状态码 | 说明 |
|-------------|------|
| 401 | 用户名或密码错误 |

---

## 任务接口

### 获取任务

从任务池中抽取一个可用任务。系统会自动锁定该任务给当前用户。

**请求**

```
GET /api/v1/task/fetch
Authorization: Bearer <token>
```

**响应**

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| data | object | 任务数据 |
| data.task_token | string | 任务令牌（后续操作凭证） |
| data.project_id | string | 项目ID |
| data.machine_id | string | 机台ID |
| data.images | array | 图片URL列表 |
| msg | string | 提示信息 |

```json
{
    "code": 200,
    "data": {
        "task_token": "uuid-gen-1234",
        "project_id": "20250107",
        "machine_id": "MCCVE01",
        "images": [
            "/static/work_20250107/tmp/MCCVE01_0.png",
            "/static/work_20250107/tmp/MCCVE01_1.png"
        ]
    },
    "msg": "获取成功，请在10秒内建立WebSocket连接"
}
```

**错误**

| HTTP 状态码 | 说明 |
|-------------|------|
| 401 | 未认证或Token无效 |
| 404 | 暂无可用任务 |

**注意事项**

- 获取任务后必须在 **10秒内** 建立 WebSocket 心跳连接
- 超时未连接或连接断开超过10秒，任务将自动释放回池

---

### 提交任务

提交采集的数据，支持多行数据。

**请求**

```
POST /api/v1/task/submit
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| task_token | string | ✅ | 任务令牌 |
| rows | array | ✅ | 数据行数组 |

**rows 数组元素**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| machine_id | string | ✅ | 机台ID |
| circuit_name | string | ✅ | 回路名称 |
| area | string | ❌ | 区域 |
| device_pos | string | ❌ | 设备位置 |
| voltage | string | ❌ | 电压 |
| phase_wire | string | ❌ | 相线 |
| power | string | ❌ | 功率 |
| max_current | string | ❌ | 最大电流 |
| run_current | string | ❌ | 运行电流 |
| machine_switch | string | ❌ | 机台开关状态 |
| factory_switch | string | ❌ | 工厂开关状态 |

**示例**

```json
{
    "task_token": "uuid-gen-1234",
    "rows": [
        {
            "machine_id": "MCCVE01",
            "circuit_name": "主回路A",
            "area": "二楼",
            "device_pos": "配电箱1",
            "voltage": "380V",
            "phase_wire": "3相4线",
            "power": "15KW",
            "max_current": "32A",
            "run_current": "20A",
            "machine_switch": "ON",
            "factory_switch": "OFF"
        },
        {
            "machine_id": "MCCVE01",
            "circuit_name": "辅助回路B",
            "area": "二楼",
            "device_pos": "配电箱2",
            "voltage": "220V",
            "phase_wire": "单相",
            "power": "5KW",
            "max_current": "25A",
            "run_current": "15A",
            "machine_switch": "ON",
            "factory_switch": "ON"
        }
    ]
}
```

**响应**

```json
{
    "code": 200,
    "msg": "提交成功"
}
```

**错误**

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 无效的任务令牌 / 任务不属于当前用户 / 数据写入失败 |
| 401 | 未认证或Token无效 |
| 422 | 请求体校验失败（缺少必填字段） |

**后端处理流程**

1. 校验 task_token 是否有效且属于当前用户
2. 将数据追加到 `work/work_{project_id}/data.xlsx` 的 DATA 工作表
3. 自动添加 `pdf_path`、`request_ip`、`request_time` 字段
4. 更新任务状态为已完成
5. 用户贡献值 +1
6. 断开对应的 WebSocket 连接

---

## WebSocket 心跳

### 连接地址

```
ws://<host>/ws/heartbeat/{task_token}
```

### 通信协议

**客户端 → 服务端**

每 3-5 秒发送一次：
```
ping
```

**服务端 → 客户端**

响应：
```
pong
```

### 连接流程

```
1. 用户调用 GET /task/fetch 获取 task_token
2. 10秒内建立 WebSocket 连接
3. 客户端定时发送 ping 保活
4. 作业完成后调用 POST /task/submit
5. 服务端自动关闭 WebSocket
```

### 断线重连

- 连接断开后有 **10秒** 重连窗口
- 10秒内重连成功，任务保持锁定
- 超过10秒未重连，任务自动释放回池

### 错误码

| 关闭码 | 说明 |
|--------|------|
| 4001 | 无效的任务令牌 |

---

## 静态资源

### 获取图片

**请求**

```
GET /static/{path}
```

**示例**

```
GET /static/work_20250107/tmp/MCCVE01_0.png
```

**说明**

- 图片命名规则: `{机台ID}_{页码}.png`（页码从0开始）
- 路径映射: `/static/` → `./work/`

---

## 错误码说明

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 404 | 资源不存在 |
| 422 | 请求体校验失败 |
| 500 | 服务器内部错误 |

### 业务状态码

| code | 说明 |
|------|------|
| 200 | 操作成功 |

---

## 附录

### 默认账户

| 用户名 | 密码 |
|--------|------|
| admin | 123 |

### 任务状态

| status | 说明 |
|--------|------|
| 0 | 未处理（可领取） |
| 1 | 锁定中（作业中） |
| 2 | 已完成 |

### Excel 输出字段顺序

```
pdf_path, request_ip, request_time, machine_id, circuit_name, 
area, device_pos, voltage, phase_wire, power, max_current, 
run_current, machine_switch, factory_switch
```

### 完整调用示例

```bash
# 1. 登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123"}'

# 响应: {"code":200,"token":"abc123...","contribution":0}

# 2. 获取任务
curl -X GET http://localhost:8000/api/v1/task/fetch \
  -H "Authorization: Bearer abc123..."

# 响应: {"code":200,"data":{"task_token":"xyz...","project_id":"20250107",...},"msg":"..."}

# 3. 建立 WebSocket 心跳 (使用 wscat 或前端 WebSocket)
wscat -c ws://localhost:8000/ws/heartbeat/xyz...
> ping
< pong

# 4. 提交数据
curl -X POST http://localhost:8000/api/v1/task/submit \
  -H "Authorization: Bearer abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "task_token": "xyz...",
    "rows": [{"machine_id":"MCCVE01","circuit_name":"主回路A"}]
  }'

# 响应: {"code":200,"msg":"提交成功"}
```
