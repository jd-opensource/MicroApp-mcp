# @micro-zoe/micro-mcp

@micro-zoe/micro-mcp 是一个基于 Model Context Protocol (MCP) 的服务器，专为 micro-app 集成而设计。

## 项目描述

这个项目提供了一个 MCP 服务器实现，用于支持 micro-app 的集成和文档抓取功能。它使用 Node.js 实现，旨在提供一个轻量级且功能强大的 MCP 服务器框架。

## 特性

- 支持抓取 Micro-app 相关文档内容
- 提供获取相关链接的功能
- 基于 Model Context Protocol 的服务器实现

## 安装

要安装此包，请运行以下命令：

```
npm install @micro-zoe/micro-mcp
```

## 使用方法

1. 在你的项目中引入 @micro-zoe/micro-mcp：

```javascript
const MicroAppMcpServer = require('@micro-zoe/micro-mcp');
```

2. 创建并启动服务器：

```javascript
const server = new MicroAppMcpServer();
server.run().catch((error) => {
  console.error('严重错误:', error);
  process.exit(1);
});
```

## API

### crawl_micro_app_docs

抓取 Micro-app 相关文档内容。

参数：
- docType: 要抓取的文档类型（'guide'、'frameworks'、'api'、'others'、'all'）

### get_related_links

获取与指定内容相关的链接。

参数：
- content: 要查找相关链接的内容
- maxResults: 最大返回结果数量（默认为 5）

## 开发

如果你想为这个项目做贡献，请按照以下步骤操作：

1. 克隆此仓库到本地机器
2. 进入项目目录
3. 运行以下命令安装依赖：

```
npm install
```

4. 进行你的修改
5. 运行测试（如果有的话）
6. 提交 Pull Request

## 构建

要构建项目，请运行：

```
npm run build
```

## 许可证

本项目采用 MIT 许可证。

## 关键词

mcp, model-context-protocol, micro-app, micro-frontend

## 版本

当前版本：0.1.0
