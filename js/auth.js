(function () {
  const API_BASE = "http://localhost:3000/api";
  const TOKEN_KEY = "river-magnet-token";
  const USER_KEY = "river-magnet-user";

  window.AuthService = {
    getToken: function () {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    },

    getUser: function () {
      try {
        var user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
      } catch {
        return null;
      }
    },

    setAuth: function (token, user) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {}
    },

    clearAuth: function () {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {}
    },

    isLoggedIn: function () {
      return !!this.getToken() && !!this.getUser();
    },

    register: function (username, email, password, callback) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/auth/register");
      xhr.setRequestHeader("Content-Type", "application/json");

      xhr.onload = function () {
        var data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          callback(false, "解析响应失败");
          return;
        }

        if (xhr.status === 201 || xhr.status === 200) {
          this.setAuth(data.token, data.user);
          callback(true, data.message || "注册成功", data.user);
        } else {
          callback(false, data.error || "注册失败");
        }
      }.bind(this);

      xhr.onerror = function () {
        callback(false, "网络错误，请检查服务器是否运行");
      };

      xhr.send(JSON.stringify({ username: username, email: email, password: password }));
    },

    login: function (username, password, callback) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/auth/login");
      xhr.setRequestHeader("Content-Type", "application/json");

      xhr.onload = function () {
        var data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          callback(false, "解析响应失败");
          return;
        }

        if (xhr.status === 200) {
          this.setAuth(data.token, data.user);
          callback(true, data.message || "登录成功", data.user);
        } else {
          callback(false, data.error || "登录失败");
        }
      }.bind(this);

      xhr.onerror = function () {
        callback(false, "网络错误，请检查服务器是否运行");
      };

      xhr.send(JSON.stringify({ username: username, password: password }));
    },

    logout: function () {
      this.clearAuth();
    },

    checkAuth: function (callback) {
      var token = this.getToken();
      if (!token) {
        callback(false);
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.open("GET", API_BASE + "/auth/me");
      xhr.setRequestHeader("Authorization", "Bearer " + token);

      xhr.onload = function () {
        if (xhr.status === 200) {
          var data = JSON.parse(xhr.responseText);
          callback(true, data.user);
        } else {
          this.clearAuth();
          callback(false);
        }
      }.bind(this);

      xhr.onerror = function () {
        callback(false);
      };

      xhr.send();
    }
  };

  window.addEventListener("DOMContentLoaded", function () {
    var authModal = document.querySelector("[data-auth-modal]");
    var loginTab = document.querySelector("[data-login-tab]");
    var registerTab = document.querySelector("[data-register-tab]");
    var loginForm = document.querySelector("[data-login-form]");
    var registerForm = document.querySelector("[data-register-form]");
    var authClose = document.querySelector("[data-auth-close]");
    var userDisplay = document.querySelector("[data-user-display]");
    var logoutBtn = document.querySelector("[data-logout-btn]");
    var authError = document.querySelector("[data-auth-error]");
    var authSuccess = document.querySelector("[data-auth-success]");
    var openLoginBtns = document.querySelectorAll("[data-open-login]");
    var openRegisterBtns = document.querySelectorAll("[data-open-register]");

    function showModal(tab) {
      if (authModal) {
        authModal.style.display = "flex";
        if (tab === "login") {
          if (loginTab) loginTab.classList.add("active");
          if (registerTab) registerTab.classList.remove("active");
          if (loginForm) loginForm.style.display = "flex";
          if (registerForm) registerForm.style.display = "none";
        } else {
          if (loginTab) loginTab.classList.remove("active");
          if (registerTab) registerTab.classList.add("active");
          if (loginForm) loginForm.style.display = "none";
          if (registerForm) registerForm.style.display = "flex";
        }
        if (authError) authError.textContent = "";
        if (authSuccess) authSuccess.textContent = "";
      }
    }

    function hideModal() {
      if (authModal) {
        authModal.style.display = "none";
      }
    }

    function updateUserDisplay() {
      var user = window.AuthService.getUser();
      var loggedIn = !!user;
      if (userDisplay) {
        if (loggedIn) {
          userDisplay.innerHTML = '<span class="user-greeting">欢迎，</span><span class="user-name">' + user.username + '</span>';
          userDisplay.style.display = "inline-flex";
        } else {
          userDisplay.innerHTML = "";
          userDisplay.style.display = "none";
        }
      }
      if (logoutBtn) {
        logoutBtn.style.display = loggedIn ? "inline-flex" : "none";
      }
      openLoginBtns.forEach(function(btn) {
        btn.style.display = loggedIn ? "none" : "inline-flex";
      });
      openRegisterBtns.forEach(function(btn) {
        btn.style.display = loggedIn ? "none" : "inline-flex";
      });
    }

    window.openAuthModal = function (tab) {
      showModal(tab || "login");
    };

    window.closeAuthModal = function () {
      hideModal();
    };

    loginTab?.addEventListener("click", function () {
      showModal("login");
    });

    registerTab?.addEventListener("click", function () {
      showModal("register");
    });

    authClose?.addEventListener("click", function () {
      hideModal();
    });

    authModal?.addEventListener("click", function (e) {
      if (e.target === authModal) {
        hideModal();
      }
    });

    document.querySelectorAll("[data-open-login]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        showModal("login");
      });
    });

    document.querySelectorAll("[data-open-register]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        showModal("register");
      });
    });

    loginForm?.addEventListener("submit", function (e) {
      e.preventDefault();
      var username = this.querySelector("[name='username']")?.value || "";
      var password = this.querySelector("[name='password']")?.value || "";

      if (!username || !password) {
        if (authError) authError.textContent = "请填写用户名和密码";
        return;
      }

      if (authError) authError.textContent = "";
      if (authSuccess) authSuccess.textContent = "登录中...";

      window.AuthService.login(username, password, function (success, message, user) {
        if (success) {
          if (authSuccess) authSuccess.textContent = "登录成功！";
          if (authError) authError.textContent = "";
          updateUserDisplay();
          setTimeout(function () {
            hideModal();
            updateCustomizerAccess();
          }, 500);
        } else {
          if (authError) authError.textContent = message;
          if (authSuccess) authSuccess.textContent = "";
        }
      });
    });

    registerForm?.addEventListener("submit", function (e) {
      e.preventDefault();
      var username = this.querySelector("[name='username']")?.value || "";
      var email = this.querySelector("[name='email']")?.value || "";
      var password = this.querySelector("[name='password']")?.value || "";
      var passwordConfirm = this.querySelector("[name='password-confirm']")?.value || "";

      if (!username || !email || !password || !passwordConfirm) {
        if (authError) authError.textContent = "请填写所有字段";
        return;
      }

      if (password !== passwordConfirm) {
        if (authError) authError.textContent = "两次密码输入不一致";
        return;
      }

      if (authError) authError.textContent = "";
      if (authSuccess) authSuccess.textContent = "注册中...";

      window.AuthService.register(username, email, password, function (success, message, user) {
        if (success) {
          if (authSuccess) authSuccess.textContent = "注册成功！";
          if (authError) authError.textContent = "";
          updateUserDisplay();
          setTimeout(function () {
            hideModal();
            updateCustomizerAccess();
          }, 500);
        } else {
          if (authError) authError.textContent = message;
          if (authSuccess) authSuccess.textContent = "";
        }
      });
    });

    logoutBtn?.addEventListener("click", function () {
      window.AuthService.logout();
      updateUserDisplay();
      updateCustomizerAccess();
    });

    window.updateCustomizerAccess = function () {
      var isLoggedIn = window.AuthService.isLoggedIn();
      var downloadBtn = document.querySelector("[data-download-btn]");

      // Download button requires login
      if (downloadBtn) {
        if (!isLoggedIn) {
          downloadBtn.disabled = true;
          downloadBtn.title = "Login required to download preview";
          downloadBtn.setAttribute("data-lang-key", "btn-login-to-download");
        } else {
          var hasImage = downloadBtn.getAttribute("data-has-image") === "true";
          downloadBtn.disabled = !hasImage;
          downloadBtn.title = "";
          downloadBtn.setAttribute("data-lang-key", "btn-download");
        }
      }

      // Apply language
      if (window.applyLang && typeof window.applyLang === "function") {
        var storedLang = localStorage.getItem("river-lang") || "en";
        if (window.applyLang) window.applyLang(storedLang);
      }
    };

    updateUserDisplay();
    updateCustomizerAccess();

    // Order form handler
    var orderForm = document.querySelector("[data-order-form]");
    var orderError = document.querySelector("[data-order-error]");
    var orderSuccess = document.querySelector("[data-order-success]");

    orderForm?.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!window.AuthService.isLoggedIn()) {
        if (orderError) {
          orderError.textContent = "Please login first to place an order";
          orderError.style.display = "block";
        }
        window.openAuthModal("login");
        return;
      }

      if (orderError) orderError.style.display = "none";
      if (orderSuccess) orderSuccess.style.display = "none";

      var formData = {
        quantity: parseInt(document.getElementById("order-quantity")?.value || "1"),
        size: document.getElementById("order-size")?.value || "Standard (8x10 cm)",
        shippingName: document.getElementById("order-name")?.value || "",
        email: document.getElementById("order-email")?.value || "",
        shippingAddress: document.getElementById("order-address")?.value || "",
        shippingCity: document.getElementById("order-city")?.value || "",
        shippingState: document.getElementById("order-state")?.value || "",
        shippingZip: document.getElementById("order-zip")?.value || "",
        shippingCountry: document.getElementById("order-country")?.value || "",
        notes: document.getElementById("order-notes")?.value || ""
      };

      if (!formData.shippingName || !formData.shippingAddress || !formData.shippingCity || !formData.shippingCountry) {
        if (orderError) {
          orderError.textContent = "Please fill in all required fields: Name, Address, City, and Country";
          orderError.style.display = "block";
        }
        return;
      }

      var submitBtn = orderForm.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Placing order...";
      }

      var xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/orders");
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Authorization", "Bearer " + window.AuthService.getToken());

      xhr.onload = function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Place Order — $9.99";
        }

        try {
          var data = JSON.parse(xhr.responseText);
        } catch (e) {
          if (orderError) {
            orderError.textContent = "Server error. Please try again later.";
            orderError.style.display = "block";
          }
          return;
        }

        if (xhr.status === 201 || xhr.status === 200) {
          if (orderSuccess) {
            orderSuccess.innerHTML = "<strong>" + (data.message || "Order placed successfully!") + "</strong><br>Order #" + data.order.id + " | Status: " + data.order.status + "<br>We will contact you at your email shortly.";
            orderSuccess.style.display = "block";
          }
          orderForm.reset();
        } else {
          if (orderError) {
            orderError.textContent = data.error || "Failed to place order. Please try again.";
            orderError.style.display = "block";
          }
        }
      };

      xhr.onerror = function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Place Order — $9.99";
        }
        if (orderError) {
          orderError.textContent = "Network error. Is the server running?";
          orderError.style.display = "block";
        }
      };

      xhr.send(JSON.stringify(formData));
    });

    // Contact form handler
    var contactForm = document.querySelector("[data-contact-form]");
    var contactError = document.querySelector("[data-contact-error]");
    var contactSuccess = document.querySelector("[data-contact-success]");

    contactForm?.addEventListener("submit", function (e) {
      e.preventDefault();

      if (contactError) contactError.style.display = "none";
      if (contactSuccess) contactSuccess.style.display = "none";

      var contactData = {
        name: document.getElementById("contact-name")?.value || "",
        email: document.getElementById("contact-email")?.value || "",
        subject: document.getElementById("contact-subject")?.value || "",
        message: document.getElementById("contact-message")?.value || ""
      };

      if (!contactData.name || !contactData.email || !contactData.message) {
        if (contactError) {
          contactError.textContent = "Please fill in name, email, and message";
          contactError.style.display = "block";
        }
        return;
      }

      var submitBtn = contactForm.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }

      var xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/contact");
      xhr.setRequestHeader("Content-Type", "application/json");

      xhr.onload = function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Message";
        }

        try {
          var data = JSON.parse(xhr.responseText);
        } catch (e) {
          if (contactError) {
            contactError.textContent = "Server error. Please try again.";
            contactError.style.display = "block";
          }
          return;
        }

        if (xhr.status === 201 || xhr.status === 200) {
          if (contactSuccess) {
            contactSuccess.textContent = data.message || "Message sent!";
            contactSuccess.style.display = "block";
          }
          contactForm.reset();
        } else {
          if (contactError) {
            contactError.textContent = data.error || "Failed to send message";
            contactError.style.display = "block";
          }
        }
      };

      xhr.onerror = function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Message";
        }
        if (contactError) {
          contactError.textContent = "Network error. Is the server running?";
          contactError.style.display = "block";
        }
      };

      xhr.send(JSON.stringify(contactData));
    });
  });
})();
