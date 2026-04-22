function userMarkdownSetup(md) {
  // The md parameter stands for the markdown-it instance used throughout the site generator.
  // Feel free to add any plugin you want here instead of /.eleventy.js
}
function userEleventySetup(eleventyConfig) {
  // The eleventyConfig parameter stands for the the config instantiated in /.eleventy.js.
  // Feel free to add any plugin you want here instead of /.eleventy.js
  // 终极补丁：全局拦截 Excalidraw，注入安全豁免、防死循环、点击激活，并彻底解决 iframe 闪烁重绘 Bug
  eleventyConfig.addTransform("excalidraw-iframe-injector", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html") && content.includes("ExcalidrawLib.Excalidraw")) {
      
      return content.replace(
        /React\.createElement\(ExcalidrawLib\.Excalidraw,\s*\{/,
        `((excalidrawProps) => {
          // 1. 将 Wrapper 组件挂载到全局 window 下，确保内存地址永远不变，防止 React 疯狂卸载导致 iframe 闪烁！
          if (!window.DgExcalidrawWrapper) {
            window.DgExcalidrawWrapper = function(props) {
              const [isActive, setIsActive] = React.useState(false);
              return React.createElement("div", {
                style: {
                  position: "relative", width: "100%", height: "100%", boxSizing: "border-box",
                  border: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                  borderRadius: "8px", overflow: "hidden", transition: "border-color 0.2s"
                }
              },
                // Iframe 依然懒加载，但由于组件不变，它只会被加载一次！
                React.createElement("iframe", {
                  src: props.link,
                  loading: "lazy",
                  style: { width: "100%", height: "100%", border: "none", pointerEvents: isActive ? "auto" : "none" }
                }),
                
                // 遮罩层：拦截点击
                !isActive ? React.createElement("div", {
                  onClick: function(e) { e.stopPropagation(); setIsActive(true); },
                  style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, cursor: "pointer", zIndex: 10 }
                }) : null,
                
                // 退出按钮
                isActive ? React.createElement("button", {
                  onClick: function(e) { e.stopPropagation(); setIsActive(false); },
                  style: { position: "absolute", top: "8px", right: "8px", zIndex: 20, padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }
                }, "🔒 锁定画布") : null
              );
            };
          }

          // 2. 注入核心拦截逻辑
          excalidrawProps.validateEmbeddable = function() { return true; };
          excalidrawProps.renderEmbeddable = function(node) { 
            if (node.link) { 
              // 防御机制：反无限套娃
              if (window.self !== window.top) {
                return React.createElement("div", { 
                  style: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f8f9fa", border: "2px dashed #d1d5db", borderRadius: "8px", padding: "10px", textAlign: "center" } 
                }, React.createElement("a", { href: node.link, target: "_top", style: { color: "#3b82f6", textDecoration: "none", fontWeight: "bold", fontSize: "14px" } }, "🔗 嵌套过多，点击查看"));
              }
              
              // 关键！给生成的组件传入全局稳定的引用，并打上 node.id 作为唯一 Key！
              return React.createElement(window.DgExcalidrawWrapper, { link: node.link, key: node.id });
            } 
            return null; 
          };

          // 3. 返回挂载好的原始 Excalidraw 组件
          return React.createElement(ExcalidrawLib.Excalidraw, excalidrawProps);
        })({`
      );
    }
    return content;
  });
  
}
exports.userMarkdownSetup = userMarkdownSetup;
exports.userEleventySetup = userEleventySetup;
