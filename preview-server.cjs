const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "dist", "client");
const port = 8080;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const safePath = path
      .normalize(urlPath)
      .replace(/^(\.\.[/\\])+/, "")
      .replace(/^[/\\]/, "");
    const requested = path.join(root, safePath || "index.html");
    const filePath =
      fs.existsSync(requested) && fs.statSync(requested).isFile()
        ? requested
        : path.join(root, "index.html");

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(500);
        res.end("Preview server error");
        return;
      }

      res.writeHead(200, {
        "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      });
      res.end(data);
    });
  })
  .listen(port, "127.0.0.1");
