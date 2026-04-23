const fs = require('fs');
const path = require('path');

function userMarkdownSetup(md) {
  // 保持空
}

function userEleventySetup(eleventyConfig) {

  // =========================================================================
  // 1. 全局缓存的文件搜索雷达：负责精准找回带 folder 的正确地址
  // =========================================================================
  let fileMapCache = null;
  function getResolvedUrl(fileName) {
    if (!fileMapCache) {
      fileMapCache = {};
      function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
          } else {
            // 获取相对于 notes 文件夹的路径 (兼容 Mac 和 Windows)
            const relative = fullPath.split(/src[\\\/]site[\\\/]notes[\\\/]/)[1];
            if (!relativePath) continue;
            
            const withoutExt = relative.replace(/\.(md|canvas)$/, '');
            
            // 使用 Eleventy 官方的 slug 转换，确保路径格式 (如大小写、空格) 与全站一致
            const slugFilter = eleventyConfig.getFilter("slugify") || eleventyConfig.getFilter("slug");
            const segments = withoutExt.split(/[\\\/]/).map(s => slugFilter ? slugFilter(s) : encodeURIComponent(s));
            const finalUrl = `/notes/${segments.join('/')}/`;

            const baseName = path.basename(file, path.extname(file));

            // 转为小写存入，免疫大小写引起的 404
            fileMapCache[baseName.toLowerCase()] = finalUrl;
            fileMapCache[file.toLowerCase()] = finalUrl;
          }
        }
      }
      walk("./src/site/notes/");
    }

    // 终极清洗：不管它是 [1234test]] 还是 [[1234test，一律暴力剔除所有括号、HTML标签和特殊符号
    let cleanName = fileName.replace(/<[^>]*>/g, '').replace(/[\[\]"\\]/g, '').split('#')[0].trim().toLowerCase();
    return fileMapCache[cleanName];
  }


  // =========================================================================
  // 2. 终极转换器：独立完成 JSON 链接修复 与 React 交互组件注入
  // =========================================================================
  eleventyConfig.addTransform("excalidraw-unified-fixer", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html") || !content.includes("ExcalidrawLib.Excalidraw")) {
      return content;
    }

    // 【第一部分：修复跳转地址】
    // 专门精准定位 JSON 里的 "link":"..."，哪怕里面残留了奇怪的括号
    content = content.replace(/("link"\s*:\s*)"([^"]+)"/g, (match, prefix, rawLink) => {
      // 如果原本就是外链或 404，不作处理
      if (!rawLink || rawLink.startsWith('http') || rawLink.startsWith('/') || rawLink === 'null') {
        return match;
      }

      // 送入雷达寻找真实地址 (比如会返回 /notes/vault/1234testlink1234/)
      const resolvedUrl = getResolvedUrl(rawLink);
      if (resolvedUrl) {
        return `${prefix}"${resolvedUrl}"`; 
      }
      return match; 
    });


    // 【第二部分：注入你测试通过的完美交互组件】
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
                onPointerDown: function(e) { e.preventDefault(); e.stopPropagation(); setIsActive(!isActive); },
                style: { position: "absolute", top: "8px", right: "8px", zIndex: 50, padding: "6px 10px", background: isActive ? "#ef4444" : "#3b82f6", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", pointerEvents: "auto", opacity: 0.9 }
              }, isActive ? "内嵌交互: 开" : "内嵌交互: 关"),
              
              React.createElement("iframe", {
                ref: iframeRef, src: props.link, loading: "lazy",
                style: { width: "100%", height: "100%", border: "none", borderRadius: "8px", boxShadow: isActive ? "0 0 0 2px #3b82f6 inset" : "none", transition: "box-shadow 0.2s", pointerEvents: isActive ? "auto" : "none" }
              })
            );
          };
        }

        excalidrawProps.validateEmbeddable = function() { return true; };
        excalidrawProps.renderEmbeddable = function(node) {
          if (node.link) {
            if (window.self !== window.top) return React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f8f9fa", border: "2px dashed #d1d5db", borderRadius: "8px" } }, React.createElement("a", { href: node.link, target: "_top", style: { color: "#3b82f6", textDecoration: "none", fontWeight: "bold", pointerEvents: "auto" } }, "🔗 嵌套过多，点击查看"));
            return React.createElement(window.DgExWrapper, { link: node.link, key: node.id });
          }
          return null;
        };
        return React.createElement(ExcalidrawLib.Excalidraw, excalidrawProps);
      })({`
    );

    return content;
  });
}

exports.userMarkdownSetup = userMarkdownSetup;
exports.userEleventySetup = userEleventySetup;
