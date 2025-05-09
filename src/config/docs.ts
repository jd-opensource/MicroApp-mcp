// 文档基础URL
const DOC_BASE_URL = 'https://jd-opensource.github.io/micro-app/docs.html';

// 定义文档项的接口
interface DocItem {
  name: string;
  url: string;
  type: string;
}

// 定义 MICRO_APP_DOCS 的类型
interface MicroAppDocs {
  guide: DocItem[];
  features: DocItem[];
  frameworks: DocItem[];
  api: DocItem[];
  others: DocItem[];
}

// Micro-app 文档源配置
const MICRO_APP_DOCS: MicroAppDocs = {
  guide: [
    {
      name: "介绍",
      url: `${DOC_BASE_URL}#/`,
      type: "common"
    },
    {
      name: "快速开始",
      url: `${DOC_BASE_URL}#/zh-cn/start`,
      type: "common"
    },
    {
      name: "0.x迁移到1.0",
      url: `${DOC_BASE_URL}#/zh-cn/transfer`,
      type: "common"
    },
  ],
  features: [
    {
      name: "配置项",
      url: `${DOC_BASE_URL}#/zh-cn/configure`,
      type: "common"
    },
    {
      name: "生命周期",
      url: `${DOC_BASE_URL}#/zh-cn/life-cycles`,
      type: "common"
    },
    {
      name: "环境变量",
      url: `${DOC_BASE_URL}#/zh-cn/env`,
      type: "common"
    },
    {
      name: "JS沙箱",
      url: `${DOC_BASE_URL}#/zh-cn/sandbox`,
      type: "common"
    },
    {
      name: "虚拟路由系统",
      url: `${DOC_BASE_URL}#/zh-cn/router`,
      type: "common"
    },
    {
      name: "样式隔离",
      url: `${DOC_BASE_URL}#/zh-cn/scopecss`,
      type: "common"
    },
    {
      name: "元素隔离",
      url: `${DOC_BASE_URL}#/zh-cn/dom-scope`,
      type: "common"
    },
    {
      name: "数据通信",
      url: `${DOC_BASE_URL}#/zh-cn/data`,
      type: "common"
    },
    {
      name: "资源系统",
      url: `${DOC_BASE_URL}#/zh-cn/static-source`,
      type: "common"
    },
    {
      name: "预加载",
      url: `${DOC_BASE_URL}#/zh-cn/prefetch`,
      type: "common"
    },
    {
      name: "umd模式",
      url: `${DOC_BASE_URL}#/zh-cn/umd`,
      type: "common"
    },
    {
      name: "keep-alive",
      url: `${DOC_BASE_URL}#/zh-cn/keep-alive`,
      type: "common"
    },
    {
      name: "多层嵌套",
      url: `${DOC_BASE_URL}#/zh-cn/nest`,
      type: "common"
    },
    {
      name: "插件系统",
      url: `${DOC_BASE_URL}#/zh-cn/plugins`,
      type: "common"
    },
    {
      name: "高级功能",
      url: `${DOC_BASE_URL}#/zh-cn/advanced`,
      type: "common"
    }
  ],
  frameworks: [
    {
      name: "说明",
      url: `${DOC_BASE_URL}#/zh-cn/framework/introduce`,
      type: "framework"
    },
    {
      name: "React",
      url: `${DOC_BASE_URL}#/zh-cn/framework/react`,
      type: "framework"
    },
    {
      name: "Vue",
      url: `${DOC_BASE_URL}#/zh-cn/framework/vue`,
      type: "framework"
    },
    {
      name: "Vite",
      url: `${DOC_BASE_URL}#/zh-cn/framework/vite`,
      type: "framework"
    },
    {
      name: "Angular",
      url: `${DOC_BASE_URL}#/zh-cn/framework/angular`,
      type: "framework"
    },
    {
      name: "Nextjs",
      url: `${DOC_BASE_URL}#/zh-cn/framework/nextjs`,
      type: "framework"
    },
    {
      name: "Nuxtjs",
      url: `${DOC_BASE_URL}#/zh-cn/framework/nuxtjs`,
      type: "framework"
    }
  ],
  api: [
    {
      name: "主应用API",
      url: `${DOC_BASE_URL}#/zh-cn/api/base-app`,
      type: "api"
    },
    {
      name: "子应用API",
      url: `${DOC_BASE_URL}#/zh-cn/api/child-app`,
      type: "api"
    }
  ],
  others: [
    {
      name: "常见问题",
      url: `${DOC_BASE_URL}#/zh-cn/questions`,
      type: "common"
    },
    {
      name: "Micro-App-DevTools",
      url: `${DOC_BASE_URL}#/zh-cn/micro-app-devtools`,
      type: "other"
    },
    {
      name: "部署",
      url: `${DOC_BASE_URL}#/zh-cn/deploy`,
      type: "common"
    },
    {
      name: "更新日志",
      url: `${DOC_BASE_URL}#/zh-cn/changelog`,
      type: "other"
    }
  ]
};

// 文档类型配置
const DOC_TYPES = ['guide', 'features', 'frameworks', 'api', 'others', 'all'] as const;

// 文档选择器配置
const DOC_SELECTORS = [
  // 文档相关选择器
  '.content',
  '.markdown-body',
  'article',
  // API文档相关选择器
  '.api-content',
  '.method-description',
  // 示例代码相关选择器
  '.code-example',
  'pre code',
];

export {
  DOC_BASE_URL,
  MICRO_APP_DOCS,
  DOC_TYPES,
  DOC_SELECTORS,
  MicroAppDocs,
  DocItem
};
