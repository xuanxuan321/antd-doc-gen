const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const simpleGit = require("simple-git");
const chalk = require("chalk");
const ora = require("ora");
const rimraf = promisify(require("rimraf"));

// 默认 GitHub 仓库地址
const DEFAULT_REPO = "https://github.com/ant-design/ant-design.git";
// 默认分支
const DEFAULT_BRANCH = "master";
// 备用默认分支
const FALLBACK_BRANCH = "main";

/**
 * 下载 Ant Design 代码
 * 下载逻辑：
 * 1. 尝试使用指定分支（默认为 master）从 HTTPS 协议下载
 * 2. 如果是默认分支且下载失败，尝试使用备用分支（main）
 * 3. 如果备用分支也失败，尝试使用 SSH 协议（git@github.com）
 * 4. 如果不是默认分支，直接尝试使用 SSH 协议
 *
 * @param {Object} options - 下载选项
 * @param {string} options.tempDir - 临时目录路径
 * @param {string} options.branch - 分支名称
 * @param {string} options.repoUrl - 仓库地址
 * @returns {Promise<string>} - 返回下载的目录路径
 */
async function downloadAntdRepo(options = {}) {
  const {
    tempDir = path.join(process.cwd(), ".antd-temp"),
    branch = DEFAULT_BRANCH,
    repoUrl = DEFAULT_REPO,
  } = options;

  const spinner = ora("正在准备下载 Ant Design 仓库...").start();

  try {
    if (fs.existsSync(tempDir)) {
      spinner.text = "检测到已存在的代码，正在删除...";
      await rimraf(tempDir);
    }

    fs.mkdirSync(tempDir, { recursive: true });

    // 设置 git 配置以提高稳定性
    const git = simpleGit({
      timeout: {
        block: 60000, // 增加超时时间到60秒
      },
      config: [
        "http.sslVerify=false", // 禁用 SSL 验证
        "http.postBuffer=1048576000", // 增加缓冲区大小
      ],
    });

    // 尝试从不同的协议克隆
    try {
      spinner.text = `正在从 ${repoUrl} 克隆 ${branch} 分支...`;
      await git.clone(repoUrl, tempDir, ["--depth", "1", "--branch", branch]);
    } catch (error) {
      // 如果是默认分支且失败，尝试使用备用分支 main
      if (branch === DEFAULT_BRANCH) {
        try {
          spinner.text = `${branch} 分支克隆失败，尝试使用 ${FALLBACK_BRANCH} 分支...`;
          // 清理之前失败的克隆尝试
          if (fs.existsSync(tempDir)) {
            await rimraf(tempDir);
            fs.mkdirSync(tempDir, { recursive: true });
          }
          await git.clone(repoUrl, tempDir, [
            "--depth",
            "1",
            "--branch",
            FALLBACK_BRANCH,
          ]);
        } catch (fallbackError) {
          // 如果备用分支也失败，尝试使用备用协议
          spinner.text = "备用分支也失败，尝试使用备用协议重新下载...";
          const gitUrl = repoUrl.replace(
            "https://github.com/",
            "git@github.com:"
          );

          // 清理之前失败的克隆尝试
          if (fs.existsSync(tempDir)) {
            await rimraf(tempDir);
            fs.mkdirSync(tempDir, { recursive: true });
          }

          // 先尝试原始分支
          try {
            await git.clone(gitUrl, tempDir, [
              "--depth",
              "1",
              "--branch",
              branch,
            ]);
          } catch (gitProtocolError) {
            // 如果原始分支失败，尝试备用分支
            spinner.text = `备用协议 ${branch} 分支也失败，尝试备用协议 ${FALLBACK_BRANCH} 分支...`;

            // 清理之前失败的克隆尝试
            if (fs.existsSync(tempDir)) {
              await rimraf(tempDir);
              fs.mkdirSync(tempDir, { recursive: true });
            }

            await git.clone(gitUrl, tempDir, [
              "--depth",
              "1",
              "--branch",
              FALLBACK_BRANCH,
            ]);
          }
        }
      } else {
        // 如果不是默认分支，直接尝试使用备用协议
        spinner.text = "尝试使用备用协议重新下载...";
        const gitUrl = repoUrl.replace(
          "https://github.com/",
          "git@github.com:"
        );

        // 清理之前失败的克隆尝试
        if (fs.existsSync(tempDir)) {
          await rimraf(tempDir);
          fs.mkdirSync(tempDir, { recursive: true });
        }

        await git.clone(gitUrl, tempDir, ["--depth", "1", "--branch", branch]);
      }
    }

    spinner.succeed("仓库下载完成!");
    return tempDir;
  } catch (error) {
    spinner.fail("下载失败");
    console.error(chalk.red("下载仓库时出错:"));
    console.error(chalk.red(error.message));
    console.error(chalk.yellow("\n可能的解决方案:"));
    console.error(chalk.yellow("1. 检查网络连接"));
    console.error(chalk.yellow("2. 确保可以访问 GitHub"));
    console.error(chalk.yellow("3. 尝试使用代理或VPN"));
    console.error(
      chalk.yellow("4. 或者手动克隆仓库后使用 --path 选项指定本地路径")
    );
    console.error(
      chalk.yellow("5. 尝试使用 -b 选项指定正确的分支名称，例如：-b main")
    );
    throw error;
  }
}

module.exports = { downloadAntdRepo };
