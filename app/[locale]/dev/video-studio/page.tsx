import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DevVideo } from "./dev-video";
import "../../../studio.css";

// Development only: the video creating screen replaying a real director run, to check it without signing in.
export default async function DevVideoStudio({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  // a few captured screens from a local run (.work), as data URIs
  const root = path.join(process.cwd(), ".work/live");
  const shots: string[] = [];
  for (const job of fs.existsSync(root) ? fs.readdirSync(root) : []) {
    const dir = path.join(root, job, "a1", "brands");
    if (!fs.existsSync(dir)) continue;
    for (const brand of fs.readdirSync(dir)) {
      const s = path.join(dir, brand, "screens");
      if (!fs.existsSync(s)) continue;
      for (const f of fs.readdirSync(s).filter((x) => x.endsWith(".view.jpg")).slice(0, 5)) shots.push(`data:image/jpeg;base64,${fs.readFileSync(path.join(s, f)).toString("base64")}`);
      if (shots.length) break;
    }
    if (shots.length) break;
  }
  return (
    <div className="mx-auto max-w-[1240px] p-6">
      <DevVideo screens={shots} />
    </div>
  );
}
