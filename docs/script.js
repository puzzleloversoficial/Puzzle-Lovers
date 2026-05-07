const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const siteNav = document.querySelector(".site-nav");
  const navToggle = document.getElementById("nav-toggle");
  const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
  const internalLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
  const progressBar = document.getElementById("scroll-progress");
  const faqItems = Array.from(document.querySelectorAll(".faq-item"));
  const revealItems = Array.from(document.querySelectorAll(".reveal"));
  const yearNode = document.getElementById("current-year");
  const heroLogo = document.getElementById("hero-logo");
  const heroLogoWrap = document.getElementById("hero-logo-wrap");

  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }

  const setNavHeight = () => {
    const navHeight = header ? header.offsetHeight : 92;
    document.documentElement.style.setProperty("--nav-height", `${navHeight}px`);
  };

  const closeMenu = () => {
    if (!siteNav || !navToggle) {
      return;
    }

    siteNav.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Abrir menú");
    document.body.classList.remove("nav-open");
  };

  const toggleMenu = () => {
    if (!siteNav || !navToggle) {
      return;
    }

    const isOpen = siteNav.classList.toggle("menu-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    document.body.classList.toggle("nav-open", isOpen);
  };

  const scrollToTarget = (target) => {
    const navHeight = header ? header.offsetHeight : 92;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
    window.scrollTo({
      top: Math.max(top, 0),
      behavior: reduceMotionQuery.matches ? "auto" : "smooth",
    });
  };

  const updateProgress = () => {
    if (!progressBar) {
      return;
    }

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    progressBar.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
  };

  const setActiveNavLink = (id) => {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  setNavHeight();
  updateProgress();

  if (navToggle) {
    navToggle.addEventListener("click", toggleMenu);
  }

  internalLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") {
      return;
    }

    const target = document.querySelector(href);
    if (!target) {
      return;
    }

    link.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu();
      scrollToTarget(target);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) {
        return;
      }

      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.open = false;
        }
      });
    });
  });

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    revealItems.forEach((item) => revealObserver.observe(item));

    const navTargets = navLinks
      .map((link) => {
        const selector = link.getAttribute("href");
        return selector ? document.querySelector(selector) : null;
      })
      .filter(Boolean);

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length > 0) {
          setActiveNavLink(visibleEntries[0].target.id);
        }
      },
      {
        threshold: [0.2, 0.45, 0.7],
        rootMargin: `-${(header ? header.offsetHeight : 92) + 20}px 0px -50% 0px`,
      }
    );

    navTargets.forEach((section) => sectionObserver.observe(section));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  window.addEventListener("resize", () => {
    setNavHeight();
    updateProgress();
  });

  window.addEventListener("scroll", updateProgress, { passive: true });

  if (heroLogo && heroLogoWrap && !reduceMotionQuery.matches && window.matchMedia("(pointer: fine)").matches) {
    heroLogoWrap.addEventListener("pointermove", (event) => {
      const rect = heroLogoWrap.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * -12;
      heroLogo.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${y}deg) translateY(-4px)`;
    });

    heroLogoWrap.addEventListener("pointerleave", () => {
      heroLogo.style.transform = "";
    });
  }

  initAmbientParticles();
  initCursorGlow();
  initStarfield();
});

function initAmbientParticles() {
  const container = document.getElementById("ambient-particles");

  if (!container || reduceMotionQuery.matches) {
    return;
  }

  for (let index = 0; index < 18; index += 1) {
    const particle = document.createElement("span");
    particle.style.setProperty("--left", `${random(2, 98).toFixed(2)}%`);
    particle.style.setProperty("--size", `${random(4, 12).toFixed(2)}px`);
    particle.style.setProperty("--delay", `${random(-20, 0).toFixed(2)}s`);
    particle.style.setProperty("--duration", `${random(14, 24).toFixed(2)}s`);
    particle.style.setProperty("--drift", `${random(-8, 8).toFixed(2)}vw`);
    particle.style.setProperty("--opacity", `${random(0.2, 0.62).toFixed(2)}`);
    container.appendChild(particle);
  }
}

function initCursorGlow() {
  const cursorGlow = document.getElementById("cursor-glow");
  const canHover = window.matchMedia("(pointer: fine)").matches;

  if (!cursorGlow || !canHover || reduceMotionQuery.matches) {
    return;
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      cursorGlow.style.opacity = "1";
      cursorGlow.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    },
    { passive: true }
  );

  window.addEventListener("pointerleave", () => {
    cursorGlow.style.opacity = "0";
  });
}

function initStarfield() {
  const canvas = document.getElementById("starfield");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const state = {
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    stars: [],
    animationFrame: 0,
  };

  const createStar = () => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    radius: random(0.45, 1.8),
    speed: random(0.06, 0.26),
    alpha: random(0.16, 0.9),
    pulse: random(0.008, 0.03),
    tint: Math.random() > 0.72 ? "229, 90, 177" : Math.random() > 0.42 ? "136, 162, 255" : "255, 255, 255",
  });

  const resize = () => {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    const starCount = Math.max(80, Math.floor((state.width * state.height) / 14000));
    state.stars = Array.from({ length: starCount }, createStar);
  };

  const draw = () => {
    context.clearRect(0, 0, state.width, state.height);

    state.stars.forEach((star) => {
      star.y += star.speed;
      star.alpha += star.pulse;

      if (star.alpha >= 0.95 || star.alpha <= 0.12) {
        star.pulse *= -1;
      }

      if (star.y > state.height + 4) {
        star.y = -4;
        star.x = Math.random() * state.width;
      }

      context.beginPath();
      context.fillStyle = `rgba(${star.tint}, ${star.alpha})`;
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    });

    if (!reduceMotionQuery.matches) {
      state.animationFrame = window.requestAnimationFrame(draw);
    }
  };

  resize();
  draw();

  if (reduceMotionQuery.matches) {
    return;
  }

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(state.animationFrame);
    resize();
    draw();
  });
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}
