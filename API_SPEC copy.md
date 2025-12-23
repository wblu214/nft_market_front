# NFT Marketplace Trading Module REST API 文档

## 1. 项目简介

这个项目是一个 **NFT 交易编排后端（Trading Module）**，负责在前端和链上 Marketplace 合约之间做业务编排。

从「用户/产品」视角，可以理解为：

- 卖家可以：上传 NFT 图片（走 IPFS）、铸造 NFT（在你自己的前端或其他服务中完成）、一键上架到链上 Marketplace。
- 买家可以：在前端看到可售 NFT，点击购买，后台自动发起链上交易并更新订单状态。
- 管理端可以：查看所有订单、查看每个订单的链上交易信息、在链上失败时自动或手动恢复为可售状态。

从「后端」视角，它主要做这些事情：

- 管理链下订单（Order）生命周期
- 控制并发：保证「同一个 NFT 只能被成功买一次」
- 调用链上 `NFTMarketplace` 合约的 `list / cancel / buy / listings / nextListingId`
- 监听链上 `Sold` 事件，同步订单状态
- 提供 IPFS 图片上传能力（通过 Pinata），前端用返回的 URL/CID 来做 NFT 元数据

**不负责：**

- NFT 铸造（Mint）
- 元数据 JSON 生成（由前端或其他服务负责）
- 钱包私钥托管（当前 Demo 用后端私钥发链上交易，仅测试用）

---

## 2. 基本信息

- Base URL（本地开发）：`http://localhost:2025`
- 所有业务接口前缀：`/api`
- Swagger UI（在线调试）：`http://localhost:2025/swagger-ui/index.html`

---

## 3. 数据模型

### 3.1 Order 对象（JSON）

```json
{
  "orderId": 1,
  "listingId": 1001,
  "seller": "0xSELLER",
  "buyer": "0xBUYER",
  "nftAddress": "0xNFT_CONTRACT",
  "tokenId": 1,
  "amount": 1,
  "price": 1000000000000000000,
  "status": "LISTED",
  "txHash": "0xTX_HASH",
  "deleted": 0,
  "createdAt": "2025-12-23 17:00:00",
  "updatedAt": "2025-12-23 17:01:00"
}
```

字段说明：

- `orderId`：链下订单 ID（主键，自增）
- `listingId`：链上 `NFTMarketplace` 合约中的 `listingId`（挂单 ID）
- `seller`：卖家地址（链上地址）
- `buyer`：买家地址（链上地址）
- `nftAddress`：NFT 合约地址（ERC721 / ERC1155）
- `tokenId`：NFT tokenId
- `amount`：数量（ERC721 恒为 1，ERC1155 为出售数量）
- `price`：总价（单位：wei，注意是整数）
- `status`：订单状态（见下面枚举）
- `txHash`：链上 `buy()` 交易哈希
- `deleted`：逻辑删除标记（0=正常，1=删除）
- `createdAt` / `updatedAt`：创建/更新时间

### 3.2 OrderStatus 枚举

`status` 可能的取值：

- `INIT`：订单刚创建（逻辑概念）
- `LISTED`：已上架，可被购买
- `LOCKED`：已被某买家锁定，防止并发
- `SETTLING`：链上结算中（`buy` 已发出，等待确认）
- `SUCCESS`：交易成功
- `FAILED`：链上失败（内部用，最终会回到 LISTED）
- `CANCELED`：订单已取消

### 3.3 错误返回格式

所有业务/校验错误统一返回：

```json
{
  "code": "ORDER_ERROR",
  "message": "错误说明"
}
```

可能的 `code`：

- `ORDER_ERROR`：订单状态不合法、找不到订单等
- `VALIDATION_ERROR`：参数校验失败（必填字段缺失等）
- `INTERNAL_ERROR`：未捕获异常

---

## 4. IPFS 图片上传接口（Pinata）

用于上传 NFT 图片，获得 `cid` 和可访问的 URL。

### 4.1 上传图片到 IPFS（Pinata）

**POST** `/api/ipfs/upload`  
**Content-Type**：`multipart/form-data`

#### 请求

FormData 字段：

- `file`：要上传的图片文件

#### 响应

```json
{
  "cid": "QmXXXXXXXX...",
  "url": "https://gateway.pinata.cloud/ipfs/QmXXXXXXXX..."
}
```

- `cid`：IPFS CID（可用于元数据）
- `url`：通过 Pinata 公共网关访问的链接（前端直接 img 显示）

#### Next.js 示例

```ts
const formData = new FormData();
formData.append('file', fileInput.files?.[0] as File);

const res = await fetch('http://localhost:2025/api/ipfs/upload', {
  method: 'POST',
  body: formData
});
const data = await res.json(); // { cid, url }
```

---

## 5. 订单与链上交互 API

### 5.1 创建链下订单（仅数据库，不上链）

**POST** `/api/orders`

用于你只想先在数据库里记一条订单，不立即调合约 `list()` 的场景。一般推荐用 5.2 一步上链。

#### 请求体

```json
{
  "seller": "0xSELLER_ADDRESS",
  "nftAddress": "0xNFT_CONTRACT",
  "tokenId": 1,
  "amount": 1,
  "price": 1000000000000000000
}
```

字段要求：

- `seller`：必填，卖家地址
- `nftAddress`：必填，NFT 合约地址
- `tokenId`：必填，>=0
- `amount`：必填，>=1
- `price`：必填，>0（单位：wei）

#### 响应

- `200 OK`，返回 `Order`，`status = "LISTED"`，`listingId = null`。

---

### 5.2 创建订单并上链挂单（调用合约 list）

**POST** `/api/orders/list-on-chain`

这个接口会：

1. 创建链下订单（LISTED）。
2. 调用合约 `NFTMarketplace.list(nftAddress, tokenId, amount, price)`。
3. 将返回的 `listingId` 写回订单。

前提条件（前端侧要确保）：

- 卖家地址是当前后端使用的钱包地址（当前 Demo 用后端私钥发交易）。
- 该钱包已经授权 NFT 给 Marketplace 合约（`approve` 或 `setApprovalForAll`）。

#### 请求体

和 5.1 一样：

```json
{
  "seller": "0xSELLER_ADDRESS",
  "nftAddress": "0xNFT_CONTRACT",
  "tokenId": 1,
  "amount": 1,
  "price": 1000000000000000000
}
```

#### 响应

- `200 OK`，返回带 `listingId` 的 `Order`：

```json
{
  "orderId": 1,
  "listingId": 1001,
  "seller": "0xSELLER_ADDRESS",
  "nftAddress": "0xNFT_CONTRACT",
  "tokenId": 1,
  "amount": 1,
  "price": 1000000000000000000,
  "status": "LISTED"
}
```

---

### 5.3 锁定订单（买家点击购买，链下）

**POST** `/api/orders/{orderId}/lock`

只做链下锁定（LISTED → LOCKED），后续是否由后端发 `buy()` 看你的选择。

#### 路径参数

- `orderId`：要锁定的订单 ID

#### 请求体

```json
{
  "buyer": "0xBUYER_ADDRESS"
}
```

#### 响应

- `200 OK`，返回更新后的 `Order`（`status = "LOCKED"`，`buyer` 已写入）。
- 并发抢单时，如果已经被锁定或处理，会返回 `ORDER_ERROR`。

---

### 5.4 一步锁定并发起链上购买（后端代发 buy）

**POST** `/api/orders/{orderId}/buy-on-chain`

这个接口会：

1. 调用 `lockOrder`：LISTED → LOCKED，写入 `buyer`。
2. 调用合约 `NFTMarketplace.buy(listingId)`，附带 `value = price`。
3. 调用 `startSettlement`：LOCKED → SETTLING，写入 `txHash`。

适合 Demo 环境由后端托管私钥统一发起链上交易的情况。

#### 路径参数

- `orderId`：订单 ID

#### 请求体

```json
{
  "buyer": "0xBUYER_ADDRESS"
}
```

#### 响应

- `200 OK`，返回状态为 `SETTLING` 的 `Order`，且包含 `txHash`：

```json
{
  "orderId": 1,
  "listingId": 1001,
  "buyer": "0xBUYER_ADDRESS",
  "status": "SETTLING",
  "txHash": "0xTX_HASH"
}
```

---

### 5.5 手动写入 txHash 并进入结算（外部发起 buy 时用）

**POST** `/api/orders/{orderId}/settle`

当 `buy()` 交易是由前端钱包或其他服务发起时，用这个接口把 `txHash` 写回订单，并将状态置为 `SETTLING`。

#### 路径参数

- `orderId`：订单 ID（通常已是 LOCKED）

#### 请求体

```json
{
  "txHash": "0xTRANSACTION_HASH"
}
```

#### 响应

- `200 OK`，返回 `status = "SETTLING"` 的 `Order`。

---

### 5.6 标记链上成功（通常由事件监听调用）

**POST** `/api/orders/{orderId}/success`

在监听到 `Sold` 事件或确认交易成功时，可以通过此接口手动标记订单为 `SUCCESS`。  
（实际代码里事件监听会直接调用 `markSuccess`。）

#### 路径参数

- `orderId`：订单 ID

#### 请求体

- 无

#### 响应

- `200 OK`，返回 `status = "SUCCESS"` 的 `Order`。

---

### 5.7 标记失败并回滚为 LISTED（可重试）

**POST** `/api/orders/{orderId}/fail`

当交易失败或超时时，调用此接口将订单从 `SETTLING` 回滚为 `LISTED`，允许重新购买。  
（项目内部还有定时任务，会自动扫描超时的 `SETTLING` 订单并调用同样的逻辑。）

#### 路径参数

- `orderId`：订单 ID

#### 请求体

- 无

#### 响应

- `200 OK`，返回 `status = "LISTED"` 的 `Order`。

---

### 5.8 卖家/系统取消订单（链下）

**POST** `/api/orders/{orderId}/cancel`

当前实现只做链下取消：LISTED → CANCELED。  
（如需同时调用合约 `cancel(listingId)`，可以后续扩展为使用 `cancelOnChain`。）

#### 路径参数

- `orderId`：订单 ID

#### 请求体

- 无

#### 响应

- `200 OK`，返回 `status = "CANCELED"` 的 `Order`。

---

### 5.9 查询单个订单

**GET** `/api/orders/{orderId}`

#### 路径参数

- `orderId`：订单 ID

#### 响应

- `200 OK`，返回 `Order` 对象。

---

### 5.10 查询订单列表（可按状态过滤）

**GET** `/api/orders`

#### 查询参数（可选）

- `status`：订单状态，如 `LISTED`、`LOCKED`、`SETTLING`、`SUCCESS` 等。

#### 示例

```http
GET /api/orders?status=LISTED
```

#### 响应

- `200 OK`，返回 `Order[]`：

```json
[
  { "orderId": 1, "status": "LISTED" },
  { "orderId": 2, "status": "LISTED" }
]
```

---

## 6. Next.js 调用流程示例

一个典型的交易流程（省略 mint）：

1. 用户上传图片 → 获得 `cid` 和 `url`。  
2. 前端使用 `url` 构造元数据 JSON，在链上铸造 NFT（前端自行完成）。  
3. 铸造完成后，前端知道 `nftAddress + tokenId`，调用 `/api/orders/list-on-chain` 上架。  
4. 买家在前端看到订单，点击购买：调用 `/api/orders/{orderId}/buy-on-chain`。  
5. 前端轮询 `/api/orders/{orderId}`，直到 `status === "SUCCESS"`，交易完成。
