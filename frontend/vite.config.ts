import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    {
      name: 'serve-backend-data',
      configureServer(server) {
        server.middlewares.use('/data/final_delivery_data.csv', (req, res, next) => {
          const backendPath = path.resolve(__dirname, '../pharmacy2u/final_delivery_data.csv');
          if (fs.existsSync(backendPath)) {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Access-Control-Allow-Origin', '*');
            fs.createReadStream(backendPath).pipe(res);
          } else {
            next();
          }
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
