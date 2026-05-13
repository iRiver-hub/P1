(function () {
  const LANG_KEY = "river-lang";
  const DEFAULT_LANG = "en";
  
  const translations = {
    en: {
      "skip-link": "Skip to main content",
      "nav-gallery": "Gallery",
      "nav-customize": "Customize",
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
      "step-3-title": "Fine Tune",
      "step-3-desc": "Adjust corners, borders, shadows and other parameters for the perfect look.",
      "step-4-title": "Download & Order",
      "step-4-desc": "Download the preview and contact us to place your order. Your unique magnet is on the way!",
      "customizer-title": "Create Your Magnet",
      "customizer-intro": "Upload your photo, choose a style, and let AI transform it into a unique artistic masterpiece. Fine-tune until perfect, then download the preview and contact us to order.",
      "dropzone-text": "<strong>Click or drag image here</strong>",
      "dropzone-hint": "Supports JPG, PNG, WEBP, GIF",
      "status-no-image": "No image selected yet.",
      "appearance-legend": "Appearance",
      "radius-label": "Corner Radius",
      "frame-label": "White Border",
      "shadow-label": "Shadow Intensity",
      "gloss-label": "Glossy Finish (Preview)",
      "ai-legend": "🎨 AI Style Generation",
      "ai-desc": "After uploading, select a style and click \"AI Generate\" to transform your photo",
      "style-3d": "3D Cartoon",
      "style-clay": "Clay Art",
      "style-pixel": "Pixel Art",
      "style-anime": "Anime Style",
      "style-watercolor": "Watercolor",
      "style-oil": "Oil Painting",
      "btn-ai-generate": "✨ AI Generate Style",
      "btn-update-preview": "Update Preview",
      "btn-download": "Download Preview PNG",
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
      "contact-card-2-title": "Message",
      "contact-card-2-desc": "Send us your preview and requirements",
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
      "footer-text": "© <span data-year></span> River Magnets · Previews for display only"
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
      "step-3-title": "微调细节",
      "step-3-desc": "调节圆角、边框、阴影等参数，找到最满意的视觉效果。",
      "step-4-title": "下载下单",
      "step-4-desc": "下载预览图，联系客服确认下单，等待独一无二的冰箱贴送到家。",
      "customizer-title": "开始创作你的冰箱贴",
      "customizer-intro": "上传你的照片，选择喜欢的风格，让 AI 帮你转换成独特的艺术效果。调节细节直到满意，下载预览图联系我们下单。",
      "dropzone-text": "<strong>点击或拖放图片到此处</strong>",
      "dropzone-hint": "支持 JPG、PNG、WEBP、GIF",
      "status-no-image": "尚未选择图片。",
      "appearance-legend": "外观调节",
      "radius-label": "圆角",
      "frame-label": "白色边框",
      "shadow-label": "投影强度",
      "gloss-label": "高光釉面效果（示意图）",
      "ai-legend": "🎨 AI 风格生成",
      "ai-desc": "上传图片后，选择风格并点击\"AI 生成\"转换为不同效果的冰箱贴",
      "style-3d": "3D卡通",
      "style-clay": "粘土世界",
      "style-pixel": "像素游戏",
      "style-anime": "动漫风格",
      "style-watercolor": "水彩画",
      "style-oil": "油画风格",
      "btn-ai-generate": "✨ AI 生成风格冰箱贴",
      "btn-update-preview": "更新预览",
      "btn-download": "下载预览 PNG",
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
      "contact-card-2-title": "微信",
      "contact-card-2-desc": "添加客服微信：RiverMagnets",
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
      "footer-text": "© <span data-year></span> River 冰箱贴 · 预览图仅供展示"
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