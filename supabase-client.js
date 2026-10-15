(() => {
  const config = window.PORTFOLIO_SUPABASE || {};
  const configured = Boolean(
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url || "") &&
    config.publishableKey &&
    !config.publishableKey.startsWith("YOUR_"),
  );
  let clientPromise;

  async function getClient() {
    if (!configured) return null;
    if (!clientPromise) {
      clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").then(({ createClient }) =>
        createClient(config.url, config.publishableKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        }),
      );
    }
    return clientPromise;
  }

  function throwIfError(result) {
    if (result.error) throw result.error;
    return result.data;
  }

  function mapContent(profileRow, groupRows, skillRows, projectRows) {
    const defaults = JSON.parse(JSON.stringify(window.PORTFOLIO_DEFAULTS));
    const profile = profileRow
      ? {
          name: profileRow.name,
          role: profileRow.role,
          status: profileRow.status,
          headline: profileRow.headline,
          intro: profileRow.intro,
          about: profileRow.about,
          school: profileRow.school,
          course: profileRow.course,
          period: profileRow.period,
          location: profileRow.location,
          email: profileRow.email,
          linkedin: profileRow.linkedin_url,
          github: profileRow.github_url,
          portrait: profileRow.portrait_url || defaults.profile.portrait,
        }
      : defaults.profile;

    const skills = groupRows.map((group) => ({
      group: group.name,
      items: skillRows.filter((skill) => skill.group_id === group.id).map((skill) => skill.name),
    }));

    const projects = projectRows.map((project) => ({
      id: project.id,
      title: project.title,
      category: project.category,
      summary: project.summary,
      contribution: project.contribution || "",
      stack: project.stack || [],
      image: project.image_url || "",
      demoUrl: project.demo_url || "",
      repoUrl: project.repo_url || "",
      featured: Boolean(project.featured),
      published: Boolean(project.published),
    }));

    return { profile, skills, projects };
  }

  async function loadContent(includeDrafts = false) {
    const client = await getClient();
    if (!client) return null;
    let projectsQuery = client.from("projects").select("*").order("sort_order").order("created_at");
    if (!includeDrafts) projectsQuery = projectsQuery.eq("published", true);
    const [profileResult, groupsResult, skillsResult, projectsResult] = await Promise.all([
      client.from("site_profile").select("*").eq("id", "main").maybeSingle(),
      client.from("skill_groups").select("*").order("sort_order"),
      client.from("skills").select("*").order("sort_order"),
      projectsQuery,
    ]);
    return mapContent(
      throwIfError(profileResult),
      throwIfError(groupsResult) || [],
      throwIfError(skillsResult) || [],
      throwIfError(projectsResult) || [],
    );
  }

  async function saveContent(content) {
    const client = await getClient();
    const data = throwIfError(await client.rpc("replace_portfolio_content", { payload: content }));
    return data;
  }

  async function uploadProjectImage(file) {
    const client = await getClient();
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const name = `${crypto.randomUUID()}.${extension || "jpg"}`;
    throwIfError(await client.storage.from("portfolio-images").upload(name, file, { upsert: false }));
    return client.storage.from("portfolio-images").getPublicUrl(name).data.publicUrl;
  }

  async function signIn(email, password) {
    const client = await getClient();
    return throwIfError(await client.auth.signInWithPassword({ email, password }));
  }

  async function signOut() {
    const client = await getClient();
    if (client) throwIfError(await client.auth.signOut());
  }

  async function getUser() {
    const client = await getClient();
    if (!client) return null;
    return throwIfError(await client.auth.getUser()).user;
  }

  async function isAdmin() {
    const client = await getClient();
    if (!client) return false;
    const result = await client.from("portfolio_admins").select("user_id").maybeSingle();
    if (result.error) return false;
    return Boolean(result.data);
  }

  window.portfolioDb = {
    isConfigured: () => configured,
    getClient,
    loadContent,
    saveContent,
    uploadProjectImage,
    signIn,
    signOut,
    getUser,
    isAdmin,
  };
})();
