import cors from "cors";

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use(
  cors({
    origin: "https://ecommerce-frontend-fawn-three.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());