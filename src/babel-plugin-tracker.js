import { transformFileSync } from "@babel/core";
import types from "@babel/types";
import { FunctionDeclaration } from "@babel/types";
// 导入 `@babel/helper-module-imports` 包的 `addDefault` 函数
// 它可以向程序中添加默认导入
import { addDefault } from "@babel/helper-module-imports";

const hasTrackerComments = (leadingComments, comments) => {
  if (!leadingComments) return false;
  if (Array.isArray(leadingComments)) {
    const res = leadingComments.filter((item) => {
      return item.node.value.includes(comments);
    });
    return res[0] || null;
  }
  return null;
};

//函数实现
const getParamsFromComment = (commentNode, options) => {
  const commentStr = commentNode.node.value;
  if (commentStr.indexOf(options.commentParam) === -1) {
    return null;
  }

  try {
    return commentStr.slice(
      commentStr.indexOf("{"),
      commentStr.indexOf("}") + 1
    );
  } catch {
    return null;
  }
};

const tracker = (api, options) => {
  const funName = "_tracker";
  const { parse, types, traverse, template } = api;
  //返回一个插件对象
  return {
    visitor: {
      "ArrowFunctionExpression|FunctionDeclaration|ClassMethod|FunctionExpression":
        (path, state) => {
          let nodeComments = path;
          if (path.isExpression()) {
            nodeComments = path.parentPath.parentPath;
          }
          const leadingComments = nodeComments.get("leadingComments");
          const paramCommentPath = hasTrackerComments(
            leadingComments,
            options.commentsTrack
          );

          if (paramCommentPath) {
            //存在指定注释标记
            // 获取函数体path
            const bodyPath = path.get("body");

            // 创建ast节点
            // const astNode = template.statement(`${funName}()`)();
            // const astNode = types.ExpressionStatement(types.callExpression(types.identifier(funName), []));
            // const astNode = parse(`${funName}()`);

            const param = getParamsFromComment(paramCommentPath, options);
            // 兼容箭头函数返回值为单个值
            if (bodyPath.isBlockStatement()) {
              
              let ast = template.statement(
                `${state.importTrackerId}(${param});`
              )();
              if (!param) {
                ast = template.statement(`${state.importTrackerId}();`);
              }
              //get returnStatement, by body of blockStatement
              const returnPath = bodyPath.get("body").slice(-1)[0];
              if (returnPath && returnPath.isReturnStatement()) {
                returnPath.insertBefore(ast)
              }else{
                bodyPath.node.body.push(ast);
              }
              // bodyPath.node.body.unshift(ast);
            } else {
              const ast2 = template.statement(`{
                ${state.importTrackerId}(${param});
                return BODY;
              }`)({ BODY: bodyPath.node });
              bodyPath.replaceWith(ast2);
            }
          }
        },

      Program: (path, state) => {
        const trackerPath = options.trackerPath;
        path.traverse({
          // CallExpression: (path) => {
          //   const {node} = path
          //   if (node.callee.name === "require") {
          //     if(trackerPath.includes(node.arguments[0].value)){
          //       isHasTracker = true;
          //       console.log("找到了");
          //       path.stop();
          //       // return
          //     }
          //   }
          // },
          ImportDeclaration(path) {
            // 如果当前导入声明的来源与 `_tracker` 函数的导入路径相同：
            if (path.node.source.value === trackerPath) {
              const specifiers = path.get("specifiers.0");
              state.importTrackerId = specifiers.get("local").toString();
              // 将标志设置为 true，表示我们找到了 `_tracker` 的导入。
              // 停止遍历，因为我们已经找到了 `_tracker` 的导入。
              path.stop();
            }
          },
        });

        // if (!state.importTrackerId && !path.parentPath) {
        if (!state.importTrackerId) {
          // const buildRequire = template(`
          //       const NAME = require(PATH)
          //   `);
          // const astNode = buildRequire({
          //   NAME: funName,
          //   PATH: trackerPath,
          // });
          // path.node.body.unshift(astNode);

          // 使用 `addDefault` 函数向程序中添加 `_tracker` 函数的默认导入。
          // `options.trackerPath` 是 `_tracker` 函数的导入路径，
          // `{ nameHint: "_tracker" }` 是一个选项对象，用于指定导入的变量名。
          state.importTrackerId = addDefault(path, options.trackerPath, {
            nameHint: path.scope.generateUid(funName),
          }).name;
        }
        state.trackerAst = api.template.statement(
          `${state.importTrackerId}();`
        )();
      },
    },
  };
};

export { tracker };
