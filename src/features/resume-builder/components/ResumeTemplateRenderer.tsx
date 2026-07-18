import { ResumeProfileData, TemplateConfig } from "../types";

function SectionTitle({ children, config }: { children: React.ReactNode; config: TemplateConfig }) {
  return (
    <h2
      style={{
        fontFamily: config.headingFont,
        color: config.accentColor,
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        marginBottom: "6px",
        borderBottom: `1.5px solid ${config.accentColor}`,
        paddingBottom: "3px",
      }}
    >
      {children}
    </h2>
  );
}

function ExperienceBlock({ data, config }: { data: ResumeProfileData; config: TemplateConfig }) {
  const gap = config.density === "compact" ? "10px" : "16px";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {data.experience.map((exp, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontWeight: 700, fontSize: "13.5px" }}>{exp.title}</span>
            <span style={{ fontSize: "11px", color: "#64748B" }}>
              {exp.start_date} — {exp.end_date}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "#475569", marginBottom: "4px" }}>
            {exp.company}
            {exp.location ? ` · ${exp.location}` : ""}
          </div>
          <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", lineHeight: 1.5 }}>
            {exp.bullets.filter(Boolean).map((b, bi) => (
              <li key={bi}>{b}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function EducationBlock({ data }: { data: ResumeProfileData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {data.education.map((ed, i) => (
        <div key={i}>
          <div style={{ fontWeight: 700, fontSize: "12.5px" }}>{ed.degree}</div>
          <div style={{ fontSize: "11.5px", color: "#475569" }}>
            {ed.institution}
            {ed.field ? ` · ${ed.field}` : ""}
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8" }}>{ed.end_date}</div>
        </div>
      ))}
    </div>
  );
}

function ContactLine({ data }: { data: ResumeProfileData }) {
  const parts = [data.email, data.phone, data.location, data.linkedin_url, data.portfolio_url].filter(
    Boolean
  );
  return <div style={{ fontSize: "11.5px", color: "#64748B" }}>{parts.join("  ·  ")}</div>;
}

function SkillsAndCerts({ data, config }: { data: ResumeProfileData; config: TemplateConfig }) {
  return (
    <>
      {data.skills.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <SectionTitle config={config}>Skills</SectionTitle>
          <div style={{ fontSize: "12px", lineHeight: 1.6 }}>{data.skills.join(", ")}</div>
        </div>
      )}
      {data.certifications.length > 0 && (
        <div>
          <SectionTitle config={config}>Certifications</SectionTitle>
          <div style={{ fontSize: "12px", lineHeight: 1.6 }}>{data.certifications.join(", ")}</div>
        </div>
      )}
    </>
  );
}

export function ResumeTemplateRenderer({
  data,
  config,
}: {
  data: ResumeProfileData;
  config: TemplateConfig;
}) {
  const base: React.CSSProperties = {
    fontFamily: config.bodyFont,
    color: "#0B1220",
    background: "white",
    width: "210mm",
    minHeight: "297mm",
    padding: "18mm",
    boxSizing: "border-box",
  };

  const nameStyle: React.CSSProperties = {
    fontFamily: config.headingFont,
    fontSize: "26px",
    fontWeight: 700,
    marginBottom: "2px",
  };

  if (config.layout === "header-band") {
    return (
      <div style={{ ...base, padding: 0 }}>
        <div style={{ background: config.accentColor, color: "white", padding: "18mm 18mm 14mm" }}>
          <div style={{ ...nameStyle, color: "white" }}>{data.full_name || "Your Name"}</div>
          <div style={{ fontSize: "12px", opacity: 0.85 }}>
            {[data.email, data.phone, data.location].filter(Boolean).join("  ·  ")}
          </div>
        </div>
        <div style={{ padding: "14mm 18mm 18mm", display: "flex", flexDirection: "column", gap: "16px" }}>
          {data.summary && <p style={{ fontSize: "12.5px", lineHeight: 1.6 }}>{data.summary}</p>}
          <div>
            <SectionTitle config={config}>Experience</SectionTitle>
            <ExperienceBlock data={data} config={config} />
          </div>
          <div>
            <SectionTitle config={config}>Education</SectionTitle>
            <EducationBlock data={data} />
          </div>
          <SkillsAndCerts data={data} config={config} />
        </div>
      </div>
    );
  }

  if (config.layout === "sidebar-left" || config.layout === "sidebar-right") {
    const sidebar = (
      <div
        style={{
          width: "62mm",
          background: config.id === "two-tone" ? "#0B1220" : "#F7F8FA",
          color: config.id === "two-tone" ? "white" : "#0B1220",
          padding: "16mm 10mm",
          boxSizing: "border-box",
        }}
      >
        <div style={{ ...nameStyle, color: config.id === "two-tone" ? "white" : "#0B1220", fontSize: "20px" }}>
          {data.full_name || "Your Name"}
        </div>
        <div style={{ fontSize: "11px", opacity: 0.8, marginBottom: "16px" }}>
          {[data.email, data.phone, data.location].filter(Boolean).join("\n")}
        </div>
        <SkillsAndCerts data={data} config={config} />
        <div style={{ marginTop: "14px" }}>
          <SectionTitle config={config}>Education</SectionTitle>
          <EducationBlock data={data} />
        </div>
      </div>
    );
    const main = (
      <div style={{ flex: 1, padding: "16mm 14mm", display: "flex", flexDirection: "column", gap: "16px" }}>
        {data.summary && <p style={{ fontSize: "12.5px", lineHeight: 1.6 }}>{data.summary}</p>}
        <div>
          <SectionTitle config={config}>Experience</SectionTitle>
          <ExperienceBlock data={data} config={config} />
        </div>
      </div>
    );
    return (
      <div style={{ ...base, padding: 0, display: "flex" }}>
        {config.layout === "sidebar-left" ? (
          <>
            {sidebar}
            {main}
          </>
        ) : (
          <>
            {main}
            {sidebar}
          </>
        )}
      </div>
    );
  }

  // single-column (default)
  return (
    <div style={base}>
      <div style={nameStyle}>{data.full_name || "Your Name"}</div>
      <ContactLine data={data} />
      <div style={{ height: "14px" }} />
      {data.summary && (
        <p style={{ fontSize: "12.5px", lineHeight: 1.6, marginBottom: "16px" }}>{data.summary}</p>
      )}
      <div style={{ marginBottom: "16px" }}>
        <SectionTitle config={config}>Experience</SectionTitle>
        <ExperienceBlock data={data} config={config} />
      </div>
      <div style={{ marginBottom: "16px" }}>
        <SectionTitle config={config}>Education</SectionTitle>
        <EducationBlock data={data} />
      </div>
      <SkillsAndCerts data={data} config={config} />
    </div>
  );
}
