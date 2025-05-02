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
} = require("@modelcontextprotocol/sdk/types.js");
const puppeteer = require('puppeteer');
const { MICRO_APP_DOCS, DOC_TYPES, DOC_SELECTORS } = require('./config/docs.js');

/**
 * MicroApp MCP服务器实现
 */
class MicroAppMcpServer {
  constructor() {
    this.server = new Server(
      {
        name: "@micro-zoe/micro-mcp",
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

    // 初始化工具处理器
    this.setupToolHandlers();
  }

  /**
   * 内容清理和格式化
   */
  cleanAndFormatContent(content) {
    return content
      .replace(/\s+/g, ' ')
      .replace(/[\n\r]+/g, '\n')
      .trim();
  }

  /**
   * 验证文档抓取参数
   */
  validateCrawlDocsArgs(args) {
    const docType = args?.docType || 'all';
    
    if (!DOC_TYPES.includes(docType)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `无效的文档类型: ${docType}。有效类型: ${DOC_TYPES.join(', ')}`
      );
    }
    
    return { docType };
  }

  /**
   * 验证API搜索参数
   */
  validateSearchAPIArgs(args) {
    if (!args?.query || typeof args.query !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        '搜索查询参数必须是非空字符串'
      );
    }
    
    return { query: args.query };
  }

  /**
   * 提取 Micro-app 相关内容
   */
  async extractMicroAppContent(page) {
    let content = '';
    
    for (const selector of DOC_SELECTORS) {
      try {
        const element = await page.$(selector);
        if (element) {
          const elementContent = await page.evaluate(el => el.textContent, element);
          if (elementContent) {
            content += elementContent + '\n\n';
          }
        }
      } catch (e) {
        continue;
      }
    }

    return this.cleanAndFormatContent(content);
  }

  /**
   * 抓取 Micro-app 文档内容
   */
  async crawlMicroAppDocs(args) {
    const { docType } = this.validateCrawlDocsArgs(args);
    let urlsToProcess = [];
    
    // 获取所有文档
    if (docType === 'all') {
      Object.values(MICRO_APP_DOCS).forEach(category => {
        urlsToProcess.push(...category);
      });
    } else {
      // 获取该类型下的文档
      urlsToProcess = MICRO_APP_DOCS[docType] || [];
      
      // 添加所有 type 为 common 的文档
      Object.values(MICRO_APP_DOCS).forEach(category => {
        category.forEach(doc => {
          if (doc.type === 'common' && !urlsToProcess.some(d => d.url === doc.url)) {
            urlsToProcess.push(doc);
          }
        });
      });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const results = [];
    
    console.error('urlsToProcess', urlsToProcess);

    try {
      for (const source of urlsToProcess) {
        const page = await browser.newPage();
        await page.goto(source.url, { 
          waitUntil: 'networkidle0',
          timeout: 60000 
        });
        
        const content = await this.extractMicroAppContent(page);
        results.push({
          name: source.name,
          url: source.url,
          content: content
        });

        await page.close();
      }
    } finally {
      await browser.close();
    }

    return {
      content: [{
        type: 'text',
        text: results.map(r => `=== ${r.name} ===\nSource: ${r.url}\n\n${r.content}\n\n`).join('\n')
      }]
    };
  }

  /**
   * 设置工具处理器
   */
  setupToolHandlers() {
    // 注册工具列表
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'crawl_micro_app_docs',
          description: '抓取 Micro-app 相关文档内容',
          inputSchema: {
            type: 'object',
            properties: {
              docType: {
                type: 'string',
                enum: ['guide', 'frameworks', 'api', 'others', 'all'],
                description: '要抓取的文档类型'
              }
            }
          }
        },
        {
          name: 'get_related_links',
          description: '获取与指定内容相关的链接',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: '要查找相关链接的内容'
              },
              maxResults: {
                type: 'number',
                description: '最大返回结果数量',
                default: 5
              }
            },
            required: ['content']
          }
        }
      ]
    }));

    // 工具调用处理
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments;

      try {
        if (toolName === 'crawl_micro_app_docs') {
          return await this.crawlMicroAppDocs(args);
        } else if (toolName === 'get_related_links') {
          return await this.getRelatedLinks(args);
        } else {
          throw new McpError(ErrorCode.MethodNotFound, `未知工具: ${toolName}`);
        }
      } catch (error) {
        console.error(`工具调用错误 ${toolName}:`, error);
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `工具执行错误 ${toolName}: ${error.message}`);
      }
    });
  }

  /**
   * 获取相关内容链接
   * @param {Object} args - 工具参数
   * @returns {Promise<Object>} - 相关链接列表
   */
  async getRelatedLinks(args) {
    const { content, maxResults = 5 } = args;
    
    if (!content) {
      throw new McpError(ErrorCode.InvalidParams, '内容不能为空');
    }

    // 从所有文档中查找相关内容
    const allDocs = [
      ...MICRO_APP_DOCS.guide,
      ...MICRO_APP_DOCS.features,
      ...MICRO_APP_DOCS.frameworks,
      ...MICRO_APP_DOCS.api,
      ...MICRO_APP_DOCS.others
    ];

    // 根据内容关键词匹配相关文档
    const contentLower = content.toLowerCase();
    const relatedLinks = allDocs
      .filter(doc => {
        // 检查文档名称和类型是否包含关键词
        return doc.name.toLowerCase().includes(contentLower) || 
               doc.type.toLowerCase().includes(contentLower);
      })
      .map(doc => ({
        title: doc.name,
        url: doc.url,
        description: `${doc.type} - ${doc.name}`,
        type: doc.type
      }))
      .slice(0, maxResults);

    return {
      links: relatedLinks
    };
  }

  /**
   * 启动服务器
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('@micro-zoe/micro-mcp 服务器已启动，运行在IDE上');
  }
}

// 创建并启动服务器
const server = new MicroAppMcpServer();
server.run().catch((error) => {
  console.error('严重错误:', error);
  process.exit(1);
});
