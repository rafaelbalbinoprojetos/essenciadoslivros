import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const STORAGE_KEY = "essencia:theme:v1";
const DEFAULT_LIGHT_THEME = "essencia";
const DEFAULT_DARK_THEME = "studio";

const ThemeContext = createContext({
  theme: null,
  themeId: DEFAULT_LIGHT_THEME,
  isDark: false,
  themes: [],
  selectTheme: () => {},
  toggleTheme: () => {},
});

function hexToRgbTuple(hex) {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r} ${g} ${b}`;
}

function createThemePreset({ id, name, description, mode, preview, colors }) {
  const variables = {
    "--color-accent-primary": hexToRgbTuple(colors.accent),
    "--color-accent-light": hexToRgbTuple(colors.accentLight ?? colors.accent),
    "--color-accent-dark": hexToRgbTuple(colors.accentDark ?? colors.accent),
    "--color-secondary-primary": hexToRgbTuple(colors.secondary ?? colors.accent),
    "--color-secondary-light": hexToRgbTuple(colors.secondaryLight ?? colors.secondary ?? colors.accent),
    "--color-secondary-dark": hexToRgbTuple(colors.secondaryDark ?? colors.secondary ?? colors.accent),
    "--color-tertiary-primary": hexToRgbTuple(colors.tertiary ?? colors.accent),
    "--color-tertiary-light": hexToRgbTuple(colors.tertiaryLight ?? colors.tertiary ?? colors.accent),
    "--color-tertiary-dark": hexToRgbTuple(colors.tertiaryDark ?? colors.tertiary ?? colors.accent),
    "--surface-base": colors.surfaceBase,
    "--surface-card": colors.surfaceCard,
    "--surface-muted": colors.surfaceMuted,
    "--border-soft": colors.borderSoft,
    "--border-strong": colors.borderStrong,
    "--text-primary": colors.textPrimary,
    "--text-secondary": colors.textSecondary,
    "--text-subtle": colors.textSubtle,
    "--shadow-sm": colors.shadowSm ?? "0 12px 24px -14px rgba(15, 23, 42, 0.18)",
    "--shadow-md": colors.shadowMd ?? "0 45px 85px -45px rgba(15, 23, 42, 0.25)",
    "--shadow-lg": colors.shadowLg ?? "0 90px 160px -80px rgba(15, 23, 42, 0.3)",
    "--ring-glow": colors.ringGlow ?? "0 0 0 3px rgba(15, 23, 42, 0.25)",
    "--surface-gradient": colors.surfaceGradient ?? "none",
  };

  return { id, name, description, mode, preview, variables };
}

const THEME_PRESETS = [
  createThemePreset({
    id: "essencia",
    name: "Essência",
    description: "Paleta palha + cobre, pensada para leituras confortáveis e acolhedoras.",
    mode: "light",
    preview: ["#d4a657", "#ba7b4f", "#f8f2e4", "#a8765c", "#5b4332"],
    colors: {
      accent: "#d4a657",
      accentLight: "#f0c676",
      accentDark: "#9c7631",
      secondary: "#ba7b4f",
      tertiary: "#7f8f64",
      surfaceBase: "248 242 228",
      surfaceCard: "255 251 239",
      surfaceMuted: "242 231 213",
      borderSoft: "rgba(212,166,87,0.18)",
      borderStrong: "rgba(186,123,79,0.32)",
      textPrimary: "58 43 32",
      textSecondary: "90 70 55",
      textSubtle: "133 112 93",
      surfaceGradient:
        "radial-gradient(circle at 20% 15%, rgba(212,166,87,0.28), transparent 55%), radial-gradient(circle at 80% -5%, rgba(186,123,79,0.22), transparent 50%), linear-gradient(135deg, rgba(127,143,100,0.12), rgba(255,251,239,0.04))",
      shadowSm: "0 14px 34px -26px rgba(90, 67, 50, 0.28)",
      shadowMd: "0 48px 90px -60px rgba(212,166,87,0.28)",
      shadowLg: "0 110px 200px -90px rgba(122,150,100,0.25)",
      ringGlow: "0 0 0 3px rgba(212,166,87,0.25)",
    },
  }),
  createThemePreset({
    id: "lumen",
    name: "Lumen",
    description: "Claro minimalista e fresco, voltado a estudo analítico em ambientes iluminados.",
    mode: "light",
    preview: ["#4f8dd1", "#68c5ff", "#f4f7fc", "#dfe7fb", "#26324b"],
    colors: {
      accent: "#4f8dd1",
      accentLight: "#8bc0f5",
      accentDark: "#2a5f96",
      secondary: "#68c5ff",
      tertiary: "#7dddc3",
      surfaceBase: "244 247 252",
      surfaceCard: "255 255 255",
      surfaceMuted: "230 237 251",
      borderSoft: "rgba(79,141,209,0.16)",
      borderStrong: "rgba(47,92,150,0.28)",
      textPrimary: "27 36 65",
      textSecondary: "64 83 119",
      textSubtle: "108 126 162",
      surfaceGradient:
        "radial-gradient(circle at 25% 10%, rgba(104,197,255,0.25), transparent 60%), radial-gradient(circle at 80% 0%, rgba(125,221,195,0.18), transparent 58%), linear-gradient(160deg, rgba(38,50,75,0.06), rgba(79,141,209,0.08))",
      shadowSm: "0 16px 34px -26px rgba(47,92,150,0.25)",
      shadowMd: "0 52px 100px -60px rgba(79,141,209,0.25)",
      shadowLg: "0 120px 210px -95px rgba(38,50,75,0.35)",
      ringGlow: "0 0 0 3px rgba(104,197,255,0.24)",
    },
  }),
  createThemePreset({
    id: "nocturne",
    name: "Nocturne",
    description: "Azuis petrolados e luz âmbar para sessões noturnas profundas.",
    mode: "dark",
    preview: ["#0c1120", "#1d253d", "#f3c97b", "#3d4b75", "#0a0d1a"],
    colors: {
      accent: "#f3c97b",
      accentLight: "#ffdca4",
      accentDark: "#b8873c",
      secondary: "#4b6edb",
      tertiary: "#59c2d8",
      surfaceBase: "10 13 26",
      surfaceCard: "17 23 43",
      surfaceMuted: "26 33 58",
      borderSoft: "rgba(243,201,123,0.18)",
      borderStrong: "rgba(75,110,219,0.32)",
      textPrimary: "234 242 255",
      textSecondary: "186 202 233",
      textSubtle: "134 153 193",
      surfaceGradient:
        "radial-gradient(circle at 20% 0%, rgba(75,110,219,0.32), transparent 55%), radial-gradient(circle at 85% -10%, rgba(35,56,104,0.45), transparent 62%), linear-gradient(145deg, rgba(12,17,32,0.85), rgba(6,9,18,0.9))",
      shadowSm: "0 24px 48px -30px rgba(0, 0, 0, 0.75)",
      shadowMd: "0 70px 140px -90px rgba(10,13,26,0.9)",
      shadowLg: "0 140px 240px -120px rgba(75,110,219,0.35)",
      ringGlow: "0 0 0 3px rgba(243,201,123,0.28)",
    },
  }),
  createThemePreset({
    id: "studio",
    name: "Studio",
    description: "Cinzas grafite e violetas elétricos inspirados em ferramentas como VS, AE e Figma.",
    mode: "dark",
    preview: ["#0f111a", "#1b1f2c", "#8d8afc", "#5c6175", "#11131f"],
    colors: {
      accent: "#8d8afc",
      accentLight: "#b6b3ff",
      accentDark: "#5b58d6",
      secondary: "#5c9ded",
      tertiary: "#60d5ff",
      surfaceBase: "15 17 26",
      surfaceCard: "27 30 43",
      surfaceMuted: "36 40 58",
      borderSoft: "rgba(255,255,255,0.06)",
      borderStrong: "rgba(141,138,252,0.35)",
      textPrimary: "232 234 247",
      textSecondary: "179 184 212",
      textSubtle: "128 134 164",
      surfaceGradient:
        "radial-gradient(circle at 18% -5%, rgba(141,138,252,0.35), transparent 52%), radial-gradient(circle at 90% 0%, rgba(44,48,74,0.6), transparent 60%), linear-gradient(150deg, rgba(12,14,24,0.95), rgba(8,9,16,0.92))",
      shadowSm: "0 28px 56px -32px rgba(0,0,0,0.65)",
      shadowMd: "0 80px 150px -90px rgba(5,6,12,0.85)",
      shadowLg: "0 160px 260px -140px rgba(12,14,26,0.85)",
      ringGlow: "0 0 0 3px rgba(141,138,252,0.35)",
    },
  }),
  createThemePreset({
    id: "sepia-analog",
    name: "Sépia Analógica",
    description: "Paleta vintage de cadernos e câmeras analógicas para sessões longas e acolhedoras.",
    mode: "light",
    preview: ["#f5e9d7", "#c57a44", "#8b4e24", "#f2d4b3", "#5b3b24"],
    colors: {
      accent: "#c57a44",
      accentLight: "#e5a56b",
      accentDark: "#8b4e24",
      secondary: "#a96838",
      tertiary: "#9d7d4b",
      surfaceBase: "245 233 215",
      surfaceCard: "254 246 232",
      surfaceMuted: "237 222 200",
      borderSoft: "rgba(197,122,68,0.2)",
      borderStrong: "rgba(111,74,40,0.35)",
      textPrimary: "64 43 28",
      textSecondary: "109 78 52",
      textSubtle: "149 116 86",
      surfaceGradient:
        "radial-gradient(circle at 15% 15%, rgba(245,219,186,0.75), transparent 55%), radial-gradient(circle at 85% 0%, rgba(197,122,68,0.35), transparent 52%), linear-gradient(140deg, rgba(255,255,255,0.4), rgba(210,173,135,0.25))",
      shadowSm: "0 18px 36px -24px rgba(91,59,36,0.35)",
      shadowMd: "0 60px 110px -70px rgba(197,122,68,0.35)",
      shadowLg: "0 140px 220px -100px rgba(110,76,52,0.4)",
      ringGlow: "0 0 0 3px rgba(197,122,68,0.28)",
    },
  }),
  createThemePreset({
    id: "jardim-nebuloso",
    name: "Jardim Nebuloso",
    description: "Verdes profundos e lilases etéreos para leituras oníricas e contemplativas.",
    mode: "dark",
    preview: ["#050d0a", "#1b2a24", "#c38fff", "#7ce0b3", "#2d4f45"],
    colors: {
      accent: "#c38fff",
      accentLight: "#e1b5ff",
      accentDark: "#8744c5",
      secondary: "#7ce0b3",
      tertiary: "#5ad1cf",
      surfaceBase: "6 12 9",
      surfaceCard: "18 31 26",
      surfaceMuted: "28 45 37",
      borderSoft: "rgba(124,224,179,0.18)",
      borderStrong: "rgba(195,143,255,0.3)",
      textPrimary: "225 239 231",
      textSecondary: "177 206 192",
      textSubtle: "134 163 150",
      surfaceGradient:
        "radial-gradient(circle at 15% -5%, rgba(124,224,179,0.35), transparent 52%), radial-gradient(circle at 90% 10%, rgba(195,143,255,0.35), transparent 58%), linear-gradient(180deg, rgba(5,8,6,0.95), rgba(5,8,10,0.9))",
      shadowSm: "0 30px 55px -32px rgba(0,0,0,0.7)",
      shadowMd: "0 90px 150px -100px rgba(3,5,4,0.85)",
      shadowLg: "0 160px 260px -140px rgba(124,224,179,0.25)",
      ringGlow: "0 0 0 3px rgba(195,143,255,0.35)",
    },
  }),
  createThemePreset({
    id: "quartzo-neon",
    name: "Quartzo Neon",
    description: "Cinzas grafite com magenta e ciano elétricos para um clima sci-fi.",
    mode: "dark",
    preview: ["#0b0c12", "#181a27", "#ff5fd2", "#5df6ff", "#2b303f"],
    colors: {
      accent: "#ff5fd2",
      accentLight: "#ff85e1",
      accentDark: "#c32393",
      secondary: "#5df6ff",
      tertiary: "#8ac4ff",
      surfaceBase: "8 9 14",
      surfaceCard: "20 22 34",
      surfaceMuted: "30 32 48",
      borderSoft: "rgba(255,95,210,0.25)",
      borderStrong: "rgba(93,246,255,0.35)",
      textPrimary: "233 236 246",
      textSecondary: "183 188 210",
      textSubtle: "132 138 168",
      surfaceGradient:
        "radial-gradient(circle at 10% -10%, rgba(255,95,210,0.35), transparent 55%), radial-gradient(circle at 85% 5%, rgba(93,246,255,0.3), transparent 58%), linear-gradient(165deg, rgba(6,7,12,0.92), rgba(10,12,20,0.95))",
      shadowSm: "0 35px 65px -38px rgba(0,0,0,0.75)",
      shadowMd: "0 110px 180px -110px rgba(6,7,12,0.9)",
      shadowLg: "0 190px 280px -150px rgba(255,95,210,0.25)",
      ringGlow: "0 0 0 3px rgba(93,246,255,0.38)",
    },
  }),
  createThemePreset({
    id: "terracota-digital",
    name: "Terracota Digital",
    description: "Argilas modernas com violetas terrosos para coleções autorais e curadorias.",
    mode: "light",
    preview: ["#f9ece2", "#d8784d", "#8f3f1f", "#c8b27c", "#59334c"],
    colors: {
      accent: "#d8784d",
      accentLight: "#f0a279",
      accentDark: "#8f3f1f",
      secondary: "#7a4c85",
      tertiary: "#c8b27c",
      surfaceBase: "249 236 226",
      surfaceCard: "255 247 239",
      surfaceMuted: "238 222 211",
      borderSoft: "rgba(216,120,77,0.18)",
      borderStrong: "rgba(122,76,133,0.32)",
      textPrimary: "68 39 30",
      textSecondary: "109 72 66",
      textSubtle: "150 104 92",
      surfaceGradient:
        "radial-gradient(circle at 20% 10%, rgba(216,120,77,0.22), transparent 55%), radial-gradient(circle at 80% -10%, rgba(122,76,133,0.25), transparent 52%), linear-gradient(155deg, rgba(255,255,255,0.5), rgba(200,144,117,0.25))",
      shadowSm: "0 18px 38px -24px rgba(122,76,67,0.3)",
      shadowMd: "0 60px 120px -75px rgba(216,120,77,0.3)",
      shadowLg: "0 140px 230px -110px rgba(122,76,133,0.28)",
      ringGlow: "0 0 0 3px rgba(216,120,77,0.28)",
    },
  }),
  createThemePreset({
    id: "pergaminho-escuro",
    name: "Pergaminho Noturno",
    description: "Tons de pergaminho envelhecido em baixa luz, incluindo navegação em couro escuro.",
    mode: "dark",
    preview: ["#18120c", "#231b13", "#d9b679", "#8f6b3d", "#3a2a1b"],
    colors: {
      accent: "#d9b679",
      accentLight: "#f2d5a2",
      accentDark: "#8f6b3d",
      secondary: "#a77c4a",
      tertiary: "#c58c5c",
      surfaceBase: "24 18 12",
      surfaceCard: "33 27 20",
      surfaceMuted: "46 36 26",
      borderSoft: "rgba(217,182,121,0.22)",
      borderStrong: "rgba(126,92,54,0.45)",
      textPrimary: "239 228 206",
      textSecondary: "196 180 150",
      textSubtle: "160 143 118",
      surfaceGradient:
        "radial-gradient(circle at 15% -5%, rgba(217,182,121,0.28), transparent 55%), radial-gradient(circle at 80% 5%, rgba(58,42,27,0.65), transparent 60%), linear-gradient(170deg, rgba(18,13,9,0.95), rgba(14,10,7,0.92))",
      shadowSm: "0 30px 60px -40px rgba(0,0,0,0.75)",
      shadowMd: "0 100px 180px -110px rgba(10,6,3,0.9)",
      shadowLg: "0 180px 300px -150px rgba(59,42,28,0.6)",
      ringGlow: "0 0 0 3px rgba(217,182,121,0.35)",
    },
  }),
  createThemePreset({
    id: "crepusculo-polar",
    name: "Crepúsculo Polar",
    description: "Azuis quase negros com brilho aurora para leituras imersivas e meditativas.",
    mode: "dark",
    preview: ["#040812", "#0e1524", "#71d6ff", "#aaf0ff", "#132440"],
    colors: {
      accent: "#71d6ff",
      accentLight: "#aaf0ff",
      accentDark: "#2b8bb5",
      secondary: "#c48bff",
      tertiary: "#5ed9f7",
      surfaceBase: "4 8 18",
      surfaceCard: "14 21 36",
      surfaceMuted: "26 33 51",
      borderSoft: "rgba(113,214,255,0.2)",
      borderStrong: "rgba(196,139,255,0.35)",
      textPrimary: "219 231 255",
      textSecondary: "170 191 226",
      textSubtle: "134 154 190",
      surfaceGradient:
        "radial-gradient(circle at 25% -5%, rgba(113,214,255,0.32), transparent 58%), radial-gradient(circle at 80% 0%, rgba(196,139,255,0.28), transparent 55%), linear-gradient(160deg, rgba(4,8,18,0.95), rgba(7,10,20,0.92))",
      shadowSm: "0 30px 60px -36px rgba(0,0,0,0.7)",
      shadowMd: "0 100px 170px -105px rgba(2,3,8,0.85)",
      shadowLg: "0 190px 300px -150px rgba(113,214,255,0.25)",
      ringGlow: "0 0 0 3px rgba(113,214,255,0.35)",
    },
  }),
];

const THEME_MAP = new Map(THEME_PRESETS.map((theme) => [theme.id, theme]));

export function ThemeProvider({ children }) {
  const explicitPreference = useRef(false);

  const [themeId, setThemeId] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LIGHT_THEME;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && THEME_MAP.has(stored)) {
      explicitPreference.current = true;
      return stored;
    }

    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
  });

  const activeTheme = useMemo(() => THEME_MAP.get(themeId) ?? THEME_MAP.get(DEFAULT_LIGHT_THEME), [themeId]);

  useEffect(() => {
    if (!activeTheme) return;

    const root = document.documentElement;
    root.dataset.theme = activeTheme.id;
    root.dataset.colorMode = activeTheme.mode;
    root.classList.toggle("dark", activeTheme.mode === "dark");

    Object.entries(activeTheme.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    if (explicitPreference.current) {
      window.localStorage.setItem(STORAGE_KEY, activeTheme.id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeTheme]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      if (explicitPreference.current) return;
      setThemeId(event.matches ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME);
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const selectTheme = useCallback((id) => {
    if (!THEME_MAP.has(id)) return;
    explicitPreference.current = true;
    setThemeId(id);
  }, []);

  const toggleTheme = useCallback(() => {
    explicitPreference.current = true;
    setThemeId((current) => {
      const currentTheme = THEME_MAP.get(current);
      return currentTheme?.mode === "dark" ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme: activeTheme,
      themeId: activeTheme?.id ?? DEFAULT_LIGHT_THEME,
      isDark: activeTheme?.mode === "dark",
      themes: THEME_PRESETS,
      selectTheme,
      toggleTheme,
    }),
    [activeTheme, selectTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
