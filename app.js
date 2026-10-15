(async () => {
  const STORAGE_KEY = "rtcPortfolioStudioV1";
  const defaults = window.PORTFOLIO_DEFAULTS;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function loadContent() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.profile && Array.isArray(saved?.skills) && Array.isArray(saved?.projects)) return saved;
    } catch (error) {
      console.warn("Saved portfolio content could not be loaded.", error);
    }
    return clone(defaults);
  }

  let content = loadContent();
  if (window.portfolioDb?.isConfigured()) {
    try {
      content = (await window.portfolioDb.loadContent(false)) || content;
    } catch (error) {
      console.error("Remote portfolio content could not be loaded. Showing the local fallback.", error);
    }
  }
  const profile = content.profile;
  const byId = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const element = byId(id);
    if (element) element.textContent = value || "";
  };
  const setLink = (id, url, label) => {
    const element = byId(id);
    if (!element) return;
    element.href = url || "#";
    if (label) element.textContent = label;
    element.hidden = !url;
  };

  setText("navName", profile.name);
  setText("profileStatus", profile.status);
  setText("profileRole", profile.role);
  setText("profileHeadline", profile.headline);
  setText("profileIntro", profile.intro);
  setText("profileLocation", profile.location);
  setText("profileAbout", profile.about);
  setText("profileCourse", profile.course);
  setText("profileSchool", profile.school);
  setText("profilePeriod", profile.period);
  setText("contactEmail", profile.email);
  setText("footerName", profile.name);
  setText("year", new Date().getFullYear());

  const portrait = byId("profilePortrait");
  if (portrait) {
    portrait.src = profile.portrait;
    portrait.alt = `${profile.name} portrait`;
  }

  setLink("emailHero", `mailto:${profile.email}`, "Email me");
  setLink("contactEmail", `mailto:${profile.email}`, profile.email);
  setLink("contactLinkedin", profile.linkedin, "LinkedIn");
  setLink("contactGithub", profile.github, "GitHub");

  const skillsGrid = byId("skillsGrid");
  const skillTemplate = byId("skillTemplate");
  content.skills.forEach(({ group, items }, index) => {
    const fragment = skillTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".skill-card");
    fragment.querySelector(".skill-number").textContent = String(index + 1).padStart(2, "0");
    fragment.querySelector("h3").textContent = group;
    const list = fragment.querySelector(".skill-tags");
    items.forEach((item) => {
      const tag = document.createElement("span");
      tag.textContent = item;
      list.appendChild(tag);
    });
    if (index === 0) card.classList.add("skill-card--accent");
    skillsGrid.appendChild(fragment);
  });

  const projectsGrid = byId("projectsGrid");
  const projectTemplate = byId("projectTemplate");
  const emptyState = byId("emptyState");
  let activeFilter = "All";

  function initials(title) {
    return title
      .split(/\s+/)
      .slice(0, 3)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  function renderProjects() {
    projectsGrid.innerHTML = "";
    const projects = content.projects.filter(
      (project) => activeFilter === "All" || project.category === activeFilter,
    );
    emptyState.hidden = projects.length > 0;
    setText("projectCount", `${projects.length} project${projects.length === 1 ? "" : "s"}`);

    projects.forEach((project, index) => {
      const fragment = projectTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".project-card");
      card.classList.toggle("featured", Boolean(project.featured));
      fragment.querySelector(".project-index").textContent = String(index + 1).padStart(2, "0");
      fragment.querySelector(".project-category").textContent = project.category;
      fragment.querySelector("h3").textContent = project.title;
      fragment.querySelector(".project-summary").textContent = project.summary;
      fragment.querySelector(".project-contribution").textContent = project.contribution || "";

      const image = fragment.querySelector(".project-media img");
      const placeholder = fragment.querySelector(".project-placeholder");
      placeholder.textContent = initials(project.title);
      if (project.image) {
        image.src = project.image;
        image.alt = `${project.title} interface preview`;
        image.addEventListener("load", () => {
          image.hidden = false;
          placeholder.hidden = true;
        });
        image.addEventListener("error", () => {
          image.hidden = true;
          placeholder.hidden = false;
        });
      } else {
        image.hidden = true;
        placeholder.hidden = false;
      }

      const stack = fragment.querySelector(".project-stack");
      project.stack.forEach((item) => {
        const tag = document.createElement("span");
        tag.textContent = item;
        stack.appendChild(tag);
      });

      const links = fragment.querySelector(".project-links");
      [
        [project.demoUrl, "View project"],
        [project.repoUrl, "Source code"],
      ].forEach(([url, label]) => {
        if (!url) return;
        const link = document.createElement("a");
        link.href = url;
        link.textContent = `${label} ↗`;
        link.target = "_blank";
        link.rel = "noreferrer";
        links.appendChild(link);
      });
      if (!links.children.length) links.hidden = true;
      projectsGrid.appendChild(fragment);
    });
  }

  const filters = ["All", ...new Set(content.projects.map((project) => project.category))];
  const filterContainer = byId("projectFilters");
  filters.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = filter;
    button.className = "filter";
    button.classList.toggle("active", filter === activeFilter);
    button.setAttribute("aria-pressed", String(filter === activeFilter));
    button.addEventListener("click", () => {
      activeFilter = filter;
      filterContainer.querySelectorAll("button").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
        item.classList.toggle("active", item === button);
      });
      renderProjects();
    });
    filterContainer.appendChild(button);
  });
  renderProjects();

  byId("copyEmail")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(profile.email);
      button.textContent = "Copied!";
      setTimeout(() => (button.textContent = "Copy email"), 1600);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  });

  const menuButton = byId("menuButton");
  const navMenu = byId("navMenu");
  menuButton?.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");
    document.body.classList.toggle("menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
  navMenu?.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      navMenu.classList.remove("open");
      document.body.classList.remove("menu-open");
      menuButton?.setAttribute("aria-expanded", "false");
    }),
  );

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) window.location.reload();
  });
})();
