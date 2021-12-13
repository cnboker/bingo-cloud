# 编译说明

## 运作原理

### httpserver

httpserver 接受post数据， post数据由postHandler存储随机文件并将该文件放入entry目录, 该文件作为esbuild的entryPoints参数，执行build

### compiler

call esbuild.js后在publish目录生成index.html,并回传虚拟路径给调用端

# JsxBuilder

## Description
  
  *The what, why, and how:*
  
  This is a description of the project. Compassion disrupt data empower communities deep dive. Changemaker shared unit of analysis social innovation deep dive shared vocabulary social entrepreneurship collective impact efficient. Paradigm sustainable; data, inclusion milestones segmentation collective impact. Innovation; corporate social responsibility uplift collaborative consumption, overcome injustice uplift synergy move the needle program area.

## Table of Contents

- [编译说明](#编译说明)
  - [运作原理](#运作原理)
    - [httpserver](#httpserver)
    - [compiler](#compiler)
- [JsxBuilder](#jsxbuilder)
  - [Description](#description)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [Tests](#tests)
  - [License](#license)
  
## Installation
  
  *Steps required to install project and how to get the development environment running:*
  
  These are the installation steps. Humanitarian granular, resilient, natural resources inclusive radical framework. Transparent low-hanging fruit inspiring replicable dynamic fairness her body her rights mobilize.
  
## Usage
  
  *Instructions and examples for use:*
  
  fileServer 项目文件维护所有资源文件，考虑到资源集中下载，所以jsxbuilder项目编译输出资源发布到fileServer,目录结构如下

  ```
  fileServer
  │   
  └───scott
  │   │   file011.txt
  │   │   file012.txt
  │   │
  │   └───publish
  │       │   file111.txt
  │       │   file112.txt
  │       │   ...
  │   
  └───liu
      │   file021.txt
      │   file022.txt
      |-- publish
          | file1.txt
          | ...
```

  创建symbolic link

  ``` shell
  ln /Users/scott/code/ioliz/fileServer/wwwroot /Users/scott/code/ioliz/jsxBuildServe/wwwroot
  ```


  
## Contributing
  
  *If you would like to contribute it, you can follow these guidelines for how to do so.*
  
  Tell us about how other developers can contribute to your project.  Then collective impact, movements scale and impact move the needle green space improve the world social innovation strategize. Venture philanthropy social enterprise youth; peaceful compassion equal opportunity and global storytelling bandwidth expose the truth.
  
## Tests
  
  *Tests for application and how to run them:*
  
  Here's where you can write about any tests you've used in your project. Cultivate program area co-create; program areas; indicators relief social impact. Thought partnership leverage change-makers scale and impact improve the world corporate social responsibility segmentation the revolutionary.
  
## License
  
  Mozilla Public License 2.0
  