function userMarkdownSetup(md) {
  // The md parameter stands for the markdown-it instance used throughout the site generator.
  // Feel free to add any plugin you want here instead of /.eleventy.js
}
function userEleventySetup(eleventyConfig) {
  // The eleventyConfig parameter stands for the the config instantiated in /.eleventy.js.
  // Feel free to add any plugin you want here instead of /.eleventy.js
  // 终极补丁：全局拦截 Excalidraw 的渲染脚本，强行注入 iframe 渲染权限
  eleventyConfig.addTransform("excalidraw-iframe-injector", function(content, outputPath) {
    // 只有在生成 HTML 文件，且包含 Excalidraw 组件时才触发
    if (outputPath && outputPath.endsWith(".html") && content.includes("ExcalidrawLib.Excalidraw")) {
      
      // 我们用正则找到 React 生成组件的尾部属性 gridModeEnabled:!1 或者 gridModeEnabled:false
      // 然后在它后面强行加上 renderEmbeddable 函数！
      return content.replace(
        /gridModeEnabled:\s*(!1|false)/g,
        `gridModeEnabled:false, renderEmbeddable: function(node) { 
          if (node.link) { 
            return React.createElement("iframe", { 
              src: node.link, 
              style: { width: "100%", height: "100%", border: "none", overflow: "hidden" } 
            }); 
          } 
          return null; 
        }`
      );
    }
    return content;
  });

}
exports.userMarkdownSetup = userMarkdownSetup;
exports.userEleventySetup = userEleventySetup;
