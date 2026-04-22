function userMarkdownSetup(md) {
  // The md parameter stands for the markdown-it instance used throughout the site generator.
  // Feel free to add any plugin you want here instead of /.eleventy.js
}
function userEleventySetup(eleventyConfig) {
  // The eleventyConfig parameter stands for the the config instantiated in /.eleventy.js.
  // Feel free to add any plugin you want here instead of /.eleventy.js
  // 终极补丁：全局拦截 Excalidraw，注入安全豁免、防套娃死循环、懒加载
  eleventyConfig.addTransform("excalidraw-iframe-injector", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html") && content.includes("ExcalidrawLib.Excalidraw")) {
      
      return content.replace(
        /React\.createElement\(ExcalidrawLib\.Excalidraw,\s*\{/,
        `React.createElement(ExcalidrawLib.Excalidraw, {
          validateEmbeddable: function(link) { return true; }, 
          renderEmbeddable: function(node) { 
            if (node.link) { 
              // 🛡️ 防御机制 1：反无限套娃 (只允许深度为 1)
              // 如果当前窗口(self)不是顶级窗口(top)，说明我们已经在一个 iframe 里了
              if (window.self !== window.top) {
                return React.createElement("div", { 
                  style: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f8f9fa", border: "2px dashed #d1d5db", borderRadius: "8px", boxSizing: "border-box", padding: "10px", textAlign: "center" } 
                }, React.createElement("a", { 
                  href: node.link, 
                  target: "_top", // 点击后让整个大网页跳转，而不是在小框里跳转
                  style: { color: "#3b82f6", textDecoration: "none", fontWeight: "bold", fontSize: "14px" } 
                }, "🔗 嵌套内容过多，点击前往查看"));
              }

              // 🛡️ 防御机制 2：内存优化 - 原生懒加载 (Lazy Loading)
              return React.createElement("iframe", { 
                src: node.link, 
                loading: "lazy", // 只有当用户拖动画板，视野看到这个框时，才开始加载 iframe，极大节省内存！
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
