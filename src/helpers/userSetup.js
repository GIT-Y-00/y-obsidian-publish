function userMarkdownSetup(md) {
  // The md parameter stands for the markdown-it instance used throughout the site generator.
  // Feel free to add any plugin you want here instead of /.eleventy.js
}
function userEleventySetup(eleventyConfig) {
  // The eleventyConfig parameter stands for the the config instantiated in /.eleventy.js.
  // Feel free to add any plugin you want here instead of /.eleventy.js
  // 终极补丁：全局拦截 Excalidraw 的渲染脚本，强行注入 iframe 渲染权限和安全豁免权
  eleventyConfig.addTransform("excalidraw-iframe-injector", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html") && content.includes("ExcalidrawLib.Excalidraw")) {
      
      // 精准手术：直接在 React 组件实例化的属性开头，注入 validate 和 render
      return content.replace(
        /React\.createElement\(ExcalidrawLib\.Excalidraw,\s*\{/,
        `React.createElement(ExcalidrawLib.Excalidraw, {
          validateEmbeddable: function(link) { return true; }, // 🛡️ 核心：安全白名单豁免！
          renderEmbeddable: function(node) { 
            if (node.link) { 
              return React.createElement("iframe", { 
                src: node.link, 
                // 让 iframe 完美填满方框，去除边框
                style: { width: "100%", height: "100%", border: "none", overflow: "hidden" } 
              }); 
            } 
            return null; 
          },`
      );
    }
    return content;
  });

}
exports.userMarkdownSetup = userMarkdownSetup;
exports.userEleventySetup = userEleventySetup;
