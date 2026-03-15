import { execSync } from "child_process";
import { statSync } from "fs";


export function remarkFileInfo() {
  return function (tree, file) {
    const filepath = file.history[0];
    const firstChanges = execSync(`git log --follow --diff-filter=A --pretty="format:%aN|%aE|%ad" "${filepath}"`);
    const latestChanges = execSync(`git log -1 --pretty="format:%cI" "${filepath}"`);
    const fileInfo = statSync(filepath)
    const [authorName, authorEmail, created] = firstChanges.toString().split('|');
    file.data.astro.frontmatter.author = authorName || '(pending)';
    file.data.astro.frontmatter.email = authorEmail || 'N/A';
    file.data.astro.frontmatter.mtime = fileInfo.mtime.toISOString();
    file.data.astro.frontmatter.createdDate = new Date(created || fileInfo.mtime.toISOString());
    file.data.astro.frontmatter.modifiedDate = new Date(latestChanges.toString() || fileInfo.mtime.toISOString());
  };
}
