(async () => {
  const STORAGE_KEY = "rtcPortfolioStudioV1";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const defaults = window.PORTFOLIO_DEFAULTS;
  const byId = (id) => document.getElementById(id);
  const remote = Boolean(window.portfolioDb?.isConfigured());
  let data;
  let toastTimer;

  if (remote) {
    try {
      const user = await window.portfolioDb.getUser();
      if (!user || !(await window.portfolioDb.isAdmin())) {
        window.location.replace("login.html");
        return;
      }
      data = (await window.portfolioDb.loadContent(true)) || clone(defaults);
    } catch (error) {
      console.error("The database-backed editor could not be opened.", error);
      window.location.replace("login.html");
      return;
    }
  } else {
    data = load();
    setInterval(() => {
      try {
        const session = JSON.parse(sessionStorage.getItem("rtcPortfolioAdminSessionV1"));
        if (!session || session.expiresAt < Date.now()) window.location.replace("login.html");
      } catch {
        window.location.replace("login.html");
      }
    }, 60000);
  }
  document.body.classList.remove("auth-pending");
  byId("storageModeTitle").textContent = remote ? "Supabase connected" : "Local fallback";
  byId("storageModeText").textContent = remote
    ? "Changes are protected by Auth and saved to the shared database."
    : "Changes stay in this browser until Supabase is configured.";

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (valid(saved)) return saved;
    } catch (error) {
      console.warn(error);
    }
    return clone(defaults);
  }

  function valid(value) {
    return Boolean(value?.profile && Array.isArray(value?.skills) && Array.isArray(value?.projects));
  }

  function toast(message) {
    const element = byId("toast");
    element.textContent = message;
    element.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("is-visible"), 2200);
  }

  const profileSchema = [
    ["name", "Full name"], ["role", "Role / title"], ["status", "Availability status"],
    ["headline", "Main headline", "textarea"], ["intro", "Short introduction", "textarea"],
    ["about", "About paragraph", "textarea"], ["email", "Email", "email"],
    ["location", "Location"], ["linkedin", "LinkedIn URL", "url"], ["github", "GitHub URL", "url"],
    ["portrait", "Portrait path or URL"], ["school", "School"], ["course", "Course"], ["period", "Study period"],
  ];

  function renderProfile() {
    const container = byId("profileFields");
    container.innerHTML = "";
    profileSchema.forEach(([key, labelText, type = "text"]) => {
      const label = document.createElement("label");
      label.textContent = labelText;
      label.dataset.key = key;
      const field = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
      if (type !== "textarea") field.type = type;
      if (type === "textarea") field.rows = key === "about" ? 5 : 3;
      field.value = data.profile[key] || "";
      field.id = `profile-${key}`;
      label.appendChild(field);
      if (["headline", "intro", "about"].includes(key)) label.classList.add("field-wide");
      container.appendChild(label);
    });
  }

  function renderSkills() {
    const container = byId("skillsFields");
    container.innerHTML = "";
    data.skills.forEach(({ group, items }, index) => {
      const card = document.createElement("div");
      card.className = "skills-editor-card";
      card.dataset.originalGroup = group;
      const groupLabel = document.createElement("label");
      groupLabel.textContent = `Group ${index + 1}`;
      const groupInput = document.createElement("input");
      groupInput.className = "skill-group-name";
      groupInput.value = group;
      groupLabel.appendChild(groupInput);
      const itemsLabel = document.createElement("label");
      itemsLabel.textContent = "Skills";
      const itemsInput = document.createElement("textarea");
      itemsInput.className = "skill-group-items";
      itemsInput.rows = 3;
      itemsInput.value = items.join(", ");
      itemsLabel.appendChild(itemsInput);
      card.append(groupLabel, itemsLabel);
      container.appendChild(card);
    });
  }

  function renderProjects() {
    const container = byId("adminProjectList");
    container.innerHTML = "";
    data.projects.forEach((project, index) => {
      const item = document.createElement("article");
      item.className = "admin-project";
      item.innerHTML = `<span class="admin-project-index">${String(index + 1).padStart(2, "0")}</span>`;
      const details = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = `${project.title}${project.featured ? " [Featured]" : ""}${project.published === false ? " [Draft]" : ""}`;
      const meta = document.createElement("p");
      meta.textContent = `${project.category} / ${project.stack.join(" / ") || "No stack added"}`;
      details.append(title, meta);
      const actions = document.createElement("div");
      actions.className = "admin-project-actions";
      const edit = document.createElement("button");
      edit.className = "mini-button"; edit.type = "button"; edit.textContent = "Edit";
      edit.addEventListener("click", () => editProject(project.id));
      const remove = document.createElement("button");
      remove.className = "mini-button"; remove.type = "button"; remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteProject(project.id));
      actions.append(edit, remove);
      item.append(details, actions);
      container.appendChild(item);
    });
  }

  function collectProfileAndSkills() {
    profileSchema.forEach(([key]) => {
      data.profile[key] = byId(`profile-${key}`).value.trim();
    });
    const nextSkills = [];
    document.querySelectorAll(".skills-editor-card").forEach((card) => {
      const group = card.querySelector(".skill-group-name").value.trim();
      const items = card.querySelector(".skill-group-items").value.split(",").map((item) => item.trim()).filter(Boolean);
      if (group) nextSkills.push({ group, items });
    });
    data.skills = nextSkills;
  }

  function projectFromForm() {
    const existingId = byId("projectId").value;
    return {
      id: existingId || `${byId("projectTitle").value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`,
      title: byId("projectTitle").value.trim(),
      category: byId("projectCategory").value.trim(),
      summary: byId("projectSummary").value.trim(),
      contribution: byId("projectContribution").value.trim(),
      stack: byId("projectStack").value.split(",").map((item) => item.trim()).filter(Boolean),
      image: byId("projectImage").value.trim(),
      demoUrl: byId("projectDemo").value.trim(),
      repoUrl: byId("projectRepo").value.trim(),
      featured: byId("projectFeatured").checked,
      published: byId("projectPublished").checked,
    };
  }

  function clearProjectForm() {
    byId("projectForm").reset();
    byId("projectId").value = "";
    byId("projectSubmitLabel").textContent = "Add project";
    byId("cancelEdit").hidden = true;
  }

  function editProject(id) {
    const project = data.projects.find((item) => item.id === id);
    if (!project) return;
    byId("projectId").value = project.id;
    byId("projectTitle").value = project.title;
    byId("projectCategory").value = project.category;
    byId("projectSummary").value = project.summary;
    byId("projectContribution").value = project.contribution || "";
    byId("projectStack").value = project.stack.join(", ");
    byId("projectImage").value = project.image || "";
    byId("projectDemo").value = project.demoUrl || "";
    byId("projectRepo").value = project.repoUrl || "";
    byId("projectFeatured").checked = Boolean(project.featured);
    byId("projectPublished").checked = project.published !== false;
    byId("projectSubmitLabel").textContent = "Update project";
    byId("cancelEdit").hidden = false;
    byId("projectForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteProject(id) {
    const project = data.projects.find((item) => item.id === id);
    if (!project || !confirm(`Delete “${project.title}”?`)) return;
    data.projects = data.projects.filter((item) => item.id !== id);
    renderProjects();
    toast("Project removed. Save changes when ready.");
  }

  byId("projectForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const project = projectFromForm();
    const imageFile = byId("projectImageFile").files[0];
    if (imageFile && remote) {
      try {
        toast("Uploading project image...");
        project.image = await window.portfolioDb.uploadProjectImage(imageFile);
      } catch (error) {
        alert(`Image upload failed: ${error.message}`);
        return;
      }
    }
    const existingIndex = data.projects.findIndex((item) => item.id === project.id);
    if (existingIndex >= 0) data.projects[existingIndex] = project;
    else data.projects.unshift(project);
    clearProjectForm();
    renderProjects();
    toast(existingIndex >= 0 ? "Project updated. Save changes when ready." : "Project added. Save changes when ready.");
  });

  byId("cancelEdit").addEventListener("click", clearProjectForm);
  byId("lockStudio").addEventListener("click", async () => {
    if (remote) await window.portfolioDb.signOut();
    else sessionStorage.removeItem("rtcPortfolioAdminSessionV1");
    window.location.replace("login.html");
  });
  byId("saveAll").addEventListener("click", async () => {
    const button = byId("saveAll");
    collectProfileAndSkills();
    button.disabled = true;
    button.textContent = "Saving...";
    try {
      if (remote) await window.portfolioDb.saveContent(data);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      toast(remote ? "Portfolio published to the database." : "Portfolio changes saved locally.");
    } catch (error) {
      alert(`Changes could not be saved: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = "Save changes";
    }
  });

  byId("exportData").addEventListener("click", () => {
    collectProfileAndSkills();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "rtc-portfolio-content.json";
    link.click();
    URL.revokeObjectURL(link.href);
    toast("Backup exported.");
  });

  byId("importData").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!valid(imported)) throw new Error("Invalid portfolio format");
      data = imported;
      renderProfile(); renderSkills(); renderProjects(); clearProjectForm();
      if (!remote) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      toast(remote ? "Backup imported. Save changes to publish it." : "Backup imported and saved.");
    } catch {
      alert("That file is not a valid portfolio backup.");
    }
    event.target.value = "";
  });

  byId("resetData").addEventListener("click", () => {
    if (!confirm("Reset all saved edits to the starter content?")) return;
    data = clone(defaults);
    if (!remote) localStorage.removeItem(STORAGE_KEY);
    renderProfile(); renderSkills(); renderProjects(); clearProjectForm();
    toast(remote ? "Starter content loaded. Save changes to publish it." : "Starter content restored.");
  });

  renderProfile();
  renderSkills();
  renderProjects();
})();
