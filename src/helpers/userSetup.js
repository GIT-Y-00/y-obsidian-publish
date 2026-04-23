const fs = require('fs');
const path = require('path');

function userMarkdownSetup(md) {
  // 保持空，或按需添加
}

function userEleventySetup(eleventyConfig) {

  // =========================================================================
  // 1. 全局缓存的文件搜索雷达
  // =========================================================================
  let fileMapCache = null;
  function resolveFilePath(fileName) {
    if (!fileMapCache) {
      fileMapCache = {};
      function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const list = fs.readdirSync(dir);
        list.forEach(function(file) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            walk(fullPath); 
          } else {
            const relativePath = fullPath.split('src/site/notes/')[1] || fullPath.split('src\\site\\notes\\')[1];
            if (!relativePath) return;
            const pathWithoutExt = relativePath.replace(/\.(md|canvas)$/, "");
            const data = { fullPath, pathWithoutExt };
            fileMapCache[file] = data; 
            const baseName = path.basename(file, path.extname(file));
            fileMapCache[baseName] = data; 
          }
        });
      }
      walk("./src/site/notes/");
    }
    let cleanName = fileName.replace(/["\\]/g, "").split("#")[0];
    const searchName = path.basename(cleanName);
    return fileMapCache[searchName] || fileMapCache[`${searchName}.md`] || fileMapCache[`${searchName}.canvas`];
  }

  // =========================================================================
  // 2. 终极拦截器：一站式修复 JSON崩溃 + 路径404 + 注入React交互
  // =========================================================================
  eleventyConfig.addTransform("excalidraw-ultimate-fixer", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html") && content.includes("ExcalidrawLib.Excalidraw")) {
      
      // 【修复阶段 A：精确解析 JSON 字符串，暴力清除括号，映射真实路径】
      // 这里使用了 (?:[^"\\]|\\.)* 来完美兼容带有转义符 \" 的复杂 JSON 字符串，绝不会再破坏语法
      let fixedContent = content.replace(
        /("link"\s*:\s*)"((?:[^"\\]|\\.)*)"/g,
        function(match, prefix, rawValue) {
          // 只对包含 <a> 标签 或 中括号 的字符串进行修复
          if (rawValue.includes("<a ") || rawValue.includes("[")) {
            // 1. 无情剥离所有 HTML 标签
            let cleanName = rawValue.replace(/<[^>]+>/g, "");
            // 2. 暴力剥离所有的 [ 和 ]（完美解决 [1234testlink1234]] 问题）
            cleanName = cleanName.replace(/\[|\]/g, "");
            // 3. 剥除转义反斜杠，去掉锚点，拿到最纯净的文件名
            cleanName = cleanName.replace(/\\/g, "").trim().split("#")[0];

            const resolved = resolveFilePath(cleanName);
            if (resolved) {
              const slugify = eleventyConfig.getFilter("slugify") || eleventyConfig.getFilter("slug");
              const cleanUrl = `/notes/${slugify(resolved.pathWithoutExt)}/`;
              return `${prefix}"${cleanUrl}"`;
            }
            // 如果真的找不到，返回纯净的 /404 字符串，保护 JSON 结构不崩溃
            return `${prefix}"/404"`;
          }
          // 如果是普通的 URL (http://) 或 null，原样返回，不破坏数据
          return match;
        }
      );

      // 【修复阶段 B：注入完美交互体验的 React 组件 (完全沿用你的黄金版本)】
      fixedContent = fixedContent.replace(
        /React\.createElement\(ExcalidrawLib\.Excalidraw,\s*\{/,
        `((excalidrawProps) => {
          if (!window.DgExcalidrawWrapper) {
            window.DgExcalidrawWrapper = function(props) {
              const [isInteractive, setIsInteractive] = React.useState(false);
              const iframeRef = React.useRef(null);

              React.useEffect(() => {
                if (isInteractive && iframeRef.current) {
                  iframeRef.current.focus();
                } else if (!isInteractive) {
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
                    e.preventDefault(); 
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
                }, isInteractive ? "内嵌交互: 开" : "内嵌交互: 关"),

                React.createElement("iframe", {
                  ref: iframeRef, 
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

      return fixedContent;
    }
    return content;
  });
}

exports.userMarkdownSetup = userMarkdownSetup;
exports.userEleventySetup = userEleventySetup;
