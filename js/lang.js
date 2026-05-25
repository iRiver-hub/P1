(function () {
  const LANG_KEY = "river-lang";
  const DEFAULT_LANG = "en";
  
  const translations = {
    en: {
      "skip-link": "Skip to main content",
      "nav-gallery": "Gallery",
      "nav-customize": "Customize",
      "nav-checkout": "Order",
      "nav-how-it-works": "How It Works",
      "nav-specs": "Specs",
      "nav-contact": "Contact",
      "btn-login": "Login",
      "btn-signup": "Sign Up",
      "btn-logout": "Logout",
      "theme-toggle": "Toggle light/dark theme",
      "hero-eyebrow": "Memories at Your Fingertips",
      "hero-title": "Turn Your\n<span class=\"hero__accent\">Photos into Art</span>",
      "hero-lead": "Every photo tells a story. Transform your precious memories into tangible 3D fridge magnets with AI magic. Let those warm moments come alive in your everyday life.",
      "hero-action-1": "Create Yours Now",
      "hero-action-2": "Our Story",
      "story-title": "Every Magnet Tells a Story",
      "story-p1": "In this fast-paced world, our lives are filled with countless photos, yet most of them lie forgotten in our phone galleries.",
      "story-p2": "<strong>River Magnets</strong> was born from a simple wish: <em>to make every precious moment visible, touchable, and cherished forever.</em>",
      "story-p3": "We believe a great photo is more than pixels - it carries laughter, tears, love, and memories. Through advanced AI technology and 3D printing, we transform these emotions into art you can hold in your hand.",
      "story-p4": "Whether it's your baby's first steps, your pet's adorable moments, a breathtaking sunset from your travels, or a sweet portrait with your loved one - every story deserves to be remembered.",
      "story-feature-1-title": "AI Artistic Styles",
      "story-feature-1-desc": "Choose from Van Gogh's Starry Night, Monet's Impressionism, Studio Ghibli's whimsical style... let AI breathe artistic life into your photos",
      "story-feature-2-title": "Unique Customization",
      "story-feature-2-desc": "Control every detail from corner radius to border design. Create a one-of-a-kind masterpiece that reflects your style",
      "story-feature-3-title": "Meaningful Gifts",
      "story-feature-3-desc": "Perfect gifts for parents, anniversary surprises for partners, and cherished keepsakes for growing children",
      "gallery-title": "Gallery",
      "gallery-intro": "Behind every magnet lies a heartfelt story. They are not just decorations, but carriers of emotion and testaments of love.",
      "gallery-item-1-title": "Family Moments",
      "gallery-item-1-desc": "Transform family portraits into warm kitchen decor. Every time you open the fridge, it's a happy memory.",
      "gallery-item-2-title": "Pet Love",
      "gallery-item-2-desc": "Capture your furry friend's cutest moments forever on your fridge. A daily dose of joy awaits.",
      "gallery-item-3-title": "Travel Memories",
      "gallery-item-3-desc": "Beautiful landscapes and delicious cuisines from your journeys. Let travel memories become the most special decoration in your home.",
      "gallery-item-4-title": "Artistic Styles",
      "gallery-item-4-desc": "Transform photos into watercolor, oil painting, clay and more artistic styles with AI. Create truly unique fridge magnets.",
      "how-title": "How It Works",
      "step-1-title": "Upload Photo",
      "step-1-desc": "Choose a meaningful photo. Supports JPG, PNG, WEBP and other common formats.",
      "step-2-title": "Choose Style",
      "step-2-desc": "Transform your photo with AI. Explore styles from 3D cartoon to watercolor painting.",
      "step-3-title": "AI Generate",
      "step-3-desc": "Choose a 3D style and shape. AI will transform your photo into a realistic fridge magnet on display.",
      "step-4-title": "Download & Order",
      "step-4-desc": "Download the preview and contact us to place your order. Your unique magnet is on the way!",
      "customizer-title": "Create Your Magnet",
      "customizer-intro": "Upload your photo, choose a style, and let AI transform it into a unique artistic masterpiece. Fine-tune until perfect, then download the preview and contact us to order.",
      "dropzone-text": "<strong>Click or drag image here</strong>",
      "dropzone-hint": "Supports JPG, PNG, WEBP, GIF",
      "status-no-image": "No image selected yet.",
      "ai-legend": "Choose Your Style",
      "ai-desc": "Select a 3D artistic style to transform your photo",
      "style-3d-cartoon": "Cute 3D Cartoon",
      "style-3d-cartoon-desc": "Playful & adorable",
      "style-ceramic": "Handcrafted Ceramic",
      "style-ceramic-desc": "Warm & textured",
      "style-resin": "Premium Resin Art",
      "style-resin-desc": "Glossy & refined",
      "style-pop-art": "Vibrant Pop Art",
      "style-pop-art-desc": "Bold & colorful",
      "shape-label": "Shape",
      "shape-square": "Square",
      "shape-round": "Round",
      "btn-ai-generate": "Generate My Magnet",
      "btn-download": "Download Preview PNG",
      "btn-login-to-download": "Login to Download",
      "preview-label": "Magnet preview",
      "preview-note": "Preview generated by browser (includes fridge metal background and magnet shadow). Final print may have color variations and cropping differences. Actual product takes precedence.",
      "specs-title": "Product Features",
      "specs-intro": "Every magnet is meticulously crafted to ensure vibrant colors, sharp details, and lasting durability.",
      "spec-card-1-title": "Premium Materials",
      "spec-card-1-desc": "Soft magnetic backing + high-definition printed surface. Smooth as glass, sticks securely and removes cleanly without residue.",
      "spec-card-2-title": "Vibrant Colors",
      "spec-card-2-desc": "Professional printing technology ensures vivid colors that resist fading. Your photos stay sharp and lively for years.",
      "spec-card-3-title": "Custom Shapes",
      "spec-card-3-desc": "Choose from classic rounded rectangles or create custom shapes. Make your magnet truly one-of-a-kind.",
      "contact-title": "Contact Us",
      "contact-intro": "Tell your story through photos and make every everyday moment special. Ready to create? Contact us and share your vision.",
      "contact-card-1-title": "Email",
      "contact-card-1-desc": "hello@rivermagnets.com",
      "contact-form-name-label": "Name *",
      "contact-form-email-label": "Email *",
      "contact-form-subject-label": "Subject",
      "contact-form-message-label": "Message *",
      "contact-form-message-placeholder": "How can we help you? Tell us about your vision...",
      "btn-send-message": "Send Message",
      "auth-tab-login": "Login",
      "auth-tab-signup": "Sign Up",
      "login-username-label": "Username or Email",
      "login-password-label": "Password",
      "btn-login-submit": "Login",
      "signup-username-label": "Username",
      "signup-email-label": "Email",
      "signup-password-label": "Password",
      "signup-confirm-label": "Confirm Password",
      "btn-signup-submit": "Sign Up",
      "footer-text": "© <span data-year></span> River Magnets · Previews for display only",
      "checkout-title": "Place Your Order",
      "checkout-intro": "Ready to bring your magnet to life? Fill in your shipping details and place your order.",
      "checkout-summary-title": "Order Summary",
      "checkout-product": "Custom Photo Magnet",
      "order-quantity-label": "Quantity *",
      "order-size-label": "Size",
      "order-size-standard": "Standard (8x10 cm)",
      "order-size-large": "Large (12x15 cm)",
      "order-size-mini": "Mini (5x6 cm)",
      "order-name-label": "Full Name *",
      "order-email-label": "Email",
      "order-address-label": "Address *",
      "order-city-label": "City *",
      "order-state-label": "State / Province",
      "order-zip-label": "ZIP / Postal Code",
      "order-country-label": "Country *",
      "order-notes-label": "Special Notes",
      "order-notes-placeholder": "Any special requirements or notes for your order...",
      "btn-place-order": "Place Order — $9.99",
      "checkout-note": "By placing your order, you agree to our Terms of Service. We will contact you via email with payment and shipping details.",
      "cookie-text": "We use cookies to enhance your experience. By continuing, you agree to our use of cookies.",
      "cookie-accept": "Accept",
      "privacy-link": "Privacy Policy"
    },
    zh: {
      "skip-link": "跳到主要内容",
      "nav-gallery": "案例",
      "nav-customize": "在线定制",
      "nav-how-it-works": "如何定制",
      "nav-specs": "规格说明",
      "nav-contact": "联系",
      "btn-login": "登录",
      "btn-signup": "注册",
      "btn-logout": "退出",
      "theme-toggle": "切换浅色/深色主题",
      "hero-eyebrow": "让回忆触手可及",
      "hero-title": "把爱\n<span class=\"hero__accent\">贴在心上</span>",
      "hero-lead": "一张照片，一个故事。我们用AI魔法将你最珍贵的瞬间变成触手可及的立体冰箱贴，让那些温暖的回忆不再沉睡在相册里，而是每天陪伴在你的生活中。",
      "hero-action-1": "创造专属回忆",
      "hero-action-2": "了解我们的故事",
      "story-title": "每一个冰箱贴，都是爱的形状",
      "story-p1": "在这个快节奏的时代，我们的生活被无数照片填满，但它们大多沉睡在手机相册里，渐渐被遗忘。",
      "story-p2": "<strong>River 冰箱贴</strong> 诞生于这样一个简单的愿望：<em>让每一个珍贵瞬间，都能被看见、被触摸、被珍藏。</em>",
      "story-p3": "我们相信，一张好照片不仅仅是像素的组合，它承载着欢笑、泪水、爱与思念。通过先进的AI技术和3D打印工艺，我们将这些情感凝固成可以握在手心的艺术品。",
      "story-p4": "无论是宝宝第一次蹒跚学步的模样、毛孩子撒娇的可爱瞬间、旅行途中的落日余晖，还是与爱人的甜蜜合照——每一个故事都值得被铭记。",
      "story-feature-1-title": "AI艺术升华",
      "story-feature-1-desc": "选择梵高的星空、莫奈的印象派、宫崎骏的童话风格...让AI为你的照片赋予艺术生命",
      "story-feature-2-title": "独一无二定制",
      "story-feature-2-desc": "从圆角弧度到边框细节，每一个参数都由你掌控，打造专属于你的艺术品",
      "story-feature-3-title": "情感传递礼物",
      "story-feature-3-desc": "送给父母的暖心礼物、送给爱人的纪念日惊喜、送给孩子的成长记录",
      "gallery-title": "爱的纪念册",
      "gallery-intro": "每一个冰箱贴背后，都藏着一个动人的故事。它们不只是装饰品，更是情感的载体，是爱的见证。",
      "gallery-item-1-title": "家庭合影",
      "gallery-item-1-desc": "把全家福或亲子照变成温馨的厨房角落，每次开冰箱都是一次幸福回忆。",
      "gallery-item-2-title": "萌宠时刻",
      "gallery-item-2-desc": "猫咪狗狗的可爱瞬间，永远定格在冰箱上，治愈每一次疲惫的下班时光。",
      "gallery-item-3-title": "旅行记忆",
      "gallery-item-3-desc": "去过的美丽风景、吃过的地道美食，让旅途的回忆成为家中最特别的装饰。",
      "gallery-item-4-title": "艺术风格",
      "gallery-item-4-desc": "通过AI技术，将照片转换成水彩、油画、粘土等艺术风格，打造别具一格的冰箱贴。",
      "how-title": "如何定制",
      "step-1-title": "上传照片",
      "step-1-desc": "选择一张有意义的照片，支持 JPG、PNG、WEBP 等常见格式。",
      "step-2-title": "选择风格",
      "step-2-desc": "使用 AI 一键转换照片风格，从3D卡通到水彩画，多种创意玩法等你探索。",
      "step-3-title": "AI 生成",
      "step-3-desc": "选择3D风格和形状，AI将把你的照片转换成展示在冰箱上的逼真冰箱贴效果。",
      "step-4-title": "下载下单",
      "step-4-desc": "下载预览图，联系客服确认下单，等待独一无二的冰箱贴送到家。",
      "customizer-title": "开始创作你的冰箱贴",
      "customizer-intro": "上传你的照片，选择喜欢的风格，让 AI 帮你转换成独特的艺术效果。调节细节直到满意，下载预览图联系我们下单。",
      "dropzone-text": "<strong>点击或拖放图片到此处</strong>",
      "dropzone-hint": "支持 JPG、PNG、WEBP、GIF",
      "status-no-image": "尚未选择图片。",
      "ai-legend": "选择你的风格",
      "ai-desc": "选择一种3D艺术风格来转换你的照片",
      "style-3d-cartoon": "可爱3D卡通",
      "style-3d-cartoon-desc": "俏皮可爱",
      "style-ceramic": "手工陶瓷质感",
      "style-ceramic-desc": "温暖纹理",
      "style-resin": "高级树脂艺术",
      "style-resin-desc": "光泽精致",
      "style-pop-art": "活力波普艺术",
      "style-pop-art-desc": "大胆多彩",
      "shape-label": "形状",
      "shape-square": "方形",
      "shape-round": "圆形",
      "btn-ai-generate": "生成我的冰箱贴",
      "btn-download": "下载预览 PNG",
      "btn-login-to-download": "登录后下载",
      "preview-label": "冰箱贴效果图预览",
      "preview-note": "预览为浏览器生成的示意图（含冰箱金属背景与磁铁投影），印刷成品可能存在色差与裁切差异，以实物为准。",
      "specs-title": "产品特点",
      "specs-intro": "每一枚冰箱贴都经过精心制作，确保色彩饱满、细节清晰、经久耐用。",
      "spec-card-1-title": "优质材质",
      "spec-card-1-desc": "软磁背部 + 高清印刷面层，表面光滑如镜面，轻轻一贴就能牢牢吸附，取下也不留痕迹。",
      "spec-card-2-title": "持久色彩",
      "spec-card-2-desc": "采用专业印刷技术，色彩鲜艳不易褪色。即使长时间使用，依然能保持照片的清晰与生动。",
      "spec-card-3-title": "个性定制",
      "spec-card-3-desc": "支持各种尺寸和形状，从经典圆角矩形到创意异形，让你的冰箱贴与众不同。",
      "contact-title": "联系我们",
      "contact-intro": "有任何问题或定制需求？欢迎随时联系我们，我们很乐意为您服务。",
      "contact-card-1-title": "邮箱",
      "contact-card-1-desc": "hello@rivermagnets.com",
      "contact-form-name-label": "姓名 *",
      "contact-form-email-label": "邮箱 *",
      "contact-form-subject-label": "主题",
      "contact-form-message-label": "留言 *",
      "contact-form-message-placeholder": "有什么可以帮你的？告诉我们你的想法...",
      "btn-send-message": "发送消息",
      "auth-tab-login": "登录",
      "auth-tab-signup": "注册",
      "login-username-label": "用户名或邮箱",
      "login-password-label": "密码",
      "btn-login-submit": "登录",
      "signup-username-label": "用户名",
      "signup-email-label": "邮箱",
      "signup-password-label": "密码",
      "signup-confirm-label": "确认密码",
      "btn-signup-submit": "注册",
      "footer-text": "© <span data-year></span> River 冰箱贴 · 预览图仅供展示",
      "nav-checkout": "下单",
      "checkout-title": "提交订单",
      "checkout-intro": "准备将你的冰箱贴变成现实？填写收货信息并提交订单。",
      "checkout-summary-title": "订单摘要",
      "checkout-product": "定制照片冰箱贴",
      "order-quantity-label": "数量 *",
      "order-size-label": "尺寸",
      "order-size-standard": "标准 (8x10 cm)",
      "order-size-large": "大号 (12x15 cm)",
      "order-size-mini": "迷你 (5x6 cm)",
      "order-name-label": "收货人姓名 *",
      "order-email-label": "邮箱",
      "order-address-label": "收货地址 *",
      "order-city-label": "城市 *",
      "order-state-label": "省份/州",
      "order-zip-label": "邮政编码",
      "order-country-label": "国家 *",
      "order-notes-label": "特殊要求",
      "order-notes-placeholder": "如有任何特殊要求或备注，请在此说明...",
      "btn-place-order": "提交订单 — $9.99",
      "checkout-note": "提交订单即表示你同意我们的服务条款。我们将通过邮件联系你确认付款和发货详情。",
      "cookie-text": "我们使用Cookie来提升你的浏览体验。继续使用即表示你同意我们使用Cookie。",
      "cookie-accept": "接受",
      "privacy-link": "隐私政策"
    }
  };

  function getStoredLang() {
    try {
      return localStorage.getItem(LANG_KEY);
    } catch {
      return null;
    }
  }

  function setStoredLang(value) {
    try {
      localStorage.setItem(LANG_KEY, value);
    } catch {
      /* ignore */
    }
  }

  function applyLang(lang) {
    const langData = translations[lang] || translations[DEFAULT_LANG];
    
    document.querySelectorAll("[data-lang-key]").forEach(el => {
      const key = el.getAttribute("data-lang-key");
      if (langData[key]) {
        el.innerHTML = langData[key];
      }
    });

    document.querySelectorAll("[data-lang-attr]").forEach(el => {
      const parts = el.getAttribute("data-lang-attr").split("|");
      const attr = parts[0];
      const key = parts[1];
      if (langData[key]) {
        el.setAttribute(attr, langData[key]);
      }
    });

    document.documentElement.lang = lang;
    setStoredLang(lang);

    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.classList.toggle("lang-btn--active", btn.getAttribute("data-lang") === lang);
    });
  }

  const storedLang = getStoredLang();
  applyLang(storedLang || DEFAULT_LANG);

  document.querySelectorAll("[data-lang]").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      applyLang(lang);
    });
  });
})();