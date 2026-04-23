const fs = require('fs');
const path = require('path');

function userMarkdownSetup(md) {
  // 保持空，或按需添加自定义 Markdown 插件
}

function userEleventySetup(eleventyConfig) {

  // =========================================================================
  // 1. 全局缓存的文件搜索雷达 (引入大小写免疫机制，完美兼容 Cloudflare)
  // =========================================================================
  let fileMapCache = null;

  function resolveFilePath(fileName) {
    if (!fileMapCache) {
      fileMapCache = {};
      function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const list = fs.readdirSync(dir);
        list.forEach(file => {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
          } else {
            // 兼容各种操作系统的路径分割符
            let relativePath = fullPath.split('src/site/notes/')[1] || fullPath.split('src\\site\\notes\\')[1];
            if (!relativePath) return;
            
            const pathWithoutExt = relativePath.replace(/\.(md|canvas)$/, "");
            const baseName = path.basename(file, path.extname(file));
            
            // 核心：全部转为小写存入字典，彻底解决云端 Linux 大小写找不到文件的问题
            fileMapCache[file.toLowerCase()] = { fullPath, pathWithoutExt };
            fileMapCache[baseName.toLowerCase()] = { fullPath, pathWithoutExt };
          }
        });
      }
      walk("./src/site/notes/");
    }

    // 清洗传入的文件名：移除 HTML 标签、暴力移除所有中括号、移除反斜杠
    let cleanName = fileName.replace(/<[^>]+>/g, ""); 
    cleanName = cleanName.replace(/\[|\]/g, ""); // 暴力抹除所有 [ 和 ]
    cleanName = cleanName.replace(/\\/g, "").trim().split("#")[0];

    // 核心：全部转为小写进行搜索匹配
    const searchName = path.basename(cleanName).toLowerCase();
    
    return fileMapCache[searchName] || fileMapCache[`${searchName}.md`] || fileMapCache[`${searchName}.canvas`];
  }

  // =========================================================================
  // 2. 终极拦截器：一站式修复 JSON 崩溃 + 路径 404 + 注入 React 交互
  // =========================================================================
  eleventyConfig.addTransform("dg-excalidraw-ultimate", function(content, outputPath) {
    // 只处理 HTML 文件
    if (!outputPath || !outputPath.endsWith(".html")) return content;

    // 只有包含 Excalidraw 画板的网页才进行处理
    if (content.includes("ExcalidrawLib.Excalidraw")) {
      
      // 【阶段 A：暴力提取并修复链接】
      content = content.replace(/("link"\s*:\s*)"([^"]+)"/g, (match, prefix, rawVal) => {
        // 无情剥除 HTML 和所有括号
        let name = rawVal.replace(/<[^>]+>/g, "").replace(/\[|\]/g, "").replace(/\\/g, "").trim().split("#")[0];

        if (!name || name.startsWith("http") || name === "/404") return match;

        const resolved = resolveFilePath(name);
        if (resolved) {
          const slugger = eleventyConfig.getFilter("slugify") || eleventyConfig.getFilter("slug");
          const cleanUrl = `/notes/${slugger(resolved.pathWithoutExt)}/`;
          // 强制输出错误级日志，确保在 Cloudflare 日志中可见
          console.error(`[DG-EXCALIDRAW] ✅ 成功链接: ${name} -> ${cleanUrl}`);
          return `${prefix}"${cleanUrl}"`;
        }
        console.error(`[DG-EXCALIDRAW] ❌ 404 找不到文件: ${name}`);
        return match;
      });

      // 【阶段 B：注入完美交互体验的 React 组件】
      content = content.replace(
        /React\.createElement\(ExcalidrawLib\.Excalidraw,\s*\{/,
        `((excalidrawProps) => {
          if (!window.DgExWrapper) {
            window.DgExWrapper = function(props) {
              const [isActive, setIsActive] = React.useState(false);
              const iframeRef = React.useRef(null);

              React.useEffect(() => {
                if (isActive && iframeRef.current) iframeRef.current.focus();
                else if (!isActive && document.activeElement === iframeRef.current) iframeRef.current.blur();
              }, [isActive]);

              return React.createElement("div", {
                style: { position: "relative", width: "100%", height: "100%", boxSizing: "border-box", pointerEvents: "none" }
              },
                React.createElement("button", {
                  onPointerDown: e => { e.preventDefault(); e.stopPropagation(); setIsActive(!isActive); },
                  style: { position: "absolute", top: "8px", right: "8px", zIndex: 50, padding: "6px 10px", background: isActive ? "#ef4444" : "#3b82f6", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", pointerEvents: "auto", opacity: 0.9 }
                }, isActive ? "内嵌交互: 开" : "内嵌交互: 关"),

                React.createElement("iframe", {
                  ref: iframeRef, 
                  src: props.link,
                  loading: "lazy",
                  style: { width: "100%", height: "100%", border: "none", borderRadius: "8px", boxShadow: isActive ? "0 0 0 2px #3b82f6 inset" : "none", transition: "box-shadow 0.2s", pointerEvents: isActive ? "auto" : "none" }
                })
              );
            };
          }

          excalidrawProps.validateEmbeddable = () => true;
          excalidrawProps.renderEmbeddable = (node) => {
            if (node.link) {
              if (window.self !== window.top) return React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f8f9fa", border: "2px dashed #d1d5db", borderRadius: "8px" } }, React.createElement("a", { href: node.link, target: "_top", style: { color: "#3b82f6", textDecoration: "none", fontWeight: "bold", pointerEvents: "auto" } }, "🔗 嵌套过多，点击查看"));
              return React.createElement(window.DgExWrapper, { link: node.link, key: node.id });
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
