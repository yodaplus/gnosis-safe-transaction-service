const express = require("express");

const {
  createProxyMiddleware,
  responseInterceptor,
  fixRequestBody,
} = require("http-proxy-middleware");

const app = express();
const cors = require("cors");

const PORT = process.env.PORT || 8083;
const DEBUG = process.env.DEBUG === "true" ? true : false;
const URL = process.env.URL || "http://rpc.apothem.network";

app.use(express.json());
app.use(cors());

const traverseObjRec = (obj) => {
  const mapValue = (value) => {
    if (typeof value === "string" && /^xdc/.test(value)) {
      return value.replace(/^xdc/, "0x");
    }

    if (typeof value === "object") {
      return traverseObjRec(value);
    }

    return value;
  };

  if (obj instanceof Array) {
    return obj.map(mapValue);
  }

  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, mapValue(value)])
    );
  }

  return obj;
};

app.use(
  "/",
  createProxyMiddleware({
    target: URL,
    selfHandleResponse: true,
    secure: false,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      const bodyContent = req.body;

      if (
        ["eth_getTransactionCount", "eth_call"].includes(bodyContent.method) &&
        bodyContent.params[1] === "pending"
      ) {
        bodyContent.params[1] = "latest";
      }

      return fixRequestBody(proxyReq, req, res);
    },
    onProxyRes: responseInterceptor(
      async (responseBuffer, proxyRes, req, res) => {
        const resStr = responseBuffer.toString("utf8");

        res.setHeader("access-control-allow-origin", "*");

        if (DEBUG) {
          console.log("req", JSON.stringify(req.body));
          console.log("res", resStr);
        }

        let data;
        try {
          data = JSON.parse(resStr);
        } catch (e) {
          data = {};
        }

        return JSON.stringify(traverseObjRec(data));
      }
    ),
  })
);

app.listen(PORT, () => {
  console.log(
    `XinFin JSON-RPC Compatibility Proxy listening at http://localhost:${PORT}`
  );
});
