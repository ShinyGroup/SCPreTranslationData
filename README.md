# SC PreTranslation

## 简介

本仓库为enza平台网页游戏『アイドルマスター シャイニーカラー』（THE iDOLM@STER SHINY COLORS， 偶像大师闪耀色彩）[汉化插件](https://github.com/biuuu/ShinyColors)的预翻译仓库，存放预翻译脚本与预翻译数据。旨在通过大语言模型改善机翻可读性与上下文连贯性，并减轻翻译者负担。

## 项目结构

- data 目录: 放置预翻译后的csv文件。文件要求：
  - 路径与文件名：与原始json对应，仅将`.json`替换为`.csv`。如`game_event_communications/400102001.json`，需要放在`data/game_event_communications/`文件夹中，命名为`400102001.csv`。（文件名不作预翻译）
  - 文件格式：与[SCTranslationData](https://github.com/ShinyGroup/SCTranslationData)一致。我们约定使用模型名作为翻译者名，如`gpt-4-1106-preview`, `gemini-pro`
- scripts：脚本文件，包括：
  - 预翻译脚本。输入待翻译文件，输出预翻译完成的csv。使用 `ChatGPT API` 兼容的模型。
  - 路径助手脚本。
  - github action脚本。自动化更新工具。
- src: 脚本依赖的库代码
- tmp: 临时文件夹。用于存放临时文件。临时文件夹内的内容将被git忽略。

## 如何使用

### 手动

- 安装依赖：`yarn`
- 配置环境变量：`cp .env.sample .env`，**接着修改 .env 文件中的变量**
- 执行翻译
  - 将待翻译csv直接放入`tmp/untranslated`文件夹，运行预翻译脚本：`yarn translate:folder`,翻译完成的文件会放入`tmp/translated`文件夹中
  - 或运行 `yarn translate:latest` 翻译服务器最新更新的文件
- 运行路径助手脚本：`yarn move`，翻译完成的文件（`tmp/translated`）会被放入`data`文件夹中
- 提交文件即可

## 模型

可选模型：

- claude-3-opus-20240229 <- 速度比gpt4稍快
- gpt-4-0125-preview / gpt-4-turbo-preview
- gpt-3.5-turbo-0125 / gpt-3.5-turbo
- gemini-pro
- moonshot-v1-8k
