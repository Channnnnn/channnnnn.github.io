import { execSync } from "child_process";

export function remarkFileInfo() {
  return function (tree, file) {
    const filepath = file.history[0];
    const firstChanges = execSync(`git log --follow --diff-filter=A --pretty="format:%aN|%aE|%ad" "${filepath}"`);
    const latestChanges = execSync(`git log -1 --pretty="format:%cI" "${filepath}"`);
    const [authorName, authorEmail, created] = firstChanges.toString().split('|');
    file.data.astro.frontmatter.author = authorName;
    file.data.astro.frontmatter.email = authorEmail;
    file.data.astro.frontmatter.createdDate = new Date(created);
    file.data.astro.frontmatter.modifiedDate = new Date(latestChanges.toString());
  };
}
