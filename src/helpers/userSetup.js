function userMarkdownSetup(md) {
  // The md parameter stands for the markdown-it instance used throughout the site generator.
  // Feel free to add any plugin you want here instead of /.eleventy.js
}
function userEleventySetup(eleventyConfig) {
  // The eleventyConfig parameter stands for the the config instantiated in /.eleventy.js.
  // Feel free to add any plugin you want here instead of /.eleventy.js
 // 终极补丁：全局拦截 Excalidraw，注入安全豁免、防套娃死循环、以及【点击激活交互】的包装器
  eleventyConfig.addTransform("excalidraw-iframe-injector", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html") && content.includes("ExcalidrawLib.Excalidraw")) {
      
      return content.replace(
        /React\.createElement\(ExcalidrawLib\.Excalidraw,\s*\{/,
        `React.createElement(ExcalidrawLib.Excalidraw, {
          validateEmbeddable: function(link) { return true; }, 
          renderEmbeddable: function(node) { 
            if (node.link) { 
              // 🛡️ 防御机制 1：反无限套娃
              if (window.self !== window.top) {
                return React.createElement("div", { 
                  style: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f8f9fa", border: "2px dashed #d1d5db", borderRadius: "8px", boxSizing: "border-box", padding: "10px", textAlign: "center" } 
                }, React.createElement("a", { 
                  href: node.link, 
                  target: "_top", 
                  style: { color: "#3b82f6", textDecoration: "none", fontWeight: "bold", fontSize: "14px" } 
                }, "🔗 嵌套内容过多，点击前往查看"));
              }

              // 🛡️ 核心交互升级：创建一个带有内部状态的 React 函数式组件
              const InteractiveWrapper = function() {
                // 使用 React 钩子管理激活状态
                const [isActive, setIsActive] = React.useState(false);

                return React.createElement("div", {
                  style: {
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    // 激活时亮起蓝色边框指示交互状态
                    border: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                    borderRadius: "8px",
                    overflow: "hidden",
                    transition: "border-color 0.2s"
                  }
                },
                  // Iframe 本体：核心在于 pointerEvents 的动态切换
                  React.createElement("iframe", {
                    src: node.link,
                    loading: "lazy",
                    style: {
                      width: "100%",
                      height: "100%",
                      border: "none",
                      pointerEvents: isActive ? "auto" : "none" // 关键！激活时接受事件，锁定则鼠标穿透给底层的 Excalidraw
                    }
                  }),
                  
                  // 未激活时的点击遮罩层：拦截点击事件并触发激活
                  !isActive ? React.createElement("div", {
                    onClick: function(e) { 
                      e.stopPropagation(); // 阻止点击事件冒泡给 Excalidraw 导致选中节点
                      setIsActive(true); 
                    },
                    style: {
                      position: "absolute",
                      top: 0, left: 0, right: 0, bottom: 0,
                      cursor: "pointer",
                      zIndex: 10
                    }
                  }) : null,
                  
                  // 激活时的退出/锁定按钮
                  isActive ? React.createElement("button", {
                    onClick: function(e) { 
                      e.stopPropagation(); 
                      setIsActive(false); 
                    },
                    style: {
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      zIndex: 20,
                      padding: "6px 12px",
                      background: "#ef4444", // 红色警示按钮
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }
                  }, "🔒 锁定画布") : null
                );
              };

              // 渲染这个包装器组件
              return React.createElement(InteractiveWrapper);
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
