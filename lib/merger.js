const fs = require("fs");
const path = require("path");
const glob = require("glob");
const readline = require("readline");
const chalk = require("chalk");

// 创建readline接口用于用户交互
let rl;

function createReadlineInterface() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

// 检查目录是否存在并处理
function checkOutputDirExists(outputDir, autoConfirm = false) {
  return new Promise((resolve) => {
    if (fs.existsSync(outputDir)) {
      if (autoConfirm) {
        console.log(chalk.yellow(`目录 ${outputDir} 已存在，将自动覆盖...`));
        fs.rmSync(outputDir, { recursive: true, force: true });
        ensureDirectoryExists(outputDir);
        resolve(true);
        return;
      }

      const rl = createReadlineInterface();
      rl.question(
        chalk.yellow(`目录 ${outputDir} 已存在，是否覆盖? (y/n): `),
        (answer) => {
          if (answer.toLowerCase() === "y") {
            console.log(chalk.yellow(`将覆盖 ${outputDir} 中的文件`));
            fs.rmSync(outputDir, { recursive: true, force: true });
            ensureDirectoryExists(outputDir);
            resolve(true);
          } else {
            console.log(chalk.blue("操作已取消"));
            resolve(false);
          }
        }
      );
    } else {
      ensureDirectoryExists(outputDir);
      resolve(true);
    }
  });
}

/**
 * 使用 fs 模块查找文件
 * @param {string} basePath - 基础路径
 * @param {string} componentDir - 组件目录路径（相对于basePath）
 * @param {string} docPattern - 文档文件名模式（例如 "index.zh-CN.md"）
 * @param {Function} filterFn - 过滤函数，用于过滤组件目录
 * @returns {string[]} - 找到的文档文件路径数组
 */
function findDocsByFs(basePath, componentDir, docPattern, filterFn = null) {
  try {
    const fullComponentDir = path.join(basePath, componentDir);

    if (!fs.existsSync(fullComponentDir)) {
      console.log(chalk.red(`组件目录不存在: ${fullComponentDir}`));
      return [];
    }

    // 获取组件目录下的所有子目录
    const componentDirs = fs.readdirSync(fullComponentDir).filter((dir) => {
      const dirPath = path.join(fullComponentDir, dir);
      return fs.statSync(dirPath).isDirectory() && (!filterFn || filterFn(dir));
    });

    // 查找每个组件目录下的文档文件
    const docs = componentDirs
      .map((dir) => {
        const docPath = path.join(componentDir, dir, docPattern);
        return fs.existsSync(path.join(basePath, docPath)) ? docPath : null;
      })
      .filter(Boolean);

    console.log(chalk.yellow(`使用 fs 模块找到的文件数量: ${docs.length}`));
    if (docs.length > 0) {
      console.log(chalk.yellow(`示例文件: ${docs.slice(0, 5).join(", ")}`));
    }

    return docs;
  } catch (error) {
    console.error(chalk.red(`查找文件时出错: ${error.message}`));
    return [];
  }
}

// 查找所有组件目录下的中文文档
function findComponentDocs(basePath, repoUrl = "") {
  // 规范化仓库地址，去掉可能的 .git 后缀
  const normalizedRepoUrl = repoUrl.replace(/\.git$/, "");

  // 默认过滤函数，排除 overview 和 _util 目录
  const defaultFilter = (dir) => dir !== "overview" && dir !== "_util";

  // 根据仓库地址确定查找路径和文件模式
  if (normalizedRepoUrl.includes("/ant-design/ant-design-mini")) {
    // 3. ant-design-mini
    console.log(chalk.blue(`使用 ant-design-mini 模式查找文档`));
    console.log(chalk.yellow(`basePath: ${basePath}`));

    return findDocsByFs(basePath, "src", "index.md", defaultFilter);
  } else if (normalizedRepoUrl.includes("/ant-design/ant-design-mobile")) {
    // 2. ant-design-mobile
    console.log(chalk.blue(`使用 ant-design-mobile 模式查找文档`));
    console.log(chalk.yellow(`basePath: ${basePath}`));

    return findDocsByFs(
      basePath,
      "src/components",
      "index.zh.md",
      defaultFilter
    );
  } else if (normalizedRepoUrl.includes("/ant-design/ant-design-web3")) {
    // 4. ant-design-web3
    console.log(chalk.blue(`使用 ant-design-web3 模式查找文档`));
    console.log(chalk.yellow(`basePath: ${basePath}`));

    return findDocsByFs(
      basePath,
      "packages/web3/src",
      "index.zh-CN.md",
      defaultFilter
    );
  } else if (normalizedRepoUrl.includes("/ant-design/x")) {
    // 5. ant-design/x
    console.log(chalk.blue(`使用 ant-design/x 模式查找文档`));
    console.log(chalk.yellow(`basePath: ${basePath}`));

    return findDocsByFs(
      basePath,
      "components",
      "index.zh-CN.md",
      defaultFilter
    );
  } else if (normalizedRepoUrl.includes("/ant-design/ant-design")) {
    // 1. ant-design 主库
    console.log(chalk.blue(`使用 ant-design 主库模式查找文档`));
    console.log(chalk.yellow(`basePath: ${basePath}`));

    return findDocsByFs(
      basePath,
      "components",
      "index.zh-CN.md",
      defaultFilter
    );
  } else {
    // 默认情况，尝试多种常见路径
    console.log(chalk.blue(`使用默认模式查找文档`));
    console.log(chalk.yellow(`basePath: ${basePath}`));

    // 尝试多种常见路径，按优先级顺序
    const searchPaths = [
      { dir: "components", pattern: "index.zh-CN.md" },
      { dir: "components", pattern: "index.zh.md" },
      { dir: "components", pattern: "index.md" },
      { dir: "src/components", pattern: "index.zh-CN.md" },
      { dir: "src/components", pattern: "index.zh.md" },
      { dir: "src/components", pattern: "index.md" },
      { dir: "src", pattern: "index.md" },
    ];

    // 依次尝试每种路径
    for (const { dir, pattern } of searchPaths) {
      const docs = findDocsByFs(basePath, dir, pattern, defaultFilter);
      if (docs.length > 0) {
        return docs;
      }
    }

    // 如果所有路径都没找到文档，尝试使用 glob 作为后备方案
    console.log(
      chalk.yellow(`使用 fs 模块未找到文档，尝试使用 glob 模式作为后备方案`)
    );
    const patterns = [
      "components/*/index.zh-CN.md",
      "components/*/index.zh.md",
      "components/*/index.md",
      "src/components/*/index.zh-CN.md",
      "src/components/*/index.zh.md",
      "src/components/*/index.md",
      "src/*/index.md",
    ];

    let allDocs = [];
    patterns.forEach((pattern) => {
      const docs = glob.sync(pattern, { cwd: basePath });
      docs.forEach((doc) => {
        if (!allDocs.includes(doc)) {
          allDocs.push(doc);
        }
      });
    });

    console.log(chalk.yellow(`使用 glob 找到的文件数量: ${allDocs.length}`));
    if (allDocs.length > 0) {
      console.log(chalk.yellow(`示例文件: ${allDocs.slice(0, 5).join(", ")}`));
    }

    // 过滤掉 overview 和 _util 文件夹下的文档
    return allDocs.filter((docPath) => {
      const pathParts = docPath.split(path.sep);
      const componentIndex = pathParts.findIndex(
        (part) => part === "components" || part === "src"
      );

      if (componentIndex !== -1 && componentIndex + 1 < pathParts.length) {
        const componentName = pathParts[componentIndex + 1];
        return componentName !== "overview" && componentName !== "_util";
      }
      return true;
    });
  }
}

// 解析文档中的demo引用
function parseDocContent(content) {
  // 修改正则表达式以匹配任意路径的 demo
  const regex = /<code\s+src="([^"]+)"[^>]*>(.*?)<\/code>/g;
  const matches = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      full: match[0],
      demoPath: match[1], // 直接使用完整的路径
      description: match[2],
    });
  }

  return matches;
}

// 读取文件内容
function readFile(filePath, silent = false) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (!silent) {
      console.error(chalk.red(`Error reading file ${filePath}:`), error);
    }
    return null;
  }
}

// 确保目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 格式化组件名称，例如 input -> Input, auto-complete -> AutoComplete
function formatComponentName(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

// 处理demo路径，自动补充后缀
function normalizeDemoPath(demoPath) {
  // 如果路径已经有扩展名，直接返回
  if (path.extname(demoPath)) {
    return demoPath;
  }
  // 如果没有扩展名，返回带 .tsx 后缀的路径，实际文件检查在 mergeDemoFiles 中进行
  return `${demoPath}.tsx`;
}

// 整合demo文件和md文件
function mergeDemoFiles(docFilePath, basePath, outputDir, repoUrl = "") {
  const docDir = path.dirname(docFilePath);
  const docContent = readFile(path.join(basePath, docFilePath));

  if (!docContent) return;

  const demoRefs = parseDocContent(docContent);

  let updatedContent = docContent;

  // 如果有 demo 引用，则处理它们
  if (demoRefs.length > 0) {
    for (const ref of demoRefs) {
      // 先尝试 .tsx 后缀
      let normalizedDemoPath = normalizeDemoPath(ref.demoPath);
      let tsxPath = path.join(basePath, docDir, normalizedDemoPath);
      let tsxContent = readFile(tsxPath, true); // 静默读取，不报错

      // 如果找不到 .tsx 文件，尝试 .ts 后缀
      if (!tsxContent && !path.extname(ref.demoPath)) {
        normalizedDemoPath = `${ref.demoPath}.ts`;
        tsxPath = path.join(basePath, docDir, normalizedDemoPath);
        tsxContent = readFile(tsxPath, true);
      }

      // 如果两种后缀都找不到，报错并继续处理下一个
      if (!tsxContent) {
        console.warn(
          chalk.yellow(
            `Could not read file for demo: ${ref.demoPath} (tried both .tsx and .ts)`
          )
        );
        continue;
      }

      // 查找对应的 md 文件
      const mdPath = tsxPath.replace(/\.(tsx|ts)$/, ".md");
      const mdContent = readFile(mdPath, true);

      // 创建整合后的内容
      let mergedContent = `## ${ref.description}\n\n`;

      // 如果有md文件就添加内容
      if (mdContent) {
        mergedContent += `${mdContent}\n\n`;
      }

      mergedContent += "```tsx\n";
      mergedContent += tsxContent;
      mergedContent += "\n```\n";

      // 替换原来的引用
      updatedContent = updatedContent.replace(ref.full, mergedContent);
    }
  }
  // 不再显示没有 demo 引用的警告，直接使用原始文档内容

  // 计算新的输出路径
  let componentName;
  let outputFilePath;

  // 根据不同仓库类型提取组件名
  if (repoUrl.includes("/ant-design/ant-design-mini")) {
    // 对于 ant-design-mini，组件名就是 src 下的一级目录名
    const pathParts = docFilePath.split(path.sep);
    const srcIndex = pathParts.indexOf("src");
    if (srcIndex !== -1 && srcIndex + 1 < pathParts.length) {
      componentName = formatComponentName(pathParts[srcIndex + 1]);
      outputFilePath = path.join(
        outputDir,
        "components",
        `${componentName}.md`
      );
    }
  } else if (repoUrl.includes("/ant-design/ant-design-web3")) {
    // 对于 ant-design-web3，组件名在 packages/web3/src/ 下的一级目录
    const pathParts = docFilePath.split(path.sep);
    const srcIndex = pathParts.indexOf("src");
    if (srcIndex !== -1 && srcIndex + 1 < pathParts.length) {
      componentName = formatComponentName(pathParts[srcIndex + 1]);
      outputFilePath = path.join(
        outputDir,
        "components",
        `${componentName}.md`
      );
    }
  } else {
    // 通用逻辑，尝试从路径中提取组件名
    const pathParts = docFilePath.split(path.sep);

    // 尝试找到 components 目录
    const componentIndex = pathParts.indexOf("components");
    if (componentIndex !== -1 && componentIndex + 1 < pathParts.length) {
      componentName = formatComponentName(pathParts[componentIndex + 1]);
    } else {
      // 如果没有 components 目录，尝试从路径中提取组件名
      // 假设组件名是文档路径的倒数第二个部分
      componentName = formatComponentName(pathParts[pathParts.length - 2]);
    }

    if (componentName) {
      outputFilePath = path.join(
        outputDir,
        "components",
        `${componentName}.md`
      );
    }
  }

  if (outputFilePath) {
    const outputDirPath = path.dirname(outputFilePath);
    // 确保输出目录存在
    ensureDirectoryExists(outputDirPath);

    // 写入到新文件
    try {
      fs.writeFileSync(outputFilePath, updatedContent);
      console.log(chalk.green(`Successfully generated ${outputFilePath}`));
    } catch (error) {
      console.error(chalk.red(`Error writing to ${outputFilePath}:`), error);
    }
  } else {
    console.warn(
      chalk.yellow(`Could not determine component name for ${docFilePath}`)
    );
  }
}

// 生成组件导航索引文件
function generateIndexFile(docPaths, outputDir) {
  const componentsDir = path.join(outputDir, "components");

  // 检查组件目录是否存在
  if (!fs.existsSync(componentsDir)) {
    console.log(chalk.yellow(`组件目录不存在: ${componentsDir}`));
    return;
  }

  // 读取组件目录中的所有 md 文件
  const componentFiles = fs
    .readdirSync(componentsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => ({
      name: path.basename(file, ".md"),
      path: `./components/${file}`,
    }));

  if (componentFiles.length === 0) {
    console.log(chalk.yellow(`组件目录中没有找到 Markdown 文件`));
    return;
  }

  // 按字母顺序排序组件
  componentFiles.sort((a, b) => a.name.localeCompare(b.name));

  // 生成索引内容
  let indexContent = `# 组件文档索引\n\n`;
  componentFiles.forEach((component) => {
    indexContent += `- [${component.name}](${component.path})\n`;
  });

  // 写入索引文件
  const indexPath = path.join(outputDir, "index.md");
  fs.writeFileSync(indexPath, indexContent);
  console.log(chalk.green(`Generated index file at ${indexPath}`));
}

// 导出主函数
async function mergeDocFiles(options) {
  const {
    projectPath,
    outputPath,
    autoConfirm = false,
    repoUrl = "",
    docPaths = undefined,
  } = options;

  // 检查输出目录
  const shouldContinue = await checkOutputDirExists(outputPath, autoConfirm);

  if (!shouldContinue) {
    if (rl) rl.close();
    return false;
  }

  // 如果指定了文档路径，直接使用；否则查找所有组件文档
  const finalDocPaths = docPaths || findComponentDocs(projectPath, repoUrl);

  if (!finalDocPaths || finalDocPaths.length === 0) {
    console.log(
      chalk.red("未找到任何组件文档，请确认项目路径或指定的文档路径是否正确。")
    );
    if (rl) rl.close();
    return false;
  }

  // 处理文档路径，确保是相对于项目路径的
  const processedDocPaths = finalDocPaths.map((docPath) => {
    if (path.isAbsolute(docPath)) {
      // 如果是绝对路径，转换为相对于项目路径的路径
      const relativePath = path.relative(projectPath, docPath);
      return relativePath;
    }
    return docPath;
  });

  console.log(chalk.blue(`找到 ${processedDocPaths.length} 个组件文档文件。`));

  for (const docPath of processedDocPaths) {
    console.log(chalk.blue(`Processing ${docPath}...`));
    mergeDemoFiles(docPath, projectPath, outputPath, repoUrl);
  }

  // 生成索引文件
  generateIndexFile(processedDocPaths, outputPath);

  console.log(
    chalk.green(
      `Finished processing all files. Merged docs are in ${outputPath}`
    )
  );

  if (rl) rl.close();
  return true;
}

module.exports = { mergeDocFiles };
