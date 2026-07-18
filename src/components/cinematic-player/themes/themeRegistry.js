import { baseTheme } from "./baseTheme.js";
import { falloutTheme } from "./falloutTheme.js";
import { godOfWarTheme } from "./godOfWarTheme.js";
import { limerenceTheme } from "./limerenceTheme.js";
import { tolkienTheme } from "./tolkienTheme.js";

export const cinematicThemeRegistry = {
  base: baseTheme,
  fallout: falloutTheme,
  godOfWar: godOfWarTheme,
  tolkien: tolkienTheme,
  limerence: limerenceTheme,
};

export function inferThemeId(work = {}) {
  const haystack = [
    work.themeId,
    work.title,
    work.author,
    work.collectionTitle,
    work.sceneTitle,
    work.sceneSubtitle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/fallout|pip-boy|vault|wasteland/.test(haystack)) return "fallout";
  if (/god of war|kratos|atreus|norse|olympus/.test(haystack)) return "godOfWar";
  if (/tolkien|senhor dos an[eé]is|lord of the rings|hobbit|silmarillion/.test(haystack)) return "tolkien";
  if (/limer[eê]ncia|amor|attachment|relacionamento/.test(haystack)) return "limerence";
  return work.themeId || "base";
}

export function getCinematicTheme(themeId) {
  return cinematicThemeRegistry[themeId] ?? cinematicThemeRegistry.base;
}

