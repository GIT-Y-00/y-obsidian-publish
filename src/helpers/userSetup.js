function userMarkdownSetup(md) {
  // The md parameter stands for the markdown-it instance used throughout the site generator.
  // Feel free to add any plugin you want here instead of /.eleventy.js
}
function userEleventySetup(eleventyConfig) {
  // The eleventyConfig parameter stands for the the config instantiated in /.eleventy.js.
  // Feel free to add any plugin you want here instead of /.eleventy.js
  // 终极补丁：全局拦截 Excalidraw，完美解决 iframe 事件吞噬与画布拖拽冲突
  eleventyConfig.addTransform("excalidraw-iframe-injector", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html") && content.includes("ExcalidrawLib.Excalidraw")) {
      
      return content.replace(
        /React\.createElement\(ExcalidrawLib\.Excalidraw,\s*\{/,
        `((excalidrawProps) => {
          if (!window.DgExcalidrawWrapper) {
            window.DgExcalidrawWrapper = function(props) {
              const [isInteractive, setIsInteractive] = React.useState(false);

              return React.createElement("div", {
                style: {
                  position: "relative", width: "100%", height: "100%", boxSizing: "border-box",
                  // 🚨 核心重构 1：最外层必须强制鼠标穿透！否则它会变成画布上的一块“死区”，阻碍你拖动画板。
                  pointerEvents: "none"
                }
              },
                // 控制按钮
                React.createElement("button", {
                  // 🚨 核心重构 2：绝对不能用 onClick，必须用 onPointerDown！并在第一时间掐断事件向下传递。
                  onPointerDown: function(e) { 
                    e.stopPropagation(); 
                    setIsInteractive(!isInteractive); 
                  },
                  style: { 
                    position: "absolute", top: "8px", right: "8px", zIndex: 50, 
                    padding: "6px 12px", 
                    background: isInteractive ? "#ef4444" : "#3b82f6", 
                    color: "white", 
                    border: "none", borderRadius: "6px", 
                    fontSize: "12px", fontWeight: "bold", cursor: "pointer", 
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    // 🚨 核心重构 3：虽然外层穿透了，但按钮本身必须接收事件！
                    pointerEvents: "auto",
                    opacity: 0.95
                  }
                }, isInteractive ? "🛑 锁定页面 (允许拖动画布)" : "🖱️ 操作页面 (解锁点击/滚动)"),

                // Iframe 本体
                React.createElement("iframe", {
                  src: props.link,
                  loading: "lazy",
                  style: { 
                    width: "100%", height: "100%", border: "none", borderRadius: "8px",
                    boxShadow: isInteractive ? "0 0 0 2px #3b82f6 inset" : "none",
                    transition: "box-shadow 0.2s",
                    // 🚨 核心重构 4：精确接管 iframe 的生杀大权
                    pointerEvents: isInteractive ? "auto" : "none" 
                  }
                })
              );
            };
          }

          // 注入逻辑
          excalidrawProps.validateEmbeddable = function() { return true; };
          excalidrawProps.renderEmbeddable = function(node) { 
            if (node.link) { 
              if (window.self !== window.top) {
                return React.createElement("div", { 
                  style: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f8f9fa", border: "2px dashed #d1d5db", borderRadius: "8px" } 
                }, React.createElement("a", { href: node.link, target: "_top", style: { color: "#3b82f6", textDecoration: "none", fontWeight: "bold", pointerEvents: "auto" } }, "🔗 嵌套过多，点击查看"));
              }
              
              return React.createElement(window.DgExcalidrawWrapper, { link: node.link, key: node.id });
            } 
            return null; 
          };

          return React.createElement(ExcalidrawLib.Excalidraw, excalidrawProps);
        })({`
      );
    }
    return content;
  });
  
}
exports.userMarkdownSetup = userMarkdownSetup;
exports.userEleventySetup = userEleventySetup;
