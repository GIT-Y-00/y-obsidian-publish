function userMarkdownSetup(md) {
  // The md parameter stands for the markdown-it instance used throughout the site generator.
  // Feel free to add any plugin you want here instead of /.eleventy.js
}
function userEleventySetup(eleventyConfig) {
  // The eleventyConfig parameter stands for the the config instantiated in /.eleventy.js.
  // Feel free to add any plugin you want here instead of /.eleventy.js
  // 终极补丁：全局拦截 Excalidraw，防死循环，并提供极简的【显式交互开关】
  eleventyConfig.addTransform("excalidraw-iframe-injector", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html") && content.includes("ExcalidrawLib.Excalidraw")) {
      
      return content.replace(
        /React\.createElement\(ExcalidrawLib\.Excalidraw,\s*\{/,
        `((excalidrawProps) => {
          // 1. 全局挂载组件，防止重新渲染闪烁
          if (!window.DgExcalidrawWrapper) {
            window.DgExcalidrawWrapper = function(props) {
              // 极简状态：只存一个是开还是关
              const [isInteractive, setIsInteractive] = React.useState(false);

              return React.createElement("div", {
                style: {
                  position: "relative", width: "100%", height: "100%", boxSizing: "border-box",
                  // 开启时显示蓝色边框，关闭时无边框
                  border: isInteractive ? "2px solid #3b82f6" : "2px solid transparent",
                  borderRadius: "8px", overflow: "hidden", transition: "border-color 0.2s"
                }
              },
                // 永远显示在右上角的控制按钮
                React.createElement("button", {
                  onClick: function(e) { 
                    e.stopPropagation(); // 防止点击按钮时触发 Excalidraw 的画布拖拽
                    setIsInteractive(!isInteractive); 
                  },
                  style: { 
                    position: "absolute", top: "8px", right: "8px", zIndex: 50, 
                    padding: "4px 8px", 
                    background: isInteractive ? "#3b82f6" : "#f3f4f6", 
                    color: isInteractive ? "white" : "#4b5563", 
                    border: "1px solid #d1d5db", borderRadius: "6px", 
                    fontSize: "12px", fontWeight: "bold", cursor: "pointer", 
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", opacity: 0.9
                  }
                }, isInteractive ? "🟢 交互: 开" : "🔴 交互: 关"),

                // Iframe 本体
                React.createElement("iframe", {
                  src: props.link,
                  loading: "lazy",
                  style: { 
                    width: "100%", height: "100%", border: "none", 
                    // 核心开关：开就接收鼠标事件，关就穿透给底层的 Excalidraw
                    pointerEvents: isInteractive ? "auto" : "none" 
                  }
                })
              );
            };
          }

          // 2. 注入核心拦截逻辑
          excalidrawProps.validateEmbeddable = function() { return true; };
          excalidrawProps.renderEmbeddable = function(node) { 
            if (node.link) { 
              // 防御套娃
              if (window.self !== window.top) {
                return React.createElement("div", { 
                  style: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f8f9fa", border: "2px dashed #d1d5db", borderRadius: "8px", padding: "10px", textAlign: "center" } 
                }, React.createElement("a", { href: node.link, target: "_top", style: { color: "#3b82f6", textDecoration: "none", fontWeight: "bold", fontSize: "14px" } }, "🔗 嵌套过多，点击查看"));
              }
              
              // 渲染包装器
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
