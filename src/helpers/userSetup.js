function userMarkdownSetup(md) {
  // The md parameter stands for the markdown-it instance used throughout the site generator.
  // Feel free to add any plugin you want here instead of /.eleventy.js
}
function userEleventySetup(eleventyConfig) {
  // The eleventyConfig parameter stands for the the config instantiated in /.eleventy.js.
  // Feel free to add any plugin you want here instead of /.eleventy.js
  // 终极补丁：全局拦截 Excalidraw，极简 UI + 自动焦点转移
  eleventyConfig.addTransform("excalidraw-iframe-injector", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html") && content.includes("ExcalidrawLib.Excalidraw")) {
      
      return content.replace(
        /React\.createElement\(ExcalidrawLib\.Excalidraw,\s*\{/,
        `((excalidrawProps) => {
          if (!window.DgExcalidrawWrapper) {
            window.DgExcalidrawWrapper = function(props) {
              const [isInteractive, setIsInteractive] = React.useState(false);
              // 1. 新增：创建一个对 iframe DOM 元素的引用
              const iframeRef = React.useRef(null);

              // 2. 新增：监听 isInteractive 的变化，自动转移焦点
              React.useEffect(() => {
                if (isInteractive && iframeRef.current) {
                  // 开启时：强行把浏览器的焦点塞给 iframe，无需额外点击即可滚动
                  iframeRef.current.focus();
                } else if (!isInteractive) {
                  // 关闭时：如果焦点还在 iframe 里，把它拔出来，还给顶级网页 (Excalidraw)
                  if (document.activeElement === iframeRef.current) {
                    iframeRef.current.blur();
                  }
                  window.focus();
                }
              }, [isInteractive]);

              return React.createElement("div", {
                style: { position: "relative", width: "100%", height: "100%", boxSizing: "border-box", pointerEvents: "none" }
              },
                React.createElement("button", {
                  onPointerDown: function(e) { 
                    e.preventDefault(); // 防止按钮自身抢走浏览器的默认焦点
                    e.stopPropagation(); 
                    setIsInteractive(!isInteractive); 
                  },
                  style: { 
                    position: "absolute", top: "8px", right: "8px", zIndex: 50, 
                    padding: "6px 10px", 
                    background: isInteractive ? "#ef4444" : "#3b82f6", 
                    color: "white", 
                    border: "none", borderRadius: "6px", 
                    fontSize: "12px", fontWeight: "bold", cursor: "pointer", 
                    pointerEvents: "auto", opacity: 0.9
                  }
                // 3. 极简文案
                }, isInteractive ? "内嵌交互: 开" : "内嵌交互: 关"),

                React.createElement("iframe", {
                  ref: iframeRef, // 绑定引用
                  src: props.link,
                  loading: "lazy",
                  style: { 
                    width: "100%", height: "100%", border: "none", borderRadius: "8px",
                    boxShadow: isInteractive ? "0 0 0 2px #3b82f6 inset" : "none",
                    transition: "box-shadow 0.2s",
                    pointerEvents: isInteractive ? "auto" : "none" 
                  }
                })
              );
            };
          }

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
