import { transformFileSync } from "@babel/core";
import { tracker } from "./babel-plugin-tracker.js";
import path from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";

const currentFileUrl = import.meta.url;

const filePathPre = dirname(fileURLToPath(currentFileUrl));

const filePath = path.resolve(filePathPre, "./sourceCode.js");
// 读取源文件，经过自定义插件
const sourceCode = transformFileSync(filePath, {
  // presets: ["@babel/preset-env"],
  plugins: [
    //my plugins
    [
      tracker,
      {
        trackerPath: "./tracker.js",
        commentsTrack: "_tracker",
        commentParam: "_trackerParam",
      },
    ],
  ],
});

// 测试=======================
// 输出处理后的代码
console.log(sourceCode.code);
console.log("编译结果执行======");

// eval(sourceCode.code);

import fs from "fs";
const codeString = sourceCode.code;
// 将字符串写入文件
fs.writeFile("./src/output.js", codeString, "utf8", (err) => {
  if (err) {
    console.error("写入文件时发生错误:", err);
  } else {
    console.log("代码已成功写入文件 output.js");
  }
});
