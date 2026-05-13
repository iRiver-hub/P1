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
      var customizerSection = document.getElementById("customizer");
      if (!customizerSection) return;

      customizerSection.classList.remove("customizer--locked");
      var lockOverlay = customizerSection.querySelector(".customizer__lock");
      if (lockOverlay) {
        lockOverlay.style.display = "none";
      }
    };

    updateUserDisplay();
    updateCustomizerAccess();
  });
})();
