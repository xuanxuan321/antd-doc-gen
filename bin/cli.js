#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const { mergeDocFiles } = require("../lib/merger");
const { downloadAntdRepo } = require("../lib/download");
const rimraf = require("rimraf");

// 定义版本和描述
program.version("1.0.0").description("合并 Ant Design 组件文档和示例代码");

// 添加命令选项
program
  .option("-p, --path <paths>", "指定组件文档入口路径，多个路径用逗号分隔", "")
  .option("-o, --output <path>", "指定输出目录", "./merged-docs") // 默认在当前目录
  .option("-y, --yes", "自动确认覆盖输出目录", false)
  .option("-d, --download", "从 GitHub 下载最新的 Ant Design 代码", false)
  .option("-b, --branch <branch>", "指定要下载的分支", "master")
  .option("-k, --keep-temp", "保留临时下载的代码不删除", false)
  .option(
    "-r, --repo <url>",
    "指定远程仓库地址",
    "https://github.com/ant-design/ant-design"
  )
  .parse(process.argv);

const options = program.opts();

// 处理仓库地址，去掉可能存在的等号
if (options.repo && options.repo.startsWith("=")) {
  options.repo = options.repo.substring(1);
}

// 处理文档路径参数
const docPaths = options.path
  ? options.path
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p)
  : [];

// 检查目录是否包含components文件夹
function checkComponentsExists(dirPath) {
  const rootComponentsPath = path.join(dirPath, "components");
  const srcComponentsPath = path.join(dirPath, "src", "components");

  return (
    (fs.existsSync(rootComponentsPath) &&
      fs.statSync(rootComponentsPath).isDirectory()) ||
    (fs.existsSync(srcComponentsPath) &&
      fs.statSync(srcComponentsPath).isDirectory())
  );
}

// 运行主函数
async function run() {
  try {
    console.log(chalk.blue("Ant Design 文档合并工具启动中..."));

    const currentDir = process.cwd();
    let projectPath = currentDir; // 默认使用当前目录作为项目路径
    let tempDir = null;
    let outputPath = path.resolve(options.output);

    // 如果指定了文档路径，检查文件是否存在
    if (docPaths.length > 0) {
      for (const docPath of docPaths) {
        const fullPath = path.isAbsolute(docPath)
          ? docPath
          : path.join(currentDir, docPath);
        if (!fs.existsSync(fullPath)) {
          console.log(chalk.yellow(`警告: 指定的文档路径不存在: ${fullPath}`));
          return;
        }
      }
      console.log(chalk.green(`使用指定的 ${docPaths.length} 个文档路径`));
    }
    // 如果没有指定文档路径且不是下载模式，检查项目路径是否包含components文件夹
    else if (!options.download && !checkComponentsExists(currentDir)) {
      console.log(chalk.yellow("警告: 当前目录中未找到 components 文件夹!"));
      console.log(chalk.yellow("这可能不是一个有效的 Ant Design 项目目录。"));
      console.log(chalk.yellow("\n您可以使用以下命令从远程拉取代码："));
      console.log(
        chalk.green("\n  antd-doc -d                # 从默认的 GitHub 仓库拉取")
      );
      console.log(chalk.green("  antd-doc -d -r <repo-url>  # 从指定仓库拉取"));
      console.log(chalk.green("\n或者指定具体的文档路径："));
      console.log(
        chalk.green(
          "  antd-doc -p components/button/index.zh-CN.md,components/input/index.zh-CN.md"
        )
      );
      console.log(chalk.green("\n示例："));
      console.log(
        chalk.green("  antd-doc -d -r https://github.com/ant-design/ant-design")
      );
      console.log(
        chalk.green(
          "  antd-doc -d -r https://github.com/ant-design/ant-design-mobile\n"
        )
      );
      return;
    }

    // 如果需要下载仓库代码
    if (options.download) {
      console.log(chalk.blue("正在从远程仓库下载代码..."));

      // 临时目录设置在当前执行命令的目录下
      tempDir = await downloadAntdRepo({
        tempDir: path.join(currentDir, ".antd-temp"),
        branch: options.branch,
        repoUrl: options.repo,
      });

      projectPath = tempDir;
      console.log(chalk.green(`代码已下载到: ${tempDir}`));
    }

    // 确保输出路径是相对于命令执行目录的
    if (!path.isAbsolute(options.output)) {
      outputPath = path.join(currentDir, options.output);
    }

    console.log(chalk.green(`项目路径: ${projectPath}`));
    console.log(chalk.green(`输出目录: ${outputPath}`));

    const success = await mergeDocFiles({
      projectPath,
      outputPath,
      autoConfirm: options.yes,
      repoUrl: options.repo,
      docPaths: docPaths.length > 0 ? docPaths : undefined,
    });

    if (success) {
      console.log(chalk.blue("文档合并处理完成!"));
    }

    // 清理临时目录
    if (tempDir && !options.keepTemp) {
      console.log(chalk.blue("清理临时下载的代码..."));
      rimraf.sync(tempDir);
      console.log(chalk.green("临时目录已清理"));
    }
  } catch (error) {
    console.error(chalk.red("处理过程中发生错误:"));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

run();
