const fs = require('fs');
const path = require('path');

function userMarkdownSetup(md) {
  // 保持空，或按需添加
}

function userEleventySetup(eleventyConfig) {

  // =========================================================================
  // 1. 全局缓存的文件搜索雷达 (只在构建时初始化一次，极速查找文件真实路径)
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
            // 兼容 Mac/Linux 和 Windows 的路径分隔符
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
    // 清洗可能残留的脏字符
    let cleanName = fileName.replace(/["\\]/g, "").split("#")[0];
    const searchName = path.basename(cleanName);
    return fileMapCache[searchName] || fileMapCache[`${searchName}.md`] || fileMapCache[`${searchName}.canvas`];
  }


  // =========================================================================
  // 2. 终极拦截器：一站式修复 JSON崩溃 + 路径404 + 注入React交互
  // =========================================================================
  eleventyConfig.addTransform("excalidraw-ultimate-fixer", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html") && content.includes("ExcalidrawLib.Excalidraw")) {
      
      // 【修复阶段 A：拨乱反正，拯救被官方代码破坏的 JSON 和 404】
      // 兼容 JSON 里的各种奇葩状态："<a href=...>[[文件名]]</a>" 或 "[[文件名]]" 或 "[文件名]]" 或带转义的乱码
      let fixedContent = content.replace(
        /("link"\s*:\s*)"((?:\\"|[^"])*)"/g,
        function(match, prefix, rawLink) {
          // 1. 暴力清洗，提取最纯净的笔记名称
          let cleanName = rawLink.replace(/<[^>]+>/g, ""); // 第一步：无情剥离所有 HTML 标签 (例如 <a>...</a>)
          cleanName = cleanName.replace(/^\[+(.*?)\]+$/, "$1"); // 第二步：智能剥离首尾的中括号 [ 和 ]（无论一边有几个，统统剥掉！）
          cleanName = cleanName.replace(/\\/g, "").trim(); // 第三步：剥除转义用的反斜杠和多余空格
          cleanName = cleanName.split("#")[0]; // 第四步：去掉可能的 # 锚点

          // 如果提取出来是空的，或者原本就是合法的外部链接 (http)，保持原样
          if (!cleanName || cleanName.startsWith("http") || cleanName === "/404") {
            return match;
          }

          // 2. 将纯净的名字扔进雷达搜索
          const resolved = resolveFilePath(cleanName);
          if (resolved) {
            // 动态调用官方的 slugify，确保生成的 URL 和全站标准完全一致
            const slugify = eleventyConfig.getFilter("slugify") || eleventyConfig.getFilter("slug");
            const cleanUrl = `/notes/${slugify(resolved.pathWithoutExt)}/`;
            return `${prefix}"${cleanUrl}"`; // 返回纯净、正确的 URL 属性
          }
          
          return match; // 如果系统里真没这个文件，就不动它
        }
      );

      // 【修复阶段 B：注入完美交互体验的 React 组件】
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
