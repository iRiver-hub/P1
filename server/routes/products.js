const express = require("express");
const productStore = require("../services/productStore");

const router = express.Router();

router.get("/catalog", (req, res) => {
  res.json(productStore.getCatalogForClient());
});

router.get("/sizes", (req, res) => {
  res.json({ sizes: productStore.listProducts(true) });
});

module.exports = router;
