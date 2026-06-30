/**
 * Scaled fridge layouts: french-door (对开门) & side-by-side (双开门).
 */
(function () {
  var W = 880;
  var H = 720;
  var VISUAL_FRIDGE_H = 548;

  var state = { sizeId: "standard", fridgeType: "french-door" };

  function buildLayout(sizeId, fridgeType) {
    var size = window.ProductCatalog ? window.ProductCatalog.getSize(sizeId) : { widthCm: 8, heightCm: 10 };
    var ftype = window.ProductCatalog ? window.ProductCatalog.getFridgeType(fridgeType) : { widthCm: 91, heightCm: 178 };
    var pxPerCm = VISUAL_FRIDGE_H / ftype.heightCm;
    var fridgeW = Math.round(ftype.widthCm * pxPerCm);
    var fridgeH = VISUAL_FRIDGE_H;
    var fridgeX = Math.round((W - fridgeW) / 2);
    var fridgeY = 56;
    var magnetW = Math.round(size.widthCm * pxPerCm);
    var magnetH = Math.round(size.heightCm * pxPerCm);

    var layout = {
      W: W, H: H, pxPerCm: pxPerCm, type: fridgeType,
      sizeId: sizeId,
      REAL: {
        fridgeWidthCm: ftype.widthCm,
        fridgeHeightCm: ftype.heightCm,
        magnetWidthCm: size.widthCm,
        magnetHeightCm: size.heightCm,
        magnetThickness3dCm: 0.8
      },
      FRIDGE: { x: fridgeX, y: fridgeY, w: fridgeW, h: fridgeH },
      counterY: H - 12,
      doorGapY: null,
      centerGapX: null,
      MAGNET: null,
      handle: {}
    };

    if (fridgeType === "side-by-side") {
      layout.centerGapX = fridgeX + Math.round(fridgeW / 2);
      layout.doorGapY = null;
      var rightInnerX = layout.centerGapX + Math.round(fridgeW * 0.06);
      var rightInnerW = fridgeX + fridgeW - rightInnerX - Math.round(fridgeW * 0.06);
      layout.MAGNET = {
        x: rightInnerX + Math.round((rightInnerW - magnetW) / 2),
        y: fridgeY + Math.round(fridgeH * 0.12),
        w: magnetW,
        h: magnetH
      };
      layout.handle = {
        left: { x: fridgeX + Math.round(fridgeW * 0.06), y: fridgeY + Math.round(fridgeH * 0.38), w: 7, h: Math.round(fridgeH * 0.2), r: 3 },
        right: { x: fridgeX + fridgeW - Math.round(fridgeW * 0.06) - 7, y: fridgeY + Math.round(fridgeH * 0.38), w: 7, h: Math.round(fridgeH * 0.2), r: 3 }
      };
    } else {
      layout.centerGapX = fridgeX + Math.round(fridgeW / 2);
      layout.doorGapY = fridgeY + Math.round(fridgeH * 0.72);
      var rInnerX = layout.centerGapX + Math.round(fridgeW * 0.08);
      var rInnerW = fridgeX + fridgeW - rInnerX - Math.round(fridgeW * 0.08);
      layout.MAGNET = {
        x: rInnerX + Math.round((rInnerW - magnetW) / 2),
        y: fridgeY + Math.round(fridgeH * 0.14),
        w: magnetW,
        h: magnetH
      };
      layout.handle = {
        left: { x: fridgeX + Math.round(fridgeW * 0.07), y: fridgeY + 88, w: 7, h: Math.round(fridgeH * 0.34), r: 3 },
        right: { x: fridgeX + fridgeW - Math.round(fridgeW * 0.07) - 7, y: fridgeY + 88, w: 7, h: Math.round(fridgeH * 0.34), r: 3 },
        freezer: { x: fridgeX + Math.round(fridgeW * 0.22), y: layout.doorGapY + 28, w: Math.round(fridgeW * 0.56), h: 6, r: 3 }
      };
    }

    layout.getFridgeLabel = function () {
      return "≈ " + layout.REAL.fridgeWidthCm + " × " + layout.REAL.fridgeHeightCm + " cm";
    };
    layout.getMagnetLabel = function () {
      return "≈ " + layout.REAL.magnetWidthCm + " × " + layout.REAL.magnetHeightCm + " cm";
    };
    layout.getScaleBarCm = function () { return 10; };
    layout.getScaleBarPx = function () { return Math.round(10 * layout.pxPerCm); };

    return layout;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawFridgeBackground(ctx, layout) {
    var g = ctx;
    var fx = layout.FRIDGE.x, fy = layout.FRIDGE.y, fw = layout.FRIDGE.w, fh = layout.FRIDGE.h;
    var fr = 10;

    var bgGrad = g.createLinearGradient(0, 0, 0, layout.H);
    bgGrad.addColorStop(0, "#ebe6df"); bgGrad.addColorStop(1, "#ddd8d0");
    g.fillStyle = bgGrad; g.fillRect(0, 0, layout.W, layout.H);
    g.fillStyle = "#cfc9c0"; g.fillRect(0, layout.counterY, layout.W, 16);
    g.fillStyle = "rgba(0,0,0,0.04)"; g.fillRect(fx - 12, fy + fh, fw + 24, 8);

    g.save();
    roundRect(g, fx + fr, fy, fw - fr * 2, fh, fr);
    var ssGrad = g.createLinearGradient(fx, 0, fx + fw, 0);
    ssGrad.addColorStop(0, "#b8bcc0"); ssGrad.addColorStop(0.5, "#dce0e4"); ssGrad.addColorStop(1, "#b0b4b8");
    g.fillStyle = ssGrad; g.fill();
    g.clip();
    for (var i = fy; i < fy + fh; i += 6) {
      g.strokeStyle = "rgba(255,255,255,0.07)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(fx, i); g.lineTo(fx + fw, i); g.stroke();
    }
    g.restore();

    g.fillStyle = "#1e1e22";
    if (layout.type === "side-by-side") {
      g.fillRect(layout.centerGapX - 2, fy + 4, 4, fh - 8);
    } else {
      g.fillRect(layout.centerGapX - 2, fy + 4, 4, layout.doorGapY - fy - 4);
      g.fillRect(fx + 4, layout.doorGapY - 2, fw - 8, 3);
    }

    g.fillStyle = "#d8dce0";
    g.shadowColor = "rgba(0,0,0,0.12)"; g.shadowBlur = 3; g.shadowOffsetX = 1;
    var hl = layout.handle;
    if (hl.left) { roundRect(g, hl.left.x, hl.left.y, hl.left.w, hl.left.h, hl.left.r || 3); g.fill(); }
    if (hl.right) { roundRect(g, hl.right.x, hl.right.y, hl.right.w, hl.right.h, hl.right.r || 3); g.fill(); }
    g.shadowColor = "transparent"; g.shadowBlur = 0;
    if (hl.freezer) { roundRect(g, hl.freezer.x, hl.freezer.y, hl.freezer.w, hl.freezer.h, hl.freezer.r || 3); g.fill(); }
  }

  function getScene() {
    return buildLayout(state.sizeId, state.fridgeType);
  }

  window.FridgeScene = {
    configure: function (opts) {
      if (opts.sizeId) state.sizeId = opts.sizeId;
      if (opts.fridgeType) state.fridgeType = opts.fridgeType;
      window.FRIDGE_SCENE = getScene();
      return window.FRIDGE_SCENE;
    },
    getState: function () { return { sizeId: state.sizeId, fridgeType: state.fridgeType }; },
    getScene: getScene,
    drawFridgeBackground: drawFridgeBackground,
    rebuild: function () {
      window.FRIDGE_SCENE = getScene();
      return window.FRIDGE_SCENE;
    }
  };

  window.FRIDGE_SCENE = getScene();
})();
