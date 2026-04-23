const fs = require('fs');
const path = require('path');

function userMarkdownSetup(md) {
  // 保持空，或按需添加
}

eleventyConfig.addTransform("excalidraw-ultimate-fixer", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      // 探头 1：看看有没有成功定位到含有 Excalidraw 的网页
      if (content.includes("ExcalidrawLib.Excalidraw")) {
        console.log(`\n[DEBUG-TRANSFORM] 🎯 捕获到目标画板文件: ${outputPath}`);

        // 【阶段 A：JSON 与 404 修复】
        let contentAfterStageA = content.replace(
          /("link"\s*:\s*)"((?:\\"|[^"])*)"/g,
          function(match, prefix, rawLink) {
            let cleanName = rawLink.replace(/<[^>]+>/g, "").replace(/^\[+(.*?)\]+$/, "$1").replace(/\\/g, "").trim().split("#")[0];
            if (!cleanName || cleanName.startsWith("http") || cleanName === "/404") return match;
            
            const resolved = resolveFilePath(cleanName);
            if (resolved) {
              const slugify = eleventyConfig.getFilter("slugify") || eleventyConfig.getFilter("slug");
              const cleanUrl = `/notes/${slugify(resolved.pathWithoutExt)}/`;
              console.log(`[DEBUG-TRANSFORM]   ✅ 成功修复链接: ${rawLink} -> ${cleanUrl}`);
              return `${prefix}"${cleanUrl}"`; 
            }
            console.log(`[DEBUG-TRANSFORM]   ❌ 无法解析此链接: ${rawLink}`);
            return match; 
          }
        );

        if (content !== contentAfterStageA) {
            console.log(`[DEBUG-TRANSFORM] 🛠️ 阶段 A (JSON修复) 执行成功！`);
        } else {
            console.log(`[DEBUG-TRANSFORM] ⚠️ 阶段 A 未匹配到任何需要修复的 link。`);
        }

        // 【阶段 B：React 交互组件注入】
        let contentAfterStageB = contentAfterStageA.replace(
          /React\.createElement\(ExcalidrawLib\.Excalidraw,\s*\{/,
          `((excalidrawProps) => {
            if (!window.DgExcalidrawWrapper) {
              window.DgExcalidrawWrapper = function(props) {
                const [isInteractive, setIsInteractive] = React.useState(false);
                const iframeRef = React.useRef(null);
                React.useEffect(() => {
                  if (isInteractive && iframeRef.current) iframeRef.current.focus();
                  else if (!isInteractive) {
                    if (document.activeElement === iframeRef.current) iframeRef.current.blur();
                    window.focus();
                  }
                }, [isInteractive]);
                return React.createElement("div", { style: { position: "relative", width: "100%", height: "100%", boxSizing: "border-box", pointerEvents: "none" } },
                  React.createElement("button", {
                    onPointerDown: function(e) { e.preventDefault(); e.stopPropagation(); setIsInteractive(!isInteractive); },
                    style: { position: "absolute", top: "8px", right: "8px", zIndex: 50, padding: "6px 10px", background: isInteractive ? "#ef4444" : "#3b82f6", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", pointerEvents: "auto", opacity: 0.9 }
                  }, isInteractive ? "内嵌交互: 开" : "内嵌交互: 关"),
                  React.createElement("iframe", { ref: iframeRef, src: props.link, loading: "lazy", style: { width: "100%", height: "100%", border: "none", borderRadius: "8px", boxShadow: isInteractive ? "0 0 0 2px #3b82f6 inset" : "none", transition: "box-shadow 0.2s", pointerEvents: isInteractive ? "auto" : "none" } })
                );
              };
            }
            excalidrawProps.validateEmbeddable = function() { return true; };
            excalidrawProps.renderEmbeddable = function(node) { 
              if (node.link) { 
                if (window.self !== window.top) return React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f8f9fa", border: "2px dashed #d1d5db", borderRadius: "8px" } }, React.createElement("a", { href: node.link, target: "_top", style: { color: "#3b82f6", textDecoration: "none", fontWeight: "bold", pointerEvents: "auto" } }, "🔗 嵌套过多，点击查看"));
                return React.createElement(window.DgExcalidrawWrapper, { link: node.link, key: node.id });
              } 
              return null; 
            };
            return React.createElement(ExcalidrawLib.Excalidraw, excalidrawProps);
          })({`
        );

        if (contentAfterStageA !== contentAfterStageB) {
            console.log(`[DEBUG-TRANSFORM] 🛠️ 阶段 B (React注入) 执行成功！`);
        } else {
            console.log(`[DEBUG-TRANSFORM] ❌ 阶段 B 注入失败！未能匹配到 React.createElement 语句。`);
        }

        return contentAfterStageB;
      }
    }
    return content;
  });

exports.userMarkdownSetup = userMarkdownSetup;
exports.userEleventySetup = userEleventySetup;
