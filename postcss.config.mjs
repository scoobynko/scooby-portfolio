const config = {
  plugins: {
    // Explicitly configure Tailwind's content sources to satisfy the scanner
    "@tailwindcss/postcss": {
      sources: [
        "app/**/*.{js,jsx,ts,tsx,mdx}",
        "components/**/*.{js,jsx,ts,tsx,mdx}",
        "lib/**/*.{js,jsx,ts,tsx,mdx}",
        "pages/**/*.{js,jsx,ts,tsx,mdx}",
      ],
    },
  },
};

export default config;
