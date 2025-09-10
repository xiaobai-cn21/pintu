### 判断当前用户是否为管理员
**GET** `/auth/is_admin`

**请求头：**
- Authorization: Bearer <token>

**返回：**
```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "isAdmin": true // 或 false
  }
}
```

**说明：**
- `isAdmin` 字段为布尔值，表示当前用户是否为管理员。
- 需要登录（JWT鉴权）。
# 拼图项目接口文档（自动生成，含 /pic/ 路由）

---

## 关卡相关（/pic/puzzles）

### 1. 创建自定义关卡  
**POST** `/pic/puzzles`  
**请求类型**：`multipart/form-data`  
**参数**：
- title (string, 必填)：关卡标题
- image (file, 必填)：关卡图片
- difficulty (string, 可选)：难度（easy/medium/hard）
- piece_count (int, 必填)：拼块数量
- piece_shape (string, 必填)：拼块形状（rect/irregular/triangle）
- is_rotatable (int, 可选)：是否可旋转（0/1）
- is_flipable (int, 可选)：是否可翻转（0/1）
- is_system_level (int, 可选)：是否为系统关卡（0/1）
- type (string, 可选)：关卡类型（nature/animal/building/cartoon/other）

**返回**：
```json
{
  "code": "200",
  "message": "关卡创建成功",
  "data": {"puzzle_id": 1}
}
```

---

### 2. 更新关卡  
**PUT** `/pic/puzzles/<puzzle_id>`  
**请求类型**：`multipart/form-data`  
**参数**（均为可选，未传则不变）：
- title, image, difficulty, piece_count, piece_shape, is_rotatable, is_flipable, is_system_level, type

**返回**：
```json
{
  "code": "200",
  "message": "关卡更新成功",
  "data": null
}
```

---

### 3. 删除关卡  
**DELETE** `/pic/puzzles/<puzzle_id>`  
**返回**：
```json
{
  "code": "200",
  "message": "关卡删除成功",
  "data": null
}
```

---

### 4. 获取关卡详情  
**GET** `/pic/puzzles/<puzzle_id>`  
**返回**：
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "puzzle_id": 1,
    "title": "xxx",
    "image_url": "/static/uploads/xxx.jpg",
    "difficulty": "easy",
    "piece_count": 100,
    "piece_shape": "rect",
    "is_rotatable": false,
    "is_flipable": false,
    "is_system_level": false,
    "type": "nature",
    "created_at": "2024-01-01T12:00:00",
    "creator": {
      "user_id": 1,
      "username": "xxx",
      "email": "xxx@xxx.com"
    }
  }
}
```

---

### 5. 获取关卡列表  
**GET** `/pic/puzzles`  
**返回**：
```json
{
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "puzzle_id": 1,
      "title": "xxx",
      "image_url": "/static/uploads/xxx.jpg",
      "difficulty": "easy",
      "piece_count": 100,
      "piece_shape": "rect",
      "is_rotatable": false,
      "is_flipable": false,
      "is_system_level": false,
      "type": "nature",
      "created_at": "2024-01-01T12:00:00"
    }
    // ...
  ]
}
```

---


---

### 6. 获取系统关卡（仅 is_system_level=true 的关卡，含所有新属性）
**GET** `/pic/levels/system`

**说明**：
返回所有 is_system_level=true 的关卡，包含 puzzles 表的所有新属性（如 is_flipable、type 等）。

**返回**：
```json
{
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "puzzle_id": 1,
      "title": "xxx",
      "image_url": "/static/uploads/xxx.jpg",
      "difficulty": "easy",
      "piece_count": 100,
      "piece_shape": "rect",
      "is_rotatable": false,
      "is_flipable": false,
      "is_system_level": true,
      "type": "nature",
      "created_at": "2024-01-01T12:00:00"
    }
    // ...
  ]
}
```

---

（如需补充其它 /pic/ 路由接口，请告知）


