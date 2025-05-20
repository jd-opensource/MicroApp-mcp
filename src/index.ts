#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import * as puppeteer from 'puppeteer';
import { MICRO_APP_DOCS, DOC_TYPES, DOC_SELECTORS, MicroAppDocs, DocItem } from './config/docs.js';

const PROMPT_TYPES = ['qa', 'code_writting'];

/**
 * MicroApp MCP服务器实现
 */
class MicroAppMcpServer {
  private server: Server;

  // 工具列表
  private TOOLS = [
    {
      name: 'get_prompt',
      description: '分析用户需求，获取micro-app问答/编写代码提示词',
      inputSchema: {
        type: 'object',
        properties: {
          promptType: {
            type: 'string',
            enum: PROMPT_TYPES,
            description: `
            提示类型，可选值：
                1. qa: 问答,解释需求的提示词,
                2. code_writting: 编写代码需求的提示词,
            `
          },
          content: {
            type: 'string',
            description: `
            用户实际询问内容/编写代码需求
            `
          }
  
        }
      }
      
    },
    {
      name: 'crawl_micro_app_docs',
      description: '抓取 Micro-app 相关文档内容，尽量选择细分类目',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            enum: ['guide', 'frameworks', 'api', 'others', 'all'],
            description: `
              文档类型，可选值：
              1. guide: 指南(${MICRO_APP_DOCS.guide.map(doc => doc.name).join(', ')}),
              2. framworks: 框架(${MICRO_APP_DOCS.frameworks.map(doc => doc.name).join(', ')}),
              3. api: API(${MICRO_APP_DOCS.api.map(doc => doc.name).join(', ')}),
              4. others: 其他(${MICRO_APP_DOCS.others.map(doc => doc.name).join(', ')}),
            `
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
  ];

  /**
   * 提示词列表
   * MCP PROMPTS功能：目前大部分客户端还未广泛支持，暂时使用工具Tools功能代替
   */
  private PROMPTS: {[key: string]: any} = {
    "qa": {
      name: "qa",
      description: "回答 Micro App 微前端框架的技术问题",
      arguments: [
        {
          name: "question",
          description: "调用需要解答的具体技术问题（包含错误信息/场景描述）",
          required: true
        }
      ]
    },
    "code-writting": {
      name: "code-writting",
      description: "编写代码",
      arguments: [
        {
          name: "code",
          description: "Code to explain",
          required: true
        },
      ]
    }
  };

  constructor() {
    this.server = new Server(
      {
        name: "micro-app-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {}
        },
      }
    );

    // 设置错误处理
    this.server.onerror = (error: Error) => console.error("[MCP Error]", error);

    // 设置进程退出处理
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });

    // 初始化工具处理器
    this.setupToolHandlers();

    // 初始化提示词处理器
    // this.setupPromptHandlers();
  }
  
  /**
   * 设置提示词处理器（MCP PROMPTS功能：目前大部分客户端还未广泛支持，暂时使用工具Tools功能代替）
   */
  private setupPromptHandlers(): void {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: Object.values(this.PROMPTS)
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request: { params: { name: string }}) => {
      const prompt = this.PROMPTS[request.params.name];
      if (!prompt) {
        throw new Error(`Prompt not found: ${request.params.name}`);
      }
    
      if (request.params.name === "qa") {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `关于微前端micro-app的问题，先调用mcp crawl_micro_app_docs工具，获取相关资料后，回答用户问题，无需切换执行模式，无需阅读本地文件`
              }
            }
          ]
        };
      }
    
      if (request.params.name === "code-writting") {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `切换执行模式，根据需求调用crawl_micro_app_docs工具获取相关资料，帮助用户编写代码`
              }
            }
          ]
        };
      }
    
      throw new Error("Prompt implementation not found");
    });
  }

  /**
   * 设置工具处理器
   */
  private setupToolHandlers(): void {
    // 注册工具列表
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.TOOLS,
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
        } else if (toolName === 'get_prompt') {
          return await this.getPrompt(args);
        } else {
          throw new McpError(ErrorCode.MethodNotFound, `未知工具: ${toolName}`);
        }
      } catch (error: unknown) {
        console.error(`工具调用错误 ${toolName}:`, error);
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `工具执行错误 ${toolName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  private async getPrompt(args: any): Promise<{ content: Array<{ type: string; text: string }> }>{
    const { promptType, content } = this.validatePromptArgs(args);
    const qa_prompt = `
1. 调用crawl_micro_app_docs工具，获取micro-app相关文档内容，
2. 然后根据文档内容，回答问题:#${content}#。
    `
    const  code_writting_prompt = `
1. 调用crawl_micro_app_docs工具获取micro-app相关文档内容，以了解相关知识。
2. 分析文档内容，阅读本地代码/文件，制定#${content}#的具体计划。
3. 切换执行/agent模式,编写相关代码。
    `
    const prompt = promptType === 'qa' ? qa_prompt : code_writting_prompt;
    return {
      content:[
        {
          type: "text",
          text: prompt
        }
      ]
    }
  }

  /**
   * 内容清理和格式化
   */
  private cleanAndFormatContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/[\n\r]+/g, '\n')
      .trim();
  }

  /**
   * 验证文档抓取参数
   */
  private validateCrawlDocsArgs(args: any): { docType: string } {
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
   * 验证提示词参数
   */
    private validatePromptArgs(args: any): { promptType: string, content: string } {
      const promptType = args?.promptType || 'qa';
      const content = args?.content;
      
      if (!PROMPT_TYPES.includes(promptType)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `无效的提示词类型: ${promptType}。有效类型: ${PROMPT_TYPES.join(', ')}`
        );
      }

      if (!content) {
        throw new McpError(
          ErrorCode.InvalidParams,
          '提示词内容不能为空'
        );
      }

      return { promptType, content };
    }

  /**
   * 验证API搜索参数
   */
  private validateSearchAPIArgs(args: any): { query: string } {
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
  private async extractMicroAppContent(page: puppeteer.Page): Promise<string> {
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
  
  private formatDocsText(docs: Array<{ name: string; url: string; content: string }>): string {
    return `
<mcp-docs>
${docs.map(r => `=== ${r.name} ===\nSource: ${r.url}\n\n${r.content}\n\n`).join('\n')}
</mcp-docs>
# MCP工具调用结束，下一步根据用户需求回答问题或编写代码，回答完毕后结束对话。 
    `
  }

  /**
   * 抓取 Micro-app 文档内容
   */
  private async crawlMicroAppDocs(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    const { docType } = this.validateCrawlDocsArgs(args);
    let urlsToProcess: DocItem[] = [];
    
    // 获取所有文档
    if (docType === 'all') {
      Object.values(MICRO_APP_DOCS).forEach(category => {
        urlsToProcess.push(...category);
      });
    } else {
      // 获取该类型下的文档
      urlsToProcess = (MICRO_APP_DOCS as any)[docType] || [];
      
      // 添加所有 type 为 common 的文档
      Object.values(MICRO_APP_DOCS).forEach((category: DocItem[]) => {
        category.forEach((doc: DocItem) => {
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
    const results: Array<{ name: string; url: string; content: string }> = [];
    
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
        text: this.formatDocsText(results)
      }]
    };
  }


  /**
   * 获取相关内容链接
   * @param {Object} args - 工具参数
   * @returns {Promise<Object>} - 相关链接列表
   */
  private async getRelatedLinks(args: Record<string, unknown> | undefined): Promise<{ links: Array<{ title: string; url: string; description: string; type: string }> }> {
    if (!args) {
      throw new McpError(ErrorCode.InvalidParams, '参数不能为空');
    }
    const { content, maxResults = 5 } = args as { content: string; maxResults?: number };
    
    if (!content) {
      throw new McpError(ErrorCode.InvalidParams, '内容不能为空');
    }

    // 从所有文档中查找相关内容
    const allDocs: DocItem[] = Object.values(MICRO_APP_DOCS).flat();

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
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('micro-app-mcp 服务器已启动，运行在IDE上');
  }
}

// 创建并启动服务器
const server = new MicroAppMcpServer();
server.run().catch((error: Error) => {
  console.error('严重错误:', error);
  process.exit(1);
});
