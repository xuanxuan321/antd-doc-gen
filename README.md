# Ant Design 文档生成工具

一个用于生成 Ant Design 风格组件库文档的命令行工具。适用于 ant-design、ant-design-x、ant-design-mobile、ant-design-mini，ant-design-web3。

## 安装

全局安装:

```bash
npm install -g antd-doc-gen
```

## 使用方法

### 基本用法

```bash
# 生成antd文档
antd-doc-gen -d -r https://github.com/ant-design/ant-design

# 生成antd-mobile文档
antd-doc-gen -d -r https://github.com/ant-design/ant-design-mobile

# 生成antd-mini文档
antd-doc-gen -d -r https://github.com/ant-design/ant-design-mini

# 生成antd-x文档
antd-doc-gen -d -r https://github.com/ant-design/x

# 生成antd-web3文档
antd-doc-gen -d -r https://github.com/ant-design/ant-design-web3
```

## 参数

```bash
- `-o, --output <path>` - 指定输出目录（默认为当前目录下的 'merged-docs'）
- `-y, --yes` - 自动确认覆盖输出目录
- `-d, --download` - 从 GitHub 下载最新的 Ant Design 代码
- `-b, --branch <branch>` - 指定要下载的分支（默认为 'master'）
- `-k, --keep-temp` - 保留临时下载的代码不删除
- `-r, --repo <url>` - 指定远程仓库地址（默认为 'https://github.com/ant-design/ant-design'）
- `-V, --version` - 显示版本号
- `-h, --help` - 显示帮助信息
```

## 其他使用示例

```bash
# 自动从 GitHub antd 下载最新代码并处理
antd-doc-gen -d

# 下载GitHub antd指定分支的代码
antd-doc-gen -d --branch develop

# 下载后保留临时代码不删除
antd-doc-gen -d --keep-temp

# 自动从指定仓库下载代码
antd-doc-gen -d -r https://github.com/ant-design/ant-design-mobile
```

## 功能

- 自动识别并处理 Ant Design 组件文档
- 合并每个组件的示例代码和说明
- 生成便于阅读的完整文档
- 创建组件文档索引
- 支持自动从 GitHub 下载 Ant Design 代码

## 支持的组件库

- Ant Design (antd)
- Ant Design Mobile
- Ant Design Mini
- Ant Design Web3 (ant-design-web3)
- Ant Design X (ant-design/x)
- 任何使用类似文档结构的组件库，要求：
  - 组件文档在 components 或 src/components 目录下
  - 使用 index.md、index.zh.md 或 index.zh-CN.md 作为文档入口
  - 使用 code 标签引用示例代码
