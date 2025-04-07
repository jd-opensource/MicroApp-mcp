#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

/**
 * MicroApp MCP服务器实现
 */
class MicroAppMcpServer {
  constructor() {
    this.server = new Server(
      {
        name: "MicroApp-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // 设置错误处理
    this.server.onerror = (error) => console.error("[MCP Error]", error);

    // 设置进程退出处理
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });

    // 初始化资源和工具
    this.setupResourceHandlers();
    this.setupToolHandlers();
  }

  /**
   * 设置资源处理器
   */
  setupResourceHandlers() {
    // 列出静态资源
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "microapp://greeting",
          name: "问候信息",
          mimeType: "text/plain",
          description: "返回一个简单的问候信息",
        },
      ],
    }));

    // 列出资源模板
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: "microapp://echo/{message}",
            name: "回显消息",
            mimeType: "text/plain",
            description: "回显提供的消息",
          },
        ],
      })
    );

    // 读取资源
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;

        // 处理静态资源
        if (uri === "microapp://greeting") {
          return {
            contents: [
              {
                uri,
                mimeType: "text/plain",
                text: "你好，这是MicroApp MCP服务器！",
              },
            ],
          };
        }

        // 处理动态资源模板
        const echoMatch = uri.match(/^microapp:\/\/echo\/(.+)$/);
        if (echoMatch) {
          const message = decodeURIComponent(echoMatch[1]);
          return {
            contents: [
              {
                uri,
                mimeType: "text/plain",
                text: `回显: ${message}`,
              },
            ],
          };
        }

        throw new McpError(ErrorCode.InvalidRequest, `未知的资源URI: ${uri}`);
      }
    );
  }

  /**
   * 设置工具处理器
   */
  setupToolHandlers() {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_current_time",
          description: "获取当前时间",
          inputSchema: {
            type: "object",
            properties: {
              format: {
                type: "string",
                description: "时间格式 (可选，默认为ISO)",
                enum: ["iso", "locale", "unix"],
              },
            },
          },
        },
        {
          name: "calculate",
          description: "执行简单的数学计算",
          inputSchema: {
            type: "object",
            properties: {
              expression: {
                type: "string",
                description: "要计算的数学表达式",
              },
            },
            required: ["expression"],
          },
        },
      ],
    }));

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // 获取当前时间工具
      if (name === "get_current_time") {
        const format = args?.format || "iso";
        let timeString;

        switch (format) {
          case "iso":
            timeString = new Date().toISOString();
            break;
          case "locale":
            timeString = new Date().toLocaleString();
            break;
          case "unix":
            timeString = Math.floor(Date.now() / 1000).toString();
            break;
          default:
            timeString = new Date().toISOString();
        }

        return {
          content: [
            {
              type: "text",
              text: timeString,
            },
          ],
        };
      }

      // 计算工具
      if (name === "calculate") {
        if (!args?.expression) {
          throw new McpError(ErrorCode.InvalidParams, "缺少表达式参数");
        }

        try {
          // 注意：eval可能有安全风险，这里仅作为示例
          // 实际应用中应使用更安全的方法如math.js库
          const result = eval(args.expression);

          return {
            content: [
              {
                type: "text",
                text: `计算结果: ${result}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `计算错误: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      throw new McpError(ErrorCode.MethodNotFound, `未知的工具: ${name}`);
    });
  }

  /**
   * 启动服务器
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MicroApp MCP服务器已启动，运行在stdio上");
  }
}

// 创建并启动服务器
const server = new MicroAppMcpServer();
server.run().catch(console.error);
