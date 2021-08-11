var proxy = require("express-http-proxy");
var express = require("express");
var app = express();
var cors = require("cors");

const PORT = process.env.PORT || 8083;
const DEBUG = process.env.DEBUG === "true" ? true : false;
const URL = "http://rpc.apothem.network";

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
  proxy(URL, {
    proxyReqBodyDecorator: (bodyContent, srcReq) => {
      if (
        ["eth_getTransactionCount", "eth_call"].includes(bodyContent.method) &&
        bodyContent.params[1] === "pending"
      ) {
        bodyContent.params[1] = "latest";
      }

      return JSON.stringify(bodyContent);
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      const resStr = proxyResData.toString("utf8");

      if (DEBUG) {
        console.log("req", userReq.body);
        console.log("res", resStr);
      }

      data = JSON.parse(resStr);

      return JSON.stringify(traverseObjRec(data));
    },
  })
);

app.listen(PORT, () => {
  console.log(
    `XinFin JSON-RPC Compatibility Proxy listening at http://localhost:${PORT}`
  );
});
